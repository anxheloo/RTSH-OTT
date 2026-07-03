/**
 * Behavior tests for the parental gate — the child-safety invariants:
 *   • verify mode: correct PIN → onSuccess + attempts reset; wrong PIN → failed
 *     attempt recorded, no unlock
 *   • lockout: the 5th failure locks the pad (message shown, keys inert)
 *   • set mode: enter → confirm mismatch is rejected; a match stores a SHA-256
 *     HASH (never the raw digits) and enables the gate
 *
 * Runs against the REAL Zustand store (MMKV mocked in jest.setup) so the slice
 * logic (recordFailedAttempt / isLocked / setParentalConfig) is covered too.
 * expo-crypto is emulated with Node crypto — same SHA-256 semantics.
 */
import React from 'react';

import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { useAppStore } from '@/store/useAppStore';
import { hashPin } from '@/utils/pin';

import ParentalPinModal from '../ParentalPinModal';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('expo-crypto', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createHash } = require('crypto') as typeof import('crypto');
  return {
    CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
    digestStringAsync: async (_alg: string, data: string) =>
      createHash('sha256').update(data).digest('hex'),
  };
});

jest.mock('@/hooks/useHaptic', () => ({
  useHaptic: () => ({
    selection: jest.fn(),
    light: jest.fn(),
    medium: jest.fn(),
    success: jest.fn(),
    warning: jest.fn(),
    error: jest.fn(),
  }),
}));

jest.mock('@/components/Icons', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { TouchableOpacity } = require('react-native');
  return {
    Icon: () => null,
    IconButton: ({
      onPress,
      testID,
      children,
    }: {
      onPress?: () => void;
      testID?: string;
      children?: React.ReactNode;
    }) => (
      <TouchableOpacity onPress={onPress} testID={testID}>
        {children}
      </TouchableOpacity>
    ),
  };
});

const enterPin = (
  getByTestId: (id: string) => unknown,
  digits: string,
) => {
  for (const d of digits) {
    fireEvent.press(getByTestId(`pin-key-${d}`) as never);
  }
};

beforeEach(() => {
  useAppStore.setState({
    parentalEnabled: true,
    parentalPin: null,
    failedAttempts: 0,
    lockedUntil: null,
  });
});

describe('ParentalPinModal — verify', () => {
  const renderVerify = async (correctPin: string) => {
    useAppStore.setState({ parentalPin: await hashPin(correctPin) });
    const onSuccess = jest.fn();
    const onDismiss = jest.fn();
    const utils = render(
      <ParentalPinModal visible mode="verify" onSuccess={onSuccess} onDismiss={onDismiss} />,
    );
    return { ...utils, onSuccess, onDismiss };
  };

  it('unlocks on the correct PIN and resets the attempt counter', async () => {
    useAppStore.setState({ failedAttempts: 2 });
    const { getByTestId, onSuccess } = await renderVerify('1234');

    enterPin(getByTestId, '1234');
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(useAppStore.getState().failedAttempts).toBe(0);
  });

  it('rejects a wrong PIN and records the failed attempt', async () => {
    const { getByTestId, onSuccess } = await renderVerify('1234');

    enterPin(getByTestId, '9999');
    await waitFor(() => expect(useAppStore.getState().failedAttempts).toBe(1));
    expect(onSuccess).not.toHaveBeenCalled();
    expect(useAppStore.getState().lockedUntil).toBeNull();
  });

  it('locks the pad after the 5th failure — message shown, keys inert', async () => {
    useAppStore.setState({ failedAttempts: 4 });
    const { getByTestId, getByText, onSuccess } = await renderVerify('1234');

    enterPin(getByTestId, '9999'); // 5th failure → lockout
    await waitFor(() => expect(useAppStore.getState().lockedUntil).not.toBeNull());
    await waitFor(() => getByText('parental.locked'));

    // Locked: even the CORRECT PIN must not unlock.
    enterPin(getByTestId, '1234');
    expect(onSuccess).not.toHaveBeenCalled();
  });
});

describe('ParentalPinModal — set', () => {
  it('stores a SHA-256 hash (never the raw digits) and unlocks on confirm match', async () => {
    const onSuccess = jest.fn();
    const { getByTestId } = render(
      <ParentalPinModal visible mode="set" onSuccess={onSuccess} onDismiss={jest.fn()} />,
    );

    enterPin(getByTestId, '1234'); // enter
    enterPin(getByTestId, '1234'); // confirm
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));

    const { parentalPin, parentalEnabled } = useAppStore.getState();
    expect(parentalEnabled).toBe(true);
    expect(parentalPin).toMatch(/^[0-9a-f]{64}$/); // hex digest…
    expect(parentalPin).not.toContain('1234'); // …never the raw PIN
    expect(parentalPin).toBe(await hashPin('1234')); // and it verifies
  });

  it('rejects a confirm mismatch and stores nothing', async () => {
    const onSuccess = jest.fn();
    const { getByTestId, getByText } = render(
      <ParentalPinModal visible mode="set" onSuccess={onSuccess} onDismiss={jest.fn()} />,
    );

    enterPin(getByTestId, '1234'); // enter
    enterPin(getByTestId, '5678'); // confirm — mismatch
    await waitFor(() => getByText('parental.mismatch'));

    expect(onSuccess).not.toHaveBeenCalled();
    expect(useAppStore.getState().parentalPin).toBeNull();
  });
});

/**
 * Regression test for REACT-NATIVE-RTSH-OTT-12 (iOS fatal
 * UIApplicationInvalidInterfaceOrientation). Any global modal can be raised
 * while the phone player is locked to landscape — the cellular gate on a
 * Wi-Fi → cellular switch, `noInternet` on a drop, `apiError`, `signInRequired`.
 * An iPhone RN Modal defaults to portrait-only, which leaves no orientation in
 * common with the landscape-locked app, and iOS throws. Dev builds only log it,
 * so this pins the fix where release-only crashes can't hide.
 */
import { Modal } from 'react-native';

import { render } from '@testing-library/react-native';

import type { ModalType } from '@/store/createModalSlice';
import { useAppStore } from '@/store/useAppStore';

import ModalWrapper from '../ModalWrapper';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
}));

const MODAL_TYPES: ModalType[] = [
  'apiError',
  'noInternet',
  'notify',
  'confirmation',
  'signInRequired',
  'forceUpdate',
];

afterEach(() => useAppStore.getState().updateModalSlice({ currentModal: null }));

describe('ModalWrapper — orientation', () => {
  it.each(MODAL_TYPES)('%s supports landscape', (type) => {
    useAppStore.getState().updateModalSlice({ currentModal: type, modalData: {} });
    const { UNSAFE_getByType } = render(<ModalWrapper />);
    expect(UNSAFE_getByType(Modal).props.supportedOrientations).toEqual(
      expect.arrayContaining(['portrait', 'landscape']),
    );
  });
});

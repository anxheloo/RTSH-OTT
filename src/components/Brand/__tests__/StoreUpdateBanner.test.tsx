import React from 'react';

import { fireEvent, render, renderHook } from '@testing-library/react-native';

import { useBrandHeaderHeight } from '@/hooks/useBrandHeaderHeight';
import { openStoreListing } from '@/utils/device';

import StoreUpdateBanner from '../StoreUpdateBanner';

jest.mock('@/constants/appUpdate', () => ({ STORE_UPDATE_MODE: 'notice' }));
jest.mock('@/utils/device', () => ({ openStoreListing: jest.fn(() => Promise.resolve()) }));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

describe('StoreUpdateBanner (notice mode)', () => {
  it('opens the store listing when tapped', () => {
    const { getByTestId } = render(<StoreUpdateBanner />);
    fireEvent.press(getByTestId('store-update-banner'));
    expect(openStoreListing).toHaveBeenCalledTimes(1);
  });

  it('has no close control — it stays until the app is updated', () => {
    const { queryByLabelText, queryByText } = render(<StoreUpdateBanner />);
    expect(queryByLabelText('common.close')).toBeNull();
    expect(queryByText('update.cta')).toBeTruthy();
  });

  it('adds its height to the header height, so content clears it', () => {
    const { result } = renderHook(() => useBrandHeaderHeight());
    // 56 base + 0 inset (jest mock) + 44 banner + 10 gap
    expect(result.current).toBe(110);
  });
});

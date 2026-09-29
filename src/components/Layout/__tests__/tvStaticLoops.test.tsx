/**
 * On Android TV the app's two endless Reanimated loops (Skeleton's pulse, the
 * radio Equalizer) must not run. react-native-tvos does a binder IPC
 * (`AccessibilityManager.getEnabledAccessibilityServiceList`) on EVERY View
 * props update, so each animated view costs one system call per frame — on a
 * low-end TV box during Home's loading grid that blocked the main thread into
 * an ANR (REACT-NATIVE-RTSH-OTT-1K). Phones keep the animations.
 */
import { withRepeat } from 'react-native-reanimated';

import { render } from '@testing-library/react-native';

import Skeleton from '@/components/Layout/Skeleton';
import Equalizer from '@/components/radio/Equalizer';

jest.mock('@/tv', () => ({ isTV: true }));

jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual('react-native-reanimated');
  return {
    __esModule: true,
    ...actual,
    default: actual.default,
    withRepeat: jest.fn(actual.withRepeat),
  };
});

describe('endless animations on TV', () => {
  beforeEach(() => jest.mocked(withRepeat).mockClear());

  it('Skeleton does not start its pulse loop', () => {
    render(<Skeleton width={100} height={20} />);
    expect(withRepeat).not.toHaveBeenCalled();
  });

  it('Equalizer does not start its bar loops, even while active', () => {
    render(<Equalizer active />);
    expect(withRepeat).not.toHaveBeenCalled();
  });
});

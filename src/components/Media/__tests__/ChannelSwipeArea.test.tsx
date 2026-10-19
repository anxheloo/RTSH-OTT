/**
 * Channel switching contract: a swipe commits only past the distance/velocity
 * threshold and reports the neighbour from the list order (wrapping at the
 * ends); it never fires while disabled; and on TV a burst of CH± presses commits
 * ONCE, to where the presses ended, after the remote goes idle.
 */
import { Text } from 'react-native';
import { State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';

import { act, fireEvent, render, screen, within } from '@testing-library/react-native';

import ChannelSwipeArea from '../ChannelSwipeArea';

import 'react-native-gesture-handler/jestSetup';

let mockIsTV = false;
jest.mock('@/tv/constants', () => ({
  get isTV() {
    return mockIsTV;
  },
}));

type RemoteEvent = { eventType: string; eventKeyAction?: number };
let mockRemote: ((e: RemoteEvent) => void) | null = null;
jest.mock('react-native/Libraries/Components/TV/useTVEventHandler', () => ({
  __esModule: true,
  default: (handler: (e: RemoteEvent) => void) => {
    mockRemote = handler;
  },
}));

const ITEMS = [
  { id: '1', name: 'RTSH 1' },
  { id: '2', name: 'RTSH 2' },
  { id: '3', name: 'RTSH 3' },
];
const WIDTH = 400;

function renderArea(activeId: string, props: { enabled?: boolean } = {}) {
  const onChange = jest.fn();
  render(
    <ChannelSwipeArea
      items={ITEMS}
      activeId={activeId}
      onChange={onChange}
      cardColor="#000"
      textColor="#fff"
      testID="area"
      {...props}
    >
      <Text>player</Text>
    </ChannelSwipeArea>,
  );
  fireEvent(screen.getByTestId('area'), 'layout', {
    nativeEvent: { layout: { width: WIDTH, height: 225, x: 0, y: 0 } },
  });
  return onChange;
}

function swipe(translationX: number, velocityX = 0) {
  fireGestureHandler(getByGestureTestId('area-pan'), [
    { state: State.BEGAN, translationX: 0 },
    { state: State.ACTIVE, translationX: translationX / 2, velocityX },
    { state: State.END, translationX, velocityX },
  ]);
  act(() => {
    jest.advanceTimersByTime(1000);
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  mockIsTV = false;
  mockRemote = null;
});

afterEach(() => {
  jest.useRealTimers();
});

describe('ChannelSwipeArea — touch', () => {
  it('swipe left past the threshold switches to the next channel', () => {
    const onChange = renderArea('2');
    swipe(-200);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('3');
  });

  it('swipe right switches to the previous channel', () => {
    const onChange = renderArea('2');
    swipe(200);
    expect(onChange).toHaveBeenCalledWith('1');
  });

  it('wraps from the last channel to the first', () => {
    const onChange = renderArea('3');
    swipe(-200);
    expect(onChange).toHaveBeenCalledWith('1');
  });

  it('a short, slow drag springs back without switching', () => {
    const onChange = renderArea('2');
    swipe(-60, -100);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('a short but fast flick still switches', () => {
    const onChange = renderArea('2');
    swipe(-60, -1500);
    expect(onChange).toHaveBeenCalledWith('3');
  });

  it('never switches while disabled', () => {
    const onChange = renderArea('2', { enabled: false });
    swipe(-200);
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('ChannelSwipeArea — TV remote', () => {
  const press = (eventType: string) => {
    act(() => {
      mockRemote?.({ eventType, eventKeyAction: 0 }); // key down — ignored
      mockRemote?.({ eventType, eventKeyAction: 1 }); // key up — counts
    });
  };

  it('a burst of CH+ commits once, to where the presses ended', () => {
    mockIsTV = true;
    const onChange = renderArea('1');

    press('channelUp');
    press('channelUp');
    // The target's card shows immediately, before anything commits.
    expect(within(screen.getByTestId('zap-landing-card')).getByText('RTSH 3')).toBeTruthy();
    expect(onChange).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('3');
  });

  it('CH- steps back, wrapping to the last channel', () => {
    mockIsTV = true;
    const onChange = renderArea('1');
    press('channelDown');
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(onChange).toHaveBeenCalledWith('3');
  });

  it('ignores the remote while disabled', () => {
    mockIsTV = true;
    const onChange = renderArea('1', { enabled: false });
    press('channelUp');
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(onChange).not.toHaveBeenCalled();
  });
});

import { act, renderHook } from '@testing-library/react-native';

import { useAppStore } from '@/store/useAppStore';

import { useStoreUpdateBlock } from '../useStoreUpdateBlock';

jest.mock('@/constants/appUpdate', () => ({ STORE_UPDATE_MODE: 'block' }));

describe('useStoreUpdateBlock (block mode)', () => {
  beforeEach(() => useAppStore.setState({ currentModal: null }));

  it('raises the blocking forceUpdate modal', () => {
    renderHook(() => useStoreUpdateBlock());
    expect(useAppStore.getState().currentModal).toBe('forceUpdate');
  });

  it('re-raises it after another modal takes the slot and closes', () => {
    renderHook(() => useStoreUpdateBlock());
    act(() => useAppStore.setState({ currentModal: 'noInternet' }));
    expect(useAppStore.getState().currentModal).toBe('noInternet');
    act(() => useAppStore.setState({ currentModal: null }));
    expect(useAppStore.getState().currentModal).toBe('forceUpdate');
  });
});

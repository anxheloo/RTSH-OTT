import { useAppStore } from '@/store/useAppStore';

/**
 * Raise the "you need an account for this" prompt.
 *
 * Imperative and copy-free on purpose: `ModalWrapper` owns the title, message,
 * CTA label and the navigation to the auth stack for the `signInRequired` type
 * (the same way it owns `forceUpdate`'s store-listing action). Call sites just
 * say "this needs an account" and cannot drift from each other.
 */
export function promptSignIn(): void {
  useAppStore.getState().updateModalSlice({
    currentModal: 'signInRequired',
    modalData: {},
  });
}

/** Close it — for the cleanup of any effect that raised it (a route-owned modal must not outlive its route). */
export function dismissSignInPrompt(): void {
  const { currentModal, updateModalSlice } = useAppStore.getState();
  if (currentModal === 'signInRequired') updateModalSlice({ currentModal: null });
}

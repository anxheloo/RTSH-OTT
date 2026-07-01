/**
 * ToastSlice — transient, non-blocking confirmation pill (design `.toast`).
 * Distinct from `ModalSlice`: a toast has no buttons and auto-dismisses; it's
 * "action confirmed" feedback (e.g. "Cilësia: 1080p"). `ToastHost` renders the
 * active toast and owns the auto-dismiss timer. Re-showing bumps `id` so the
 * host restarts its timer even for an identical message.
 */
import { StateCreator } from 'zustand';

import type { AppStore } from './useAppStore';

export interface ToastState {
  id: number;
  message: string;
}

export interface ToastSlice {
  toast: ToastState | null;
  showToast: (message: string) => void;
  hideToast: () => void;
}

export const createToastSlice: StateCreator<AppStore, [], [], ToastSlice> = (set) => ({
  toast: null,
  showToast: (message) => set({ toast: { id: Date.now(), message } }),
  hideToast: () => set({ toast: null }),
});

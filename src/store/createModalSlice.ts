import { StateCreator } from 'zustand';

import type { AppStore } from './useAppStore';

export type ModalType = 'apiError' | 'noInternet' | 'notify' | 'confirmation';

export interface ModalPayload {
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export interface ModalEntry {
  id: string;
  type: ModalType;
  payload?: ModalPayload;
}

export interface ModalSlice {
  modals: ModalEntry[];
  openModal: (type: ModalType, payload?: ModalPayload) => string;
  closeModal: (id?: string) => void;
  closeAllModals: () => void;
}

export const createModalSlice: StateCreator<AppStore, [], [], ModalSlice> = (set) => ({
  modals: [],

  openModal: (type, payload) => {
    const id = `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    set((s) => ({ modals: [...s.modals, { id, type, payload }] }));
    return id;
  },

  closeModal: (id) =>
    set((s) => ({
      modals: id ? s.modals.filter((m) => m.id !== id) : s.modals.slice(0, -1),
    })),

  closeAllModals: () => set({ modals: [] }),
});

import { StateCreator } from 'zustand';

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

export const createModalSlice: StateCreator<ModalSlice> = (set, get) => ({
  modals: [],

  openModal: (type, payload) => {
    const id = `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    set((s) => ({ modals: [...s.modals, { id, type, payload }] }));
    return id;
  },

  closeModal: (id) => {
    const { modals } = get();
    if (!modals.length) return;
    if (id) {
      set({ modals: modals.filter((m) => m.id !== id) });
    } else {
      set({ modals: modals.slice(0, -1) });
    }
  },

  closeAllModals: () => set({ modals: [] }),
});

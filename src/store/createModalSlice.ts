import { StateCreator } from 'zustand';

import type { AppStore } from './useAppStore';

export type ModalType = 'apiError' | 'noInternet' | 'notify' | 'confirmation';

/**
 * Modal copy + actions. Up to three buttons (SOLITAR shape). `button` defaults
 * to "OK" in `ModalWrapper` when a modal is shown without one. Alert-style
 * modals leave `title`/`description` empty to fall back to the i18n defaults in
 * `ModalWrapper` (so triggers like the network listener pass no text).
 */
export interface ModalData {
  title?: string;
  description?: string;
  button?: string;
  button2?: string;
  button3?: string;
  action?: () => void | Promise<void>;
  action2?: () => void | Promise<void>;
  action3?: () => void | Promise<void>;
}

/**
 * Single-modal slice (one modal at a time), matching RTSH + SOLITAR and the
 * STYLE_GUIDE. Invoke from anywhere via
 * `useAppStore.getState().updateModalSlice({ currentModal, modalData })`; close
 * with `{ currentModal: null }`. `ModalWrapper` renders the active modal.
 */
export interface ModalSlice {
  currentModal: ModalType | null;
  modalData: ModalData;
  updateModalSlice: (data: Partial<ModalSlice>) => void;
}

export const createModalSlice: StateCreator<AppStore, [], [], ModalSlice> = (set) => ({
  currentModal: null,
  modalData: {},
  updateModalSlice: (data) => set(data as Partial<AppStore>),
});

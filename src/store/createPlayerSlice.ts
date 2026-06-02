/**
 * PlayerSlice — radio mini-player state persisted across tab navigation.
 * Video player state is local to each player component; only radio needs
 * cross-screen persistence (mini-player docked above tab bar).
 */
import { StateCreator } from 'zustand';

export interface PlayerSlice {
  // Radio state (cross-screen, persisted)
  radioChannelId: string | null;
  radioIsPlaying: boolean;
  radioStreamUrl: string | null;
  radioTitle: string | null;
  radioArtworkUrl: string | null;

  // Actions
  setRadioChannel: (params: {
    channelId: string;
    streamUrl: string;
    title: string;
    artworkUrl?: string;
  }) => void;
  setRadioPlaying: (isPlaying: boolean) => void;
  clearRadio: () => void;
}

export const createPlayerSlice: StateCreator<PlayerSlice, [], [], PlayerSlice> = (set) => ({
  radioChannelId: null,
  radioIsPlaying: false,
  radioStreamUrl: null,
  radioTitle: null,
  radioArtworkUrl: null,

  setRadioChannel: ({ channelId, streamUrl, title, artworkUrl }) =>
    set({
      radioChannelId: channelId,
      radioStreamUrl: streamUrl,
      radioTitle: title,
      radioArtworkUrl: artworkUrl ?? null,
      radioIsPlaying: true,
    }),

  setRadioPlaying: (isPlaying) => set({ radioIsPlaying: isPlaying }),

  clearRadio: () =>
    set({
      radioChannelId: null,
      radioIsPlaying: false,
      radioStreamUrl: null,
      radioTitle: null,
      radioArtworkUrl: null,
    }),
});

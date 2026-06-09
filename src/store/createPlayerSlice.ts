/**
 * PlayerSlice — radio mini-player state persisted across tab navigation, plus
 * the selected video quality. Most video player state is local to each player
 * component; `videoQuality` lives here because the quality picker is a separate
 * modal route from the player, so the two share it through the store. Radio
 * needs cross-screen persistence (mini-player docked above the tab bar).
 */
import { StateCreator } from 'zustand';

import type { QualityId } from '@/types/domain';
import { DEFAULT_QUALITY } from '@/constants/player';

export interface PlayerSlice {
  // Radio state (cross-screen, persisted)
  radioChannelId: string | null;
  radioIsPlaying: boolean;
  radioStreamUrl: string | null;
  radioTitle: string | null;
  radioArtworkUrl: string | null;

  // Video quality (selected in the quality sheet, read by the player)
  videoQuality: QualityId;

  // Actions
  setRadioChannel: (params: {
    channelId: string;
    streamUrl: string;
    title: string;
    artworkUrl?: string;
  }) => void;
  setRadioPlaying: (isPlaying: boolean) => void;
  clearRadio: () => void;
  setVideoQuality: (quality: QualityId) => void;
}

export const createPlayerSlice: StateCreator<PlayerSlice, [], [], PlayerSlice> = (set) => ({
  radioChannelId: null,
  radioIsPlaying: false,
  radioStreamUrl: null,
  radioTitle: null,
  radioArtworkUrl: null,
  videoQuality: DEFAULT_QUALITY,

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

  setVideoQuality: (quality) => set({ videoQuality: quality }),
});

/**
 * RadioAudioHost — the single radio audio engine for the whole app.
 *
 * Mounted once at the authenticated layout (above the router), it owns the only
 * `expo-audio` player and is driven entirely by `PlayerSlice`: the radio routes
 * and the mini-player never touch audio directly — they mutate the store, and
 * this host obeys (swap source on `radioStreamUrl`, play/pause on
 * `radioIsPlaying`). Living above the router is what lets playback survive tab
 * navigation and screen unmounts, which is the whole point of the docked
 * mini-player. Renders nothing.
 *
 * Background-while-locked still needs the iOS `audio` background mode + Android
 * foreground-service entitlements — tracked separately in 5.X.13.
 */
import { useEffect } from 'react';

import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';

import { useAppStore } from '@/store/useAppStore';

const RadioAudioHost: React.FC = () => {
  const radioStreamUrl = useAppStore((s) => s.radioStreamUrl);
  const radioIsPlaying = useAppStore((s) => s.radioIsPlaying);
  const player = useAudioPlayer(null);

  // Background-capable audio session, set once.
  useEffect(() => {
    void setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'doNotMix' });
  }, []);

  // Swap the live stream whenever the selected station changes.
  useEffect(() => {
    if (radioStreamUrl) {
      player.replace({ uri: radioStreamUrl });
    }
  }, [radioStreamUrl, player]);

  // Mirror the store's play/pause intent onto the engine.
  useEffect(() => {
    if (!radioStreamUrl) {
      player.pause();
      return;
    }
    if (radioIsPlaying) {
      player.play();
    } else {
      player.pause();
    }
  }, [radioIsPlaying, radioStreamUrl, player]);

  return null;
};

export default RadioAudioHost;

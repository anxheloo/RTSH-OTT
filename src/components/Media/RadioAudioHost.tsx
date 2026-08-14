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
 * Background-while-locked relies on the iOS `audio` background mode + Android
 * foreground-service entitlements emitted by the `expo-audio` config plugin
 * (`enableBackgroundPlayback: true`) — a native rebuild is required for them to
 * take effect.
 */
import { useEffect } from 'react';

import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';

import { useAppStore } from '@/store/useAppStore';
import { getStreamHeaders, resolveExternalPlaybackChange } from '@/utils';
import { publish, STOMP_DEST } from '@/realtime';

const RadioAudioHost: React.FC = () => {
  const radioChannelId = useAppStore((s) => s.radioChannelId);
  const radioStreamUrl = useAppStore((s) => s.radioStreamUrl);
  const radioIsPlaying = useAppStore((s) => s.radioIsPlaying);
  const radioTitle = useAppStore((s) => s.radioTitle);
  const radioArtworkUrl = useAppStore((s) => s.radioArtworkUrl);
  const realtimeConnected = useAppStore((s) => s.realtimeConnected);
  const player = useAudioPlayer(null);

  // Station id as the numeric channel id the watch contract expects (radio and
  // TV share the /channels id namespace). Keyed on the engine's lifetime here —
  // not a screen — so tracking survives navigation, unlike channel/[id].
  const stationId = radioChannelId != null ? Number(radioChannelId) : null;

  // Watch segment (socket analytics) — mirrors channel/[id] via useChannelRealtime.
  // Radio is always live with no programme. Open on select + every station switch
  // (backend closes the previous segment); re-fire on reconnect (publish is a
  // no-op until connected, and RN drops the socket on background).
  useEffect(() => {
    if (stationId == null) return;
    publish(STOMP_DEST.watch, { channelId: stationId, programId: null, kind: 'LIVE' });
  }, [stationId, realtimeConnected]);

  // Watch end — on station change / clear (mini-player close). Disconnect/kill
  // closes it server-side.
  useEffect(() => {
    if (stationId == null) return;
    return () => {
      publish(STOMP_DEST.watchEnd, { channelId: stationId });
    };
  }, [stationId]);

  // Background-capable audio session, set once. `shouldPlayInBackground` keeps
  // the session alive when the screen locks; `doNotMix` is required for the OS
  // to associate the lock-screen controls with this player.
  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'doNotMix',
      shouldPlayInBackground: true,
    });
  }, []);

  // Swap the live stream whenever the selected station changes.
  useEffect(() => {
    if (radioStreamUrl) {
      player.replace({ uri: radioStreamUrl, headers: getStreamHeaders() });
    }
  }, [radioStreamUrl, player]);

  // Lock-screen now-playing controls (also required on Android for sustained
  // >3min background playback). Cleared when the station is torn down.
  //
  // `isLiveStream: true` is load-bearing, not cosmetic: expo-audio gates the
  // scrub bar on it (`changePlaybackPositionCommand.isEnabled = !isLiveStream`
  // in MediaController.swift), so without it the lock screen offers a duration
  // and a seek control for a stream that has neither. Radio is always live.
  //
  // Next/previous station are NOT available here and cannot be added from JS:
  // expo-audio wires only play/pause/togglePlayPause/changePlaybackPosition/
  // skipForward/skipBackward, and never touches `nextTrackCommand` /
  // `previousTrackCommand` — so iOS draws those two buttons permanently
  // greyed out. See `rules/ARCHITECTURE.md → Radio audio → Known gaps`.
  useEffect(() => {
    if (!radioStreamUrl) {
      player.clearLockScreenControls();
      return;
    }
    player.setActiveForLockScreen(
      true,
      {
        title: radioTitle ?? undefined,
        artworkUrl: radioArtworkUrl ?? undefined,
      },
      { isLiveStream: true },
    );
  }, [radioStreamUrl, radioTitle, radioArtworkUrl, player]);

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

  // ...and mirror the engine back onto the store, closing the loop. The
  // lock-screen / notification transport moves the player NATIVELY inside
  // expo-audio, so this is the only way JS learns the user paused from outside
  // the app — without it the intent goes stale, the UI shows a pause icon over
  // silence, and the sync effect above never re-runs (the intent didn't
  // change), so resuming takes two taps. Same in reverse for lock-screen play.
  //
  // Intent is read via `getState()` rather than closed over, so the listener is
  // subscribed once per player instead of re-attached on every play/pause. No
  // feedback loop: the write re-runs the sync effect, which then commands an
  // engine that already agrees. `resolveExternalPlaybackChange` abstains on
  // buffering/loading frames — see its JSDoc for why that guard is required.
  useEffect(() => {
    const sub = player.addListener('playbackStatusUpdate', (status) => {
      const { radioIsPlaying: intent, setRadioPlaying } = useAppStore.getState();
      const next = resolveExternalPlaybackChange(status, intent);
      if (next !== null) setRadioPlaying(next);
    });
    return () => sub.remove();
  }, [player]);

  return null;
};

export default RadioAudioHost;

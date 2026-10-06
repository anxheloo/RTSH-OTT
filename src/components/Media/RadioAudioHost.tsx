/**
 * RadioAudioHost — the single radio audio engine for the whole app.
 *
 * Mounted once at the authenticated layout (above the router), it owns the only
 * `expo-audio` player and is driven entirely by `PlayerSlice`: the radio routes
 * and the mini-player never touch audio directly — they mutate the store, and
 * this host obeys (swap source on `radioStreamUrl`, play/pause on
 * `radioIsPlaying`). Living above the router is what lets playback survive tab
 * navigation and screen unmounts, which is the whole point of the docked
 * mini-player. Renders no UI of its own — it wraps the router only to share
 * the player through context (`useRadioAudioPlayer`), so a screen can READ
 * position/duration and seek a catch-up recording without owning the engine.
 * Everything else still goes through the store.
 *
 * Background-while-locked relies on the iOS `audio` background mode + Android
 * foreground-service entitlements emitted by the `expo-audio` config plugin
 * (`enableBackgroundPlayback: true`) — a native rebuild is required for them to
 * take effect.
 *
 * The engine itself is created only when a station is first selected, then
 * kept for the session. Constructing an expo-audio player builds an ExoPlayer
 * AND a media3 `MediaSession` on the Android main thread, and doing that at
 * mount caught low-end TV boxes in the cold-start window — an ANR for users who
 * never opened radio (REACT-NATIVE-RTSH-OTT-2V).
 */
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

import { type AudioPlayer, setAudioModeAsync, useAudioPlayer } from 'expo-audio';

import { useAppStore } from '@/store/useAppStore';
import { getStreamHeaders, isAtPlaybackEnd, resolveExternalPlaybackChange } from '@/utils';
import { reportHandledError } from '@/lib/monitoring';
import { publish, STOMP_DEST } from '@/realtime';

const RadioPlayerContext = createContext<AudioPlayer | null>(null);

/**
 * The single radio engine — for reading status and seeking, never for
 * source/play state. `null` until a station has been selected (and for the
 * one commit in which the engine is being created).
 */
export function useRadioAudioPlayer(): AudioPlayer | null {
  return useContext(RadioPlayerContext);
}

/**
 * Runs one engine command. expo-audio throws synchronously when the native
 * session is in a bad state ("Session lookup failed"), and a throw inside an
 * effect unmounts the whole app into the root error screen
 * (REACT-NATIVE-RTSH-OTT-26) — losing radio is far better than losing the app.
 */
function engine(command: () => unknown): void {
  try {
    const result = command();
    if (result instanceof Promise) result.catch(reportHandledError);
  } catch (error) {
    reportHandledError(error);
  }
}

const RadioAudioHost: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const radioStreamUrl = useAppStore((s) => s.radioStreamUrl);
  const [player, setPlayer] = useState<AudioPlayer | null>(null);
  // Latches on the first station select (adjust-during-render, no extra commit),
  // so the engine mounts in the same commit as the selection and is never
  // rebuilt afterwards — closing a station pauses it, it does not destroy it.
  const [engaged, setEngaged] = useState(false);
  if (radioStreamUrl && !engaged) setEngaged(true);

  // The engine is a sibling, not a wrapper: mounting it must never remount the
  // router underneath.
  return (
    <RadioPlayerContext.Provider value={player}>
      {engaged ? <RadioEngine onPlayer={setPlayer} /> : null}
      {children}
    </RadioPlayerContext.Provider>
  );
};

/**
 * Owns the expo-audio player and every command sent to it. Mounted only once a
 * station has been selected (see `RadioAudioHost`), so nothing here runs — and
 * no native player exists — for a session that never plays radio
 * (REACT-NATIVE-RTSH-OTT-24 / -2V).
 */
const RadioEngine: React.FC<{ onPlayer: (player: AudioPlayer | null) => void }> = ({
  onPlayer,
}) => {
  const radioChannelId = useAppStore((s) => s.radioChannelId);
  const radioStreamUrl = useAppStore((s) => s.radioStreamUrl);
  const radioIsPlaying = useAppStore((s) => s.radioIsPlaying);
  const radioTitle = useAppStore((s) => s.radioTitle);
  const radioArtworkUrl = useAppStore((s) => s.radioArtworkUrl);
  const radioProgramId = useAppStore((s) => s.radioProgramId);
  const realtimeConnected = useAppStore((s) => s.realtimeConnected);
  const player = useAudioPlayer(null);
  // True from a source swap until the new source first plays — iOS pauses the
  // old item mid-swap, and that frame must not read as a user pause.
  const awaitingStart = useRef(false);

  // Station id as the numeric channel id the watch contract expects (radio and
  // TV share the /channels id namespace). Keyed on the engine's lifetime here —
  // not a screen — so tracking survives navigation, unlike channel/[id].
  const stationId = radioChannelId != null ? Number(radioChannelId) : null;

  // Watch segment (socket analytics) — mirrors channel/[id] via useChannelRealtime.
  // Live carries no programme; a catch-up recording carries its programme id. Open
  // on select + every station/programme switch (backend closes the previous
  // segment); re-fire on reconnect (publish is a no-op until connected, and RN
  // drops the socket on background).
  useEffect(() => {
    if (stationId == null) return;
    publish(STOMP_DEST.watch, {
      channelId: stationId,
      programId: radioProgramId != null ? Number(radioProgramId) : null,
      kind: radioProgramId != null ? 'RECORDED' : 'LIVE',
    });
  }, [stationId, radioProgramId, realtimeConnected]);

  // Watch end — on station change / clear (mini-player close). Disconnect/kill
  // closes it server-side.
  useEffect(() => {
    if (stationId == null) return;
    return () => {
      publish(STOMP_DEST.watchEnd, { channelId: stationId });
    };
  }, [stationId]);

  // Share the engine with the screens that read it (`useRadioAudioPlayer`).
  useEffect(() => {
    onPlayer(player);
    return () => onPlayer(null);
  }, [player, onPlayer]);

  // The background-capable audio session, set once — this engine only exists
  // after a station was selected. Declared before the source swap below so it
  // runs first. `shouldPlayInBackground` keeps the session alive when the screen
  // locks; `doNotMix` is required for the OS to associate the lock-screen controls.
  useEffect(() => {
    engine(() =>
      setAudioModeAsync({
        playsInSilentMode: true,
        interruptionMode: 'doNotMix',
        shouldPlayInBackground: true,
      }),
    );
  }, []);

  // Swap the live stream whenever the selected station changes.
  useEffect(() => {
    if (!radioStreamUrl) return;
    awaitingStart.current = true;
    engine(() => player.replace({ uri: radioStreamUrl, headers: getStreamHeaders() }));
  }, [radioStreamUrl, player]);

  // Lock-screen now-playing controls (also required on Android for sustained
  // >3min background playback). Cleared when the station is torn down.
  //
  // `isLiveStream` is load-bearing, not cosmetic: expo-audio gates the scrub bar
  // on it (`changePlaybackPositionCommand.isEnabled = !isLiveStream` in
  // MediaController.swift). Live radio must pass `true`, or the lock screen offers
  // a duration and a seek control for a stream that has neither; a catch-up
  // recording passes `false`, which is what gives it a working lock-screen scrubber.
  //
  // Next/previous station are NOT available here and cannot be added from JS:
  // expo-audio wires only play/pause/togglePlayPause/changePlaybackPosition/
  // skipForward/skipBackward, and never touches `nextTrackCommand` /
  // `previousTrackCommand` — so iOS draws those two buttons permanently
  // greyed out. See `rules/ARCHITECTURE.md → Radio audio → Known gaps`.
  useEffect(() => {
    if (!radioStreamUrl) {
      engine(() => player.clearLockScreenControls());
      return;
    }
    engine(() =>
      player.setActiveForLockScreen(
        true,
        {
          title: radioTitle ?? undefined,
          artworkUrl: radioArtworkUrl ?? undefined,
        },
        { isLiveStream: radioProgramId == null },
      ),
    );
  }, [radioStreamUrl, radioTitle, radioArtworkUrl, radioProgramId, player]);

  // Mirror the store's play/pause intent onto the engine.
  useEffect(() => {
    if (!radioStreamUrl) {
      engine(() => player.pause());
      return;
    }
    if (!radioIsPlaying) {
      engine(() => player.pause());
    } else if (radioProgramId != null && isAtPlaybackEnd(player.currentTime, player.duration)) {
      // A finished recording is parked at its end, where `play()` does nothing
      // (the UI showed "playing" over silence) — play restarts it from the top.
      engine(() => player.seekTo(0).then(() => player.play()));
    } else {
      engine(() => player.play());
    }
  }, [radioIsPlaying, radioStreamUrl, radioProgramId, player]);

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
      const next = resolveExternalPlaybackChange(status, intent, awaitingStart.current);
      if (status.playing) awaitingStart.current = false;
      if (next !== null) setRadioPlaying(next);
    });
    return () => sub.remove();
  }, [player]);

  return null;
};

export default RadioAudioHost;

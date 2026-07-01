/**
 * VideoPlayer — base expo-video wrapper.
 * Manages player lifecycle and event wiring. Exposes `renderOverlay` — a
 * render prop that receives the live player instance so PlayerControls can
 * call play/pause/seekBy directly.
 * nativeControls is always off; we build our own via PlayerControls.
 *
 * TODO(anx 2026-06-02): VideoSource.headers may not forward to AES-128
 * key requests on iOS/Android. Validate on a real RTSH stream before
 * shipping. Fallback: react-native-video if headers don't propagate.
 */
import React, { useEffect, useRef, useState } from 'react';
import { AppState, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { useEvent, useEventListener } from 'expo';
import { useKeepAwake } from 'expo-keep-awake';
import { useVideoPlayer, VideoPlayer as ExpoVideoPlayer, VideoSource, VideoView } from 'expo-video';

import { PLAYER_COLORS } from '@/theme/playerColors';
import { inferContentType } from '@/utils/resolveStreamSource';

export type VideoStatus = 'idle' | 'loading' | 'readyToPlay' | 'error';

export type VideoPlayerOverlayProps = {
  player: ExpoVideoPlayer;
  status: VideoStatus;
  currentTime: number;
  duration: number;
};

export type VideoPlayerProps = {
  source: string | null;
  headers?: Record<string, string>;
  autoPlay?: boolean;
  /**
   * Declaratively pause/resume playback without remounting (e.g. while a
   * mid-roll ad overlay is up). On resume of a **live** stream we best-effort
   * re-sync to the live edge so the pause doesn't leave the viewer behind live.
   * This prop is the ONLY thing that drives play/pause from React state — the
   * manual play/pause control calls the player directly, so it never collides.
   */
  paused?: boolean;
  onStatusChange?: (status: VideoStatus) => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onPlayEnd?: () => void;
  allowsPictureInPicture?: boolean;
  startsPictureInPictureAutomatically?: boolean;
  /**
   * Keep audio playing while backgrounded AND show lock-screen / control-center
   * now-playing controls. Opt-in (default off) so ads never keep playing
   * invisibly or hijack the lock screen — only LivePlayer enables it.
   */
  backgroundPlayback?: boolean;
  /** Lock-screen / now-playing metadata (title, artist, artwork uri). */
  metadata?: { title?: string; artist?: string; artwork?: string };
  style?: StyleProp<ViewStyle>;
  /** Render prop — receives live player instance for custom controls overlay. */
  renderOverlay?: (props: VideoPlayerOverlayProps) => React.ReactNode;
};

function VideoPlayer({
  source,
  headers,
  autoPlay = false,
  paused = false,
  onStatusChange,
  onTimeUpdate,
  onPlayEnd,
  allowsPictureInPicture = false,
  startsPictureInPictureAutomatically = false,
  backgroundPlayback = false,
  metadata,
  style,
  renderOverlay,
}: VideoPlayerProps): React.ReactElement {
  // Keep the screen awake while a video player is mounted (deactivates on unmount).
  useKeepAwake();

  // `contentType` is inferred from the URL extension (extensionless → HLS) so the
  // native player parses streaming manifests correctly instead of falling back to
  // progressive container sniffing. See inferContentType.
  //
  // Build the player's source ONCE, from a ref frozen at first render. expo-video's
  // `useVideoPlayer` recreates the native player whenever the *stringified* source
  // changes (`useReleasingSharedObject` keys on `JSON.stringify(source)`) — and that
  // string includes `metadata`. So a now-playing label change (e.g. the programme
  // title flipping when the user browses another day mid-playback) would tear down
  // the decoder and restart playback from 0. Freezing the creation source keeps the
  // player instance stable; every later change (quality-switch URI, metadata) is
  // driven EXCLUSIVELY through `replaceAsync` below — an in-place swap that keeps the
  // decoder warm and preserves fullscreen/PiP. (This is also why a quality switch no
  // longer double-loads: previously the source object changed each render, so the
  // player was both recreated here AND replaced in the effect.)
  // Lazy `useState` initializer — computed once on mount, never recomputed, and
  // (unlike a ref) safe to read during render. This is the stable source handed to
  // `useVideoPlayer`.
  const [initialSource] = useState<VideoSource>(() =>
    source
      ? { uri: source, headers: headers ?? {}, contentType: inferContentType(source), metadata }
      : null,
  );

  const player = useVideoPlayer(initialSource, (p) => {
    // expo-video emits `timeUpdate` ONLY when this interval is > 0 (defaults to
    // 0 = never). Without it `currentTime`/`duration` stay 0 forever, so the
    // recorded seek bar never becomes seekable and the progress fill never moves.
    p.timeUpdateEventInterval = 0.5;
    // Background audio + lock-screen now-playing controls (opt-in via prop).
    p.staysActiveInBackground = backgroundPlayback;
    p.showNowPlayingNotification = backgroundPlayback;
    if (autoPlay && !paused) {
      p.play();
    }
  });

  // Sole source driver. The player is created once (frozen ref above), so every
  // source change — a quality switch (new URL) and any metadata that rides along
  // with it — is applied here via `replaceAsync`: an in-place swap so fullscreen/PiP
  // survive, loaded off the main thread (avoids UI freezes vs sync `replace`). The
  // last-URI ref makes the URI the ONLY trigger for a reload: a metadata-only change
  // (a now-playing label) early-returns, so the stream never restarts just to
  // relabel — the new metadata is picked up on the next genuine URI change (expo-video
  // 56 exposes no metadata-only setter; reloading a live decoder for a label is wrong).
  // PIP stop fires for BOTH the restore button (returns to app → AppState
  // becomes `active`) and the X/close button (app stays backgrounded). They
  // share one native event, so we disambiguate by AppState: a stop while still
  // backgrounded means the user dismissed PIP via X → pause so audio + the CDN
  // pull don't keep running invisibly. Restore (active) keeps playing.
  const handlePictureInPictureStop = () => {
    if (AppState.currentState !== 'active') player.pause();
  };

  const lastUriRef = useRef(source);
  useEffect(() => {
    if (source === lastUriRef.current) return;
    lastUriRef.current = source;
    void player
      .replaceAsync(
        source
          ? { uri: source, headers: headers ?? {}, contentType: inferContentType(source), metadata }
          : null,
      )
      .then(() => {
        if (autoPlay && source && !paused) player.play();
      });
  }, [player, source, headers, autoPlay, paused, metadata]);

  // Reconcile the declarative `paused` prop onto the imperative player — the
  // Expo-idiomatic bridge (no remount; the source/decoder stay warm). Resuming
  // a LIVE stream re-syncs to the live edge first so a pause (mid-roll ad break)
  // doesn't strand the viewer behind live: `seekBy(offset)` jumps forward by
  // however far behind live we are. Best-effort only — `currentOffsetFromLive`
  // is null without HLS EXT-X-PROGRAM-DATE-TIME metadata, in which case we
  // simply resume in place (the seek is skipped). A property write
  // (`targetOffsetFromLive`) would trip react-hooks/immutability — the method
  // call doesn't, and works on both platforms.
  useEffect(() => {
    if (paused) {
      player.pause();
      return;
    }
    if (player.isLive) {
      const behind = player.currentOffsetFromLive;
      if (behind && behind > 0) player.seekBy(behind);
    }
    player.play();
  }, [player, paused]);

  // Reactive render state straight off the player's events (replaces the manual
  // addListener + useState + setState). `useEvent` subscribes internally and
  // re-renders with the latest payload. `duration` isn't an event field — it's a
  // player property, read fresh each render (every `timeUpdate` re-renders us).
  const { status } = useEvent(player, 'statusChange', { status: player.status });
  // `timeUpdate` has no convenient partial initializer (all payload fields are
  // required), so subscribe without one and fall back to the live property until
  // the first tick lands.
  const timeEvent = useEvent(player, 'timeUpdate');
  const currentTime = timeEvent?.currentTime ?? player.currentTime;
  const duration = player.duration ?? 0;

  // Side effects (parent callbacks + error logging) — `useEventListener` is
  // addListener-as-a-hook with automatic cleanup, so no manual sub/remove.
  useEventListener(player, 'statusChange', ({ status: s, error }) => {
    // Surface playback failures (e.g. CDN geo-block on our IP) in dev so we can
    // see the underlying error message/source while testing. Dev-only — the
    // failure still reaches callers via onStatusChange in every build.
    if (s === 'error' && __DEV__) {
      // eslint-disable-next-line no-console
      console.error('[VideoPlayer] playback error', { message: error?.message, source, error });
    }
    onStatusChange?.(s);
  });

  useEventListener(player, 'timeUpdate', ({ currentTime: ct }) => {
    onTimeUpdate?.(ct, player.duration ?? 0);
  });

  useEventListener(player, 'playToEnd', () => {
    onPlayEnd?.();
  });

  return (
    <View style={[styles.container, style]} testID="video-player-container">
      <VideoView
        player={player}
        style={styles.video}
        nativeControls={false}
        allowsPictureInPicture={allowsPictureInPicture}
        startsPictureInPictureAutomatically={startsPictureInPictureAutomatically}
        onPictureInPictureStop={handlePictureInPictureStop}
        testID="video-view"
      />
      {renderOverlay ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          {renderOverlay({ player, status, currentTime, duration })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PLAYER_COLORS.surface,
  },
  video: {
    flex: 1,
  },
});

export default VideoPlayer;

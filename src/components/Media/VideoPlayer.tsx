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
import React, { useEffect, useRef } from 'react';
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
  onStatusChange?: (status: VideoStatus) => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onPlayEnd?: () => void;
  allowsPictureInPicture?: boolean;
  startsPictureInPictureAutomatically?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Render prop — receives live player instance for custom controls overlay. */
  renderOverlay?: (props: VideoPlayerOverlayProps) => React.ReactNode;
};

function VideoPlayer({
  source,
  headers,
  autoPlay = false,
  onStatusChange,
  onTimeUpdate,
  onPlayEnd,
  allowsPictureInPicture = false,
  startsPictureInPictureAutomatically = false,
  style,
  renderOverlay,
}: VideoPlayerProps): React.ReactElement {
  // Keep the screen awake while a video player is mounted (deactivates on unmount).
  useKeepAwake();

  // `contentType` is inferred from the URL extension (extensionless → HLS) so the
  // native player parses streaming manifests correctly instead of falling back to
  // progressive container sniffing. See inferContentType.
  const videoSource: VideoSource = source
    ? { uri: source, headers: headers ?? {}, contentType: inferContentType(source) }
    : null;

  const player = useVideoPlayer(videoSource, (p) => {
    // expo-video emits `timeUpdate` ONLY when this interval is > 0 (defaults to
    // 0 = never). Without it `currentTime`/`duration` stay 0 forever, so the
    // recorded seek bar never becomes seekable and the progress fill never moves.
    p.timeUpdateEventInterval = 0.5;
    if (autoPlay) {
      p.play();
    }
  });

  // In-place source swap on quality change. `useVideoPlayer` only consumes the
  // source at creation, so a quality switch (new `source` URL) is applied via
  // `replaceAsync` — this avoids a full remount, so fullscreen/PiP survive, and
  // loads off the main thread (avoids UI freezes vs sync `replace`). A last-URI
  // ref skips the redundant initial replace (source already loaded).
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
        source ? { uri: source, headers: headers ?? {}, contentType: inferContentType(source) } : null,
      )
      .then(() => {
        if (autoPlay && source) player.play();
      });
  }, [player, source, headers, autoPlay]);

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
    // Surface playback failures (e.g. CDN geo-block on our IP) so we can see the
    // underlying error message/source while testing.
    if (s === 'error') {
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

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

import { useKeepAwake } from 'expo-keep-awake';
import { useVideoPlayer, VideoPlayer as ExpoVideoPlayer, VideoSource, VideoView } from 'expo-video';

import { PLAYER_COLORS } from '@/theme/playerColors';

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

  const [status, setStatus] = useState<VideoStatus>('idle');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const videoSource: VideoSource = source
    ? { uri: source, headers: headers ?? {} }
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
    void player.replaceAsync(source ? { uri: source, headers: headers ?? {} } : null).then(() => {
      if (autoPlay && source) player.play();
    });
  }, [player, source, headers, autoPlay]);

  useEffect(() => {
    const statusSub = player.addListener('statusChange', ({ status: s, error }) => {
      const mapped = s as VideoStatus;
      // Surface playback failures (e.g. CDN geo-block on our IP) so we can see
      // the underlying error message/source while testing.
      if (mapped === 'error') {
        // eslint-disable-next-line no-console
        console.log('[VideoPlayer] playback error', { source, error });
      }
      setStatus(mapped);
      onStatusChange?.(mapped);
    });

    const timeSub = player.addListener('timeUpdate', ({ currentTime: ct }) => {
      const dur = player.duration ?? 0;
      setCurrentTime(ct);
      setDuration(dur);
      onTimeUpdate?.(ct, dur);
    });

    const endSub = player.addListener('playToEnd', () => {
      onPlayEnd?.();
    });

    return () => {
      statusSub.remove();
      timeSub.remove();
      endSub.remove();
    };
  }, [player, source, onStatusChange, onTimeUpdate, onPlayEnd]);

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

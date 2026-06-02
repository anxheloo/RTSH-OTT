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
import React, { useEffect, useState } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { useVideoPlayer, VideoPlayer as ExpoVideoPlayer, VideoSource, VideoView } from 'expo-video';

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
  const [status, setStatus] = useState<VideoStatus>('idle');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const videoSource: VideoSource = source
    ? { uri: source, headers: headers ?? {} }
    : null;

  const player = useVideoPlayer(videoSource, (p) => {
    if (autoPlay) {
      p.play();
    }
  });

  useEffect(() => {
    const statusSub = player.addListener('statusChange', ({ status: s }) => {
      const mapped = s as VideoStatus;
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
  }, [player, onStatusChange, onTimeUpdate, onPlayEnd]);

  return (
    <View style={[styles.container, style]} testID="video-player-container">
      <VideoView
        player={player}
        style={styles.video}
        nativeControls={false}
        allowsPictureInPicture={allowsPictureInPicture}
        startsPictureInPictureAutomatically={startsPictureInPictureAutomatically}
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
    backgroundColor: '#000000',
  },
  video: {
    flex: 1,
  },
});

export default VideoPlayer;

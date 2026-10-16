import { useLayoutEffect, useRef } from 'react';
import { Animated, Easing, Pressable, View, useWindowDimensions } from 'react-native';
import { PanGestureHandler, State as GState } from 'react-native-gesture-handler';
import TrackPlayer, { State, useActiveTrack, usePlaybackState } from 'react-native-track-player';

import { navigate } from '../navigation/ref';
import { usePlayer } from '../player/queue';
import { useAuth } from '../state/auth';
import { Art } from './Art';
import { IconBtn } from './IconBtn';
import { Txt } from './text';
import { useColors } from './theme';

/** Docked above the tab bar / bottom edge whenever something is loaded. */
export function MiniPlayer() {
  const c = useColors();
  const client = useAuth((a) => a.client);
  const track = useActiveTrack();
  const { state } = usePlaybackState();
  const queued = usePlayer((s) => s.tracks.filter((t, i) => i > s.index && t.queued).length);
  const { width } = useWindowDimensions();
  const x = useRef(new Animated.Value(0)).current;
  const dir = useRef(0); // -1 = skipped forward, 1 = skipped back; the new song slides in from that side's opposite
  const id = track ? String(track.id) : '';
  useLayoutEffect(() => {
    if (!dir.current) return;
    x.setValue(-dir.current * width * 0.5);
    Animated.spring(x, { toValue: 0, useNativeDriver: true, bounciness: 0, speed: 18 }).start();
    dir.current = 0;
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  const onGesture = useRef(Animated.event([{ nativeEvent: { translationX: x } }], { useNativeDriver: true })).current;
  const onState = (e: any) => {
    const { oldState, translationX: dx, velocityX: vx } = e.nativeEvent;
    if (oldState !== GState.ACTIVE) return;
    const { tracks, index } = usePlayer.getState();
    const next = (dx < -60 || vx < -600) && dx < 0 && index < tracks.length - 1;
    const prev = (dx > 60 || vx > 600) && dx > 0 && index > 0;
    if (!next && !prev) { Animated.spring(x, { toValue: 0, useNativeDriver: true, bounciness: 0, speed: 20 }).start(); return; }
    dir.current = next ? -1 : 1;
    Animated.timing(x, { toValue: next ? -width : width, duration: 140, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(() => {
      (next ? TrackPlayer.skipToNext() : TrackPlayer.skipToPrevious()).catch(() => { dir.current = 0; x.setValue(0); });
    });
  };
  const fade = x.interpolate({ inputRange: [-width, 0, width], outputRange: [0, 1, 0], extrapolate: 'clamp' });
  if (!track || !client) return null;
  const playing = state === State.Playing;
  const albumId = (track as any).albumId ?? track.id;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 8, borderTopWidth: 1, borderTopColor: c.line, backgroundColor: c.bg }}>
      <PanGestureHandler activeOffsetX={[-12, 12]} failOffsetY={[-16, 16]} onGestureEvent={onGesture} onHandlerStateChange={onState}>
        <Animated.View style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10, opacity: fade, transform: [{ translateX: x }] }}>
          <Art uri={client.imageUrl(String(albumId), 160)} size={38} />
          <Pressable style={{ flex: 1, minWidth: 0 }} onPress={() => navigate('NowPlaying')} accessibilityLabel="Open now playing">
            <Txt v="med" numberOfLines={1}>{track.title}</Txt>
            <Txt v="mute" numberOfLines={1}>{track.artist}</Txt>
          </Pressable>
        </Animated.View>
      </PanGestureHandler>
      <View>
        <IconBtn name="queue" label="Queue" onPress={() => navigate('Queue')} />
        {queued > 0 && (
          <View pointerEvents="none" style={{ position: 'absolute', top: -2, right: -4, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
            <Txt v="small" color={c.bg} style={{ fontSize: 10, lineHeight: 12 }}>{queued}</Txt>
          </View>
        )}
      </View>
      <IconBtn name={playing ? 'pause' : 'play'} size={28} label={playing ? 'Pause' : 'Play'} onPress={() => (playing ? TrackPlayer.pause() : TrackPlayer.play())} />
    </View>
  );
}

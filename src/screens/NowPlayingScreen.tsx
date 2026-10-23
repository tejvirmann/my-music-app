import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Alert, Animated, Easing, Pressable, View, useWindowDimensions } from 'react-native';
import { PanGestureHandler, State as GState } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import TrackPlayer, { RepeatMode, useActiveTrack, useProgress } from 'react-native-track-player';

import { setLiked, useLiked } from '../likes';
import { openAfterDismiss } from '../navigation/ref';
import { skipNext, skipPrev, useIsPlaying } from '../player/controls';
import { cycleRepeat, setShuffle, trackToItem, usePlayer } from '../player/queue';
import { useAuth } from '../state/auth';
import { useSettings } from '../state/settings';
import { Art } from '../ui/Art';
import { Icon } from '../ui/Icon';
import { Tint, useArtTint } from '../ui/Tint';
import { IconBtn, fmt } from '../ui/layout';
import { openSongMenu } from '../ui/sheets';
import { ToggleBtn } from '../ui/ToggleBtn';
import { Txt } from '../ui/text';
import { F, useColors } from '../ui/theme';
import { toast } from '../ui/toast';

const GAP = 12;

export interface SlideCtl { go(dir: 'next' | 'prev'): void }

/**
 * Artwork rail: previous · current · next. Native-driven, so it tracks the finger and the buttons at 60fps.
 * The rail keeps showing the old track until the slide has finished, then re-centres in the same frame the new track is committed, so a
 * slow or early track-changed event can never make the art jump mid-slide.
 */
function Carousel({ size, ctl }: { size: number; ctl: { current: SlideCtl | null } }) {
  const client = useAuth((a) => a.client)!;
  const { tracks, index } = usePlayer();
  const x = useRef(new Animated.Value(0)).current;
  const { width } = useWindowDimensions();
  const step = size + GAP;
  const [shown, setShown] = useState(index);
  const sliding = useRef(false);
  const indexRef = useRef(index);
  indexRef.current = index;
  const art = (i: number) => { const t = tracks[i]; return t ? client.imageUrl(String((t as any).albumId ?? t.id), 640) : undefined; };
  const hasPrev = index > 0, hasNext = index >= 0 && index < tracks.length - 1;
  const lim = useRef({ hasPrev, hasNext });
  lim.current = { hasPrev, hasNext };

  // Track changed from outside a slide (song ended, queue tap): swap straight away. Mid-slide, the slide's own finish does it.
  useEffect(() => { if (!sliding.current) setShown(index); }, [index]);
  // The rail now shows `shown` in the middle: park the translation at 0 before paint.
  useLayoutEffect(() => { x.setValue(0); }, [shown]); // eslint-disable-line react-hooks/exhaustive-deps

  const slide = (next: boolean, run: () => Promise<void>) => {
    if (sliding.current) return;
    sliding.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    run().catch(() => {});
    Animated.spring(x, { toValue: next ? -step : step, stiffness: 230, damping: 30, mass: 1, overshootClamping: true, useNativeDriver: true }).start(() => {
      // Wait (briefly) for the player to report the new track; if it never does, ease back.
      const t0 = Date.now();
      const settle = () => {
        if (indexRef.current !== shown) { sliding.current = false; setShown(indexRef.current); return; }
        if (Date.now() - t0 > 1200) { sliding.current = false; Animated.spring(x, { toValue: 0, stiffness: 230, damping: 30, mass: 1, useNativeDriver: true }).start(); return; }
        setTimeout(settle, 40);
      };
      settle();
    });
  };
  ctl.current = {
    go: (dir) => {
      if (dir === 'next') { if (lim.current.hasNext) slide(true, skipNext); else skipNext().catch(() => {}); return; }
      TrackPlayer.getProgress().then(({ position }) => {
        if (lim.current.hasPrev && position <= 3) slide(false, () => skipPrev()); else skipPrev().catch(() => {});
      }).catch(() => {});
    },
  };

  const onGesture = useRef(Animated.event([{ nativeEvent: { translationX: x } }], { useNativeDriver: true })).current;
  const onState = (e: any) => {
    const { oldState, translationX: dx, velocityX: vx } = e.nativeEvent;
    if (oldState !== GState.ACTIVE || sliding.current) return;
    const next = (dx < -step * 0.28 || vx < -600) && dx < 0 && lim.current.hasNext;
    const prev = (dx > step * 0.28 || vx > 600) && dx > 0 && lim.current.hasPrev;
    if (!next && !prev) { Animated.spring(x, { toValue: 0, stiffness: 260, damping: 28, mass: 1, useNativeDriver: true }).start(); return; }
    slide(next, () => (next ? skipNext() : skipPrev(true)));
  };

  const hp = shown > 0, hn = shown >= 0 && shown < tracks.length - 1;
  const tx = x.interpolate({ inputRange: [-step, 0, step], outputRange: [hn ? -step : -step * 0.25, 0, hp ? step : step * 0.25], extrapolate: 'clamp' });
  const near = x.interpolate({ inputRange: [-step, 0, step], outputRange: [1, 0, 1], extrapolate: 'clamp' });
  const slot = (i: number, cur?: boolean) => {
    const isNext = i > shown;
    // current fades out/shrinks; the neighbour being pulled in grows to full.
    const grow = cur ? null : x.interpolate({ inputRange: isNext ? [-step, 0] : [0, step], outputRange: isNext ? [1, 0] : [0, 1], extrapolate: 'clamp' });
    const scale = cur ? near.interpolate({ inputRange: [0, 1], outputRange: [1, 0.86] }) : grow!.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1] });
    const opacity = cur ? near.interpolate({ inputRange: [0, 1], outputRange: [1, 0.3] }) : grow!.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] });
    return <Animated.View style={{ width: size, opacity, transform: [{ scale }] }}><Art uri={art(i)} size={size} /></Animated.View>;
  };
  return (
    <PanGestureHandler activeOffsetX={[-10, 10]} failOffsetY={[-24, 24]} onGestureEvent={onGesture} onHandlerStateChange={onState}>
      <Animated.View style={{ height: size + 12, overflow: 'hidden' }}>
        <Animated.View style={{ flexDirection: 'row', gap: GAP, position: 'absolute', top: 6, left: (width - size) / 2 - step, transform: [{ translateX: tx }] }}>
          {slot(shown - 1)}{slot(shown, true)}{slot(shown + 1)}
        </Animated.View>
      </Animated.View>
    </PanGestureHandler>
  );
}

/** Fades and lifts its content in whenever `k` changes (a new song), so text arrives instead of snapping. */
function Arrive({ k, children, style }: { k: string; children: React.ReactNode; style?: any }) {
  const v = useRef(new Animated.Value(1)).current;
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    v.setValue(0);
    Animated.timing(v, { toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [k]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Animated.View style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }]}>{children}</Animated.View>;
}

/**
 * Seek bar. Drag anywhere on it (or tap); seeks on release. While dragging, the knob follows the finger and ignores the playback clock.
 * After release it stays where you put it until the player catches up, instead of snapping back to the old position.
 */
function Scrubber({ position, duration }: { position: number; duration: number }) {
  const c = useColors();
  const [w, setW] = useState(1);
  const [drag, setDrag] = useState<number | null>(null);
  const [landed, setLanded] = useState<number | null>(null);
  const dragRef = useRef<number | null>(null);
  const dur = useRef(duration);
  dur.current = duration;
  const wRef = useRef(1);
  const ratio = (px: number) => Math.max(0, Math.min(1, px / wRef.current));

  // Let go of the held spot once playback reports (roughly) that position, or after a moment in case it never does.
  useEffect(() => {
    if (landed == null) return;
    if (duration && Math.abs(position - landed * duration) < 1.5) setLanded(null);
  }, [position]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (landed == null) return;
    const t = setTimeout(() => setLanded(null), 1500);
    return () => clearTimeout(t);
  }, [landed]);

  const onMove = (e: any) => { dragRef.current = ratio(e.nativeEvent.x); setDrag(dragRef.current); };
  const onState = (e: any) => {
    const { state, x } = e.nativeEvent;
    if (state === GState.BEGAN) { dragRef.current = ratio(x); setDrag(dragRef.current); return; }
    if (state !== GState.END && state !== GState.CANCELLED && state !== GState.FAILED) return;
    const r = dragRef.current;
    dragRef.current = null;
    setDrag(null);
    if (state === GState.END && r != null && dur.current) { setLanded(r); TrackPlayer.seekTo(r * dur.current).catch(() => setLanded(null)); }
  };

  const p = drag ?? landed ?? (duration ? Math.min(1, position / duration) : 0);
  const shown = (drag ?? landed) != null ? p * duration : position;
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
      <PanGestureHandler minDist={0} shouldCancelWhenOutside={false} hitSlop={{ top: 14, bottom: 14 }} onGestureEvent={onMove} onHandlerStateChange={onState}>
        <View style={{ height: 28, justifyContent: 'center' }} onLayout={(e) => { setW(e.nativeEvent.layout.width); wRef.current = e.nativeEvent.layout.width; }}>
          <View pointerEvents="none" style={{ height: 3, backgroundColor: c.line }}>
            <View style={{ height: 3, width: p * w, backgroundColor: c.fg }} />
          </View>
          <View pointerEvents="none" style={{ position: 'absolute', left: p * w - 6, width: 12, height: 12, borderRadius: 6, backgroundColor: c.fg }} />
        </View>
      </PanGestureHandler>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Txt v="small">{fmt(shown)}</Txt><Txt v="small">{fmt(duration)}</Txt>
      </View>
    </View>
  );
}

export function NowPlayingScreen({ navigation }: any) {
  const c = useColors();
  const inset = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const client = useAuth((a) => a.client)!;
  const qc = useQueryClient();
  const track = useActiveTrack();
  const { position, duration } = useProgress(250);
  const { ctxName, ctx, shuffle, tracks, index, repeat } = usePlayer();
  const liked = useLiked().data?.entries ?? {};
  const playing = useIsPlaying();
  const id = track ? String(track.id) : '';
  const info = useQuery({ queryKey: ['song', id], queryFn: () => client.item(id), enabled: !!id, staleTime: 10 * 60_000 });
  const slideCtl = useRef<SlideCtl | null>(null);
  const artTint = useSettings((s) => s.artTint);
  const tint = useArtTint(artTint && track ? String((track as any).albumId ?? track.id) : undefined);
  const queued = tracks.filter((t, i) => i > index && t.queued).length;

  if (!track) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Txt v="mute">Nothing playing</Txt>
      </View>
    );
  }
  const isLiked = !!liked[id];
  const src = info.data?.MediaSources?.[0];
  const audio = src?.MediaStreams?.find((m) => m.Type === 'Audio');
  const format = [src?.Container?.toUpperCase(), audio?.SampleRate ? `${audio.SampleRate / 1000} kHz` : null, (audio?.BitRate ?? src?.Bitrate) ? `${Math.round((audio?.BitRate ?? src?.Bitrate)! / 1000)} kbps` : null].filter(Boolean).join(' · ');
  const art = Math.min(width - 96, 320);
  // Where "playing from" leads: the playlist/album the queue was started from, else this song's own album.
  const albumId = (track as any).albumId as string | undefined;
  const dest = ctx ? { screen: ctx.kind === 'playlist' ? 'Playlist' : 'Album', params: { id: ctx.id, name: ctx.name } }
    : albumId ? { screen: 'Album', params: { id: albumId, name: track.album ?? '' } } : null;
  const goTo = (screen: string, params: object) => { navigation.goBack(); openAfterDismiss(screen, params); };
  const artists = info.data?.Artists?.length ? info.data.Artists : track.artist ? String(track.artist).split(', ') : [];
  const like = () => setLiked(client, qc, [id], !isLiked).then(() => toast(isLiked ? 'Removed from Liked' : 'Added to Liked')).catch((e) => Alert.alert('Failed', e.message));

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: Math.max(inset.top, 14), paddingBottom: inset.bottom + 8 }}>
      <Tint color={tint} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 14 }}>
        <IconBtn name="down" size={28} label="Close" onPress={() => navigation.goBack()} />
        <Pressable disabled={!dest} onPress={() => dest && goTo(dest.screen, dest.params)} style={{ alignItems: 'center', flex: 1 }} accessibilityLabel={dest ? `Open ${dest.params.name}` : undefined}>
          <Txt v="label">playing from</Txt>
          <Txt numberOfLines={1} style={dest ? { textDecorationLine: 'underline' } : undefined}>{ctxName || 'Queue'}</Txt>
        </Pressable>
        <IconBtn name="dots" label="More" onPress={() => openSongMenu(trackToItem(track))} />
      </View>

      <Carousel size={art} ctl={slideCtl} />
      <Txt v="small" style={{ textAlign: 'center', marginTop: 4 }}>‹ swipe artwork to skip ›</Txt>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16 }}>
        <Arrive k={id} style={{ flex: 1, paddingRight: 12 }}>
          <Txt v="h2" numberOfLines={2} style={{ fontSize: 30, lineHeight: 32 }}>{track.title}</Txt>
          <Txt v="mute" numberOfLines={1}>
            {artists.map((a, i) => (
              <Txt key={a} v="mute" suppressHighlighting onPress={() => goTo('Artist', { name: a })} style={{ textDecorationLine: 'underline' }}>{a}{i < artists.length - 1 ? ', ' : ''}</Txt>
            ))}
          </Txt>
        </Arrive>
        <IconBtn name={isLiked ? 'heart' : 'heartO'} size={28} color={isLiked ? c.accent : c.mute} label={isLiked ? 'Unlike' : 'Like'} onPress={like} />
      </View>

      <Scrubber position={position} duration={duration} />

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8 }}>
        <ToggleBtn name="shuf" on={shuffle} label={shuffle ? 'Shuffle on' : 'Shuffle off'} onPress={() => setShuffle(!shuffle).catch(() => {})} />
        <IconBtn name="prev" size={34} label="Previous" onPress={() => slideCtl.current?.go('prev')} />
        <Pressable onPress={() => (playing ? TrackPlayer.pause() : TrackPlayer.play())} accessibilityLabel={playing ? 'Pause' : 'Play'}
          style={({ pressed }) => ({ width: 66, height: 66, borderRadius: 33, backgroundColor: c.fg, alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.94 : 1 }] })}>
          <Icon name={playing ? 'pause' : 'play'} size={32} color={c.bg} />
        </Pressable>
        <IconBtn name="next" size={34} label="Next" onPress={() => slideCtl.current?.go('next')} />
        <ToggleBtn name="rep" on={repeat !== RepeatMode.Off} badge={repeat === RepeatMode.Track ? '1' : undefined} label={repeat === RepeatMode.Track ? 'Repeat one' : repeat === RepeatMode.Queue ? 'Repeat all' : 'Repeat off'} onPress={() => cycleRepeat().catch(() => {})} />
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginTop: 'auto', paddingTop: 12 }}>
        <Txt v="small">{format}</Txt>
        <View>
          <IconBtn name="queue" label="Queue" onPress={() => navigation.navigate('Queue')} />
          {queued > 0 && <View pointerEvents="none" style={{ position: 'absolute', top: -4, right: -6, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}><Txt v="small" color={c.bg} style={{ fontSize: 10, lineHeight: 12, fontFamily: F.monoMed }}>{queued}</Txt></View>}
        </View>
      </View>
    </View>
  );
}

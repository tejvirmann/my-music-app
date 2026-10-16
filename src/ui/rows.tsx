import { useEffect, useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, View } from 'react-native';

import { Art } from './Art';
import { Icon } from './Icon';
import { Txt } from './text';
import { F, useColors } from './theme';

const ARM = 70; // drag distance (px) at which releasing triggers the action

/** Swipe right to trigger `onSwipe` (add to queue). Row follows the finger, hint flips to "release to add", then confirms with a check. */
export function SwipeRow({ onSwipe, label = 'add to queue', done: doneLabel = 'added', children }: {
  onSwipe: () => void; label?: string; done?: string; children: React.ReactNode;
}) {
  const c = useColors();
  const x = useRef(new Animated.Value(0)).current;
  const cb = useRef(onSwipe);
  cb.current = onSwipe;
  const [armed, setArmed] = useState(false);
  const [done, setDone] = useState(false);
  const armedRef = useRef(false);

  useEffect(() => {
    const id = x.addListener(({ value }) => {
      const a = value > ARM;
      if (a !== armedRef.current) { armedRef.current = a; setArmed(a); }
    });
    return () => x.removeListener(id);
  }, [x]);

  const back = () => Animated.spring(x, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
  const pan = useRef(PanResponder.create({
    // Claim a mostly-horizontal drag in the capture phase so child buttons and the list scroll don't steal it.
    onMoveShouldSetPanResponderCapture: (_, g) => g.dx > 8 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
    onPanResponderTerminationRequest: () => false,
    onPanResponderMove: (_, g) => x.setValue(Math.max(0, Math.min(g.dx * 0.8, 120))),
    onPanResponderRelease: () => {
      const fire = armedRef.current;
      back();
      if (fire) { cb.current(); setDone(true); setTimeout(() => setDone(false), 900); }
    },
    onPanResponderTerminate: back,
  })).current;

  const bgOpacity = x.interpolate({ inputRange: [0, ARM], outputRange: [0, 1], extrapolate: 'clamp' });
  return (
    <View>
      <Animated.View pointerEvents="none" style={{
        position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 16,
        backgroundColor: c.card, opacity: done ? 1 : bgOpacity,
      }}>
        <Icon name={done ? 'check' : 'queue'} size={20} color={c.accent} />
        <Txt color={c.accent}>{done ? doneLabel : armed ? 'release to add' : label}</Txt>
      </Animated.View>
      <Animated.View style={{ backgroundColor: c.bg, transform: [{ translateX: x }] }} {...pan.panHandlers}>{children}</Animated.View>
    </View>
  );
}

/** Green dot used for "available offline". */
export function DlDot() {
  const c = useColors();
  return <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.ok, marginRight: 6 }} />;
}

export const ROW_H = 60;

/** Standard list row: square art, title + subtitle, optional offline dot, trailing slot. */
export function ListRow({ art, title, sub, subExtra, dl, active, onPress, onLongPress, right, swipe, swipeLabel, noArt, lead, titleNode }: {
  art?: string; title: string; sub?: string; subExtra?: React.ReactNode; dl?: boolean; active?: boolean;
  onPress?: () => void; onLongPress?: () => void; right?: React.ReactNode;
  swipe?: () => void; swipeLabel?: string; noArt?: boolean; lead?: React.ReactNode; titleNode?: React.ReactNode;
}) {
  const c = useColors();
  const row = (
    <Pressable onPress={onPress} onLongPress={onLongPress} delayLongPress={350} style={({ pressed }) => ({
      flexDirection: 'row', alignItems: 'center', gap: 12, height: ROW_H, paddingHorizontal: 16, backgroundColor: pressed ? c.card : 'transparent',
    })}>
      {lead}
      {!noArt && <Art uri={art} size={44} />}
      <View style={{ flex: 1, minWidth: 0 }}>
        {titleNode ?? <Txt v="med" numberOfLines={1} color={active ? c.accent : c.fg}>{title}</Txt>}
        {(!!sub || dl || subExtra) && (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {dl && <DlDot />}
            {!!sub && <Txt v="mute" numberOfLines={1} style={{ flexShrink: 1 }}>{sub}</Txt>}
            {subExtra}
          </View>
        )}
      </View>
      {right}
    </Pressable>
  );
  return swipe ? <SwipeRow onSwipe={swipe} label={swipeLabel}>{row}</SwipeRow> : row;
}

/** Animated equaliser bars for the playing row. */
export function Eq({ playing }: { playing: boolean }) {
  const c = useColors();
  const bars = useRef([0, 1, 2].map(() => new Animated.Value(0.3))).current;
  useEffect(() => {
    const loops = bars.map((b, i) => Animated.loop(Animated.sequence([
      Animated.timing(b, { toValue: 1, duration: 450 + i * 120, useNativeDriver: true }),
      Animated.timing(b, { toValue: 0.3, duration: 450 + i * 120, useNativeDriver: true }),
    ])));
    if (playing) loops.forEach((l) => l.start()); else bars.forEach((b) => b.setValue(0.5));
    return () => loops.forEach((l) => l.stop());
  }, [playing]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 14, width: 14 }}>
      {bars.map((b, i) => <Animated.View key={i} style={{ flex: 1, height: 14, backgroundColor: c.accent, transform: [{ translateY: b.interpolate({ inputRange: [0.3, 1], outputRange: [4.9, 0] }) }, { scaleY: b }] }} />)}
    </View>
  );
}

export const mono = F.mono;

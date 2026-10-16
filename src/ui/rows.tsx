import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, View } from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';

import { Art } from './Art';
import { Icon } from './Icon';
import { Txt } from './text';
import { F, useColors } from './theme';

const ARM = 80; // drag distance (px) at which releasing triggers the action

/**
 * Swipe right to trigger `onSwipe` (add to queue). Uses the native gesture recogniser, which only activates on a rightward
 * drag and yields to vertical scrolling, so it behaves inside lists. The row follows the finger on the native thread.
 */
export function SwipeRow({ onSwipe, label = 'add to queue', done: doneLabel = 'added', children }: {
  onSwipe: () => void; label?: string; done?: string; children: React.ReactNode;
}) {
  const c = useColors();
  const tx = useRef(new Animated.Value(0)).current;
  const cb = useRef(onSwipe);
  cb.current = onSwipe;
  const [armed, setArmed] = useState(false);
  const [done, setDone] = useState(false);
  const armedRef = useRef(false);

  // Follows the finger 1:1 up to ARM, then stretches like elastic: keeps moving, but with growing resistance.
  const x = tx.interpolate({ inputRange: [0, ARM, 200, 450], outputRange: [0, ARM, 190, 270], extrapolate: 'clamp' });
  const bgOpacity = tx.interpolate({ inputRange: [0, ARM], outputRange: [0, 1], extrapolate: 'clamp' });
  const onGesture = useRef(Animated.event([{ nativeEvent: { translationX: tx } }], {
    useNativeDriver: true,
    listener: (e: any) => {
      const a = e.nativeEvent.translationX > ARM;
      if (a !== armedRef.current) { armedRef.current = a; setArmed(a); }
    },
  })).current;
  const onState = (e: any) => {
    const { oldState, translationX, velocityX } = e.nativeEvent;
    if (oldState !== State.ACTIVE) return;
    const fire = translationX > ARM || (translationX > 30 && velocityX > 800);
    Animated.spring(tx, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
    armedRef.current = false; setArmed(false);
    if (fire) { cb.current(); setDone(true); setTimeout(() => setDone(false), 900); }
  };

  return (
    <View>
      <Animated.View pointerEvents="none" style={{
        position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 16,
        backgroundColor: c.card, opacity: done ? 1 : bgOpacity,
      }}>
        <Icon name={done ? 'check' : 'queue'} size={20} color={c.accent} />
        <Txt color={c.accent}>{done ? doneLabel : armed ? 'release to add' : label}</Txt>
      </Animated.View>
      <PanGestureHandler activeOffsetX={10} failOffsetY={[-12, 12]} onGestureEvent={onGesture} onHandlerStateChange={onState}>
        <Animated.View style={{ backgroundColor: c.bg, transform: [{ translateX: x }] }}>{children}</Animated.View>
      </PanGestureHandler>
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

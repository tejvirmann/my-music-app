import { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { create } from 'zustand';

import { F, useColors } from './theme';
import { Txt } from './text';

const useToast = create<{ id: number; msg: string; pos: string }>(() => ({ id: 0, msg: '', pos: '' }));
/** Brief confirmation at the bottom of the screen ("Added to queue · #2 up next"). Needs <ToastHost/> mounted once. */
export const toast = (msg: string, pos = '') => useToast.setState((s) => ({ id: s.id + 1, msg, pos }));

export function ToastHost({ bottom }: { bottom: number }) {
  const c = useColors();
  const { id, msg, pos } = useToast();
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!id) return;
    a.setValue(0);
    Animated.sequence([
      Animated.timing(a, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.delay(1400),
      Animated.timing(a, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Animated.View pointerEvents="none" style={{
      position: 'absolute', left: 16, right: 16, bottom, opacity: a, backgroundColor: c.fg, paddingVertical: 10, paddingHorizontal: 14,
      flexDirection: 'row', justifyContent: 'space-between', transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
    }}>
      <Txt color={c.bg} style={{ fontFamily: F.monoMed }}>{msg}</Txt>
      {!!pos && <View><Txt color={c.bg} style={{ opacity: 0.6 }}>{pos}</Txt></View>}
    </Animated.View>
  );
}

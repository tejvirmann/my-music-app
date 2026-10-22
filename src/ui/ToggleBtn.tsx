import * as Haptics from 'expo-haptics';
import { useEffect, useRef } from 'react';
import { Animated, Pressable } from 'react-native';

import { Icon, type IconName } from './Icon';
import { Txt } from './text';
import { useColors } from './theme';

/**
 * Shuffle / repeat style toggle. Presses squash the icon and spring it back with a light haptic tick; turning on cross-fades the icon to the
 * accent colour and pops a dot in beneath it. `badge` (e.g. "1" for repeat one) pops in on the corner of the icon.
 */
export function ToggleBtn({ name, on, onPress, label, size = 24, badge }: { name: IconName; on: boolean; onPress: () => void; label: string; size?: number; badge?: string }) {
  const c = useColors();
  const press = useRef(new Animated.Value(1)).current;
  const lit = useRef(new Animated.Value(on ? 1 : 0)).current;
  const badgeIn = useRef(new Animated.Value(badge ? 1 : 0)).current;
  useEffect(() => { Animated.spring(lit, { toValue: on ? 1 : 0, useNativeDriver: true, bounciness: 10, speed: 14 }).start(); }, [on]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { Animated.spring(badgeIn, { toValue: badge ? 1 : 0, useNativeDriver: true, bounciness: 12, speed: 16 }).start(); }, [badge]); // eslint-disable-line react-hooks/exhaustive-deps

  const squash = (to: number, bounce = 0) => Animated.spring(press, { toValue: to, useNativeDriver: true, bounciness: bounce, speed: 40 }).start();
  return (
    <Pressable onPress={() => { Haptics.selectionAsync().catch(() => {}); onPress(); }} onPressIn={() => squash(0.82)} onPressOut={() => squash(1, 14)}
      hitSlop={10} accessibilityLabel={label} accessibilityRole="button" accessibilityState={{ selected: on }} style={{ padding: 4, alignItems: 'center' }}>
      <Animated.View style={{ transform: [{ scale: press }] }}>
        <Icon name={name} size={size} color={c.mute} />
        <Animated.View pointerEvents="none" style={{ position: 'absolute', opacity: lit }}><Icon name={name} size={size} color={c.accent} /></Animated.View>
        {!!badge && (
          <Animated.View pointerEvents="none" style={{ position: 'absolute', right: -4, top: -6, opacity: badgeIn, transform: [{ scale: badgeIn }] }}>
            <Txt v="small" color={c.accent} style={{ fontSize: 10 }}>{badge}</Txt>
          </Animated.View>
        )}
      </Animated.View>
      <Animated.View pointerEvents="none" style={{ width: 4, height: 4, borderRadius: 2, marginTop: 3, backgroundColor: c.accent, opacity: lit, transform: [{ scale: lit }] }} />
    </Pressable>
  );
}

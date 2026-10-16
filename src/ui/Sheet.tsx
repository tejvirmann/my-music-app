import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Art } from './Art';
import { Icon, type IconName } from './Icon';
import { Txt } from './text';
import { useColors } from './theme';

const H = Dimensions.get('window').height;

/** Bottom sheet: dimmed backdrop, slides up. Stays mounted until the close animation finishes. */
export function Sheet({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: React.ReactNode }) {
  const c = useColors();
  const inset = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (visible) { setMounted(true); Animated.timing(t, { toValue: 1, duration: 230, useNativeDriver: true }).start(); }
    else Animated.timing(t, { toValue: 0, duration: 170, useNativeDriver: true }).start(({ finished }) => finished && setMounted(false));
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!mounted) return null;
  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={{ flex: 1, backgroundColor: c.dim, opacity: t }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Close" />
      </Animated.View>
      <Animated.View style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: H * 0.78, backgroundColor: c.bg, borderTopWidth: 1, borderTopColor: c.fg,
        transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [H * 0.5, 0] }) }],
      }}>
        <ScrollView bounces={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: inset.bottom + 10 }}>{children}</ScrollView>
      </Animated.View>
    </Modal>
  );
}

export function SheetHeader({ art, title, sub }: { art?: string; title: string; sub?: string }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 12, marginBottom: 6, borderBottomWidth: 1, borderBottomColor: c.line }}>
      <Art uri={art} size={44} />
      <View style={{ flex: 1 }}>
        <Txt v="med" numberOfLines={1}>{title}</Txt>
        {!!sub && <Txt v="mute" numberOfLines={1}>{sub}</Txt>}
      </View>
    </View>
  );
}

export function SheetItem({ icon, label, onPress, danger, right }: { icon?: IconName; label: string; onPress: () => void; danger?: boolean; right?: string }) {
  const c = useColors();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, opacity: pressed ? 0.5 : 1 })}>
      {icon && <Icon name={icon} size={22} color={danger ? c.accent : c.mute} />}
      <Txt style={{ flex: 1 }} color={danger ? c.accent : c.fg}>{label}</Txt>
      {!!right && <Txt v="mute">{right}</Txt>}
    </Pressable>
  );
}

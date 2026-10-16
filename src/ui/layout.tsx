import { Pressable, ScrollView, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconBtn } from './IconBtn';
import { MiniPlayer } from './MiniPlayer';
import { Txt } from './text';
import { useColors } from './theme';

export { IconBtn };

/** Page chrome: themed background + top safe area. `mini` docks the mini-player at the bottom (tab screens get it from the tab bar). */
export function Screen({ children, mini, style }: { children: React.ReactNode; mini?: boolean; style?: ViewStyle }) {
  const c = useColors();
  const inset = useSafeAreaInsets();
  return (
    <View style={[{ flex: 1, backgroundColor: c.bg, paddingTop: inset.top }, style]}>
      {children}
      {mini && <View style={{ paddingBottom: inset.bottom }}><MiniPlayer /></View>}
    </View>
  );
}

/** Scrolling body with the standard 16px gutter. */
export function Body({ children, refreshControl, bottom = 28 }: { children: React.ReactNode; refreshControl?: React.ReactElement<any>; bottom?: number }) {
  return (
    <ScrollView refreshControl={refreshControl as any} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: bottom }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  );
}

/** Top row: label/back on the left, actions on the right. */
export function TopBar({ left, right, onBack }: { left?: React.ReactNode; right?: React.ReactNode; onBack?: () => void }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 40, paddingHorizontal: 16, marginBottom: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {onBack && <IconBtn name="back" label="Back" onPress={onBack} size={22} style={{ marginLeft: -4 }} />}
        {typeof left === 'string' ? <Txt v="mute">{left}</Txt> : left}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>{right}</View>
    </View>
  );
}

export function Heading({ title, sub, size = 'h2' }: { title: string; sub?: string; size?: 'h1' | 'h2' }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Txt v={size} numberOfLines={2}>{title}</Txt>
      {!!sub && <Txt v="mute" style={{ marginTop: 4 }}>{sub}</Txt>}
    </View>
  );
}

/** Section title in serif italic with a quiet right-hand hint. */
export function Section({ title, hint, onHint }: { title: string; hint?: string; onHint?: () => void }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 22, marginBottom: 6 }}>
      <Txt v="h3">{title}</Txt>
      {!!hint && <Txt v="mute" onPress={onHint}>{hint}</Txt>}
    </View>
  );
}

export function Pill({ label, on, onPress }: { label: string; on?: boolean; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable onPress={onPress} style={{ borderWidth: 1, borderColor: on ? c.fg : c.line, backgroundColor: on ? c.fg : 'transparent', borderRadius: 99, paddingHorizontal: 12, paddingVertical: 4 }}>
      <Txt color={on ? c.bg : c.mute}>{label}</Txt>
    </Pressable>
  );
}

/** Outlined / solid button, square corners to match the rest of the language. */
export function Button({ title, onPress, solid, danger, disabled, style }: { title: string; onPress: () => void; solid?: boolean; danger?: boolean; disabled?: boolean; style?: ViewStyle }) {
  const c = useColors();
  const col = danger ? c.accent : c.fg;
  return (
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [{
      borderWidth: 1, borderColor: col, backgroundColor: solid ? col : 'transparent', paddingVertical: 11, alignItems: 'center',
      opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
    }, style]}>
      <Txt color={solid ? c.bg : col}>{title}</Txt>
    </Pressable>
  );
}

export function Empty({ text, loading }: { text?: string; loading?: boolean }) {
  const c = useColors();
  return (
    <View style={{ padding: 18, borderWidth: 1, borderStyle: 'dashed', borderColor: c.line, alignItems: 'center', marginVertical: 10 }}>
      <Txt v="mute" style={{ textAlign: 'center' }}>{loading ? 'Loading…' : text ?? 'Nothing here'}</Txt>
    </View>
  );
}

export function Fill({ children }: { children: React.ReactNode }) {
  return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>{children}</View>;
}

export const fmt = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;

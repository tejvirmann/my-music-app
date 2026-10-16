import { useRef } from 'react';
import { ActivityIndicator, Animated, Image, PanResponder, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

// Placeholder styling only. Theme/UX pass comes later.
export const colors = { bg: '#0b0b0f', card: '#17171f', text: '#f2f2f7', dim: '#8e8e99', accent: '#1db954', danger: '#ff453a' };

export function Btn({ title, onPress, kind = 'default', style, disabled }: {
  title: string; onPress: () => void; kind?: 'default' | 'primary' | 'danger'; style?: ViewStyle; disabled?: boolean;
}) {
  const bg = kind === 'primary' ? colors.accent : kind === 'danger' ? colors.danger : colors.card;
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[s.btn, { backgroundColor: bg, opacity: disabled ? 0.4 : 1 }, style]}>
      <Text style={[s.btnText, kind === 'primary' && { color: '#000' }]}>{title}</Text>
    </Pressable>
  );
}

/** Spotify-style green "downloaded" marker. */
export function DownloadBadge() {
  return (
    <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#000', fontSize: 10, fontWeight: '900' }}>↓</Text>
    </View>
  );
}

/** Swipe right to trigger `onSwipe` (e.g. add to queue); the row springs back. */
function SwipeRow({ onSwipe, label, children }: { onSwipe: () => void; label: string; children: React.ReactNode }) {
  const x = useRef(new Animated.Value(0)).current;
  const cb = useRef(onSwipe);
  cb.current = onSwipe;
  const back = () => Animated.spring(x, { toValue: 0, useNativeDriver: true }).start();
  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => g.dx > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
    onPanResponderMove: (_, g) => x.setValue(Math.max(0, Math.min(g.dx, 140))),
    onPanResponderRelease: (_, g) => { if (g.dx > 80) cb.current(); back(); },
    onPanResponderTerminate: back,
  })).current;
  return (
    <View>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.accent, justifyContent: 'center', paddingLeft: 16 }]}>
        <Text style={{ color: '#000', fontWeight: '700' }}>{label}</Text>
      </View>
      <Animated.View style={{ backgroundColor: colors.bg, transform: [{ translateX: x }] }} {...pan.panHandlers}>
        {children}
      </Animated.View>
    </View>
  );
}

export function Row({ title, subtitle, art, onPress, onLongPress, right, downloaded, onSwipeRight, swipeLabel = '+ Queue' }: {
  title: string; subtitle?: string; art?: string; onPress?: () => void; onLongPress?: () => void; right?: React.ReactNode;
  downloaded?: boolean; onSwipeRight?: () => void; swipeLabel?: string;
}) {
  const row = (
    <Pressable onPress={onPress} onLongPress={onLongPress} style={s.row}>
      {art !== undefined && <Image source={art ? { uri: art } : undefined} style={s.art} />}
      <View style={{ flex: 1 }}>
        <Text style={s.title} numberOfLines={1}>{title}</Text>
        {(!!subtitle || downloaded) && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {downloaded && <DownloadBadge />}
            {!!subtitle && <Text style={[s.sub, { flexShrink: 1 }]} numberOfLines={1}>{subtitle}</Text>}
          </View>
        )}
      </View>
      {right}
    </Pressable>
  );
  return onSwipeRight ? <SwipeRow onSwipe={onSwipeRight} label={swipeLabel}>{row}</SwipeRow> : row;
}

export function Empty({ loading, error, text }: { loading?: boolean; error?: string; text?: string }) {
  return (
    <View style={s.center}>
      {loading ? <ActivityIndicator color={colors.text} /> : <Text style={{ color: error ? colors.danger : colors.dim, textAlign: 'center' }}>{error ?? text ?? 'Nothing here'}</Text>}
    </View>
  );
}

export const fmt = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;

export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  pad: { padding: 16 },
  h1: { color: colors.text, fontSize: 22, fontWeight: '700' },
  text: { color: colors.text },
  dim: { color: colors.dim },
  input: { backgroundColor: colors.card, color: colors.text, padding: 12, borderRadius: 10, marginBottom: 10 },
  btn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, alignItems: 'center' },
  btnText: { color: colors.text, fontWeight: '600' },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, paddingHorizontal: 16 },
  art: { width: 48, height: 48, borderRadius: 6, backgroundColor: colors.card },
  title: { color: colors.text, fontSize: 16 },
  sub: { color: colors.dim, fontSize: 13 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
});

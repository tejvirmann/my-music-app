import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { useAuth } from '../state/auth';
import { useColors, useIsDark } from './theme';

const B83 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz#$%*+,-.:;=?@[]^_{|}~';

/** Average colour of a blurhash: its DC component is the plain sRGB mean, stored in characters 2–5. */
function average(hash: string): [number, number, number] | null {
  if (hash.length < 6) return null;
  let v = 0;
  for (let i = 2; i < 6; i++) { const d = B83.indexOf(hash[i]); if (d < 0) return null; v = v * 83 + d; }
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

/** Pull the colour toward something that sits well behind text: a touch richer, and dark (or light) enough in the current theme. */
function tint([r, g, b]: [number, number, number], dark: boolean) {
  const [R, G, B] = [r / 255, g / 255, b / 255];
  const max = Math.max(R, G, B), min = Math.min(R, G, B), d = max - min;
  let h = 0;
  if (d) h = max === R ? ((G - B) / d) % 6 : max === G ? (B - R) / d + 2 : (R - G) / d + 4;
  h = (h * 60 + 360) % 360;
  const l0 = (max + min) / 2;
  const s = Math.min(1, (d ? d / (1 - Math.abs(2 * l0 - 1)) : 0) * 1.2);
  const l = dark ? Math.min(0.3, Math.max(0.16, l0 * 0.6)) : Math.max(0.78, Math.min(0.9, 0.78 + l0 * 0.12));
  return `hsl(${Math.round(h)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
}

/** Tint colour for a cover (album id, else song id), or undefined when unknown / offline. */
export function useArtTint(id?: string) {
  const client = useAuth((a) => a.client);
  const dark = useIsDark();
  const q = useQuery({ queryKey: ['blur', id], queryFn: () => client!.blurhash(id!), enabled: !!id && !!client, staleTime: Infinity, retry: 0 });
  const rgb = q.data ? average(q.data) : null;
  return rgb ? tint(rgb, dark) : undefined;
}

function Wash({ color }: { color: string }) {
  const c = useColors();
  return (
    <Svg style={StyleSheet.absoluteFill} preserveAspectRatio="none">
      <Defs>
        <LinearGradient id="w" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity="1" />
          <Stop offset="0.75" stopColor={c.bg} stopOpacity="1" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#w)" />
    </Svg>
  );
}

/** Full-screen backdrop that eases from one cover colour to the next instead of cutting. */
export function Tint({ color }: { color?: string }) {
  const [layers, setLayers] = useState<{ under?: string; over?: string }>({ over: color });
  const fade = useRef(new Animated.Value(1)).current;
  const cur = useRef(color);
  useEffect(() => {
    if (cur.current === color) return;
    setLayers({ under: cur.current, over: color });
    cur.current = color;
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 700, useNativeDriver: true }).start(({ finished }) => { if (finished) setLayers({ over: color }); });
  }, [color]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      {layers.under && <Animated.View pointerEvents="none" style={StyleSheet.absoluteFill}><Wash color={layers.under} /></Animated.View>}
      {layers.over && <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: fade }]}><Wash color={layers.over} /></Animated.View>}
    </>
  );
}

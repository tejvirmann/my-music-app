import { Text, type TextProps, type TextStyle } from 'react-native';

import { F, useColors } from './theme';

type V = 'body' | 'med' | 'mute' | 'small' | 'label' | 'h1' | 'h2' | 'h3';

const base: Record<V, TextStyle> = {
  body: { fontFamily: F.mono, fontSize: 13, lineHeight: 19 },
  med: { fontFamily: F.monoMed, fontSize: 13, lineHeight: 19 },
  mute: { fontFamily: F.mono, fontSize: 13, lineHeight: 19 },
  small: { fontFamily: F.mono, fontSize: 11, lineHeight: 15 },
  label: { fontFamily: F.mono, fontSize: 10, letterSpacing: 1.1, textTransform: 'uppercase' },
  h1: { fontFamily: F.serif, fontSize: 40, lineHeight: 42 },
  h2: { fontFamily: F.serif, fontSize: 32, lineHeight: 34 },
  h3: { fontFamily: F.serif, fontSize: 21, lineHeight: 26 },
};

/** The app's one text component. v picks the type style; colour follows the theme unless overridden. */
export function Txt({ v = 'body', color, style, ...p }: TextProps & { v?: V; color?: string }) {
  const c = useColors();
  const col = color ?? (v === 'mute' || v === 'small' || v === 'label' ? c.mute : c.fg);
  return <Text allowFontScaling={false} {...p} style={[base[v], { color: col }, style]} />;
}

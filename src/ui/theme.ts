import Storage from 'expo-sqlite/kv-store';
import { useMemo } from 'react';
import { Appearance, useColorScheme } from 'react-native';
import { create } from 'zustand';

/** "Index of sound" palette: warm paper in light, near-black in dark, one vermillion accent. */
export interface Palette { bg: string; fg: string; mute: string; line: string; card: string; accent: string; ok: string; dim: string }
const light: Palette = { bg: '#f4f1ea', fg: '#141414', mute: '#76726a', line: '#d9d4c8', card: '#ebe7dc', accent: '#d8431f', ok: '#2f9460', dim: 'rgba(0,0,0,.45)' };
const dark: Palette = { bg: '#0f0f0e', fg: '#ece8dd', mute: '#8a867c', line: '#2a2927', card: '#191917', accent: '#ff6a3d', ok: '#3fa86b', dim: 'rgba(0,0,0,.6)' };

export type Mode = 'light' | 'dark' | 'system';
const readMode = (): Mode => (Storage.getItemSync('themeMode') as Mode) || 'system';
const apply = (m: Mode) => Appearance.setColorScheme(m === 'system' ? 'unspecified' : m);

/** Choice persists locally. Appearance override makes the whole OS chrome (keyboard, alerts) follow it too. */
export const useThemeMode = create<{ mode: Mode; setMode: (m: Mode) => void }>((set) => {
  const mode = readMode();
  apply(mode);
  return { mode, setMode: (m) => { Storage.setItemSync('themeMode', m); apply(m); set({ mode: m }); } };
});

export function useColors(): Palette {
  return useColorScheme() === 'light' ? light : dark;
}
export const useIsDark = () => useColorScheme() !== 'light';

/** Memoised per palette so components can write StyleSheet-style objects without re-creating them every render. */
export function useStyles<T>(make: (c: Palette) => T): T {
  const c = useColors();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => make(c), [c]);
}

export const F = {
  mono: 'DMMono_400Regular',
  monoLight: 'DMMono_300Light',
  monoMed: 'DMMono_500Medium',
  serif: 'InstrumentSerif_400Regular_Italic',
} as const;

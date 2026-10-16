import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MiniPlayer } from './MiniPlayer';
import { Txt } from './text';
import { useColors } from './theme';

/** Mini-player on top, then plain lowercase tabs with an underline on the active one. */
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const c = useColors();
  const inset = useSafeAreaInsets();
  return (
    <View style={{ backgroundColor: c.bg, paddingBottom: inset.bottom }}>
      <MiniPlayer />
      <View style={{ flexDirection: 'row', justifyContent: 'space-around', borderTopWidth: 1, borderTopColor: c.line, paddingTop: 4 }}>
        {state.routes.map((r, i) => {
          const on = state.index === i;
          return (
            <Pressable key={r.key} accessibilityRole="tab" accessibilityState={{ selected: on }}
              onPress={() => { const e = navigation.emit({ type: 'tabPress', target: r.key, canPreventDefault: true }); if (!on && !e.defaultPrevented) navigation.navigate(r.name); }}
              style={{ paddingHorizontal: 14, paddingVertical: 10 }}>
              <View style={{ borderBottomWidth: 1, borderBottomColor: on ? c.fg : 'transparent', paddingBottom: 2 }}>
                <Txt color={on ? c.fg : c.mute} style={on ? { fontFamily: 'DMMono_500Medium' } : undefined}>{r.name.toLowerCase()}</Txt>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

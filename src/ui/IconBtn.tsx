import { Pressable, type ViewStyle } from 'react-native';

import { Icon, type IconName } from './Icon';

export function IconBtn({ name, onPress, size = 22, color, label, style }: { name: IconName; onPress: () => void; size?: number; color?: string; label: string; style?: ViewStyle }) {
  return (
    <Pressable onPress={onPress} hitSlop={10} accessibilityLabel={label} accessibilityRole="button" style={({ pressed }) => [{ padding: 4, opacity: pressed ? 0.5 : 1 }, style]}>
      <Icon name={name} size={size} color={color} />
    </Pressable>
  );
}

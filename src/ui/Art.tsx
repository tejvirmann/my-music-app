import { Image } from 'expo-image';
import { useState } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { Icon } from './Icon';
import { useColors } from './theme';

/** Square cover. Disk-cached; shows a quiet placeholder when there is no image (or it fails to load). */
export function Art({ uri, size, style }: { uri?: string; size?: number; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  const [failed, setFailed] = useState(false);
  const box: ViewStyle = size ? { width: size, height: size } : { width: '100%', aspectRatio: 1 };
  return (
    <View style={[box, { backgroundColor: c.card, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }, style]}>
      {(!uri || failed) && <Icon name="queue" size={size ? Math.max(14, size * 0.35) : 28} color={c.line} />}
      {!!uri && !failed && (
        <Image source={{ uri }} style={{ position: 'absolute', width: '100%', height: '100%' }} cachePolicy="disk" recyclingKey={uri}
          transition={150} contentFit="cover" onError={() => setFailed(true)} />
      )}
    </View>
  );
}

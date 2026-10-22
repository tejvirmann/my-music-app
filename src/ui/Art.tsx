import { Image } from 'expo-image';
import { useState } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { DEFAULT_COVER, useCovers } from '../state/covers';
import { useSettings } from '../state/settings';
import { unownFor } from '../unown';
import { Icon } from './Icon';
import { useColors } from './theme';

/** An Unown for the name's first letter: white on black, or (Settings) white on a steady per-name colour. */
export function UnownTile({ name, size, box }: { name: string; size?: number; box: object }) {
  const color = useSettings((x) => x.unownColor);
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return (
    <View style={[box, { backgroundColor: color ? `hsl(${h}, 32%, 38%)` : '#000', alignItems: 'center', justifyContent: 'center' }]}>
      <Image source={unownFor(name)} tintColor="#fff" contentFit="contain" style={{ width: size ? size * 0.7 : '70%', height: size ? size * 0.7 : '70%' }} />
    </View>
  );
}

/** Square cover. Disk-cached; when there is no image (or it fails to load) it shows the default image from Settings, else a quiet placeholder. With `name` (and the Unown setting on) a missing image becomes that name's Unown. */
export function Art({ uri, size, style, name }: { uri?: string; size?: number; style?: StyleProp<ViewStyle>; name?: string }) {
  const c = useColors();
  // Remember which address failed, not just that something failed: this component is reused as the song changes, and a flag left over from
  // a song with no art used to hide the next song's art.
  const [failedUri, setFailedUri] = useState<string>();
  const failed = !!uri && failedUri === uri;
  const unownOn = useSettings((x) => x.unownCovers);
  const fallback = useCovers((m) => m.map[DEFAULT_COVER.art]);
  const box: ViewStyle = size ? { width: size, height: size } : { width: '100%', aspectRatio: 1 };
  if ((!uri || failed) && name && unownOn) return <UnownTile name={name} size={size} box={[box, style]} />;
  return (
    <View style={[box, { backgroundColor: c.card, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }, style]}>
      {(!uri || failed) && !!fallback && <Image source={{ uri: fallback }} style={{ position: 'absolute', width: '100%', height: '100%' }} cachePolicy="disk" contentFit="cover" />}
      {(!uri || failed) && !fallback && <Icon name="queue" size={size ? Math.max(14, size * 0.35) : 28} color={c.line} />}
      {!!uri && !failed && (
        <Image key={uri} source={{ uri }} style={{ position: 'absolute', width: '100%', height: '100%' }} cachePolicy="disk" recyclingKey={uri}
          transition={150} contentFit="cover" onError={() => setFailedUri(uri)} />
      )}
    </View>
  );
}

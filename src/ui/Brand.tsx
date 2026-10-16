import { Image } from 'expo-image';
import { View } from 'react-native';

import { useSettings } from '../state/settings';
import { Txt } from './text';
import { F, useColors } from './theme';

/** The in-app logo: the user's chosen image, or the first letter of the app name in a hairline box. */
export function Logo({ size = 28 }: { size?: number }) {
  const c = useColors();
  const { appImage, appName } = useSettings();
  if (appImage) return <Image source={{ uri: appImage }} style={{ width: size, height: size }} contentFit="cover" />;
  return (
    <View style={{ width: size, height: size, borderWidth: 1, borderColor: c.fg, alignItems: 'center', justifyContent: 'center' }}>
      <Txt style={{ fontFamily: F.serif, fontSize: size * 0.55, lineHeight: size * 0.7 }}>{appName.trim()[0] ?? '·'}</Txt>
    </View>
  );
}

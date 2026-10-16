import { Image } from 'expo-image';

import { APP_ICONS } from '../brand';
import { useAppIcon } from '../state/icon';

/** The icon currently on the home screen, so the in-app logo always matches it. */
export function Logo({ size = 28 }: { size?: number }) {
  const id = useAppIcon((s) => s.id);
  const icon = APP_ICONS.find((i) => i.id === id) ?? APP_ICONS[0];
  return <Image source={icon.source} style={{ width: size, height: size, borderRadius: size * 0.22 }} contentFit="cover" />;
}

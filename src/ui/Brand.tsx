import { Image } from 'expo-image';

import { APP_ICON } from '../brand';

/** The app icon, as shown on the home screen. */
export function Logo({ size = 28 }: { size?: number }) {
  return <Image source={APP_ICON} style={{ width: size, height: size, borderRadius: size * 0.22 }} contentFit="cover" />;
}

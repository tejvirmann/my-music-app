import * as SecureStore from 'expo-secure-store';

import type { LidarrConfig } from '../api/lidarr';

const KEY = 'lidarr_config';
export async function loadLidarr(): Promise<LidarrConfig | null> {
  const raw = await SecureStore.getItemAsync(KEY);
  return raw ? (JSON.parse(raw) as LidarrConfig) : null;
}
export const saveLidarr = (c: LidarrConfig) => SecureStore.setItemAsync(KEY, JSON.stringify(c));
export const clearLidarr = () => SecureStore.deleteItemAsync(KEY);

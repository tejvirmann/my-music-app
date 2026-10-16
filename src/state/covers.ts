import * as ImagePicker from 'expo-image-picker';
import { Directory, File, Paths } from 'expo-file-system';
import Storage from 'expo-sqlite/kv-store';
import { create } from 'zustand';

const KEY = 'playlistCovers';
const read = (): Record<string, string> => { try { return JSON.parse(Storage.getItemSync(KEY) ?? '{}'); } catch { return {}; } };
const dir = new Directory(Paths.document, 'covers');

/** Custom playlist covers, stored on the phone (playlist id -> local file). Playlists without one get an auto collage. */
export const useCovers = create<{ map: Record<string, string> }>(() => ({ map: read() }));

const save = (map: Record<string, string>) => { Storage.setItemSync(KEY, JSON.stringify(map)); useCovers.setState({ map }); };

/** Opens the photo library, square-crop, keeps a copy in app storage. Returns false if cancelled. */
export async function pickCover(playlistId: string): Promise<boolean> {
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7 });
  if (res.canceled || !res.assets[0]) return false;
  if (!dir.exists) dir.create({ intermediates: true });
  const dest = new File(dir, `${playlistId}-${Date.now()}.jpg`); // new name each time so image caches refresh
  new File(res.assets[0].uri).copy(dest);
  const old = useCovers.getState().map[playlistId];
  save({ ...useCovers.getState().map, [playlistId]: dest.uri });
  if (old) { try { new File(old).delete(); } catch {} }
  return true;
}

export function clearCover(playlistId: string) {
  const { [playlistId]: old, ...rest } = useCovers.getState().map;
  save(rest);
  if (old) { try { new File(old).delete(); } catch {} }
}

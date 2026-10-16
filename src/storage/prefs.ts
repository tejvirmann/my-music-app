import Storage from 'expo-sqlite/kv-store';

/** Local-only preferences. Hiding a playlist never touches the server. */
export function getHiddenPlaylists(): string[] {
  const raw = Storage.getItemSync('hiddenPlaylistIds');
  return raw ? JSON.parse(raw) : [];
}
export function setHiddenPlaylists(ids: string[]) {
  Storage.setItemSync('hiddenPlaylistIds', JSON.stringify(ids));
}

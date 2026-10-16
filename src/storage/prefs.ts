import Storage from 'expo-sqlite/kv-store';

/** Local-only preferences. Hiding a playlist never touches the server. */
export function getHiddenPlaylists(): string[] {
  const raw = Storage.getItemSync('hiddenPlaylistIds');
  return raw ? JSON.parse(raw) : [];
}
export function setHiddenPlaylists(ids: string[]) {
  Storage.setItemSync('hiddenPlaylistIds', JSON.stringify(ids));
}

export const getLastServerUrl = (): string => Storage.getItemSync('lastServerUrl') ?? '';
export const setLastServerUrl = (u: string) => Storage.setItemSync('lastServerUrl', u);

/** Pinned playlists (local-only, shown first in Library, in pin order). */
export function getPinnedPlaylists(): string[] {
  const raw = Storage.getItemSync('pinnedPlaylistIds');
  return raw ? JSON.parse(raw) : [];
}
export function setPinnedPlaylists(ids: string[]) {
  Storage.setItemSync('pinnedPlaylistIds', JSON.stringify(ids));
}

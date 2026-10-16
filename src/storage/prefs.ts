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

/** Albums requested through Lidarr with "like when it arrives". Matched against Jellyfin later. */
export interface PendingLike { artist: string; title: string }
export function getPendingLikes(): PendingLike[] {
  const raw = Storage.getItemSync('pendingLikes');
  return raw ? JSON.parse(raw) : [];
}
export function setPendingLikes(v: PendingLike[]) {
  Storage.setItemSync('pendingLikes', JSON.stringify(v));
}

export const getShowDiscover = (): boolean => Storage.getItemSync('showDiscover') !== '0';
export const setShowDiscover = (v: boolean) => Storage.setItemSync('showDiscover', v ? '1' : '0');

/** Home greeting: hidden, automatic (by time of day, when text is empty) or custom text. */
export const getShowGreeting = (): boolean => Storage.getItemSync('showGreeting') !== '0';
export const setShowGreeting = (v: boolean) => Storage.setItemSync('showGreeting', v ? '1' : '0');
export const getGreetingText = (): string => Storage.getItemSync('greetingText') ?? '';
export const setGreetingText = (v: string) => Storage.setItemSync('greetingText', v);

/** Recently played songs (local history, newest first). */
export function getRecentTracks(): import('../api/types').JfItem[] {
  const raw = Storage.getItemSync('recentTracks');
  return raw ? JSON.parse(raw) : [];
}
export function setRecentTracks(v: import('../api/types').JfItem[]) {
  Storage.setItemSync('recentTracks', JSON.stringify(v));
}

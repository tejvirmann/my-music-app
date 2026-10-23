import { type PersistedClient, type Persister } from '@tanstack/react-query-persist-client';
import Storage from 'expo-sqlite/kv-store';

const KEY = 'queryCache';

/** Library queries worth showing instantly on the next launch. The big search indexes are rebuilt instead. */
const PERSISTED = new Set(['playlists', 'playlist', 'albums', 'album', 'recentAlbums', 'recentSongs', 'liked', 'sameArt', 'playlistCover', 'playlistIds', 'blur']);
export const shouldPersist = (key: readonly unknown[]) => PERSISTED.has(String(key[0]));

let latest: PersistedClient | undefined;
let timer: ReturnType<typeof setTimeout> | undefined;

export const queryPersister: Persister = {
  // Trailing throttle: the cache can be large, so don't re-serialise it on every query update.
  persistClient: (c: PersistedClient) => {
    latest = c;
    if (timer) return;
    timer = setTimeout(() => { timer = undefined; if (latest) Storage.setItem(KEY, JSON.stringify(latest)).catch(() => {}); }, 5000);
  },
  restoreClient: async () => {
    try { const raw = await Storage.getItem(KEY); return raw ? (JSON.parse(raw) as PersistedClient) : undefined; } catch { return undefined; }
  },
  removeClient: () => { Storage.removeItem(KEY).catch(() => {}); },
};

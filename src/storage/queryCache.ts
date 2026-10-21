import { type PersistedClient, type Persister } from '@tanstack/react-query-persist-client';
import Storage from 'expo-sqlite/kv-store';

const KEY = 'queryCache';

/** Library queries worth showing instantly on the next launch. The big search indexes are rebuilt instead. */
const PERSISTED = new Set(['playlists', 'playlist', 'albums', 'album', 'recentAlbums', 'recentSongs', 'liked', 'sameArt']);
export const shouldPersist = (key: readonly unknown[]) => PERSISTED.has(String(key[0]));

export const queryPersister: Persister = {
  persistClient: (c: PersistedClient) => { Storage.setItem(KEY, JSON.stringify(c)).catch(() => {}); },
  restoreClient: async () => {
    try { const raw = await Storage.getItem(KEY); return raw ? (JSON.parse(raw) as PersistedClient) : undefined; } catch { return undefined; }
  },
  removeClient: () => { Storage.removeItem(KEY).catch(() => {}); },
};

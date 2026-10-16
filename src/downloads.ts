import * as SQLite from 'expo-sqlite';
import { create } from 'zustand';
import { Image } from 'expo-image';
import { Directory, File, Paths } from 'expo-file-system';

import type { JellyfinClient } from './api/jellyfin';
import type { JfItem } from './api/types';

/**
 * Pinned offline downloads (separate from any streaming cache).
 * Tracks are reference-counted by playlist: undownloading a playlist only
 * deletes files no other downloaded playlist still needs.
 */
const db = SQLite.openDatabaseSync('downloads.db');
db.execSync(`
  CREATE TABLE IF NOT EXISTS tracks (id TEXT PRIMARY KEY, path TEXT NOT NULL, size INTEGER DEFAULT 0);
  CREATE TABLE IF NOT EXISTS playlist_tracks (playlist_id TEXT NOT NULL, track_id TEXT NOT NULL, PRIMARY KEY (playlist_id, track_id));
  CREATE TABLE IF NOT EXISTS downloaded_playlists (playlist_id TEXT PRIMARY KEY);
`);

/** UI state: `rev` bumps whenever downloads change; `progress` is "done/total" per playlist in flight. */
const useStore = create<{ rev: number; progress: Record<string, string> }>(() => ({ rev: 0, progress: {} }));
const bump = () => useStore.setState((s) => ({ rev: s.rev + 1 }));
const setProgress = (id: string, v?: string) =>
  useStore.setState((s) => {
    const progress = { ...s.progress };
    if (v) progress[id] = v; else delete progress[id];
    return { progress, rev: s.rev + 1 };
  });

/** One SQL read per change, shared by every row on screen (rows used to each query on every progress tick). */
const memo = <T,>(read: () => T) => {
  let rev = -1, val: T;
  return (r: number) => { if (r !== rev) { val = read(); rev = r; } return val; };
};
const playlistSet = memo(() => new Set(db.getAllSync<{ playlist_id: string }>('SELECT playlist_id FROM downloaded_playlists').map((r) => r.playlist_id)));
const trackSet = memo(() => new Set(db.getAllSync<{ id: string }>('SELECT id FROM tracks').map((r) => r.id)));

/** Keys of playlists / albums / songs whose download finished. Re-renders when downloads change. */
export function useDownloadedPlaylists(): Set<string> {
  return playlistSet(useStore((s) => s.rev));
}
/** Ids of tracks stored on the device. */
export function useDownloadedTracks(): Set<string> {
  return trackSet(useStore((s) => s.rev));
}
/** "3/20" while a playlist is downloading, else undefined. */
export const useDownloadProgress = (playlistId: string): string | undefined => useStore((s) => s.progress[playlistId]);

const dir = new Directory(Paths.document, 'downloads');

export function localPath(trackId: string): string | null {
  const row = db.getFirstSync<{ path: string }>('SELECT path FROM tracks WHERE id = ?', trackId);
  return row?.path ?? null;
}

export function totalBytes(): number {
  return db.getFirstSync<{ n: number }>('SELECT COALESCE(SUM(size),0) AS n FROM tracks')?.n ?? 0;
}

/** Sequential on purpose: gentle on the home server. */
export async function downloadPlaylist(
  client: JellyfinClient,
  playlistId: string,
  tracks: JfItem[],
  onProgress?: (done: number, total: number) => void,
) {
  if (useStore.getState().progress[playlistId]) return; // already running
  dir.create({ idempotent: true, intermediates: true });
  // Warm the on-disk image cache so artwork also shows offline.
  const artIds = [...new Set(tracks.map((t) => t.AlbumId ?? t.Id))];
  Image.prefetch(artIds.flatMap((id) => [client.imageUrl(id, 160), client.imageUrl(id, 640)]), 'disk').catch(() => {});
  let done = 0;
  setProgress(playlistId, `0/${tracks.length}`);
  try {
    for (const t of tracks) {
      if (!localPath(t.Id)) {
        const file = await File.downloadFileAsync(client.streamUrl(t.Id), new File(dir, `${t.Id}.audio`), { idempotent: true });
        db.runSync('INSERT OR REPLACE INTO tracks (id, path, size) VALUES (?, ?, ?)', t.Id, file.uri, file.size ?? 0);
      }
      db.runSync('INSERT OR IGNORE INTO playlist_tracks (playlist_id, track_id) VALUES (?, ?)', playlistId, t.Id);
      onProgress?.(++done, tracks.length);
      setProgress(playlistId, `${done}/${tracks.length}`);
    }
    db.runSync('INSERT OR IGNORE INTO downloaded_playlists (playlist_id) VALUES (?)', playlistId);
  } finally {
    setProgress(playlistId, undefined);
  }
}

export function removePlaylistDownload(playlistId: string) {
  db.runSync('DELETE FROM playlist_tracks WHERE playlist_id = ?', playlistId);
  db.runSync('DELETE FROM downloaded_playlists WHERE playlist_id = ?', playlistId);
  const orphans = db.getAllSync<{ id: string; path: string }>(
    'SELECT id, path FROM tracks WHERE id NOT IN (SELECT track_id FROM playlist_tracks)',
  );
  for (const o of orphans) {
    try { new File(o.path).delete(); } catch {}
    db.runSync('DELETE FROM tracks WHERE id = ?', o.id);
  }
  bump();
}

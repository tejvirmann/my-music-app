import * as SQLite from 'expo-sqlite';
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
`);

const dir = new Directory(Paths.document, 'downloads');

export function localPath(trackId: string): string | null {
  const row = db.getFirstSync<{ path: string }>('SELECT path FROM tracks WHERE id = ?', trackId);
  return row?.path ?? null;
}

export function isPlaylistDownloaded(playlistId: string, trackIds: string[]) {
  if (!trackIds.length) return false;
  const rows = db.getAllSync<{ track_id: string }>('SELECT track_id FROM playlist_tracks WHERE playlist_id = ?', playlistId);
  return trackIds.every((id) => rows.some((r) => r.track_id === id));
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
  dir.create({ idempotent: true, intermediates: true });
  let done = 0;
  for (const t of tracks) {
    if (!localPath(t.Id)) {
      const file = await File.downloadFileAsync(client.streamUrl(t.Id), new File(dir, `${t.Id}.audio`), { idempotent: true });
      db.runSync('INSERT OR REPLACE INTO tracks (id, path, size) VALUES (?, ?, ?)', t.Id, file.uri, file.size ?? 0);
    }
    db.runSync('INSERT OR IGNORE INTO playlist_tracks (playlist_id, track_id) VALUES (?, ?)', playlistId, t.Id);
    onProgress?.(++done, tracks.length);
  }
}

export function removePlaylistDownload(playlistId: string) {
  db.runSync('DELETE FROM playlist_tracks WHERE playlist_id = ?', playlistId);
  const orphans = db.getAllSync<{ id: string; path: string }>(
    'SELECT id, path FROM tracks WHERE id NOT IN (SELECT track_id FROM playlist_tracks)',
  );
  for (const o of orphans) {
    try { new File(o.path).delete(); } catch {}
    db.runSync('DELETE FROM tracks WHERE id = ?', o.id);
  }
}

import * as SQLite from 'expo-sqlite';
import { create } from 'zustand';
import { Image } from 'expo-image';
import { Directory, File, Paths } from 'expo-file-system';

import type { JellyfinClient } from './api/jellyfin';
import type { ItemsResponse, JfItem } from './api/types';
import { isOffline } from './state/offline';

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
  CREATE TABLE IF NOT EXISTS dl_meta (key TEXT PRIMARY KEY, kind TEXT NOT NULL, name TEXT NOT NULL, artist TEXT, year INTEGER, count INTEGER DEFAULT 0, ordered INTEGER DEFAULT 0);
`);
// What the offline screens need: each song's details, and each song's place in its playlist/album. Added to databases made by earlier builds.
for (const sql of ['ALTER TABLE tracks ADD COLUMN meta TEXT', 'ALTER TABLE playlist_tracks ADD COLUMN pos INTEGER DEFAULT 0']) { try { db.execSync(sql); } catch {} }

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

/** Files are saved with their real extension: the native player picks a decoder from it, and an unknown one (.audio) won't play. */
function extFor(container?: string) {
  const c = (container ?? '').toLowerCase();
  if (/m4a|mp4|mov/.test(c)) return 'm4a';
  if (/flac|ogg|opus|wav|aac|mp3|wma/.test(c)) return c.match(/flac|ogg|opus|wav|aac|mp3|wma/)![0];
  return c.split(',')[0] || 'mp3';
}

// Earlier builds saved downloads as ".audio", which never played. Drop them (and any playlist that used one) so they can be downloaded again.
(() => {
  const stale = db.getAllSync<{ id: string; path: string }>("SELECT id, path FROM tracks WHERE path LIKE '%.audio'");
  if (!stale.length) return;
  for (const t of stale) {
    try { new File(t.path).delete(); } catch {}
    db.runSync('DELETE FROM playlist_tracks WHERE playlist_id IN (SELECT playlist_id FROM playlist_tracks WHERE track_id = ?)', t.id);
    db.runSync('DELETE FROM tracks WHERE id = ?', t.id);
  }
  db.runSync('DELETE FROM downloaded_playlists WHERE playlist_id NOT IN (SELECT playlist_id FROM playlist_tracks)');
})();

export function localPath(trackId: string): string | null {
  const row = db.getFirstSync<{ path: string }>('SELECT path FROM tracks WHERE id = ?', trackId);
  if (!row) return null;
  // iOS moves the app container on updates/reinstalls, so a saved absolute path goes stale: rebuild it from the file name.
  const f = new File(dir, row.path.split('/').pop()!);
  return f.exists ? f.uri : null;
}

export function totalBytes(): number {
  return db.getFirstSync<{ n: number }>('SELECT COALESCE(SUM(size),0) AS n FROM tracks')?.n ?? 0;
}

export type DlInfo = { kind: 'playlist' | 'album' | 'song'; name: string };

/** Sequential on purpose: gentle on the home server. Progress reads "3/13 · 45%" (songs done, and how far the current one is). */
export async function downloadPlaylist(
  client: JellyfinClient,
  playlistId: string,
  tracks: JfItem[],
  onProgress?: (done: number, total: number) => void,
  info?: DlInfo,
) {
  if (useStore.getState().progress[playlistId]) return; // already running
  dir.create({ idempotent: true, intermediates: true });
  // Warm the on-disk image cache so artwork also shows offline.
  const artIds = [...new Set(tracks.map((t) => t.AlbumId ?? t.Id))];
  Image.prefetch(artIds.flatMap((id) => [160, 320, 640].map((w) => client.imageUrl(id, w))), 'disk').catch(() => {});
  let done = 0;
  const total = tracks.length;
  setProgress(playlistId, `0/${total}`);
  try {
    for (const [pos, t] of tracks.entries()) {
      if (!localPath(t.Id)) {
        const container = (t.MediaSources ?? (await client.item(t.Id).catch(() => undefined))?.MediaSources)?.[0]?.Container;
        let last = -1;
        const file = await File.downloadFileAsync(client.streamUrl(t.Id), new File(dir, `${t.Id}.${extFor(container)}`), {
          idempotent: true,
          onProgress: ({ bytesWritten, totalBytes }) => {
            if (totalBytes <= 0) return;
            const pct = Math.min(99, Math.floor((bytesWritten / totalBytes) * 20) * 5);
            if (pct !== last) { last = pct; setProgress(playlistId, `${done}/${total} · ${pct}%`); }
          },
        });
        db.runSync('INSERT OR REPLACE INTO tracks (id, path, size) VALUES (?, ?, ?)', t.Id, file.uri, file.size ?? 0);
      }
      const { MediaSources: _ms, ...slim } = t;
      db.runSync('UPDATE tracks SET meta = ? WHERE id = ?', JSON.stringify(slim), t.Id);
      db.runSync('INSERT OR REPLACE INTO playlist_tracks (playlist_id, track_id, pos) VALUES (?, ?, ?)', playlistId, t.Id, pos);
      onProgress?.(++done, total);
      setProgress(playlistId, `${done}/${total}`);
    }
    db.runSync('INSERT OR IGNORE INTO downloaded_playlists (playlist_id) VALUES (?)', playlistId);
    if (info) {
      const first = tracks[0];
      db.runSync('INSERT OR REPLACE INTO dl_meta (key, kind, name, artist, year, count, ordered) VALUES (?, ?, ?, ?, ?, ?, 1)',
        playlistId, info.kind, info.name, first?.AlbumArtist ?? first?.Artists?.[0] ?? null, first?.ProductionYear ?? null, total);
    }
  } finally {
    setProgress(playlistId, undefined);
  }
}

// ---- Offline reads: everything below answers from this database, never from the network. ----

const parse = (rows: { meta: string }[]) => rows.map((r) => JSON.parse(r.meta) as JfItem);

/** A downloaded playlist/album/song's tracks in order, or null if it was never downloaded (or predates offline details). */
export function localTracks(key: string): JfItem[] | null {
  const rows = db.getAllSync<{ meta: string }>(
    'SELECT t.meta FROM playlist_tracks p JOIN tracks t ON t.id = p.track_id WHERE p.playlist_id = ? AND t.meta IS NOT NULL ORDER BY p.pos', key);
  return rows.length ? parse(rows) : null;
}

/** Same shape as a Jellyfin list response, so a screen can use it as a drop-in. */
export function localResponse(key: string): ItemsResponse | null {
  const items = localTracks(key);
  return items ? { Items: items, TotalRecordCount: items.length } : null;
}

/** Network first, but the downloaded copy when offline, or when the request fails. */
export async function orLocal(key: string, net: () => Promise<ItemsResponse>): Promise<ItemsResponse> {
  const local = localResponse(key);
  if (local && isOffline()) return local;
  try { return await net(); } catch (e) { if (local) return local; throw e; }
}

const collections = (kind: DlInfo['kind']) => memo(() => db.getAllSync<{ key: string; name: string; artist: string | null; year: number | null; count: number }>(
  'SELECT m.key, m.name, m.artist, m.year, m.count FROM dl_meta m JOIN downloaded_playlists d ON d.playlist_id = m.key WHERE m.kind = ? ORDER BY m.name COLLATE NOCASE', kind));
const playlistRows = collections('playlist'), albumRows = collections('album');

/** Downloaded playlists as Jellyfin-style items, for the offline Home / Library / Search. */
export function useLocalPlaylists(): JfItem[] {
  return playlistRows(useStore((s) => s.rev)).map((r) => ({ Id: r.key, Name: r.name, Type: 'Playlist', ChildCount: r.count }));
}
export function useLocalAlbums(): JfItem[] {
  return albumRows(useStore((s) => s.rev)).map((r) => ({ Id: r.key.replace(/^album:/, ''), Name: r.name, Type: 'MusicAlbum', AlbumArtist: r.artist ?? undefined, ProductionYear: r.year ?? undefined, ChildCount: r.count }));
}

let backfilling = false;
/**
 * Downloads made before offline support have files but no song details, names or order. While online, fill those in from Jellyfin
 * once, so they show up offline too.
 */
export async function backfillOfflineMeta(client: JellyfinClient) {
  if (backfilling) return;
  backfilling = true;
  try {
    const missing = db.getAllSync<{ id: string }>('SELECT id FROM tracks WHERE meta IS NULL').map((r) => r.id);
    for (let i = 0; i < missing.length; i += 50) {
      const r = await client.itemsByIds(missing.slice(i, i + 50));
      for (const t of r.Items) { const { MediaSources: _ms, ...slim } = t; db.runSync('UPDATE tracks SET meta = ? WHERE id = ?', JSON.stringify(slim), t.Id); }
    }
    const keys = db.getAllSync<{ playlist_id: string }>(
      'SELECT d.playlist_id FROM downloaded_playlists d LEFT JOIN dl_meta m ON m.key = d.playlist_id WHERE m.key IS NULL OR m.ordered = 0').map((r) => r.playlist_id);
    for (const key of keys) {
      const kind: DlInfo['kind'] = key.startsWith('album:') ? 'album' : key.startsWith('song:') ? 'song' : 'playlist';
      const id = key.replace(/^(album|song):/, '');
      const list = kind === 'song' ? { Items: [await client.item(id)] } : kind === 'album' ? await client.albumTracks(id) : await client.playlistTracks(id);
      list.Items.forEach((t, pos) => db.runSync('UPDATE playlist_tracks SET pos = ? WHERE playlist_id = ? AND track_id = ?', pos, key, t.Id));
      const name = kind === 'song' ? list.Items[0]?.Name : kind === 'album' ? list.Items[0]?.Album : (await client.playlists()).Items.find((p) => p.Id === id)?.Name;
      if (!name) continue;
      const first = list.Items[0];
      db.runSync('INSERT OR REPLACE INTO dl_meta (key, kind, name, artist, year, count, ordered) VALUES (?, ?, ?, ?, ?, ?, 1)',
        key, kind, name, first?.AlbumArtist ?? first?.Artists?.[0] ?? null, first?.ProductionYear ?? null, list.Items.length);
    }
    if (missing.length || keys.length) bump();
  } catch { /* offline or server busy: try again next launch */ } finally { backfilling = false; }
}

export function removePlaylistDownload(playlistId: string) {
  db.runSync('DELETE FROM playlist_tracks WHERE playlist_id = ?', playlistId);
  db.runSync('DELETE FROM downloaded_playlists WHERE playlist_id = ?', playlistId);
  db.runSync('DELETE FROM dl_meta WHERE key = ?', playlistId);
  const orphans = db.getAllSync<{ id: string; path: string }>(
    'SELECT id, path FROM tracks WHERE id NOT IN (SELECT track_id FROM playlist_tracks)',
  );
  for (const o of orphans) {
    try { new File(o.path).delete(); } catch {}
    db.runSync('DELETE FROM tracks WHERE id = ?', o.id);
  }
  bump();
}

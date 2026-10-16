import { useQuery, type QueryClient } from '@tanstack/react-query';

import type { JellyfinClient } from './api/jellyfin';
import { useAuth } from './state/auth';
import { getPendingLikes, setPendingLikes, type PendingLike } from './storage/prefs';

/** "Liked" is just a normal Jellyfin playlist with this name, so it syncs everywhere. */
export const LIKED_NAME = 'Liked Songs';

export interface LikedData { playlistId?: string; entries: Record<string, string> } // trackId -> PlaylistItemId

export async function loadLiked(client: JellyfinClient): Promise<LikedData> {
  const pl = (await client.playlists()).Items.find((p) => p.Name === LIKED_NAME);
  if (!pl) return { entries: {} };
  const entries: Record<string, string> = {};
  for (const t of (await client.playlistTracks(pl.Id)).Items) if (t.PlaylistItemId) entries[t.Id] = t.PlaylistItemId;
  return { playlistId: pl.Id, entries };
}

export function useLiked() {
  const client = useAuth((a) => a.client)!;
  return useQuery({ queryKey: ['liked'], queryFn: () => loadLiked(client), staleTime: 30_000 });
}

/** Like or unlike tracks. Creates the Liked playlist on first like. Throws on server error. */
export async function setLiked(client: JellyfinClient, qc: QueryClient, trackIds: string[], like: boolean) {
  const cur = await qc.fetchQuery({ queryKey: ['liked'], queryFn: () => loadLiked(client), staleTime: 0 });
  if (like) {
    const add = trackIds.filter((id) => !cur.entries[id]);
    if (add.length) {
      if (cur.playlistId) await client.addToPlaylist(cur.playlistId, add);
      else await client.createPlaylist(LIKED_NAME, add);
    }
  } else if (cur.playlistId) {
    const entryIds = trackIds.map((id) => cur.entries[id]).filter(Boolean);
    if (entryIds.length) await client.removeFromPlaylist(cur.playlistId, entryIds);
  }
  await qc.invalidateQueries({ queryKey: ['liked'] });
  qc.invalidateQueries({ queryKey: ['playlists'] });
  if (cur.playlistId) qc.invalidateQueries({ queryKey: ['playlist', cur.playlistId] });
}

const norm = (x: string) => x.toLowerCase().replace(/[^a-z0-9]/g, '');

/** For albums requested with "like when it arrives": once Jellyfin has the album, like all its tracks. Safe to call often. */
export async function processPendingLikes(client: JellyfinClient, qc: QueryClient) {
  const pending = getPendingLikes();
  if (!pending.length) return;
  const left: PendingLike[] = [];
  for (const p of pending) {
    try {
      const found = (await client.albums(0, 10, p.title)).Items.find(
        (a) => norm(a.Name) === norm(p.title) && (!a.AlbumArtist || norm(a.AlbumArtist).includes(norm(p.artist)) || norm(p.artist).includes(norm(a.AlbumArtist))),
      );
      if (!found) { left.push(p); continue; }
      await setLiked(client, qc, (await client.albumTracks(found.Id)).Items.map((t) => t.Id), true);
    } catch { left.push(p); }
  }
  setPendingLikes(left);
}

import TrackPlayer, { type Track } from 'react-native-track-player';

import type { JellyfinClient } from '../api/jellyfin';
import type { JfItem } from '../api/types';
import { localPath } from '../downloads';

/** Prefers the downloaded file; otherwise streams directly from Jellyfin. */
export function toTrack(client: JellyfinClient, t: JfItem): Track {
  const art = t.AlbumId ?? t.Id;
  return {
    id: t.Id,
    url: localPath(t.Id) ?? client.streamUrl(t.Id),
    title: t.Name,
    artist: t.Artists?.join(', ') ?? t.AlbumArtist ?? '',
    album: t.Album,
    artwork: client.imageUrl(art, 600),
    duration: t.RunTimeTicks ? t.RunTimeTicks / 10_000_000 : undefined,
  };
}

/** Play Now: replaces the queue and starts at `index`. */
export async function playNow(client: JellyfinClient, items: JfItem[], index = 0) {
  await TrackPlayer.reset();
  await TrackPlayer.add(items.map((i) => toTrack(client, i)));
  await TrackPlayer.skip(index);
  await TrackPlayer.play();
}

export async function playNext(client: JellyfinClient, items: JfItem[]) {
  const current = await TrackPlayer.getActiveTrackIndex();
  await TrackPlayer.add(items.map((i) => toTrack(client, i)), (current ?? -1) + 1);
}

export async function addToQueue(client: JellyfinClient, items: JfItem[]) {
  await TrackPlayer.add(items.map((i) => toTrack(client, i)));
}

export const removeFromQueue = (index: number) => TrackPlayer.remove(index);
export const moveInQueue = (from: number, to: number) => TrackPlayer.move(from, to);
export async function clearQueue() {
  const current = await TrackPlayer.getActiveTrackIndex();
  const queue = await TrackPlayer.getQueue();
  const remove = queue.map((_, i) => i).filter((i) => i !== current);
  if (remove.length) await TrackPlayer.remove(remove);
}

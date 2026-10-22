import { useEffect } from 'react';
import TrackPlayer, { Event, RepeatMode, type Track } from 'react-native-track-player';
import { create } from 'zustand';

import type { JellyfinClient } from '../api/jellyfin';
import type { JfItem } from '../api/types';
import { localPath } from '../downloads';
import type { PlaySource } from '../storage/prefs';
import { recordSource } from './recents';

/** `queued` marks tracks the user added by hand ("Next in queue"), as opposed to the rest of the playing list. */
export type QTrack = Track & { queued?: boolean; albumId?: string };

/** Mirror of the native queue so screens can render it. Refreshed after every mutation and on track change. */
export const usePlayer = create<{ tracks: QTrack[]; index: number; ctxName: string; ctx: PlaySource | null; shuffle: boolean; repeat: RepeatMode }>(() => ({
  tracks: [], index: -1, ctxName: '', ctx: null, shuffle: false, repeat: RepeatMode.Off,
}));
/** Upcoming context tracks in their pre-shuffle order, so turning shuffle off can restore it. */
let originalOrder: string[] = [];

export async function syncQueue() {
  const [tracks, index, repeat] = await Promise.all([TrackPlayer.getQueue(), TrackPlayer.getActiveTrackIndex(), TrackPlayer.getRepeatMode()]);
  usePlayer.setState({ tracks: tracks as QTrack[], index: index ?? -1, repeat });
}

/** Mount once. */
export function useQueueSync() {
  useEffect(() => {
    syncQueue().catch(() => {});
    const sub = TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, () => syncQueue().catch(() => {}));
    return () => sub.remove();
  }, []);
}

/** Prefers the downloaded file; otherwise streams directly from Jellyfin. */
export function toTrack(client: JellyfinClient, t: JfItem, queued = false): QTrack {
  const art = t.AlbumId ?? t.Id;
  return {
    id: t.Id,
    url: localPath(t.Id) ?? client.streamUrl(t.Id),
    title: t.Name,
    artist: t.Artists?.join(', ') ?? t.AlbumArtist ?? '',
    album: t.Album,
    albumId: t.AlbumId,
    artwork: client.imageUrl(art, 640),
    duration: t.RunTimeTicks ? t.RunTimeTicks / 10_000_000 : undefined,
    queued,
  };
}

/** Rebuild a song record from the native track (for menus and history). */
export function trackToItem(t: Track): JfItem {
  return {
    Id: String(t.id), Name: t.title ?? '', Type: 'Audio', AlbumArtist: t.artist, Artists: t.artist ? [t.artist] : undefined,
    Album: t.album, AlbumId: (t as QTrack).albumId, RunTimeTicks: t.duration ? t.duration * 10_000_000 : undefined,
  };
}

/** Play Now: replaces the queue and starts at `index`. `name` is shown as "playing from". */
export async function playNow(client: JellyfinClient, items: JfItem[], index = 0, name = '', source?: PlaySource) {
  if (source) recordSource(source);
  await TrackPlayer.reset();
  await TrackPlayer.add(items.map((i) => toTrack(client, i)));
  await TrackPlayer.skip(index);
  originalOrder = [];
  usePlayer.setState({ ctxName: name, ctx: source ?? null, shuffle: false });
  await TrackPlayer.play();
  await syncQueue();
}

/** Shuffle button on a playlist / artist: plays in random order and turns the shuffle indicator on, so it is already lit in Now Playing. */
export async function playShuffled(client: JellyfinClient, items: JfItem[], name = '', source?: PlaySource) {
  if (!items.length) return;
  const order = [...items].sort(() => Math.random() - 0.5);
  await playNow(client, order, 0, name, source);
  // Turning shuffle off later puts the rest back in the list's own order.
  originalOrder = items.filter((i) => i.Id !== order[0].Id).map((i) => i.Id);
  usePlayer.setState({ shuffle: true });
}

/** Where hand-queued songs go: right after the current track and any songs already queued by hand. */
async function queueInsertIndex() {
  const { tracks, index } = usePlayer.getState();
  let at = index + 1;
  while (at < tracks.length && tracks[at].queued) at++;
  return at;
}

export async function playNext(client: JellyfinClient, items: JfItem[]) {
  const { index } = usePlayer.getState();
  await TrackPlayer.add(items.map((i) => toTrack(client, i, true)), index + 1);
  await syncQueue();
}

/** Returns how many songs are now queued by hand (for the "#n up next" toast). */
export async function addToQueue(client: JellyfinClient, items: JfItem[]) {
  const wasEmpty = usePlayer.getState().tracks.length === 0;
  const at = await queueInsertIndex();
  await TrackPlayer.add(items.map((i) => toTrack(client, i, !wasEmpty)), wasEmpty ? undefined : at);
  await syncQueue();
  return usePlayer.getState().tracks.filter((t, i) => t.queued && i > usePlayer.getState().index).length;
}

export const removeFromQueue = async (index: number) => { await TrackPlayer.remove(index); await syncQueue(); };
export const moveInQueue = async (from: number, to: number) => { await TrackPlayer.move(from, to); await syncQueue(); };
export async function skipTo(index: number) { await TrackPlayer.skip(index); await TrackPlayer.play(); await syncQueue(); }

export async function clearQueue() {
  const { tracks, index } = usePlayer.getState();
  const remove = tracks.map((_, i) => i).filter((i) => i !== index);
  if (remove.length) await TrackPlayer.remove(remove);
  originalOrder = [];
  await syncQueue();
}

/** Shuffle only what is coming up from the playing list; hand-queued songs and the current track stay put. */
export async function setShuffle(on: boolean) {
  const { tracks, index } = usePlayer.getState();
  const idx = tracks.map((t, i) => i).filter((i) => i > index && !tracks[i].queued);
  if (!idx.length) { usePlayer.setState({ shuffle: on }); return; }
  const upcoming = idx.map((i) => tracks[i]);
  let next: QTrack[];
  if (on) {
    originalOrder = upcoming.map((t) => String(t.id));
    next = [...upcoming].sort(() => Math.random() - 0.5);
  } else {
    const rank = new Map(originalOrder.map((id, i) => [id, i]));
    next = [...upcoming].sort((a, b) => (rank.get(String(a.id)) ?? 1e9) - (rank.get(String(b.id)) ?? 1e9));
  }
  await TrackPlayer.remove(idx);
  await TrackPlayer.add(next);
  usePlayer.setState({ shuffle: on });
  await syncQueue();
}

export async function cycleRepeat(): Promise<RepeatMode> {
  const cur = await TrackPlayer.getRepeatMode();
  const next = cur === RepeatMode.Off ? RepeatMode.Queue : cur === RepeatMode.Queue ? RepeatMode.Track : RepeatMode.Off;
  await TrackPlayer.setRepeatMode(next);
  usePlayer.setState({ repeat: next });
  return next;
}

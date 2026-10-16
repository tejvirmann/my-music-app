import { useEffect } from 'react';
import { useActiveTrack } from 'react-native-track-player';
import { create } from 'zustand';

import type { JfItem } from '../api/types';
import { trackToItem } from './queue';
import { getRecentSources, getRecentTracks, setRecentSources, setRecentTracks, type PlaySource } from '../storage/prefs';

const MAX = 30;

/** Local "recently played" history. Jellyfin only knows plays it was told about, so we keep our own. */
export const useRecents = create<{ tracks: JfItem[] }>(() => ({ tracks: getRecentTracks() }));

/** Mount once: records each track that becomes active. */
export function useRecordPlays() {
  const t = useActiveTrack();
  useEffect(() => {
    if (!t?.id) return;
    const item = trackToItem(t);
    const next = [item, ...useRecents.getState().tracks.filter((x) => x.Id !== item.Id)].slice(0, MAX);
    setRecentTracks(next);
    useRecents.setState({ tracks: next });
  }, [t?.id]); // eslint-disable-line react-hooks/exhaustive-deps
}

export const useRecentSources = create<{ sources: PlaySource[] }>(() => ({ sources: getRecentSources() }));

/** Call when playback starts from a playlist or album, so it surfaces on Home. */
export function recordSource(src: PlaySource) {
  const next = [src, ...useRecentSources.getState().sources.filter((s) => s.id !== src.id)].slice(0, 12);
  setRecentSources(next);
  useRecentSources.setState({ sources: next });
}

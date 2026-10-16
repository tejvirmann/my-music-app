import { useEffect } from 'react';
import { useActiveTrack } from 'react-native-track-player';
import { create } from 'zustand';

import type { JfItem } from '../api/types';
import { trackToItem } from './queue';
import { getRecentTracks, setRecentTracks } from '../storage/prefs';

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

import { useEffect } from 'react';
import { useActiveTrack } from 'react-native-track-player';
import { create } from 'zustand';

import type { JfItem } from '../api/types';
import { getRecentTracks, setRecentTracks } from '../storage/prefs';

const MAX = 30;

/** Local "recently played" history. Jellyfin only knows plays it was told about, so we keep our own. */
export const useRecents = create<{ tracks: JfItem[] }>(() => ({ tracks: getRecentTracks() }));

/** Mount once: records each track that becomes active. */
export function useRecordPlays() {
  const t = useActiveTrack();
  useEffect(() => {
    if (!t?.id) return;
    const item = {
      Id: String(t.id), Name: t.title ?? '', Type: 'Audio', AlbumArtist: t.artist, Artists: t.artist ? [t.artist] : undefined,
      Album: t.album, AlbumId: (t as any).albumId, RunTimeTicks: t.duration ? t.duration * 10_000_000 : undefined,
    } as JfItem;
    const next = [item, ...useRecents.getState().tracks.filter((x) => x.Id !== item.Id)].slice(0, MAX);
    setRecentTracks(next);
    useRecents.setState({ tracks: next });
  }, [t?.id]); // eslint-disable-line react-hooks/exhaustive-deps
}

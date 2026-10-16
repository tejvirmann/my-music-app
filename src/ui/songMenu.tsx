import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { create } from 'zustand';

import type { JfItem } from '../api/types';
import type { LikedData } from '../likes';
import { setLiked } from '../likes';
import { playNext, addToQueue } from '../player/queue';
import { useAuth } from '../state/auth';
import { PlaylistPicker } from './PlaylistPicker';

const useMenu = create<{ track: JfItem | null }>(() => ({ track: null }));
/** Open the long-press menu for a song from anywhere. Needs <SongMenuHost/> mounted once. */
export const openSongMenu = (track: JfItem) => useMenu.setState({ track });

export function SongMenuHost({ onInfo }: { onInfo: (id: string) => void }) {
  const client = useAuth((a) => a.client)!;
  const qc = useQueryClient();
  const track = useMenu((s) => s.track);
  const [pick, setPick] = useState<string[] | null>(null);

  useEffect(() => {
    if (!track) return;
    const close = () => useMenu.setState({ track: null });
    const liked = !!qc.getQueryData<LikedData>(['liked'])?.entries[track.Id];
    const then = (fn: () => unknown) => () => { close(); fn(); };
    Alert.alert(track.Name, track.Artists?.[0] ?? track.AlbumArtist, [
      { text: 'Play next', onPress: then(() => playNext(client, [track])) },
      { text: 'Add to queue', onPress: then(() => addToQueue(client, [track])) },
      { text: 'Add to playlist…', onPress: then(() => setPick([track.Id])) },
      { text: liked ? 'Remove from Liked' : 'Add to Liked', onPress: then(() => setLiked(client, qc, [track.Id], !liked).catch((e) => Alert.alert('Failed', e.message))) },
      { text: 'Song info', onPress: then(() => onInfo(track.Id)) },
      { text: 'Cancel', style: 'cancel', onPress: close },
    ]);
  }, [track]); // eslint-disable-line react-hooks/exhaustive-deps

  return <PlaylistPicker visible={!!pick} trackIds={pick ?? []} onClose={() => setPick(null)} />;
}

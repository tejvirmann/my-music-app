import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { FlatList, View } from 'react-native';

import { PlaylistPicker } from '../ui/PlaylistPicker';
import { Btn, Empty, Row, s } from '../ui';
import { useDownloadedTracks } from '../downloads';
import { addToQueue, playNext, playNow } from '../player/queue';
import { useAuth } from '../state/auth';
import type { JfItem } from '../api/types';

export function AlbumScreen({ route }: any) {
  const client = useAuth((a) => a.client)!;
  const { id } = route.params;
  const { data, isLoading, error } = useQuery({ queryKey: ['album', id], queryFn: () => client.albumTracks(id) });
  const [pick, setPick] = useState<string[] | null>(null);
  const tracks = data?.Items ?? [];
  const dlTracks = useDownloadedTracks();

  if (isLoading) return <Empty loading />;
  if (error) return <Empty error={(error as Error).message} />;

  const trackMenu = (t: JfItem) => (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      <Btn title="Next" onPress={() => playNext(client, [t])} />
      <Btn title="+Q" onPress={() => addToQueue(client, [t])} />
      <Btn title="+PL" onPress={() => setPick([t.Id])} />
    </View>
  );

  return (
    <View style={s.screen}>
      <View style={s.buttons}>
        <Btn title="Play" kind="primary" onPress={() => playNow(client, tracks, 0)} />
        <Btn title="Play next" onPress={() => playNext(client, tracks)} />
        <Btn title="Add to queue" onPress={() => addToQueue(client, tracks)} />
        <Btn title="Add to playlist" onPress={() => setPick(tracks.map((t) => t.Id))} />
      </View>
      <FlatList data={tracks} keyExtractor={(t) => t.Id}
        renderItem={({ item, index }) => (
          <Row title={`${item.IndexNumber ?? index + 1}. ${item.Name}`} downloaded={dlTracks.has(item.Id)} onSwipeRight={() => addToQueue(client, [item])} onPress={() => playNow(client, tracks, index)} right={trackMenu(item)} />
        )} />
      <PlaylistPicker visible={!!pick} trackIds={pick ?? []} onClose={() => setPick(null)} />
    </View>
  );
}

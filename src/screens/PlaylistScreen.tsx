import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, FlatList, Text, View } from 'react-native';

import { Btn, Empty, Row, s } from '../ui';
import { openSongMenu } from '../ui/songMenu';
import { toggleDownload } from '../downloadActions';
import { useDownloadedPlaylists, useDownloadedTracks, useDownloadProgress } from '../downloads';
import { addToQueue, playNext, playNow } from '../player/queue';
import { useAuth } from '../state/auth';

export function PlaylistScreen({ route }: any) {
  const client = useAuth((a) => a.client)!;
  const qc = useQueryClient();
  const { id } = route.params;
  const key = ['playlist', id];
  const { data, isLoading, error } = useQuery({ queryKey: key, queryFn: () => client.playlistTracks(id) });
  const tracks = data?.Items ?? [];
  const progress = useDownloadProgress(id);
  const dlPlaylists = useDownloadedPlaylists();
  const dlTracks = useDownloadedTracks();
  const isDl = dlPlaylists.has(id);
  const needsUpdate = isDl && tracks.some((t) => !dlTracks.has(t.Id));

  const refresh = () => qc.invalidateQueries({ queryKey: key });
  const run = async (fn: () => Promise<unknown>) => {
    try { await fn(); await refresh(); } catch (e: any) { Alert.alert('Failed', e.message); }
  };

  if (isLoading) return <Empty loading />;
  if (error) return <Empty error={(error as Error).message} />;

  return (
    <View style={s.screen}>
      <View style={s.buttons}>
        <Btn title="Play" kind="primary" onPress={() => playNow(client, tracks, 0)} />
        <Btn title="Play next" onPress={() => playNext(client, tracks)} />
        <Btn title="Add to queue" onPress={() => addToQueue(client, tracks)} />
        <Btn title={progress ? `Downloading ${progress}` : isDl ? 'Remove download' : 'Download'}
          onPress={() => toggleDownload(client, id, route.params.name, isDl)} disabled={!!progress} />
        {needsUpdate && !progress && <Btn title="Update download" onPress={() => toggleDownload(client, id, route.params.name, false)} />}
      </View>
      <FlatList data={tracks} keyExtractor={(t, i) => t.PlaylistItemId ?? `${t.Id}-${i}`}
        ListEmptyComponent={<Empty text="Empty playlist. Add tracks from an album." />}
        renderItem={({ item, index }) => (
          <Row title={item.Name} subtitle={item.AlbumArtist} downloaded={dlTracks.has(item.Id)} onLongPress={() => openSongMenu(item)} onPress={() => playNow(client, tracks, index)}
            onSwipeRight={() => addToQueue(client, [item])}
            right={
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <Btn title="↑" disabled={index === 0} onPress={() => run(() => client.moveInPlaylist(id, item.PlaylistItemId!, index - 1))} />
                <Btn title="↓" disabled={index === tracks.length - 1} onPress={() => run(() => client.moveInPlaylist(id, item.PlaylistItemId!, index + 1))} />
                <Btn title="✕" kind="danger" onPress={() => run(() => client.removeFromPlaylist(id, [item.PlaylistItemId!]))} />
              </View>
            } />
        )} />
      <Text style={[s.dim, { padding: 8, textAlign: 'center' }]}>{tracks.length} tracks</Text>
    </View>
  );
}

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, FlatList, Text, View } from 'react-native';

import { Btn, Empty, Row, s } from '../components/ui';
import { downloadPlaylist, isPlaylistDownloaded, removePlaylistDownload } from '../downloads';
import { addToQueue, playNext, playNow } from '../player/queue';
import { useAuth } from '../state/auth';

export function PlaylistScreen({ route, navigation }: any) {
  const client = useAuth((a) => a.client)!;
  const qc = useQueryClient();
  const { id } = route.params;
  const key = ['playlist', id];
  const { data, isLoading, error } = useQuery({ queryKey: key, queryFn: () => client.playlistTracks(id) });
  const tracks = data?.Items ?? [];
  const [progress, setProgress] = useState<string>();
  const [downloaded, setDownloaded] = useState<boolean | null>(null);
  const isDl = downloaded ?? isPlaylistDownloaded(id, tracks.map((t) => t.Id));

  const refresh = () => qc.invalidateQueries({ queryKey: key });
  const run = async (fn: () => Promise<unknown>) => {
    try { await fn(); await refresh(); } catch (e: any) { Alert.alert('Failed', e.message); }
  };

  const toggleDownload = async () => {
    if (isDl) { removePlaylistDownload(id); setDownloaded(false); return; }
    try {
      await downloadPlaylist(client, id, tracks, (d, t) => setProgress(`Downloading ${d}/${t}`));
      setDownloaded(true);
    } catch (e: any) { Alert.alert('Download failed', e.message); }
    setProgress(undefined);
  };

  const confirmDelete = () =>
    Alert.alert('Delete from Jellyfin?', 'This permanently deletes the playlist on the server. To just hide it, use Hide on the list.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete from Jellyfin', style: 'destructive', onPress: async () => {
        await run(() => client.deletePlaylist(id)); qc.invalidateQueries({ queryKey: ['playlists'] }); navigation.goBack();
      } },
    ]);

  if (isLoading) return <Empty loading />;
  if (error) return <Empty error={(error as Error).message} />;

  return (
    <View style={s.screen}>
      <View style={s.buttons}>
        <Btn title="Play" kind="primary" onPress={() => playNow(client, tracks, 0)} />
        <Btn title="Play next" onPress={() => playNext(client, tracks)} />
        <Btn title="Add to queue" onPress={() => addToQueue(client, tracks)} />
        <Btn title={progress ?? (isDl ? 'Remove download' : 'Download')} onPress={toggleDownload} disabled={!!progress} />
        <Btn title="Delete from Jellyfin" kind="danger" onPress={confirmDelete} />
      </View>
      <FlatList data={tracks} keyExtractor={(t, i) => t.PlaylistItemId ?? `${t.Id}-${i}`}
        ListEmptyComponent={<Empty text="Empty playlist. Add tracks from an album." />}
        renderItem={({ item, index }) => (
          <Row title={item.Name} subtitle={item.AlbumArtist} onPress={() => playNow(client, tracks, index)}
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

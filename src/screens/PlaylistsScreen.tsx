import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, FlatList, View } from 'react-native';

import { Btn, Empty, Row, s } from '../components/ui';
import { useAuth } from '../state/auth';
import { getHiddenPlaylists, setHiddenPlaylists } from '../storage/prefs';

export function PlaylistsScreen({ navigation }: any) {
  const client = useAuth((a) => a.client)!;
  const qc = useQueryClient();
  const { data, isLoading, error, refetch, isRefetching } = useQuery({ queryKey: ['playlists'], queryFn: () => client.playlists() });
  const [hidden, setHidden] = useState(getHiddenPlaylists());
  const [showHidden, setShowHidden] = useState(false);

  const toggleHidden = (id: string) => {
    const next = hidden.includes(id) ? hidden.filter((h) => h !== id) : [...hidden, id];
    setHiddenPlaylists(next); setHidden(next);
  };
  const create = () =>
    Alert.prompt('New playlist', 'Name', async (name) => {
      if (!name?.trim()) return;
      try { await client.createPlaylist(name.trim()); qc.invalidateQueries({ queryKey: ['playlists'] }); } catch (e: any) { Alert.alert('Failed', e.message); }
    });

  if (isLoading) return <Empty loading />;
  if (error) return <Empty error={(error as Error).message} />;
  const items = (data?.Items ?? []).filter((p) => showHidden || !hidden.includes(p.Id));

  return (
    <View style={s.screen}>
      <View style={s.buttons}>
        <Btn title="New playlist" kind="primary" onPress={create} />
        <Btn title={showHidden ? 'Hide hidden' : `Show hidden (${hidden.length})`} onPress={() => setShowHidden(!showHidden)} />
        <Btn title="Sync now" onPress={() => refetch()} />
      </View>
      <FlatList data={items} keyExtractor={(p) => p.Id} refreshing={isRefetching} onRefresh={() => refetch()}
        ListEmptyComponent={<Empty text="No playlists" />}
        renderItem={({ item }) => (
          <Row title={item.Name} subtitle={hidden.includes(item.Id) ? 'Hidden (local only)' : `${item.ChildCount ?? ''} tracks`}
            onPress={() => navigation.navigate('Playlist', { id: item.Id, name: item.Name })}
            right={<Btn title={hidden.includes(item.Id) ? 'Unhide' : 'Hide'} onPress={() => toggleHidden(item.Id)} />} />
        )} />
    </View>
  );
}

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, FlatList, View } from 'react-native';

import { toggleDownload } from '../downloadActions';
import { useDownloadedPlaylists } from '../downloads';
import { useDownloadProgress } from '../downloads';
import { useAuth } from '../state/auth';
import { getHiddenPlaylists, getPinnedPlaylists, setHiddenPlaylists, setPinnedPlaylists } from '../storage/prefs';
import { Btn, Empty, Row, s } from '../ui';
import type { JfItem } from '../api/types';

/** Playlist list inside the Library tab. Edits go to Jellyfin; pin/hide are local to this phone. */
export function PlaylistsScreen({ navigation }: any) {
  const client = useAuth((a) => a.client)!;
  const qc = useQueryClient();
  const { data, isLoading, error, refetch, isRefetching } = useQuery({ queryKey: ['playlists'], queryFn: () => client.playlists() });
  const [hidden, setHidden] = useState(getHiddenPlaylists());
  const [pinned, setPinned] = useState(getPinnedPlaylists());
  const [showHidden, setShowHidden] = useState(false);
  const downloaded = useDownloadedPlaylists();

  const toggleHidden = (id: string) => {
    const next = hidden.includes(id) ? hidden.filter((h) => h !== id) : [...hidden, id];
    setHiddenPlaylists(next); setHidden(next);
  };
  const togglePinned = (id: string) => {
    const next = pinned.includes(id) ? pinned.filter((p) => p !== id) : [...pinned, id];
    setPinnedPlaylists(next); setPinned(next);
  };
  const create = () =>
    Alert.prompt('New playlist', 'Name', async (name) => {
      if (!name?.trim()) return;
      try { await client.createPlaylist(name.trim()); qc.invalidateQueries({ queryKey: ['playlists'] }); } catch (e: any) { Alert.alert('Failed', e.message); }
    });
  const menu = (p: JfItem) =>
    Alert.alert(p.Name, undefined, [
      { text: pinned.includes(p.Id) ? 'Unpin' : 'Pin to top', onPress: () => togglePinned(p.Id) },
      { text: downloaded.has(p.Id) ? 'Remove download' : 'Download', onPress: () => toggleDownload(client, p.Id, p.Name, downloaded.has(p.Id)) },
      { text: hidden.includes(p.Id) ? 'Unhide' : 'Hide (this phone only)', onPress: () => toggleHidden(p.Id) },
      { text: 'Cancel', style: 'cancel' },
    ]);

  if (isLoading) return <Empty loading />;
  if (error) return <Empty error={(error as Error).message} />;
  const all = (data?.Items ?? []).filter((p) => showHidden || !hidden.includes(p.Id));
  const items = [
    ...pinned.map((id) => all.find((p) => p.Id === id)).filter((p): p is JfItem => !!p),
    ...all.filter((p) => !pinned.includes(p.Id)),
  ];

  return (
    <View style={s.screen}>
      <View style={s.buttons}>
        <Btn title="New playlist" kind="primary" onPress={create} />
        {hidden.length > 0 && <Btn title={showHidden ? 'Hide hidden' : `Show hidden (${hidden.length})`} onPress={() => setShowHidden(!showHidden)} />}
      </View>
      <FlatList data={items} keyExtractor={(p) => p.Id} refreshing={isRefetching} onRefresh={() => refetch()} extraData={[pinned, hidden, downloaded]}
        ListEmptyComponent={<Empty text="No playlists" />}
        renderItem={({ item }) => (
          <PlaylistRow item={item} pinned={pinned.includes(item.Id)} hidden={hidden.includes(item.Id)} downloaded={downloaded.has(item.Id)}
            onOpen={() => navigation.navigate('Playlist', { id: item.Id, name: item.Name })}
            onMenu={() => menu(item)}
            onDownload={() => toggleDownload(client, item.Id, item.Name, downloaded.has(item.Id))} />
        )} />
    </View>
  );
}

function PlaylistRow({ item, pinned, hidden, downloaded, onOpen, onMenu, onDownload }: {
  item: JfItem; pinned: boolean; hidden: boolean; downloaded: boolean; onOpen: () => void; onMenu: () => void; onDownload: () => void;
}) {
  const progress = useDownloadProgress(item.Id);
  const sub = [pinned && 'Pinned', hidden && 'Hidden', progress ? `Downloading ${progress}` : null, `${item.ChildCount ?? ''} tracks`].filter(Boolean).join(' · ');
  return (
    <Row title={item.Name} subtitle={sub} downloaded={downloaded} onPress={onOpen} onLongPress={onMenu}
      right={<Btn title={progress ? '…' : downloaded ? '✓' : '↓'} disabled={!!progress} onPress={onDownload} />} />
  );
}

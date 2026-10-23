import { useInfiniteQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, FlatList, Pressable, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

import type { JfItem } from '../api/types';
import { dlKey } from '../downloadActions';
import { useDownloadedPlaylists, useDownloadProgress, useLocalAlbums } from '../downloads';
import { useAuth } from '../state/auth';
import { useLibraryPrefs } from '../state/library';
import { useOffline } from '../state/offline';
import { PlaylistCover } from '../ui/PlaylistCover';
import { Art } from '../ui/Art';
import { Empty, IconBtn, Pill, Screen, TopBar } from '../ui/layout';
import { DlDot, ListRow } from '../ui/rows';
import { openAlbumMenu, openPlaylistMenu } from '../ui/sheets';
import { Txt } from '../ui/text';
import { useColors } from '../ui/theme';
import { toast } from '../ui/toast';
import { usePlaylists } from './hooks';

const PAGE = 200;

function PlaylistRow({ item, pinned, onOpen }: { item: JfItem; pinned: boolean; onOpen: () => void }) {
  const c = useColors();
  const client = useAuth((a) => a.client)!;
  const dl = useDownloadedPlaylists().has(item.Id);
  const progress = useDownloadProgress(item.Id);
  const sub = [pinned && 'pinned', 'Playlist', `${item.ChildCount ?? 0} songs`, progress && `downloading ${progress}`].filter(Boolean).join(' · ');
  return (
    <ListRow cover={<PlaylistCover id={item.Id} name={item.Name} size={44} />} title={item.Name} sub={sub} dl={dl} onPress={onOpen} onLongPress={() => openPlaylistMenu(item)}
      right={<IconBtn name="dots" label="More" color={c.mute} onPress={() => openPlaylistMenu(item)} />} />
  );
}

export function LibraryScreen({ navigation }: any) {
  const client = useAuth((a) => a.client)!;
  const qc = useQueryClient();
  const [tab, setTab] = useState<'pl' | 'alb'>('pl');
  const [dlOnly, setDlOnly] = useState(false);
  const c = useColors();
  const downloaded = useDownloadedPlaylists();
  const pl = usePlaylists();
  const unhideAll = useLibraryPrefs((s) => s.unhideAll);
  const offline = useOffline((s) => s.offline);
  const localAlbums = useLocalAlbums();
  const albums = useInfiniteQuery({
    queryKey: ['albums'], initialPageParam: 0, staleTime: 5 * 60_000,
    queryFn: ({ pageParam }) => client.albums(pageParam, PAGE),
    getNextPageParam: (last, all) => { const n = all.reduce((x, p) => x + p.Items.length, 0); return n < last.TotalRecordCount ? n : undefined; },
  });

  const create = () => Alert.prompt('New playlist', 'Name', async (name) => {
    if (!name?.trim()) return;
    try { await client.createPlaylist(name.trim()); qc.invalidateQueries({ queryKey: ['playlists'] }); toast('Playlist created', name.trim()); } catch (e: any) { Alert.alert('Failed', e.message); }
  });

  const isPl = tab === 'pl';
  const playlists = pl.items.filter((p) => !dlOnly || downloaded.has(p.Id));
  const loaded = albums.data?.pages.flatMap((p) => p.Items) ?? [];
  // Offline: saved details first, then (for downloads from before offline support) albums remembered from the last online visit.
  const offlineAlbums = [...localAlbums, ...loaded.filter((a) => downloaded.has(dlKey('album', a.Id)) && !localAlbums.some((l) => l.Id === a.Id))];
  const alb = (offline ? offlineAlbums : loaded).filter((a) => !dlOnly || downloaded.has(dlKey('album', a.Id)));
  const loading = !offline && (isPl ? pl.isLoading : albums.isLoading);
  const header = (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <Pill label="playlists" on={isPl} onPress={() => setTab('pl')} />
        <Pill label="albums" on={!isPl} onPress={() => setTab('alb')} />
        <View style={{ flex: 1 }} />
        <Pressable onPress={() => setDlOnly(!dlOnly)} style={{ borderWidth: 1, borderColor: dlOnly ? c.ok : c.line, paddingHorizontal: 10, paddingVertical: 3 }}>
          <Txt color={dlOnly ? c.ok : c.mute}>↓ downloaded</Txt>
        </Pressable>
      </View>
    </View>
  );

  return (
    <Screen>
      <TopBar left="library" right={<><IconBtn name="plus" label="New playlist" onPress={create} /><IconBtn name="gear" label="Settings" onPress={() => navigation.navigate('Settings')} /></>} />
      <FlatList
        key={tab} numColumns={isPl ? 1 : 2}
        data={(isPl ? playlists : alb.length % 2 ? [...alb, { Id: '__pad', Name: '', Type: '' }] : alb) as JfItem[]} keyExtractor={(i) => i.Id}
        columnWrapperStyle={isPl ? undefined : { gap: 12, paddingHorizontal: 16 }}
        contentContainerStyle={{ paddingBottom: 28 }}
        ListHeaderComponent={<View style={{ paddingHorizontal: 16 }}>{header}</View>}
        ListEmptyComponent={<View style={{ paddingHorizontal: 16 }}><Empty loading={loading} text={dlOnly ? `Nothing downloaded yet.\nUse ⋯ → Download on a ${isPl ? 'playlist' : 'album'}.` : isPl ? 'No playlists yet. Tap + to make one.' : 'No albums'} /></View>}
        ListFooterComponent={isPl && pl.hidden.length && !dlOnly ? (
          <Txt v="mute" style={{ paddingHorizontal: 16, paddingTop: 12 }} onPress={unhideAll}>{pl.hidden.length} hidden · show all</Txt>
        ) : undefined}
        onEndReached={() => !isPl && !offline && albums.hasNextPage && albums.fetchNextPage()}
        onRefresh={() => { pl.refetch(); albums.refetch(); }} refreshing={pl.isRefetching || albums.isRefetching}
        renderItem={({ item }) => item.Id === '__pad' ? <View style={{ flex: 1 }} /> : isPl ? (
          <PlaylistRow item={item} pinned={pl.pinned.includes(item.Id)} onOpen={() => navigation.navigate('Playlist', { id: item.Id, name: item.Name })} />
        ) : (
          <Pressable style={{ flex: 1, marginBottom: 16 }} onPress={() => navigation.navigate('Album', { id: item.Id, name: item.Name })} onLongPress={() => openAlbumMenu(item)}>
            <Art uri={client.imageUrl(item.Id, 320)} />
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
              {downloaded.has(dlKey('album', item.Id)) && <DlDot />}
              <Txt v="med" numberOfLines={1} style={{ flexShrink: 1 }}>{item.Name}</Txt>
            </View>
            <Txt v="small" numberOfLines={1}>{[item.AlbumArtist, item.ProductionYear].filter(Boolean).join(', ')}</Txt>
          </Pressable>
        )} />
    </Screen>
  );
}

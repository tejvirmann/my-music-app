import { useQuery } from '@tanstack/react-query';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';

import { playNow } from '../player/queue';
import { useRecents } from '../player/recents';
import { useAuth } from '../state/auth';
import { useSettings } from '../state/settings';
import { Art } from '../ui/Art';
import { Logo } from '../ui/Brand';
import { Body, Empty, Heading, IconBtn, Screen, Section, TopBar } from '../ui/layout';
import { SongRow } from '../ui/SongRow';
import { Txt } from '../ui/text';
import { F, useColors } from '../ui/theme';
import { greeting, usePlaylists } from './hooks';

function Tile({ art, title, onPress }: { art: string; title: string; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ flexBasis: '48.5%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: pressed ? c.line : c.card })}>
      <Art uri={art} size={46} />
      <Txt v="med" numberOfLines={2} style={{ flex: 1, paddingRight: 8, lineHeight: 16 }}>{title}</Txt>
    </Pressable>
  );
}

export function HomeScreen({ navigation }: any) {
  const c = useColors();
  const client = useAuth((a) => a.client)!;
  const appName = useSettings((s) => s.appName);
  const recent = useRecents((r) => r.tracks).slice(0, 8);
  const pl = usePlaylists();
  const albums = useQuery({ queryKey: ['recentAlbums'], queryFn: () => client.recentAlbums(20) });
  const added = useQuery({ queryKey: ['recentSongs'], queryFn: () => client.recentSongs(10) });
  const refreshing = albums.isRefetching || added.isRefetching || pl.isRefetching;
  const refresh = () => { albums.refetch(); added.refetch(); pl.refetch(); };

  const tiles = [
    ...pl.items.slice(0, 3).map((p) => ({ key: `p${p.Id}`, art: client.imageUrl(p.Id, 160), title: p.Name, go: () => navigation.navigate('Playlist', { id: p.Id, name: p.Name }) })),
    ...(albums.data?.Items ?? []).slice(0, 3).map((a) => ({ key: `a${a.Id}`, art: client.imageUrl(a.Id, 160), title: a.Name, go: () => navigation.navigate('Album', { id: a.Id, name: a.Name }) })),
  ];

  return (
    <Screen>
      <TopBar
        left={<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Logo size={26} /><Txt style={{ fontFamily: F.serif, fontSize: 18 }}>{appName}</Txt></View>}
        right={<IconBtn name="gear" label="Settings" onPress={() => navigation.navigate('Settings')} />} />
      <Body refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.mute} />}>
        <Heading title={greeting()} sub="pick up where you left off" />
        {tiles.length > 0 && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{tiles.map((t) => <Tile key={t.key} art={t.art} title={t.title} onPress={t.go} />)}</View>}

        {recent.length > 0 ? (
          <>
            <Section title="Recently played" hint="swipe → queue" />
            <View style={{ marginHorizontal: -16 }}>
              {recent.map((t, i) => <SongRow key={t.Id} track={t} onPress={() => playNow(client, recent, i, 'Recently played')} />)}
            </View>
          </>
        ) : (
          <>
            <Section title="Recently added" hint="swipe → queue" />
            <View style={{ marginHorizontal: -16 }}>
              {(added.data?.Items ?? []).map((t, i, all) => <SongRow key={t.Id} track={t} onPress={() => playNow(client, all, i, 'Recently added')} />)}
            </View>
          </>
        )}

        <Section title="New albums" />
        {albums.isLoading ? <Empty loading /> : albums.error ? <Empty text={(albums.error as Error).message} /> : (
          <FlatList horizontal data={albums.data?.Items ?? []} keyExtractor={(a) => a.Id} showsHorizontalScrollIndicator={false}
            style={{ marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }} ListEmptyComponent={<Empty text="No albums yet" />}
            renderItem={({ item }) => (
              <Pressable style={{ width: 132 }} onPress={() => navigation.navigate('Album', { id: item.Id, name: item.Name })}>
                <Art uri={client.imageUrl(item.Id, 320)} size={132} />
                <Txt v="med" numberOfLines={1} style={{ marginTop: 6 }}>{item.Name}</Txt>
                <Txt v="small" numberOfLines={1}>{item.AlbumArtist}</Txt>
              </Pressable>
            )} />
        )}
      </Body>
    </Screen>
  );
}

import { useQuery } from '@tanstack/react-query';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';

import { playNow } from '../player/queue';
import { useRecentSources, useRecents } from '../player/recents';
import { useAuth } from '../state/auth';
import { useSettings } from '../state/settings';
import { useAppTitle } from '../brand';
import { Art } from '../ui/Art';
import { PlaylistCover } from '../ui/PlaylistCover';
import { Logo } from '../ui/Brand';
import { Body, Empty, Heading, IconBtn, Screen, Section, TopBar } from '../ui/layout';
import { SongRow } from '../ui/SongRow';
import { Txt } from '../ui/text';
import { F, useColors } from '../ui/theme';
import { greeting, usePlaylists } from './hooks';

function Tile({ art, cover, title, onPress }: { art?: string; cover?: React.ReactNode; title: string; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ flexBasis: '48.5%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: pressed ? c.line : c.card })}>
      {cover ? <View style={{ width: 46, height: 46 }}>{cover}</View> : <Art uri={art} size={46} />}
      <Txt v="med" numberOfLines={2} style={{ flex: 1, paddingRight: 8, lineHeight: 16 }}>{title}</Txt>
    </Pressable>
  );
}

export function HomeScreen({ navigation }: any) {
  const c = useColors();
  const title = useAppTitle();
  const { showGreeting, greetingText } = useSettings();
  const client = useAuth((a) => a.client)!;
  const recent = useRecents((r) => r.tracks).slice(0, 8);
  const pl = usePlaylists();
  const albums = useQuery({ queryKey: ['recentAlbums'], queryFn: () => client.recentAlbums(20) });
  const added = useQuery({ queryKey: ['recentSongs'], queryFn: () => client.recentSongs(10) });
  const refreshing = albums.isRefetching || added.isRefetching || pl.isRefetching;
  const refresh = () => { albums.refetch(); added.refetch(); pl.refetch(); };

  const sources = useRecentSources((s) => s.sources);
  const open = (kind: 'playlist' | 'album', id: string, name: string) => () => navigation.navigate(kind === 'playlist' ? 'Playlist' : 'Album', { id, name });
  // Tiles: what you actually played from lately, topped up with your playlists and new albums.
  const fromRecent = sources.filter((s) => s.kind === 'album' || pl.items.some((p) => p.Id === s.id)).map((s) => s.kind === 'playlist'
    ? { key: `p${s.id}`, cover: <PlaylistCover id={s.id} name={s.name} size={46} />, title: s.name, go: open('playlist', s.id, s.name) }
    : { key: `a${s.id}`, art: client.imageUrl(s.id, 160), title: s.name, go: open('album', s.id, s.name) });
  const fill = [
    ...pl.items.map((p) => ({ key: `p${p.Id}`, cover: <PlaylistCover id={p.Id} name={p.Name} size={46} />, title: p.Name, go: open('playlist', p.Id, p.Name) })),
    ...(albums.data?.Items ?? []).map((a) => ({ key: `a${a.Id}`, art: client.imageUrl(a.Id, 160), title: a.Name, go: open('album', a.Id, a.Name) })),
  ];
  const seen = new Set<string>();
  const tiles = [...fromRecent.slice(0, 6), ...fill].filter((t) => !seen.has(t.key) && !!seen.add(t.key)).slice(0, 6);

  return (
    <Screen>
      <TopBar
        left={<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Logo size={26} /><Txt style={{ fontFamily: F.serif, fontSize: 20, lineHeight: 26, marginTop: 4 }}>{title}</Txt></View>}
        right={<IconBtn name="gear" label="Settings" onPress={() => navigation.navigate('Settings')} />} />
      <Body refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.mute} />}>
        {showGreeting && <Heading title={greetingText.trim() || greeting()} />}
        {tiles.length > 0 && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{tiles.map((t) => <Tile key={t.key} art={"art" in t ? t.art : undefined} cover={"cover" in t ? t.cover : undefined} title={t.title} onPress={t.go} />)}</View>}

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

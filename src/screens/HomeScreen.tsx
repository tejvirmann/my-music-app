import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { FlatList, Pressable, ScrollView, Text, View } from 'react-native';

import { playNow } from '../player/queue';
import { useRecents } from '../player/recents';
import { useAuth } from '../state/auth';
import { Btn, Empty, colors, s } from '../ui';
import { SongRow } from '../ui/SongRow';

const H = ({ children }: { children: string }) => (
  <Text style={[s.h1, { paddingHorizontal: 16, marginTop: 20, marginBottom: 8 }]}>{children}</Text>
);

/** Home tab: recently played songs, recently added albums, and a way into Lidarr. */
export function HomeScreen({ navigation }: any) {
  const client = useAuth((a) => a.client)!;
  const recent = useRecents((r) => r.tracks).slice(0, 10);
  const albums = useQuery({ queryKey: ['recentAlbums'], queryFn: () => client.recentAlbums(20) });
  const added = useQuery({ queryKey: ['recentSongs'], queryFn: () => client.recentSongs(10) });
  const refresh = () => { albums.refetch(); added.refetch(); };

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ paddingBottom: 90 }}>
      <View style={[s.buttons, { paddingBottom: 0 }]}>
        <Btn title="Find new music" kind="primary" onPress={() => navigation.navigate('FindMusic')} />
        <Btn title="Refresh" onPress={refresh} />
      </View>

      {recent.length > 0 && (
        <>
          <H>Recently played</H>
          {recent.map((t, i) => (
            <SongRow key={t.Id} track={t} art={client.imageUrl(t.AlbumId ?? t.Id, 120)} subtitle={t.AlbumArtist}
              onPress={() => playNow(client, recent, i)} />
          ))}
        </>
      )}

      <H>Recently added albums</H>
      {albums.isLoading ? <Empty loading /> : albums.error ? <Empty error={(albums.error as Error).message} /> : (
        <FlatList horizontal data={albums.data?.Items ?? []} keyExtractor={(a) => a.Id} showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }} ListEmptyComponent={<Text style={s.dim}>No albums yet</Text>}
          renderItem={({ item }) => (
            <Pressable style={{ width: 130 }} onPress={() => navigation.navigate('Album', { id: item.Id, name: item.Name })}>
              <Image source={{ uri: client.imageUrl(item.Id, 300) }} style={{ width: 130, height: 130, borderRadius: 8, backgroundColor: colors.card }} cachePolicy="disk" transition={120} />
              <Text style={[s.text, { marginTop: 6 }]} numberOfLines={1}>{item.Name}</Text>
              <Text style={s.dim} numberOfLines={1}>{item.AlbumArtist}</Text>
            </Pressable>
          )} />
      )}

      <H>Recently added songs</H>
      {(added.data?.Items ?? []).map((t, i, all) => (
        <SongRow key={t.Id} track={t} art={client.imageUrl(t.AlbumId ?? t.Id, 120)}
          subtitle={[t.Artists?.[0] ?? t.AlbumArtist, t.Album].filter(Boolean).join(' · ')} onPress={() => playNow(client, all, i)} />
      ))}
    </ScrollView>
  );
}

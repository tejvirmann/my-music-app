import { useQuery } from '@tanstack/react-query';
import { SectionList, Text } from 'react-native';

import type { JfItem } from '../api/types';
import { addToQueue, playNow } from '../player/queue';
import { useAuth } from '../state/auth';
import { Empty, Row, colors, s } from '../ui';
import { SongRow } from '../ui/SongRow';

/** Library search: songs, albums and playlists together. */
export function SearchResults({ term, navigation }: { term: string; navigation: any }) {
  const client = useAuth((a) => a.client)!;
  const { data, isLoading, error } = useQuery({ queryKey: ['search', term], queryFn: () => client.search(term), staleTime: 60_000 });

  if (isLoading) return <Empty loading />;
  if (error) return <Empty error={(error as Error).message} />;
  const sections = [
    { title: 'Songs', data: data!.songs },
    { title: 'Albums', data: data!.albums },
    { title: 'Playlists', data: data!.playlists },
  ].filter((x) => x.data.length);
  if (!sections.length) return <Empty text={`No results for "${term}"`} />;

  const queueAll = (fetch: () => Promise<{ Items: JfItem[] }>) => fetch().then((r) => addToQueue(client, r.Items));

  return (
    <SectionList sections={sections} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
      keyExtractor={(i) => i.Id}
      renderSectionHeader={({ section }) => (
        <Text style={[s.dim, { backgroundColor: colors.bg, paddingHorizontal: 16, paddingVertical: 8, fontWeight: '700', textTransform: 'uppercase' }]}>{section.title}</Text>
      )}
      renderItem={({ item }) =>
        item.Type === 'Audio' ? (
          <SongRow track={item} art={client.imageUrl(item.AlbumId ?? item.Id, 120)}
            subtitle={[item.Artists?.[0] ?? item.AlbumArtist, item.Album].filter(Boolean).join(' · ')}
            onPress={() => playNow(client, [item], 0)} />
        ) : item.Type === 'MusicAlbum' ? (
          <Row title={item.Name} subtitle={`Album · ${item.AlbumArtist ?? ''}`} art={client.imageUrl(item.Id, 120)}
            onPress={() => navigation.navigate('Album', { id: item.Id, name: item.Name })}
            onSwipeRight={() => queueAll(() => client.albumTracks(item.Id))} />
        ) : (
          <Row title={item.Name} subtitle={`Playlist · ${item.ChildCount ?? ''} tracks`}
            onPress={() => navigation.navigate('Playlist', { id: item.Id, name: item.Name })}
            onSwipeRight={() => queueAll(() => client.playlistTracks(item.Id))} />
        )
      } />
  );
}

import { useInfiniteQuery } from '@tanstack/react-query';
import { FlatList } from 'react-native';

import { Empty, Row } from '../ui';
import { useAuth } from '../state/auth';

const PAGE = 100;

export function AlbumsScreen({ navigation }: any) {
  const client = useAuth((a) => a.client)!;
  const q = useInfiniteQuery({
    queryKey: ['albums'],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => client.albums(pageParam, PAGE),
    getNextPageParam: (last, all) => {
      const loaded = all.reduce((n, p) => n + p.Items.length, 0);
      return loaded < last.TotalRecordCount ? loaded : undefined;
    },
    staleTime: 5 * 60_000,
  });
  const items = q.data?.pages.flatMap((p) => p.Items) ?? [];

  return (
    <>
      {q.isLoading ? <Empty loading /> : q.error ? <Empty error={(q.error as Error).message} /> : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.Id}
          onEndReached={() => q.hasNextPage && q.fetchNextPage()}
          onRefresh={() => q.refetch()}
          refreshing={q.isRefetching}
          ListEmptyComponent={<Empty text="No albums" />}
          renderItem={({ item }) => (
            <Row title={item.Name} subtitle={item.AlbumArtist} art={client.imageUrl(item.Id, 120)}
              onPress={() => navigation.navigate('Album', { id: item.Id, name: item.Name })} />
          )}
        />
      )}
    </>
  );
}

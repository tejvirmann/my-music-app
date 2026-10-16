import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Alert, FlatList, Text, TextInput, View } from 'react-native';

import { LidarrClient, type LidarrAlbum } from '../api/lidarr';
import { processPendingLikes } from '../likes';
import { useAuth } from '../state/auth';
import { getPendingLikes, setPendingLikes } from '../storage/prefs';
import { Btn, Empty, Row, colors, s } from '../ui';
import { useLidarrConfig } from './lidarrConfig';

/** Find new music via Lidarr and request it. Optionally like it automatically once it lands in Jellyfin. */
export function LidarrScreen() {
  const client = useAuth((a) => a.client)!;
  const qc = useQueryClient();
  const cfg = useLidarrConfig();
  const [text, setText] = useState('');
  const [term, setTerm] = useState('');
  const [requested, setRequested] = useState<Set<string>>(new Set());
  useEffect(() => { const t = setTimeout(() => setTerm(text.trim()), 600); return () => clearTimeout(t); }, [text]);
  useEffect(() => { processPendingLikes(client, qc); }, [client, qc]);

  const lidarr = cfg.data ? new LidarrClient(cfg.data) : null;
  const results = useQuery({
    queryKey: ['lidarr', term], enabled: !!lidarr && term.length > 2, staleTime: 5 * 60_000,
    queryFn: () => lidarr!.lookupAlbums(term),
  });

  if (cfg.isLoading) return <Empty loading />;
  if (!lidarr) return <Empty text="Set up Lidarr in Settings (URL + API key) to search for new music here." />;

  const request = async (a: LidarrAlbum, like: boolean) => {
    try {
      await lidarr.addAlbum(a);
      setRequested((r) => new Set(r).add(a.foreignAlbumId));
      if (like) setPendingLikes([...getPendingLikes(), { artist: a.artist.artistName, title: a.title }]);
      Alert.alert('Requested', like ? 'Lidarr is searching. When it shows up in Jellyfin its songs get added to Liked automatically (checked when you open Home or Find new music).' : 'Lidarr is searching for it.');
    } catch (e: any) { Alert.alert('Failed', e.message); }
  };

  return (
    <View style={s.screen}>
      <TextInput style={[s.input, { margin: 12 }]} placeholder="Search for an album or artist to add" placeholderTextColor={colors.dim}
        value={text} onChangeText={setText} autoCapitalize="none" autoCorrect={false} clearButtonMode="while-editing" />
      {results.isFetching ? <Empty loading /> : results.error ? <Empty error={(results.error as Error).message} /> : (
        <FlatList data={results.data ?? []} keyExtractor={(a) => a.foreignAlbumId} keyboardShouldPersistTaps="handled"
          ListEmptyComponent={<Empty text={term.length > 2 ? 'No results' : 'Type at least 3 letters'} />}
          renderItem={({ item }) => {
            const inLidarr = item.id > 0 || requested.has(item.foreignAlbumId);
            const pct = item.statistics?.percentOfTracks;
            const cover = item.images?.find((i) => i.coverType === 'cover')?.remoteUrl;
            return (
              <Row title={item.title} art={cover ?? ''}
                subtitle={[item.artist.artistName, item.releaseDate?.slice(0, 4), item.albumType].filter(Boolean).join(' · ')}
                right={inLidarr
                  ? <Text style={s.dim}>{pct === 100 ? 'Have it' : item.id > 0 ? 'In Lidarr' : 'Requested'}</Text>
                  : <View style={{ flexDirection: 'row', gap: 6 }}>
                      <Btn title="Add" onPress={() => request(item, false)} />
                      <Btn title="♥ Add" kind="primary" onPress={() => request(item, true)} />
                    </View>} />
            );
          }} />
      )}
    </View>
  );
}

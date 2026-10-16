import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';

import { LidarrClient, type LidarrAlbum } from '../api/lidarr';
import { processPendingLikes } from '../likes';
import { useAuth } from '../state/auth';
import { getPendingLikes, setPendingLikes } from '../storage/prefs';
import { Button, Empty } from '../ui/layout';
import { ListRow } from '../ui/rows';
import { Txt } from '../ui/text';
import { useColors } from '../ui/theme';
import { toast } from '../ui/toast';
import { useLidarrConfig } from './lidarrConfig';

/** Search the wider world through Lidarr and request albums. Optionally like them once they land in Jellyfin. */
export function Discover({ term, onSettings }: { term: string; onSettings: () => void }) {
  const c = useColors();
  const client = useAuth((a) => a.client)!;
  const qc = useQueryClient();
  const cfg = useLidarrConfig();
  const [requested, setRequested] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string>();
  useEffect(() => { processPendingLikes(client, qc); }, [client, qc]);

  const lidarr = cfg.data ? new LidarrClient(cfg.data) : null;
  const results = useQuery({
    queryKey: ['lidarr', term], enabled: !!lidarr && term.length > 2, staleTime: 5 * 60_000,
    queryFn: () => lidarr!.lookupAlbums(term),
  });

  if (cfg.isLoading) return <Empty loading />;
  if (!lidarr) {
    return (
      <View style={{ gap: 12 }}>
        <Empty text="Discover searches Lidarr for new music. Add your Lidarr URL and API key in Settings." />
        <Button title="Open Settings" onPress={onSettings} />
      </View>
    );
  }

  const request = async (a: LidarrAlbum, like: boolean) => {
    setBusy(a.foreignAlbumId);
    try {
      await lidarr.addAlbum(a);
      setRequested((r) => new Set(r).add(a.foreignAlbumId));
      if (like) setPendingLikes([...getPendingLikes(), { artist: a.artist.artistName, title: a.title }]);
      toast(like ? 'Requested · will be liked' : 'Requested', a.title);
    } catch (e: any) { Alert.alert('Failed', e.message); } finally { setBusy(undefined); }
  };

  if (term.length < 3) return <Empty text="Type at least 3 letters to search online." />;
  if (results.isFetching) return <Empty loading />;
  if (results.error) return <Empty text={(results.error as Error).message} />;
  if (!results.data?.length) return <Empty text="No matches online." />;

  return (
    <View style={{ marginHorizontal: -16 }}>
      {results.data.map((a) => {
        const have = a.statistics?.percentOfTracks === 100;
        const status = have ? '✓ in library' : requested.has(a.foreignAlbumId) ? 'requested' : a.id > 0 ? 'in Lidarr' : undefined;
        const cover = a.images?.find((i) => i.coverType === 'cover')?.remoteUrl;
        return (
          <ListRow key={a.foreignAlbumId} art={cover} title={a.title}
            sub={[a.artist.artistName, a.releaseDate?.slice(0, 4), a.albumType].filter(Boolean).join(' · ')}
            right={status ? <Txt v="mute">{status}</Txt> : busy === a.foreignAlbumId ? <Txt v="mute">adding…</Txt> : (
              <View style={{ flexDirection: 'row', gap: 14 }}>
                <Txt color={c.fg} onPress={() => request(a, false)}>+ add</Txt>
                <Txt color={c.accent} onPress={() => request(a, true)}>♥ add</Txt>
              </View>
            )} />
        );
      })}
    </View>
  );
}

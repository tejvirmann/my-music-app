import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Alert, ScrollView, Text, View } from 'react-native';

import type { JfItem } from '../api/types';
import { playNow } from '../player/queue';
import { useAuth } from '../state/auth';
import { Btn, Empty, fmt, s } from '../ui';

const mb = (n?: number) => (n ? `${(n / 1e6).toFixed(1)} MB` : undefined);
const kbps = (n?: number) => (n ? `${Math.round(n / 1000)} kbps` : undefined);

/** Everything Jellyfin knows about a song. Metadata itself is edited in Jellyfin; "Refresh" re-reads tags + online sources. */
export function SongInfoScreen({ route }: any) {
  const client = useAuth((a) => a.client)!;
  const { id } = route.params;
  const { data: t, isLoading, error, refetch } = useQuery({ queryKey: ['song', id], queryFn: () => client.item(id) });
  if (isLoading) return <Empty loading />;
  if (error || !t) return <Empty error={(error as Error)?.message ?? 'Not found'} />;

  const src = t.MediaSources?.[0];
  const audio = src?.MediaStreams?.find((m) => m.Type === 'Audio');
  const rows: [string, string | undefined][] = [
    ['Title', t.Name],
    ['Artist', t.Artists?.join(', ')],
    ['Album artist', t.AlbumArtist],
    ['Album', t.Album],
    ['Track', t.IndexNumber ? `${t.IndexNumber}${t.ParentIndexNumber ? ` (disc ${t.ParentIndexNumber})` : ''}` : undefined],
    ['Year', t.ProductionYear?.toString()],
    ['Genres', t.Genres?.join(', ')],
    ['Length', t.RunTimeTicks ? fmt(t.RunTimeTicks / 1e7) : undefined],
    ['Format', [src?.Container?.toUpperCase(), audio?.Codec, kbps(audio?.BitRate ?? src?.Bitrate)].filter(Boolean).join(' · ') || undefined],
    ['Sample rate', audio?.SampleRate ? `${audio.SampleRate} Hz${audio.BitDepth ? ` / ${audio.BitDepth}-bit` : ''}` : undefined],
    ['Size', mb(src?.Size)],
    ['File', t.Path],
    ['MusicBrainz track', t.ProviderIds?.MusicBrainzTrack],
    ['MusicBrainz album', t.ProviderIds?.MusicBrainzAlbum],
  ];
  const missing = !t.Album || !t.Artists?.length || !t.ProductionYear || !t.Genres?.length;

  const refresh = async () => {
    try { await client.refreshMetadata(id); Image.clearDiskCache().catch(() => {}); Alert.alert('Refresh started', 'Jellyfin is re-reading tags and fetching metadata. Pull to reload in a few seconds.'); setTimeout(() => refetch(), 4000); }
    catch (e: any) { Alert.alert('Failed', e.message); }
  };

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ padding: 16 }}>
      <View style={[s.buttons, { paddingHorizontal: 0, paddingTop: 0 }]}>
        <Btn title="Play" kind="primary" onPress={() => playNow(client, [t as JfItem], 0)} />
        <Btn title="Refresh metadata" onPress={refresh} />
      </View>
      {missing && <Text style={{ color: '#ffd60a', marginBottom: 12 }}>Some fields are empty. That usually means the file's tags are missing; fix the tags (e.g. MusicBrainz Picard), then Refresh.</Text>}
      {rows.filter(([, v]) => v).map(([k, v]) => (
        <View key={k} style={{ marginBottom: 12 }}>
          <Text style={s.dim}>{k}</Text>
          <Text style={s.text} selectable>{v}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

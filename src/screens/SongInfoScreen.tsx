import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Alert, View } from 'react-native';

import { playNow } from '../player/queue';
import { useAuth } from '../state/auth';
import { Art } from '../ui/Art';
import { Body, Button, Empty, Screen, TopBar, fmt } from '../ui/layout';
import { Txt } from '../ui/text';
import { useColors } from '../ui/theme';
import { toast } from '../ui/toast';

const mb = (n?: number) => (n ? `${(n / 1e6).toFixed(1)} MB` : undefined);
const kbps = (n?: number) => (n ? `${Math.round(n / 1000)} kbps` : undefined);

/** Everything Jellyfin knows about a song. Fix tags at the source (Picard/beets), then Refresh. */
export function SongInfoScreen({ route, navigation }: any) {
  const c = useColors();
  const client = useAuth((a) => a.client)!;
  const { id } = route.params;
  const { data: t, isLoading, error, refetch } = useQuery({ queryKey: ['song', id], queryFn: () => client.item(id) });

  const src = t?.MediaSources?.[0];
  const audio = src?.MediaStreams?.find((m) => m.Type === 'Audio');
  const rows: [string, string | undefined][] = t ? [
    ['album', t.Album],
    ['artist', t.Artists?.join(', ')],
    ['album artist', t.AlbumArtist],
    ['year', t.ProductionYear?.toString()],
    ['genre', t.Genres?.join(', ')],
    ['track', t.IndexNumber ? `${t.IndexNumber}${t.ParentIndexNumber ? ` · disc ${t.ParentIndexNumber}` : ''}` : undefined],
    ['length', t.RunTimeTicks ? fmt(t.RunTimeTicks / 1e7) : undefined],
    ['format', [src?.Container?.toUpperCase(), audio?.Codec, kbps(audio?.BitRate ?? src?.Bitrate)].filter(Boolean).join(' · ') || undefined],
    ['sample rate', audio?.SampleRate ? `${audio.SampleRate} Hz${audio.BitDepth ? ` / ${audio.BitDepth}-bit` : ''}` : undefined],
    ['size', mb(src?.Size)],
    ['file', t.Path],
    ['musicbrainz', t.ProviderIds?.MusicBrainzTrack ?? t.ProviderIds?.MusicBrainzAlbum],
  ] : [];
  const missing = !!t && (!t.Album || !t.Artists?.length || !t.ProductionYear || !t.Genres?.length);

  const refresh = async () => {
    try {
      await client.refreshMetadata(id); Image.clearDiskCache().catch(() => {});
      toast('Refreshing metadata…'); setTimeout(() => refetch(), 4000);
    } catch (e: any) { Alert.alert('Failed', e.message); }
  };

  return (
    <Screen mini>
      <TopBar onBack={() => navigation.goBack()} />
      <Body>
        {isLoading ? <Empty loading /> : error || !t ? <Empty text={(error as Error)?.message ?? 'Not found'} /> : (
          <>
            <View style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-end', marginBottom: 16 }}>
              <Art uri={client.imageUrl(t.AlbumId ?? t.Id, 320)} size={96} />
              <View style={{ flex: 1 }}>
                <Txt v="h2" style={{ fontSize: 28, lineHeight: 30 }} numberOfLines={3}>{t.Name}</Txt>
                <Txt v="mute" numberOfLines={1}>{t.Artists?.[0] ?? t.AlbumArtist}</Txt>
              </View>
            </View>
            {missing && <Txt color={c.accent} style={{ marginBottom: 10 }}>Some fields are empty. That usually means the file's tags are missing: fix them (MusicBrainz Picard / beets), then refresh.</Txt>}
            {rows.filter(([, v]) => v).map(([k, v]) => (
              <View key={k} style={{ flexDirection: 'row', gap: 10, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: c.line }}>
                <Txt v="mute" style={{ width: 92 }}>{k}</Txt>
                <Txt style={{ flex: 1 }} selectable>{v}</Txt>
              </View>
            ))}
            <View style={{ gap: 8, marginTop: 14 }}>
              <Button title="Play" solid onPress={() => playNow(client, [t], 0, 'Song info')} />
              <Button title="Refresh metadata" onPress={refresh} />
            </View>
          </>
        )}
      </Body>
    </Screen>
  );
}

import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Alert, View } from 'react-native';

import { useAuth } from '../state/auth';
import { Body, Button, Empty, Heading, Screen, TopBar } from '../ui/layout';
import { Txt } from '../ui/text';
import { useColors } from '../ui/theme';

/** Library-wide metadata health: what Jellyfin has no data for, and a one-tap refresh of those albums. */
export function MetadataScreen({ navigation }: any) {
  const c = useColors();
  const client = useAuth((a) => a.client)!;
  const [busy, setBusy] = useState<string>();
  const q = useQuery({ queryKey: ['metadata-scan'], queryFn: () => client.scanMetadata(), staleTime: 0, gcTime: 0 });

  const body = () => {
    if (q.isLoading) return <Empty loading text="Scanning library…" />;
    if (q.error || !q.data) return <Empty text={`Scan failed: ${(q.error as Error)?.message}`} />;
    const { songs, albums } = q.data;
    const noArt = albums.filter((a) => !a.ImageTags?.Primary);
    const stats: [string, number, number][] = [
      ['Albums without cover art', noArt.length, albums.length],
      ['Albums without year', albums.filter((a) => !a.ProductionYear).length, albums.length],
      ['Albums without genre', albums.filter((a) => !a.Genres?.length).length, albums.length],
      ['Albums not on MusicBrainz', albums.filter((a) => !a.ProviderIds?.MusicBrainzAlbum && !a.ProviderIds?.MusicBrainzReleaseGroup).length, albums.length],
      ['Songs without artist', songs.filter((t) => !t.Artists?.length && !t.AlbumArtist).length, songs.length],
      ['Songs without album', songs.filter((t) => !t.Album).length, songs.length],
    ];
    const problem = [...new Map(albums.filter((a) => !a.ImageTags?.Primary || !a.ProductionYear || !a.Genres?.length || (!a.ProviderIds?.MusicBrainzAlbum && !a.ProviderIds?.MusicBrainzReleaseGroup)).map((a) => [a.Id, a])).values()];
    const refreshAll = async () => {
      for (let i = 0; i < problem.length; i++) {
        setBusy(`${i + 1}/${problem.length}`);
        try { await client.refreshMetadata(problem[i].Id, false); } catch {}
        await new Promise((r) => setTimeout(r, 400)); // gentle on the server
      }
      setBusy(undefined);
      await Image.clearDiskCache().catch(() => {});
      Alert.alert('Refresh queued', 'Jellyfin is working through them in the background. Re-scan in a few minutes.');
    };
    return (
      <>
        <Txt v="mute" style={{ marginBottom: 6 }}>{songs.length.toLocaleString()} songs · {albums.length.toLocaleString()} albums</Txt>
        {stats.map(([label, n, of]) => (
          <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: c.line }}>
            <Txt>{label}</Txt>
            <Txt v="med" color={n ? c.accent : c.ok}>{n ? `${n} / ${of}` : '✓'}</Txt>
          </View>
        ))}
        <View style={{ gap: 8, marginTop: 16 }}>
          <Button solid title={busy ? `Refreshing ${busy}` : `Refresh ${problem.length} albums with gaps`} disabled={!!busy || !problem.length} onPress={refreshAll} />
          <Button title="Re-scan" onPress={() => q.refetch()} />
        </View>
        {noArt.length > 0 && <Txt v="h3" style={{ marginTop: 22, marginBottom: 6 }}>No cover art</Txt>}
        {noArt.slice(0, 40).map((a) => <Txt key={a.Id} v="mute" numberOfLines={1}>{a.AlbumArtist ?? '?'} — {a.Name}</Txt>)}
        <Txt v="small" style={{ marginTop: 20 }}>Refresh only fills what Jellyfin can read or look up. If tags are wrong or missing in the files, fix them with MusicBrainz Picard or beets first, then refresh.</Txt>
      </>
    );
  };

  return (
    <Screen>
      <TopBar onBack={() => navigation.goBack()} />
      <Body>
        <Heading title="Metadata health" />
        {body()}
      </Body>
    </Screen>
  );
}

import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';

import { useAuth } from '../state/auth';
import { Btn, Empty, colors, s } from '../ui';

/** Library-wide metadata health: what Jellyfin has no data for, and a one-tap refresh of those items. */
export function MetadataScreen() {
  const client = useAuth((a) => a.client)!;
  const [busy, setBusy] = useState<string>();
  const q = useQuery({ queryKey: ['metadata-scan'], queryFn: () => client.scanMetadata(), staleTime: 0, gcTime: 0 });
  if (q.isLoading) return <Empty text="Scanning library…" loading />;
  if (q.error || !q.data) return <Empty text={`Scan failed: ${(q.error as Error)?.message}`} />;

  const { songs, albums } = q.data;
  const noArt = albums.filter((a) => !a.ImageTags?.Primary);
  const noArtist = songs.filter((t) => !t.Artists?.length && !t.AlbumArtist);
  const noAlbum = songs.filter((t) => !t.Album);
  const noYear = albums.filter((a) => !a.ProductionYear);
  const noGenre = albums.filter((a) => !a.Genres?.length);
  const noMbid = albums.filter((a) => !a.ProviderIds?.MusicBrainzAlbum && !a.ProviderIds?.MusicBrainzReleaseGroup);

  const stats: [string, number, number][] = [
    ['Albums without cover art', noArt.length, albums.length],
    ['Albums without year', noYear.length, albums.length],
    ['Albums without genre', noGenre.length, albums.length],
    ['Albums not matched to MusicBrainz', noMbid.length, albums.length],
    ['Songs without artist', noArtist.length, songs.length],
    ['Songs without album', noAlbum.length, songs.length],
  ];

  const problem = [...new Map([...noArt, ...noYear, ...noGenre, ...noMbid].map((a) => [a.Id, a])).values()];

  const refreshAll = async (replace: boolean) => {
    for (let i = 0; i < problem.length; i++) {
      setBusy(`${i + 1}/${problem.length}`);
      try { await client.refreshMetadata(problem[i].Id, replace); } catch {}
      await new Promise((r) => setTimeout(r, 400)); // gentle on the server
    }
    setBusy(undefined);
    await Image.clearDiskCache().catch(() => {});
    Alert.alert('Refresh queued', 'Jellyfin is working through them in the background. Re-scan in a few minutes.');
  };

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ padding: 16 }}>
      <Text style={s.dim}>{songs.length} songs · {albums.length} albums</Text>
      {stats.map(([label, n, of]) => (
        <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 }}>
          <Text style={s.text}>{label}</Text>
          <Text style={{ color: n ? colors.danger : colors.accent, fontWeight: '700' }}>{n}{n ? ` / ${of}` : ' ✓'}</Text>
        </View>
      ))}
      <View style={[s.buttons, { paddingHorizontal: 0 }]}>
        <Btn title={busy ? `Refreshing ${busy}` : `Refresh ${problem.length} albums with gaps`} kind="primary" disabled={!!busy || !problem.length} onPress={() => refreshAll(false)} />
        <Btn title="Re-scan" onPress={() => q.refetch()} />
      </View>
      {!!noArt.length && <Text style={[s.h1, { marginTop: 20, marginBottom: 6 }]}>No cover art</Text>}
      {noArt.slice(0, 40).map((a) => <Text key={a.Id} style={s.dim}>{a.AlbumArtist ?? '?'} — {a.Name}</Text>)}
      <Text style={[s.dim, { marginTop: 20 }]}>
        Refresh only fills what Jellyfin can read or look up. If tags are wrong or missing in the files, fix them with MusicBrainz Picard or beets first, then refresh.
      </Text>
    </ScrollView>
  );
}

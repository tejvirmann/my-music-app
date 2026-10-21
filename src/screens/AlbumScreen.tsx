import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Pressable, View } from 'react-native';

import { dlKey, toggleDownload } from '../downloadActions';
import { useDownloadedPlaylists, useDownloadProgress } from '../downloads';
import { setLiked, useLiked } from '../likes';
import { playNow } from '../player/queue';
import { useAuth } from '../state/auth';
import { Art } from '../ui/Art';
import { Icon } from '../ui/Icon';
import { Body, Empty, IconBtn, Screen, TopBar, fmt } from '../ui/layout';
import { SongRow } from '../ui/SongRow';
import { openAlbumMenu } from '../ui/sheets';
import { Txt } from '../ui/text';
import { useColors } from '../ui/theme';
import { toast } from '../ui/toast';

export function AlbumScreen({ route, navigation }: any) {
  const c = useColors();
  const client = useAuth((a) => a.client)!;
  const qc = useQueryClient();
  const { id, name } = route.params;
  const { data, isLoading, error } = useQuery({ queryKey: ['album', id], queryFn: () => client.albumTracks(id) });
  const liked = useLiked().data?.entries ?? {};
  const key = dlKey('album', id);
  const isDl = useDownloadedPlaylists().has(key);
  const progress = useDownloadProgress(key);
  const tracks = data?.Items ?? [];
  const allLiked = tracks.length > 0 && tracks.every((t) => liked[t.Id]);
  const first = tracks[0];
  const secs = tracks.reduce((n, t) => n + (t.RunTimeTicks ?? 0) / 1e7, 0);
  const meta = [first?.AlbumArtist, first?.ProductionYear, first?.Genres?.[0], `${tracks.length} song${tracks.length === 1 ? '' : 's'}`, secs ? `${Math.round(secs / 60)} min` : null].filter(Boolean).join(' · ');

  return (
    <Screen mini>
      <TopBar onBack={() => navigation.goBack()} right={<IconBtn name="dots" label="More" onPress={() => openAlbumMenu({ Id: id, Name: name, Type: 'MusicAlbum', AlbumArtist: first?.AlbumArtist })} />} />
      <Body>
        <View style={{ width: 190, alignSelf: 'center', marginBottom: 16 }}><Art uri={client.imageUrl(id, 640)} /></View>
        <Txt v="h2" style={{ fontSize: 30 }}>{name}</Txt>
        {!!first?.AlbumArtist && <Txt color={c.accent} style={{ marginTop: 4 }} onPress={() => navigation.navigate('Artist', { name: first.AlbumArtist })}>{first.AlbumArtist}</Txt>}
        <Txt v="mute" style={{ marginTop: 4 }}>{meta.split(' · ').slice(first?.AlbumArtist ? 1 : 0).join(' · ')}</Txt>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20, marginTop: 14, marginBottom: 6 }}>
          <Pressable disabled={!!progress} onPress={() => toggleDownload(client, 'album', id, name, isDl)} hitSlop={8} accessibilityLabel="Download album">
            {progress ? <Txt color={c.ok}>{progress}</Txt> : <Icon name="dl" size={24} color={isDl ? c.ok : c.mute} />}
          </Pressable>
          <IconBtn name={allLiked ? 'heart' : 'heartO'} size={24} color={allLiked ? c.accent : c.mute} label="Like all songs"
            onPress={() => setLiked(client, qc, tracks.map((t) => t.Id), !allLiked).then(() => toast(allLiked ? 'Removed from Liked' : 'Album added to Liked')).catch((e) => Alert.alert('Failed', e.message))} />
          <View style={{ flex: 1 }} />
          <Pressable onPress={() => tracks.length && playNow(client, tracks, 0, name, { kind: 'album', id, name })} accessibilityLabel="Play album"
            style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: c.fg, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="play" size={24} color={c.bg} />
          </Pressable>
        </View>
        {isLoading ? <Empty loading /> : error ? <Empty text={(error as Error).message} /> : (
          <View style={{ marginHorizontal: -16 }}>
            {tracks.map((t, i) => (
              <SongRow key={t.Id} track={t} hideArt sub={t.RunTimeTicks ? fmt(t.RunTimeTicks / 1e7) : undefined}
                lead={<Txt v="mute" style={{ width: 20, textAlign: 'left' }}>{t.IndexNumber ?? i + 1}</Txt>}
                onPress={() => playNow(client, tracks, i, name, { kind: 'album', id, name })} />
            ))}
          </View>
        )}
      </Body>
    </Screen>
  );
}

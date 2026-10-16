import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Pressable, View } from 'react-native';

import { toggleDownload } from '../downloadActions';
import { useDownloadedPlaylists, useDownloadedTracks, useDownloadProgress } from '../downloads';
import { playNow } from '../player/queue';
import { useAuth } from '../state/auth';
import { PlaylistCover } from '../ui/PlaylistCover';
import { Icon } from '../ui/Icon';
import { Body, Empty, IconBtn, Screen, TopBar } from '../ui/layout';
import { SongRow } from '../ui/SongRow';
import { openPlaylistMenu } from '../ui/sheets';
import { Txt } from '../ui/text';
import { useColors } from '../ui/theme';

export function PlaylistScreen({ route, navigation }: any) {
  const c = useColors();
  const client = useAuth((a) => a.client)!;
  const qc = useQueryClient();
  const { id, name } = route.params;
  const key = ['playlist', id];
  const { data, isLoading, error } = useQuery({ queryKey: key, queryFn: () => client.playlistTracks(id) });
  const tracks = data?.Items ?? [];
  const progress = useDownloadProgress(id);
  const isDl = useDownloadedPlaylists().has(id);
  const dlTracks = useDownloadedTracks();
  const stale = isDl && tracks.some((t) => !dlTracks.has(t.Id));
  const mins = Math.round(tracks.reduce((n, t) => n + (t.RunTimeTicks ?? 0) / 6e8, 0));
  const refresh = () => { qc.invalidateQueries({ queryKey: key }); qc.invalidateQueries({ queryKey: ['playlists'] }); };
  const shuffled = () => [...tracks].sort(() => Math.random() - 0.5);

  return (
    <Screen mini>
      <TopBar onBack={() => navigation.goBack()} />
      <Body>
        <View style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-end', marginBottom: 14 }}>
          <PlaylistCover id={id} name={name} size={120} />
          <View style={{ flex: 1 }}>
            <Txt v="h2" style={{ fontSize: 28, lineHeight: 30 }} numberOfLines={3}>{name}</Txt>
            <Txt v="mute" style={{ marginTop: 4 }}>{tracks.length} songs{mins ? ` · ${mins} min` : ''}</Txt>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20, marginBottom: 6 }}>
          <Pressable disabled={!!progress} onPress={() => toggleDownload(client, 'playlist', id, name, isDl && !stale)} hitSlop={8} accessibilityLabel="Download playlist">
            {progress ? <Txt color={c.ok}>{progress}</Txt> : <Icon name="dl" size={24} color={isDl ? (stale ? c.accent : c.ok) : c.mute} />}
          </Pressable>
          <IconBtn name="shuf" size={24} color={c.mute} label="Shuffle play" onPress={() => tracks.length && playNow(client, shuffled(), 0, name)} />
          <IconBtn name="dots" size={24} color={c.mute} label="More" onPress={() => openPlaylistMenu({ Id: id, Name: name, Type: 'Playlist', ChildCount: tracks.length })} />
          <View style={{ flex: 1 }} />
          <Pressable onPress={() => tracks.length && playNow(client, tracks, 0, name)} accessibilityLabel="Play playlist"
            style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: c.fg, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="play" size={24} color={c.bg} />
          </Pressable>
        </View>
        {stale && !progress && <Txt color={c.accent} style={{ marginBottom: 4 }} onPress={() => toggleDownload(client, 'playlist', id, name, false)}>↻ new songs not downloaded · update</Txt>}
        {isLoading ? <Empty loading /> : error ? <Empty text={(error as Error).message} /> : !tracks.length ? <Empty text="Empty playlist. Use ⋯ on any song → Add to playlist." /> : (
          <View style={{ marginHorizontal: -16 }}>
            {tracks.map((t, i) => (
              <SongRow key={t.PlaylistItemId ?? `${t.Id}-${i}`} track={t} sub={[t.Artists?.[0] ?? t.AlbumArtist, t.Album].filter(Boolean).join(' · ')}
                ctx={{ playlistId: id, entryId: t.PlaylistItemId, index: i, count: tracks.length, onChange: refresh }}
                onPress={() => playNow(client, tracks, i, name)} />
            ))}
          </View>
        )}
      </Body>
    </Screen>
  );
}

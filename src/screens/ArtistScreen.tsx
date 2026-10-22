import { useQuery } from '@tanstack/react-query';
import { View, useWindowDimensions } from 'react-native';

import { playNow, playShuffled, usePlayer } from '../player/queue';
import { useAuth } from '../state/auth';
import { Art } from '../ui/Art';
import { Icon } from '../ui/Icon';
import { Body, Empty, IconBtn, Screen, Section, TopBar } from '../ui/layout';
import { ListRow } from '../ui/rows';
import { SongRow } from '../ui/SongRow';
import { Txt } from '../ui/text';
import { useColors } from '../ui/theme';
import { Pressable } from 'react-native';

const POPULAR = 5;

/** Artist page: hero, play/shuffle, most-played songs (only when there is play history) and albums. All from Jellyfin data. */
export function ArtistScreen({ route, navigation }: any) {
  const c = useColors();
  const client = useAuth((a) => a.client)!;
  const { width } = useWindowDimensions();
  const { name } = route.params as { name: string };
  const artist = useQuery({ queryKey: ['artist', name], queryFn: () => client.artist(name) });
  const artistId = artist.data?.Id;
  const albums = useQuery({ queryKey: ['artistAlbums', artistId], queryFn: () => client.albumsByArtist(artistId!), enabled: !!artistId });
  const songs = useQuery({ queryKey: ['artistSongs', artistId], queryFn: () => client.songsByArtist(artistId!), enabled: !!artistId });

  const all = songs.data?.Items ?? [];
  const albumList = albums.data?.Items ?? [];
  const hasHistory = all.some((t) => (t.UserData?.PlayCount ?? 0) > 0);
  const shuffling = usePlayer((s) => s.shuffle && s.ctxName === name);
  const popular = hasHistory ? all.slice(0, POPULAR) : [];
  const hero = artist.data?.ImageTags?.Primary ? client.imageUrl(artist.data.Id, 640) : albumList[0] ? client.imageUrl(albumList[0].Id, 640) : undefined;
  const play = (shuffle: boolean) => {
    if (!all.length) return;
    if (shuffle) playShuffled(client, all, name); else playNow(client, all, 0, name);
  };

  return (
    <Screen mini>
      <TopBar onBack={() => navigation.goBack()} />
      <Body>
        {artist.isLoading ? <Empty loading /> : artist.error ? <Empty text={(artist.error as Error).message} /> : (
          <>
            <View style={{ width: Math.min(width - 32, 320), alignSelf: 'center', marginBottom: 16, borderRadius: 999, overflow: 'hidden' }}>
              <Art uri={hero} />
            </View>
            <Txt v="h2" style={{ fontSize: 34, textAlign: 'center' }}>{name}</Txt>
            <Txt v="mute" style={{ textAlign: 'center', marginTop: 4 }}>
              {[albumList.length ? `${albumList.length} album${albumList.length === 1 ? '' : 's'}` : null, all.length ? `${all.length} song${all.length === 1 ? '' : 's'}` : null].filter(Boolean).join(' · ')}
            </Txt>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24, marginTop: 14 }}>
              <IconBtn name="shuf" size={26} color={shuffling ? c.accent : c.mute} label="Shuffle artist" onPress={() => play(true)} />
              <Pressable onPress={() => play(false)} accessibilityLabel="Play artist"
                style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: c.fg, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="play" size={28} color={c.bg} />
              </Pressable>
            </View>

            {popular.length > 0 && (
              <>
                <Section title="Popular" />
                <View style={{ marginHorizontal: -16 }}>
                  {popular.map((t, i) => (
                    <SongRow key={t.Id} track={t} sub={t.Album} onPress={() => playNow(client, popular, i, `${name} · Popular`)} />
                  ))}
                </View>
              </>
            )}

            {albumList.length > 0 && (
              <>
                <Section title="Albums" />
                <View style={{ marginHorizontal: -16 }}>
                  {albumList.map((a) => (
                    <ListRow key={a.Id} art={client.imageUrl(a.Id, 160)} title={a.Name} sub={['Album', a.ProductionYear].filter(Boolean).join(' · ')}
                      onPress={() => navigation.navigate('Album', { id: a.Id, name: a.Name })} />
                  ))}
                </View>
              </>
            )}

            {all.length > 0 && (
              <>
                <Section title={`All songs`} />
                <View style={{ marginHorizontal: -16 }}>
                  {all.map((t, i) => <SongRow key={t.Id} track={t} sub={t.Album} onPress={() => playNow(client, all, i, name)} />)}
                </View>
              </>
            )}
          </>
        )}
      </Body>
    </Screen>
  );
}

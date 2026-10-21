import { useQueries, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import type { JfItem } from '../api/types';
import { addToQueue, playNow } from '../player/queue';
import { norm, prep, searchItems } from '../search';
import { useAuth } from '../state/auth';
import { isFresh, loadIndex, saveIndex } from '../storage/searchIndex';
import { useSettings } from '../state/settings';
import { Icon } from '../ui/Icon';
import { Body, Empty, IconBtn, Pill, Screen, Section, TopBar, fmt } from '../ui/layout';
import { ListRow } from '../ui/rows';
import { SongRow } from '../ui/SongRow';
import { Txt } from '../ui/text';
import { F, useColors } from '../ui/theme';
import { toast } from '../ui/toast';
import { PlaylistCover } from '../ui/PlaylistCover';
import { Discover } from './Discover';
import { usePlaylists } from './hooks';

const W = { title: 2, name: 2, artist: 1.5, album: 1, genre: 0.8, year: 0.8 };

/** Everything is matched on the phone against a cached index, so results appear as you type and cover year/genre too. */
function useIndex() {
  const client = useAuth((a) => a.client)!;
  const userId = useAuth((a) => a.session!.userId);
  // Saved copy is reused when the server's song/album totals and newest items still match (two 1-row probes) and it is under a day old.
  const index = useQuery({
    queryKey: ['searchIndex', userId], staleTime: 30 * 60_000, gcTime: Infinity,
    queryFn: async () => {
      const sigNow = async () => (await Promise.all([client.fingerprint('Audio'), client.fingerprint('MusicAlbum')])).join('|');
      const saved = await loadIndex(userId);
      if (saved && isFresh(saved)) {
        try {
          if ((await sigNow()) === saved.sig) return saved;
        } catch { return saved; }
      }
      let songs: JfItem[], albums: JfItem[], sig: string;
      try { sig = await sigNow(); } catch { sig = ''; }
      try { [songs, albums] = await Promise.all([client.allSongs(), client.allAlbums()]); } catch (e) { if (saved) return saved; throw e; }
      const fresh = { userId, at: Date.now(), songs, albums, sig };
      saveIndex(fresh);
      return fresh;
    },
  });
  const songs = { data: index.data?.songs, isLoading: index.isLoading };
  const albums = { data: index.data?.albums };
  const rows = useMemo(() => (songs.data ?? []).map((s) => ({
    item: s, p: prep({ title: s.Name, artist: (s.Artists ?? [s.AlbumArtist ?? '']).join(' '), album: s.Album, year: String(s.ProductionYear ?? ''), genre: (s.Genres ?? []).join(' ') }),
  })), [songs.data]);
  const albumRows = useMemo(() => (albums.data ?? []).map((a) => ({ item: a, p: prep({ name: a.Name, artist: a.AlbumArtist, year: String(a.ProductionYear ?? '') }) })), [albums.data]);
  return { rows, albumRows, loading: songs.isLoading, count: songs.data?.length ?? 0 };
}

export function SearchScreen({ navigation }: any) {
  const c = useColors();
  const client = useAuth((a) => a.client)!;
  const showDiscover = useSettings((s) => s.showDiscover);
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const [mode, setMode] = useState<'lib' | 'disc'>('lib');
  const [more, setMore] = useState(false);
  const [kind, setKind] = useState<'all' | 'songs' | 'artists' | 'albums' | 'playlists'>('all');
  const idx = useIndex();
  const pls = usePlaylists();
  useEffect(() => { const t = setTimeout(() => setQ(text.trim()), mode === 'disc' ? 600 : 120); return () => clearTimeout(t); }, [text, mode]);
  useEffect(() => { if (!showDiscover) setMode('lib'); }, [showDiscover]);
  useEffect(() => setMore(false), [q]);
  useEffect(() => setKind('all'), [q === '']); // eslint-disable-line react-hooks/exhaustive-deps

  const has = norm(q).length > 0;
  const songs = useMemo(() => searchItems(idx.rows, q, W), [idx.rows, q]);
  const albums = useMemo(() => searchItems(idx.albumRows, q, W).map((x) => x.item), [idx.albumRows, q]);
  const artistRows = useMemo(() => {
    const n = new Map<string, number>();
    idx.rows.forEach(({ item: s }) => new Set([...(s.Artists ?? []), ...(s.AlbumArtist ? [s.AlbumArtist] : [])]).forEach((a) => n.set(a, (n.get(a) ?? 0) + 1)));
    return [...n.entries()].map(([name, count]) => ({ item: { name, count }, p: prep({ name }) }));
  }, [idx.rows]);
  const artists = useMemo(() => searchItems(artistRows, q, W).map((x) => x.item), [artistRows, q]);
  const plRows = useMemo(() => pls.items.map((p) => ({ item: p, p: prep({ name: p.Name }) })), [pls.items]);
  const plByName = useMemo(() => searchItems(plRows, q, W).map((x) => x.item), [plRows, q]);

  // Which playlists hold which songs: fetched once per playlist the first time you search, then saved (refetched if its song count changes).
  const members = useQueries({
    queries: pls.items.map((p) => ({
      queryKey: ['playlistIds', p.Id, p.ChildCount ?? 0], queryFn: () => client.playlistIds(p.Id), enabled: has, staleTime: 60 * 60_000, gcTime: Infinity,
    })),
  });
  const memberKey = members.map((m) => m.dataUpdatedAt).join(',');
  const sets = useMemo(() => new Map(pls.items.map((p, i) => [p.Id, new Set(members[i]?.data ?? [])] as const)), [memberKey, pls.items]); // eslint-disable-line react-hooks/exhaustive-deps
  const inPlaylists = (songId: string) => pls.items.filter((p) => sets.get(p.Id)?.has(songId));
  // Playlists matched by name first, then playlists that contain one of the best-matching songs.
  const playlists = useMemo(() => {
    const out = plByName.map((p) => ({ p, via: undefined as string | undefined }));
    const seen = new Set(plByName.map((p) => p.Id));
    for (const { item: s } of songs.slice(0, 30)) {
      for (const p of pls.items) if (!seen.has(p.Id) && sets.get(p.Id)?.has(s.Id)) { seen.add(p.Id); out.push({ p, via: s.Name }); }
    }
    return out;
  }, [plByName, songs, sets, pls.items]);

  // Suggestions come from the user's own library: most common genres, then newest years.
  const suggestions = useMemo(() => {
    const g = new Map<string, number>();
    idx.rows.forEach(({ item: s }) => s.Genres?.forEach((x) => g.set(x, (g.get(x) ?? 0) + 1)));
    const genres = [...g.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([x]) => x.toLowerCase());
    const years = [...new Set(idx.rows.map(({ item: s }) => s.ProductionYear).filter(Boolean))].sort().reverse().slice(0, 2).map(String);
    return [...genres, ...years];
  }, [idx.rows]);

  const showSongs = kind === 'all' || kind === 'songs', showArtists = kind === 'all' || kind === 'artists', showAlbums = kind === 'all' || kind === 'albums', showPlaylists = kind === 'all' || kind === 'playlists';
  const shown = (more || kind === 'songs' ? songs.slice(0, 50) : songs.slice(0, 6)).map((x) => ({ s: x.item, hits: x.hits }));
  const queueAlbum = (id: string) => client.albumTracks(id).then((r) => addToQueue(client, r.Items)).then((n) => toast('Album added to queue', `${n} up next`));

  return (
    <Screen>
      <TopBar left="search" right={<IconBtn name="gear" label="Settings" onPress={() => navigation.navigate('Settings')} />} />
      <Body>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 1, borderBottomColor: c.fg, paddingVertical: 6, marginBottom: 12 }}>
          <Icon name="srch" size={18} color={c.mute} />
          <TextInput value={text} onChangeText={setText} autoCapitalize="none" autoCorrect={false} returnKeyType="search" clearButtonMode="while-editing"
            placeholder={mode === 'lib' ? 'songs, albums, playlists, artists…' : 'find new albums & artists online'} placeholderTextColor={c.mute} selectionColor={c.accent}
            style={{ flex: 1, fontFamily: F.mono, fontSize: 14, color: c.fg, paddingVertical: 4 }} />
        </View>
        {showDiscover && (
          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
            <Pill label="library" on={mode === 'lib'} onPress={() => setMode('lib')} />
            <Pill label="discover" on={mode === 'disc'} onPress={() => setMode('disc')} />
          </View>
        )}

        {mode === 'lib' && has && (
          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
            {(['all', 'songs', 'artists', 'albums', 'playlists'] as const).map((k) => <Pill key={k} label={k} on={kind === k} onPress={() => setKind(k)} />)}
          </View>
        )}

        {mode === 'disc' ? <Discover term={q} onSettings={() => navigation.navigate('Settings')} /> : !has ? (
          <View>
            <Txt v="mute" style={{ marginBottom: 6 }}>try</Txt>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {suggestions.map((s) => (
                <Pressable key={s} onPress={() => setText(s)} style={{ borderWidth: 1, borderColor: c.line, paddingHorizontal: 8, paddingVertical: 2 }}><Txt v="mute">{s}</Txt></Pressable>
              ))}
            </View>
            <Txt v="mute" style={{ marginTop: 14 }}>
              {idx.loading ? 'Indexing your library…' : `Searches ${idx.count.toLocaleString()} songs by title, artist, album, year and genre.`}
            </Txt>
          </View>
        ) : (kind === 'all' ? !songs.length && !artists.length && !albums.length && !playlists.length : kind === 'songs' ? !songs.length : kind === 'artists' ? !artists.length : kind === 'albums' ? !albums.length : !playlists.length) ? (
          <Empty loading={idx.loading} text={`Nothing in your library for "${q}".${showDiscover ? '\nTry Discover.' : ''}`} />
        ) : (
          <View>
            {showSongs && songs.length > 0 && (
              <>
                <Section title="Songs" hint={`${songs.length} found`} />
                <View style={{ marginHorizontal: -16 }}>
                  {shown.map(({ s, hits }, i) => (
                    <SongRow key={s.Id} track={s} sub={[s.Artists?.[0] ?? s.AlbumArtist, s.Album].filter(Boolean).join(' · ')}
                      chips={[...inPlaylists(s.Id).slice(0, 2).map((p) => `in ${p.Name}`), hits.has('year') && s.ProductionYear ? String(s.ProductionYear) : null, hits.has('genre') ? s.Genres?.[0] ?? null : null, s.RunTimeTicks ? fmt(s.RunTimeTicks / 1e7) : null].filter(Boolean) as string[]}
                      onPress={() => playNow(client, shown.map((x) => x.s), i, 'Search')} />
                  ))}
                </View>
                {kind === 'all' && songs.length > 6 && <Txt v="mute" style={{ paddingTop: 8 }} onPress={() => setMore(!more)}>{more ? 'show fewer' : `show ${Math.min(songs.length, 50) - 6} more`}</Txt>}
              </>
            )}
            {showArtists && artists.length > 0 && (
              <>
                <Section title="Artists" hint={kind === 'all' && artists.length > 3 ? `see all ${artists.length}` : undefined} onHint={() => setKind('artists')} />
                <View style={{ marginHorizontal: -16 }}>
                  {artists.slice(0, kind === 'artists' ? 60 : 3).map((a) => (
                    <ListRow key={a.name} title={a.name} sub={`Artist · ${a.count} song${a.count === 1 ? '' : 's'}`} onPress={() => navigation.navigate('Artist', { name: a.name })}
                      cover={<View style={{ flex: 1, borderRadius: 22, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center' }}><Txt v="h3">{a.name[0]?.toUpperCase()}</Txt></View>} />
                  ))}
                </View>
              </>
            )}
            {showAlbums && albums.length > 0 && (
              <>
                <Section title="Albums" hint={kind === 'all' && albums.length > 5 ? `see all ${albums.length}` : undefined} onHint={() => setKind('albums')} />
                <View style={{ marginHorizontal: -16 }}>
                  {albums.slice(0, kind === 'albums' ? 60 : 5).map((a) => (
                    <ListRow key={a.Id} art={client.imageUrl(a.Id, 160)} title={a.Name} sub={['Album', a.AlbumArtist, a.ProductionYear].filter(Boolean).join(' · ')}
                      onPress={() => navigation.navigate('Album', { id: a.Id, name: a.Name })} swipe={() => queueAlbum(a.Id)} />
                  ))}
                </View>
              </>
            )}
            {showPlaylists && playlists.length > 0 && (
              <>
                <Section title="Playlists" hint={kind === 'all' && playlists.length > 4 ? `see all ${playlists.length}` : undefined} onHint={() => setKind('playlists')} />
                <View style={{ marginHorizontal: -16 }}>
                  {playlists.slice(0, kind === 'playlists' ? 60 : 4).map(({ p, via }) => (
                    <ListRow key={p.Id} cover={<PlaylistCover id={p.Id} name={p.Name} size={44} />} title={p.Name} sub={`Playlist · ${p.ChildCount ?? 0} songs${via ? ` · has “${via}”` : ''}`}
                      onPress={() => navigation.navigate('Playlist', { id: p.Id, name: p.Name })}
                      swipe={() => client.playlistTracks(p.Id).then((r) => addToQueue(client, r.Items)).then((n) => toast('Playlist added to queue', `${n} up next`))} />
                  ))}
                </View>
              </>
            )}
          </View>
        )}
      </Body>
    </Screen>
  );
}

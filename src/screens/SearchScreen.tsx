import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import type { JfItem } from '../api/types';
import { addToQueue, playNow } from '../player/queue';
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

const tokens = (q: string) => q.toLowerCase().split(/\s+/).filter(Boolean);

/** Everything is matched on the phone against a cached index, so results appear as you type and cover year/genre too. */
function useIndex() {
  const client = useAuth((a) => a.client)!;
  const userId = useAuth((a) => a.session!.userId);
  // Saved copy is reused when the server's song/album totals still match (two 1-row probes) and it is under a day old.
  const index = useQuery({
    queryKey: ['searchIndex', userId], staleTime: 30 * 60_000, gcTime: Infinity,
    queryFn: async () => {
      const saved = await loadIndex(userId);
      if (saved && isFresh(saved)) {
        try {
          const [ns, na] = await Promise.all([client.count('Audio'), client.count('MusicAlbum')]);
          if (ns === saved.songs.length && na === saved.albums.length) return saved;
        } catch { return saved; }
      }
      let songs: JfItem[], albums: JfItem[];
      try { [songs, albums] = await Promise.all([client.allSongs(), client.allAlbums()]); } catch (e) { if (saved) return saved; throw e; }
      const fresh = { userId, at: Date.now(), songs, albums };
      saveIndex(fresh);
      return fresh;
    },
  });
  const songs = { data: index.data?.songs, isLoading: index.isLoading };
  const albums = { data: index.data?.albums };
  const rows = useMemo(() => (songs.data ?? []).map((s) => ({
    s, f: { title: s.Name, artist: (s.Artists ?? [s.AlbumArtist ?? '']).join(' '), album: s.Album ?? '', year: String(s.ProductionYear ?? ''), genre: (s.Genres ?? []).join(' ') },
  })), [songs.data]);
  return { rows, albums: albums.data ?? [], loading: songs.isLoading, count: songs.data?.length ?? 0 };
}

function searchSongs(rows: ReturnType<typeof useIndex>['rows'], q: string) {
  const toks = tokens(q);
  if (!toks.length) return [];
  const out: { s: JfItem; hits: Set<string>; rank: number }[] = [];
  for (const { s, f } of rows) {
    const hits = new Set<string>();
    let all = true, rank = 0;
    for (const t of toks) {
      let hit = false;
      for (const k of ['title', 'artist', 'album', 'year', 'genre'] as const) {
        const v = f[k].toLowerCase();
        if (v.includes(t)) { hit = true; hits.add(k); if (k === 'title' && v.startsWith(t)) rank -= 2; if (k === 'title' || k === 'artist') rank -= 1; }
      }
      if (!hit) { all = false; break; }
    }
    if (all) out.push({ s, hits, rank });
  }
  return out.sort((a, b) => a.rank - b.rank);
}

export function SearchScreen({ navigation }: any) {
  const c = useColors();
  const client = useAuth((a) => a.client)!;
  const showDiscover = useSettings((s) => s.showDiscover);
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const [mode, setMode] = useState<'lib' | 'disc'>('lib');
  const [more, setMore] = useState(false);
  const idx = useIndex();
  const pls = usePlaylists();
  useEffect(() => { const t = setTimeout(() => setQ(text.trim()), mode === 'disc' ? 600 : 120); return () => clearTimeout(t); }, [text, mode]);
  useEffect(() => { if (!showDiscover) setMode('lib'); }, [showDiscover]);
  useEffect(() => setMore(false), [q]);

  const songs = useMemo(() => searchSongs(idx.rows, q), [idx.rows, q]);
  const toks = tokens(q);
  const albums = useMemo(() => toks.length ? idx.albums.filter((a) => toks.every((t) => `${a.Name} ${a.AlbumArtist ?? ''} ${a.ProductionYear ?? ''}`.toLowerCase().includes(t))) : [], [idx.albums, q]); // eslint-disable-line react-hooks/exhaustive-deps
  const playlists = toks.length ? pls.items.filter((p) => toks.every((t) => p.Name.toLowerCase().includes(t))) : [];

  // Suggestions come from the user's own library: most common genres, then newest years.
  const suggestions = useMemo(() => {
    const g = new Map<string, number>();
    idx.rows.forEach(({ s }) => s.Genres?.forEach((x) => g.set(x, (g.get(x) ?? 0) + 1)));
    const genres = [...g.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([x]) => x.toLowerCase());
    const years = [...new Set(idx.rows.map(({ s }) => s.ProductionYear).filter(Boolean))].sort().reverse().slice(0, 2).map(String);
    return [...genres, ...years];
  }, [idx.rows]);

  const shown = more ? songs.slice(0, 50) : songs.slice(0, 6);
  const queueAlbum = (id: string) => client.albumTracks(id).then((r) => addToQueue(client, r.Items)).then((n) => toast('Album added to queue', `${n} up next`));

  return (
    <Screen>
      <TopBar left="search" right={<IconBtn name="gear" label="Settings" onPress={() => navigation.navigate('Settings')} />} />
      <Body>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 1, borderBottomColor: c.fg, paddingVertical: 6, marginBottom: 12 }}>
          <Icon name="srch" size={18} color={c.mute} />
          <TextInput value={text} onChangeText={setText} autoCapitalize="none" autoCorrect={false} returnKeyType="search" clearButtonMode="while-editing"
            placeholder={mode === 'lib' ? 'title, artist, album, year, genre…' : 'find new albums & artists online'} placeholderTextColor={c.mute} selectionColor={c.accent}
            style={{ flex: 1, fontFamily: F.mono, fontSize: 14, color: c.fg, paddingVertical: 4 }} />
        </View>
        {showDiscover && (
          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
            <Pill label="library" on={mode === 'lib'} onPress={() => setMode('lib')} />
            <Pill label="discover" on={mode === 'disc'} onPress={() => setMode('disc')} />
          </View>
        )}

        {mode === 'disc' ? <Discover term={q} onSettings={() => navigation.navigate('Settings')} /> : !toks.length ? (
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
        ) : !songs.length && !albums.length && !playlists.length ? (
          <Empty loading={idx.loading} text={`Nothing in your library for "${q}".${showDiscover ? '\nTry Discover.' : ''}`} />
        ) : (
          <View>
            {songs.length > 0 && (
              <>
                <Section title="Songs" hint={`${songs.length} found`} />
                <View style={{ marginHorizontal: -16 }}>
                  {shown.map(({ s, hits }, i) => (
                    <SongRow key={s.Id} track={s} sub={[s.Artists?.[0] ?? s.AlbumArtist, s.Album].filter(Boolean).join(' · ')}
                      chips={[hits.has('year') && s.ProductionYear ? String(s.ProductionYear) : null, hits.has('genre') ? s.Genres?.[0] ?? null : null, s.RunTimeTicks ? fmt(s.RunTimeTicks / 1e7) : null].filter(Boolean) as string[]}
                      onPress={() => playNow(client, shown.map((x) => x.s), i, 'Search')} />
                  ))}
                </View>
                {songs.length > 6 && <Txt v="mute" style={{ paddingTop: 8 }} onPress={() => setMore(!more)}>{more ? 'show fewer' : `show ${Math.min(songs.length, 50) - 6} more`}</Txt>}
              </>
            )}
            {albums.length > 0 && (
              <>
                <Section title="Albums" />
                <View style={{ marginHorizontal: -16 }}>
                  {albums.slice(0, 5).map((a) => (
                    <ListRow key={a.Id} art={client.imageUrl(a.Id, 160)} title={a.Name} sub={['Album', a.AlbumArtist, a.ProductionYear].filter(Boolean).join(' · ')}
                      onPress={() => navigation.navigate('Album', { id: a.Id, name: a.Name })} swipe={() => queueAlbum(a.Id)} />
                  ))}
                </View>
              </>
            )}
            {playlists.length > 0 && (
              <>
                <Section title="Playlists" />
                <View style={{ marginHorizontal: -16 }}>
                  {playlists.slice(0, 4).map((p) => (
                    <ListRow key={p.Id} cover={<PlaylistCover id={p.Id} name={p.Name} size={44} />} title={p.Name} sub={`Playlist · ${p.ChildCount ?? 0} songs`}
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

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Pressable, View } from 'react-native';
import { create } from 'zustand';

import type { JfItem } from '../api/types';
import { confirmCancel, dlKey, toggleDownload } from '../downloadActions';
import { useDownloadProgress, useDownloadedPlaylists } from '../downloads';
import { setLiked, useLiked } from '../likes';
import { navigate } from '../navigation/ref';
import { addToQueue, playNext } from '../player/queue';
import { useAuth } from '../state/auth';
import { useLibraryPrefs } from '../state/library';
import { useCovers, clearCover, pickCover } from '../state/covers';
import { Art } from './Art';
import { PlaylistCover } from './PlaylistCover';
import { Icon } from './Icon';
import { Sheet, SheetHeader, SheetItem } from './Sheet';
import { Txt } from './text';
import { useColors } from './theme';
import { toast } from './toast';

/** Where a song was opened from, so the menu can offer playlist-specific actions. */
export interface SongCtx { playlistId: string; entryId?: string; index: number; count: number; onChange: () => void }

type Open =
  | { k: 'song'; track: JfItem; ctx?: SongCtx }
  | { k: 'addpl'; ids: string[]; title: string; sub?: string; art?: string }
  | { k: 'playlist'; item: JfItem }
  | { k: 'album'; item: JfItem }
  | null;

const useSheet = create<{ open: Open }>(() => ({ open: null }));
const close = () => useSheet.setState({ open: null });
export const openSongMenu = (track: JfItem, ctx?: SongCtx) => useSheet.setState({ open: { k: 'song', track, ctx } });
export const openAddToPlaylist = (ids: string[], title: string, sub?: string, art?: string) => useSheet.setState({ open: { k: 'addpl', ids, title, sub, art } });
export const openPlaylistMenu = (item: JfItem) => useSheet.setState({ open: { k: 'playlist', item } });
export const openAlbumMenu = (item: JfItem) => useSheet.setState({ open: { k: 'album', item } });

/** Mount once near the root. Every action sheet in the app is rendered here. */
export function SheetHost() {
  const open = useSheet((s) => s.open);
  return (
    <Sheet visible={!!open} onClose={close}>
      {open?.k === 'song' && <SongSheet track={open.track} ctx={open.ctx} />}
      {open?.k === 'addpl' && <AddToPlaylist ids={open.ids} title={open.title} sub={open.sub} art={open.art} />}
      {open?.k === 'playlist' && <PlaylistSheet item={open.item} />}
      {open?.k === 'album' && <AlbumSheet item={open.item} />}
    </Sheet>
  );
}

const run = (fn: () => Promise<unknown> | unknown) => async () => {
  close();
  try { await fn(); } catch (e: any) { Alert.alert('Failed', e?.message ?? String(e)); }
};

function SongSheet({ track, ctx }: { track: JfItem; ctx?: SongCtx }) {
  const client = useAuth((a) => a.client)!;
  const qc = useQueryClient();
  const liked = !!useLiked().data?.entries[track.Id];
  const dl = useDownloadedPlaylists().has(dlKey('song', track.Id));
  const art = client.imageUrl(track.AlbumId ?? track.Id, 160);
  const queueIt = async (next: boolean) => {
    if (next) { await playNext(client, [track]); toast('Playing next'); }
    else { const n = await addToQueue(client, [track]); toast('Added to queue', `#${n} up next`); }
  };
  const mutate = (fn: () => Promise<unknown>, msg: string) => async () => { await fn(); ctx!.onChange(); toast(msg); };
  return (
    <>
      <SheetHeader art={art} title={track.Name} sub={track.Artists?.[0] ?? track.AlbumArtist} />
      <SheetItem icon={liked ? 'heart' : 'heartO'} label={liked ? 'Remove from Liked' : 'Add to Liked'}
        onPress={run(async () => { await setLiked(client, qc, [track.Id], !liked); toast(liked ? 'Removed from Liked' : 'Added to Liked'); })} />
      <SheetItem icon="queue" label="Play next" onPress={run(() => queueIt(true))} />
      <SheetItem icon="queue" label="Add to queue" onPress={run(() => queueIt(false))} />
      <SheetItem icon="plus" label="Add to playlist…" onPress={() => useSheet.setState({ open: { k: 'addpl', ids: [track.Id], title: track.Name, sub: track.Artists?.[0] ?? track.AlbumArtist, art } })} />
      <SheetItem icon="dl" label={dl ? 'Remove download' : 'Download'} onPress={run(() => toggleDownload(client, 'song', track.Id, track.Name, dl, track))} />
      <SheetItem icon="info" label="Song info & metadata" onPress={run(() => navigate('SongInfo', { id: track.Id }))} />
      {ctx && (
        <>
          {ctx.index > 0 && ctx.entryId && <SheetItem icon="down" label="Move up" onPress={run(mutate(() => client.moveInPlaylist(ctx.playlistId, ctx.entryId!, ctx.index - 1), 'Moved up'))} />}
          {ctx.index < ctx.count - 1 && ctx.entryId && <SheetItem icon="down" label="Move down" onPress={run(mutate(() => client.moveInPlaylist(ctx.playlistId, ctx.entryId!, ctx.index + 1), 'Moved down'))} />}
          {ctx.entryId && <SheetItem icon="x" danger label="Remove from this playlist" onPress={run(mutate(() => client.removeFromPlaylist(ctx.playlistId, [ctx.entryId!]), 'Removed from playlist'))} />}
        </>
      )}
    </>
  );
}

function AddToPlaylist({ ids, title, sub, art }: { ids: string[]; title: string; sub?: string; art?: string }) {
  const c = useColors();
  const client = useAuth((a) => a.client)!;
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['playlists'], queryFn: () => client.playlists() });
  const hidden = useLibraryPrefs((s) => s.hidden);
  const refresh = () => { qc.invalidateQueries({ queryKey: ['playlists'] }); qc.invalidateQueries({ queryKey: ['playlist'] }); qc.invalidateQueries({ queryKey: ['playlistCover'] }); };
  const add = (id: string, name: string) => run(async () => { await client.addToPlaylist(id, ids); refresh(); toast(`Added to ${name}`); })();
  const create = () => {
    close();
    setTimeout(() => Alert.prompt('New playlist', 'Name', async (name) => {
      if (!name?.trim()) return;
      try { await client.createPlaylist(name.trim(), ids); refresh(); toast(`Created ${name.trim()}`); } catch (e: any) { Alert.alert('Failed', e.message); }
    }), 300);
  };
  return (
    <>
      <SheetHeader art={art} title={title} sub={sub ?? `${ids.length} song${ids.length === 1 ? '' : 's'}`} />
      <Pressable onPress={create} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, opacity: pressed ? 0.5 : 1 })}>
        <View style={{ width: 44, height: 44, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center' }}><Icon name="plus" size={20} /></View>
        <Txt>New playlist</Txt>
      </Pressable>
      {data?.Items.filter((p) => !hidden.includes(p.Id)).map((p) => (
        <Pressable key={p.Id} onPress={() => add(p.Id, p.Name)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, opacity: pressed ? 0.5 : 1 })}>
          <PlaylistCover id={p.Id} name={p.Name} size={44} />
          <View style={{ flex: 1 }}>
            <Txt numberOfLines={1}>{p.Name}</Txt>
            <Txt v="small">{p.ChildCount ?? 0} songs</Txt>
          </View>
        </Pressable>
      ))}
    </>
  );
}

function PlaylistSheet({ item }: { item: JfItem }) {
  const client = useAuth((a) => a.client)!;
  const { pinned, hidden, togglePin, toggleHide } = useLibraryPrefs();
  const dl = useDownloadedPlaylists().has(item.Id);
  const busy = !!useDownloadProgress(item.Id);
  const custom = useCovers((s) => s.map[item.Id]);
  const all = async () => (await client.playlistTracks(item.Id)).Items;
  return (
    <>
      <SheetHeader cover={<PlaylistCover id={item.Id} name={item.Name} size={44} />} title={item.Name} sub={`Playlist · ${item.ChildCount ?? 0} songs`} />
      <SheetItem icon="pin" label={pinned.includes(item.Id) ? 'Unpin' : 'Pin to top'} onPress={run(() => { togglePin(item.Id); toast(pinned.includes(item.Id) ? 'Unpinned' : 'Pinned to top'); })} />
      {busy ? <SheetItem icon="x" label="Cancel download" onPress={run(() => confirmCancel(item.Id))} />
        : <SheetItem icon="dl" label={dl ? 'Remove download' : 'Download playlist'} onPress={run(() => toggleDownload(client, 'playlist', item.Id, item.Name, dl))} />}
      <SheetItem icon="queue" label="Add to queue" onPress={run(async () => { const n = await addToQueue(client, await all()); toast('Added to queue', `${n} up next`); })} />
      <SheetItem icon="img" label="Set cover image…" onPress={run(() => pickCover(item.Id).then((ok) => ok && toast('Cover updated')).catch((e) => Alert.alert('Could not set cover', e.message)))} />
      {!!custom && <SheetItem icon="x" label="Remove cover image" onPress={run(() => { clearCover(item.Id); toast('Cover removed'); })} />}
      <SheetItem icon="x" label={hidden.includes(item.Id) ? 'Show in app' : 'Hide from app'} onPress={run(() => { toggleHide(item.Id); toast(hidden.includes(item.Id) ? 'Playlist shown' : 'Hidden · still on Jellyfin'); })} />
    </>
  );
}

function AlbumSheet({ item }: { item: JfItem }) {
  const client = useAuth((a) => a.client)!;
  const dl = useDownloadedPlaylists().has(dlKey('album', item.Id));
  const busy = !!useDownloadProgress(dlKey('album', item.Id));
  const tracks = async () => (await client.albumTracks(item.Id)).Items;
  return (
    <>
      <SheetHeader art={client.imageUrl(item.Id, 160)} title={item.Name} sub={`Album · ${item.AlbumArtist ?? ''}`} />
      <SheetItem icon="queue" label="Play next" onPress={run(async () => { await playNext(client, await tracks()); toast('Playing next'); })} />
      <SheetItem icon="queue" label="Add to queue" onPress={run(async () => { const n = await addToQueue(client, await tracks()); toast('Added to queue', `${n} up next`); })} />
      <SheetItem icon="plus" label="Add to playlist…" onPress={async () => { const t = await tracks(); openAddToPlaylist(t.map((x) => x.Id), item.Name, item.AlbumArtist, client.imageUrl(item.Id, 160)); }} />
      {busy ? <SheetItem icon="x" label="Cancel download" onPress={run(() => confirmCancel(dlKey('album', item.Id)))} />
        : <SheetItem icon="dl" label={dl ? 'Remove download' : 'Download album'} onPress={run(() => toggleDownload(client, 'album', item.Id, item.Name, dl))} />}
    </>
  );
}

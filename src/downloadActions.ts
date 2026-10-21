import { Alert } from 'react-native';

import type { JellyfinClient } from './api/jellyfin';
import type { JfItem } from './api/types';
import { downloadPlaylist, removePlaylistDownload } from './downloads';
import { toast } from './ui/toast';

export type DlKind = 'playlist' | 'album' | 'song';
/** Key under which a download is tracked. Playlists keep their bare id so earlier downloads still match. */
export const dlKey = (kind: DlKind, id: string) => (kind === 'playlist' ? id : `${kind}:${id}`);

/** Download a playlist / album / song, or (after confirming) remove it. Songs shared with other downloads are kept. */
export function toggleDownload(client: JellyfinClient, kind: DlKind, id: string, name: string, isDownloaded: boolean, song?: JfItem) {
  const key = dlKey(kind, id);
  if (isDownloaded) {
    Alert.alert('Remove download?', `"${name}" will no longer be available offline. Songs shared with other downloads are kept.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => { removePlaylistDownload(key); toast('Download removed'); } },
    ]);
    return;
  }
  const items = kind === 'song' && song ? Promise.resolve([song]) : kind === 'album' ? client.albumTracks(id).then((r) => r.Items) : client.playlistTracks(id).then((r) => r.Items);
  toast('Downloading…', name);
  items.then((list) => downloadPlaylist(client, key, list, undefined, { kind, name })).then(() => toast('Downloaded', name))
    .catch((e: any) => Alert.alert('Download failed', e.message));
}

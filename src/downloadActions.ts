import { Alert } from 'react-native';

import type { JellyfinClient } from './api/jellyfin';
import { downloadPlaylist, removePlaylistDownload } from './downloads';

/** Download a playlist, or (after confirming) remove its download. Shared by the Library list and the playlist screen. */
export function toggleDownload(client: JellyfinClient, id: string, name: string, isDownloaded: boolean) {
  if (isDownloaded) {
    Alert.alert(`Remove download?`, `"${name}" will no longer be available offline. Songs shared with other downloaded playlists are kept.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removePlaylistDownload(id) },
    ]);
    return;
  }
  client.playlistTracks(id)
    .then((r) => downloadPlaylist(client, id, r.Items))
    .catch((e: any) => Alert.alert('Download failed', e.message));
}

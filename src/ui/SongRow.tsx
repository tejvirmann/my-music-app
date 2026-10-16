import { useQueryClient } from '@tanstack/react-query';
import { Alert, Pressable, Text } from 'react-native';

import type { JfItem } from '../api/types';
import { useDownloadedTracks } from '../downloads';
import { setLiked, useLiked } from '../likes';
import { addToQueue } from '../player/queue';
import { useAuth } from '../state/auth';
import { Row, colors } from '.';
import { openSongMenu } from './songMenu';

/** A song: swipe right = queue, heart = Liked, long-press = menu, green badge = downloaded. */
export function SongRow({ track, title, subtitle, art, onPress }: {
  track: JfItem; title?: string; subtitle?: string; art?: string; onPress: () => void;
}) {
  const client = useAuth((a) => a.client)!;
  const qc = useQueryClient();
  const dl = useDownloadedTracks();
  const liked = !!useLiked().data?.entries[track.Id];
  return (
    <Row title={title ?? track.Name} subtitle={subtitle} art={art} downloaded={dl.has(track.Id)}
      onPress={onPress} onLongPress={() => openSongMenu(track)} onSwipeRight={() => addToQueue(client, [track])}
      right={
        <Pressable hitSlop={10} onPress={() => setLiked(client, qc, [track.Id], !liked).catch((e) => Alert.alert('Failed', e.message))}>
          <Text style={{ color: liked ? colors.accent : colors.dim, fontSize: 22 }}>{liked ? '♥' : '♡'}</Text>
        </Pressable>
      } />
  );
}

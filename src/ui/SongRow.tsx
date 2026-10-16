import { View } from 'react-native';

import type { JfItem } from '../api/types';
import { useDownloadedTracks } from '../downloads';
import { addToQueue, usePlayer } from '../player/queue';
import { useAuth } from '../state/auth';
import { IconBtn } from './IconBtn';
import { ListRow } from './rows';
import { openSongMenu, type SongCtx } from './sheets';
import { Txt } from './text';
import { toast } from './toast';
import { useColors } from './theme';

/** A song: tap = play, swipe right = queue, dots / long-press = menu. Green dot = on this phone, accent title = playing. */
export function SongRow({ track, onPress, sub, hideArt, lead, ctx, chips }: {
  track: JfItem; onPress: () => void; sub?: string; hideArt?: boolean; lead?: React.ReactNode; ctx?: SongCtx; chips?: string[];
}) {
  const c = useColors();
  const client = useAuth((a) => a.client)!;
  const dl = useDownloadedTracks().has(track.Id);
  const active = usePlayer((s) => s.tracks[s.index]?.id === track.Id);
  return (
    <ListRow
      noArt={hideArt} lead={lead}
      art={client.imageUrl(track.AlbumId ?? track.Id, 160)}
      title={track.Name} sub={sub ?? track.Artists?.[0] ?? track.AlbumArtist} dl={dl} active={active}
      subExtra={chips?.length ? (
        <View style={{ flexDirection: 'row', gap: 4, marginLeft: 8 }}>
          {chips.map((x) => <View key={x} style={{ borderWidth: 1, borderColor: c.accent, paddingHorizontal: 5 }}><Txt v="small" color={c.accent}>{x}</Txt></View>)}
        </View>
      ) : undefined}
      onPress={onPress} onLongPress={() => openSongMenu(track, ctx)}
      swipe={() => addToQueue(client, [track]).then((n) => toast('Added to queue', `#${n} up next`))}
      right={<IconBtn name="dots" label="More" color={c.mute} onPress={() => openSongMenu(track, ctx)} />}
    />
  );
}

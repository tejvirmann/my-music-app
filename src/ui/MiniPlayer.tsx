import { Pressable, View } from 'react-native';
import TrackPlayer, { State, useActiveTrack, usePlaybackState } from 'react-native-track-player';

import { navigate } from '../navigation/ref';
import { usePlayer } from '../player/queue';
import { useAuth } from '../state/auth';
import { Art } from './Art';
import { IconBtn } from './IconBtn';
import { Txt } from './text';
import { useColors } from './theme';

/** Docked above the tab bar / bottom edge whenever something is loaded. */
export function MiniPlayer() {
  const c = useColors();
  const client = useAuth((a) => a.client);
  const track = useActiveTrack();
  const { state } = usePlaybackState();
  const queued = usePlayer((s) => s.tracks.filter((t, i) => i > s.index && t.queued).length);
  if (!track || !client) return null;
  const playing = state === State.Playing;
  const albumId = (track as any).albumId ?? track.id;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 8, borderTopWidth: 1, borderTopColor: c.line, backgroundColor: c.bg }}>
      <Art uri={client.imageUrl(String(albumId), 160)} size={38} />
      <Pressable style={{ flex: 1, minWidth: 0 }} onPress={() => navigate('NowPlaying')} accessibilityLabel="Open now playing">
        <Txt v="med" numberOfLines={1}>{track.title}</Txt>
        <Txt v="mute" numberOfLines={1}>{track.artist}</Txt>
      </Pressable>
      <View>
        <IconBtn name="queue" label="Queue" onPress={() => navigate('Queue')} />
        {queued > 0 && (
          <View pointerEvents="none" style={{ position: 'absolute', top: -2, right: -4, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
            <Txt v="small" color={c.bg} style={{ fontSize: 10, lineHeight: 12 }}>{queued}</Txt>
          </View>
        )}
      </View>
      <IconBtn name={playing ? 'pause' : 'play'} size={28} label={playing ? 'Pause' : 'Play'} onPress={() => (playing ? TrackPlayer.pause() : TrackPlayer.play())} />
    </View>
  );
}

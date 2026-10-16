import { Pressable, Text, View } from 'react-native';
import TrackPlayer, { State, useActiveTrack, usePlaybackState } from 'react-native-track-player';

import { colors } from '.';

export function MiniPlayer({ onOpen }: { onOpen: () => void }) {
  const track = useActiveTrack();
  const { state } = usePlaybackState();
  if (!track) return null;
  const playing = state === State.Playing;
  return (
    <Pressable onPress={onOpen} style={{ backgroundColor: colors.card, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text }} numberOfLines={1}>{track.title}</Text>
        <Text style={{ color: colors.dim, fontSize: 12 }} numberOfLines={1}>{track.artist}</Text>
      </View>
      <Pressable onPress={() => TrackPlayer.skipToPrevious()}><Text style={{ color: colors.text, fontSize: 20 }}>⏮</Text></Pressable>
      <Pressable onPress={() => (playing ? TrackPlayer.pause() : TrackPlayer.play())}><Text style={{ color: colors.text, fontSize: 24 }}>{playing ? '⏸' : '▶️'}</Text></Pressable>
      <Pressable onPress={() => TrackPlayer.skipToNext()}><Text style={{ color: colors.text, fontSize: 20 }}>⏭</Text></Pressable>
    </Pressable>
  );
}

import { Image, Text, View } from 'react-native';
import TrackPlayer, { RepeatMode, State, useActiveTrack, usePlaybackState, useProgress } from 'react-native-track-player';
import { useState } from 'react';

import { Btn, fmt, s } from '../ui';

export function NowPlayingScreen({ navigation }: any) {
  const track = useActiveTrack();
  const { state } = usePlaybackState();
  const { position, duration } = useProgress(500);
  const [repeat, setRepeat] = useState(RepeatMode.Off);
  const playing = state === State.Playing;

  const cycleRepeat = async () => {
    const next = repeat === RepeatMode.Off ? RepeatMode.Queue : repeat === RepeatMode.Queue ? RepeatMode.Track : RepeatMode.Off;
    await TrackPlayer.setRepeatMode(next); setRepeat(next);
  };
  /** Shuffles only the upcoming tracks; the current one keeps playing. */
  const shuffle = async () => {
    const queue = await TrackPlayer.getQueue();
    const cur = (await TrackPlayer.getActiveTrackIndex()) ?? 0;
    const upcoming = queue.slice(cur + 1).sort(() => Math.random() - 0.5);
    for (let i = queue.length - 1; i > cur; i--) await TrackPlayer.remove(i);
    await TrackPlayer.add(upcoming);
  };

  if (!track) return <View style={[s.screen, s.center]}><Text style={s.dim}>Nothing playing</Text></View>;
  return (
    <View style={[s.screen, s.pad, { alignItems: 'center' }]}>
      <Image source={{ uri: track.artwork }} style={{ width: 280, height: 280, borderRadius: 12, marginTop: 24 }} />
      <Text style={[s.h1, { marginTop: 24 }]} numberOfLines={2}>{track.title}</Text>
      <Text style={s.dim}>{track.artist}</Text>
      <Text style={[s.dim, { marginTop: 16 }]}>{fmt(position)} / {fmt(duration)}</Text>
      <View style={s.buttons}>
        <Btn title="−15s" onPress={() => TrackPlayer.seekTo(Math.max(0, position - 15))} />
        <Btn title="+15s" onPress={() => TrackPlayer.seekTo(position + 15)} />
      </View>
      <View style={s.buttons}>
        <Btn title="⏮" onPress={() => TrackPlayer.skipToPrevious()} />
        <Btn title={playing ? 'Pause' : 'Play'} kind="primary" onPress={() => (playing ? TrackPlayer.pause() : TrackPlayer.play())} />
        <Btn title="⏭" onPress={() => TrackPlayer.skipToNext()} />
      </View>
      <View style={s.buttons}>
        <Btn title="Shuffle upcoming" onPress={shuffle} />
        <Btn title={`Repeat: ${['off', 'track', 'queue'][repeat]}`} onPress={cycleRepeat} />
        <Btn title="Queue" onPress={() => navigation.navigate('Tabs', { screen: 'Queue' })} />
      </View>
    </View>
  );
}

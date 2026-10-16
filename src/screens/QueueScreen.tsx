import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, View } from 'react-native';
import TrackPlayer, { Event, useActiveTrack, type Track } from 'react-native-track-player';

import { PlaylistPicker } from '../components/PlaylistPicker';
import { Btn, Empty, Row, s } from '../components/ui';
import { clearQueue, moveInQueue, removeFromQueue } from '../player/queue';

export function QueueScreen() {
  const [queue, setQueue] = useState<Track[]>([]);
  const [saving, setSaving] = useState(false);
  const active = useActiveTrack();
  const load = useCallback(async () => setQueue(await TrackPlayer.getQueue()), []);

  useEffect(() => {
    load();
    const sub = TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, load);
    return () => sub.remove();
  }, [load, active?.id]);

  const act = (fn: () => Promise<unknown>) => async () => { await fn(); await load(); };

  return (
    <View style={s.screen}>
      <View style={s.buttons}>
        <Btn title="Clear queue" kind="danger" onPress={() => Alert.alert('Clear queue?', 'The playing track stays.', [
          { text: 'Cancel', style: 'cancel' }, { text: 'Clear', style: 'destructive', onPress: act(clearQueue) }])} />
        <Btn title="Save as playlist" onPress={() => setSaving(true)} disabled={!queue.length} />
        <Btn title="Refresh" onPress={load} />
      </View>
      <FlatList data={queue} keyExtractor={(t, i) => `${t.id}-${i}`} ListEmptyComponent={<Empty text="Queue is empty" />}
        renderItem={({ item, index }) => (
          <Row title={`${index === (queue.findIndex((q) => q.id === active?.id)) ? '▶ ' : ''}${item.title}`} subtitle={item.artist}
            onPress={act(async () => { await TrackPlayer.skip(index); await TrackPlayer.play(); })}
            right={
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <Btn title="↑" disabled={index === 0} onPress={act(() => moveInQueue(index, index - 1))} />
                <Btn title="↓" disabled={index === queue.length - 1} onPress={act(() => moveInQueue(index, index + 1))} />
                <Btn title="✕" kind="danger" onPress={act(() => removeFromQueue(index))} />
              </View>
            } />
        )} />
      <PlaylistPicker visible={saving} trackIds={queue.map((t) => String(t.id))} onClose={() => setSaving(false)} />
    </View>
  );
}

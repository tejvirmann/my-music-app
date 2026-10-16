import { useRef, useState } from 'react';
import { Alert, Animated, PanResponder, ScrollView, View } from 'react-native';
import TrackPlayer, { State, usePlaybackState } from 'react-native-track-player';

import { clearQueue, moveInQueue, removeFromQueue, skipTo, usePlayer, type QTrack } from '../player/queue';
import { useAuth } from '../state/auth';
import { Icon } from '../ui/Icon';
import { Empty, Heading, IconBtn, Screen, TopBar } from '../ui/layout';
import { Eq, ListRow, ROW_H } from '../ui/rows';
import { openAddToPlaylist } from '../ui/sheets';
import { Txt } from '../ui/text';
import { useColors } from '../ui/theme';

function Group({ title, hint, note }: { title: string; hint?: string; note?: string }) {
  return (
    <View style={{ marginTop: 20, marginBottom: 4, paddingHorizontal: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Txt v="h3">{title}</Txt>{!!hint && <Txt v="mute">{hint}</Txt>}
      </View>
      {!!note && <Txt v="mute">{note}</Txt>}
    </View>
  );
}

/** A queued row you can reorder by dragging its grip. Rows are a fixed height, so the drop slot is just dy / ROW_H. */
function DragRow({ t, pos, count, art, onDrop, onDragState, onRemove, onPlay }: {
  t: QTrack; pos: number; count: number; art?: string; onDrop: (from: number, to: number) => void; onDragState: (d: boolean) => void; onRemove: () => void; onPlay: () => void;
}) {
  const c = useColors();
  const y = useRef(new Animated.Value(0)).current;
  const [lift, setLift] = useState(false);
  const cfg = useRef({ pos, count, onDrop, onDragState });
  cfg.current = { pos, count, onDrop, onDragState };
  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: () => { setLift(true); cfg.current.onDragState(true); },
    onPanResponderMove: (_, g) => y.setValue(g.dy),
    onPanResponderRelease: (_, g) => {
      const { pos: p, count: n } = cfg.current;
      const to = Math.max(0, Math.min(n - 1, p + Math.round(g.dy / ROW_H)));
      Animated.timing(y, { toValue: 0, duration: 120, useNativeDriver: true }).start();
      setLift(false); cfg.current.onDragState(false);
      if (to !== p) cfg.current.onDrop(p, to);
    },
    onPanResponderTerminate: () => { y.setValue(0); setLift(false); cfg.current.onDragState(false); },
  })).current;
  return (
    <Animated.View style={{ transform: [{ translateY: y }], zIndex: lift ? 10 : 0, backgroundColor: c.bg, borderTopWidth: lift ? 1 : 0, borderBottomWidth: lift ? 1 : 0, borderColor: c.line, shadowColor: '#000', shadowOpacity: lift ? 0.25 : 0, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } }}>
      <ListRow art={art} title={t.title ?? ''} sub={t.artist} onPress={onPlay}
        right={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <IconBtn name="x" size={18} color={c.mute} label="Remove from queue" onPress={onRemove} />
            <View {...pan.panHandlers} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ padding: 4 }} accessibilityLabel="Drag to reorder"><Icon name="grip" size={18} color={c.mute} /></View>
          </View>
        } />
    </Animated.View>
  );
}

export function QueueScreen({ navigation }: any) {
  const c = useColors();
  const client = useAuth((a) => a.client)!;
  const { tracks, index, ctxName } = usePlayer();
  const { state } = usePlaybackState();
  const [dragging, setDragging] = useState(false);
  const cur = tracks[index];
  const upcoming = tracks.map((t, i) => ({ t, i })).filter((x) => x.i > index);
  const queued = upcoming.filter((x) => x.t.queued);
  const rest = upcoming.filter((x) => !x.t.queued);
  const art = (t: QTrack) => client.imageUrl(String(t.albumId ?? t.id), 160);

  return (
    <Screen>
      <TopBar onBack={() => navigation.goBack()} right={<>
        <Txt v="mute" onPress={() => tracks.length && openAddToPlaylist(tracks.map((t) => String(t.id)), 'Current queue', `${tracks.length} songs`)}>save</Txt>
        <Txt v="mute" onPress={() => Alert.alert('Clear queue?', 'The playing song stays.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Clear', style: 'destructive', onPress: () => clearQueue() }])}>clear queue</Txt>
      </>} />
      <ScrollView scrollEnabled={!dragging} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={{ paddingHorizontal: 16 }}><Heading title="Queue" /></View>
        {!queued.length && (
          <View style={{ marginHorizontal: 16, padding: 10, borderWidth: 1, borderColor: c.line }}>
            <Txt v="mute"><Txt v="med">How it works: </Txt>swipe any song right to add it here. Drag ≡ to reorder, ✕ to remove, tap to play now.</Txt>
          </View>
        )}

        <Group title="Now playing" />
        {cur ? (
          <ListRow art={art(cur)} title={cur.title ?? ''} sub={cur.artist} active onPress={() => navigation.navigate('NowPlaying')} right={<Eq playing={state === State.Playing} />} />
        ) : <View style={{ paddingHorizontal: 16 }}><Empty text="Nothing playing" /></View>}

        <Group title="Next in queue" hint={`${queued.length} song${queued.length === 1 ? '' : 's'}`} note="You added these. They play first." />
        {queued.length ? queued.map(({ t, i }, k) => (
          <DragRow key={`${t.id}-${i}`} t={t} pos={k} count={queued.length} art={art(t)} onDragState={setDragging}
            onDrop={(from, to) => moveInQueue(queued[from].i, queued[to].i)} onRemove={() => removeFromQueue(i)} onPlay={() => skipTo(i)} />
        )) : <View style={{ paddingHorizontal: 16 }}><Empty text={'Nothing queued yet.\nSwipe a song right anywhere.'} /></View>}

        <Group title={`Next from ${ctxName || 'queue'}`} hint={`${rest.length} songs`} note="Plays automatically after your queue." />
        {rest.length ? rest.map(({ t, i }) => (
          <ListRow key={`${t.id}-${i}`} art={art(t)} title={t.title ?? ''} sub={t.artist} onPress={() => skipTo(i)}
            right={<IconBtn name="x" size={18} color={c.mute} label="Remove" onPress={() => removeFromQueue(i)} />} />
        )) : <View style={{ paddingHorizontal: 16 }}><Empty text="End of list." /></View>}
      </ScrollView>
    </Screen>
  );
}

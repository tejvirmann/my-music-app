import TrackPlayer, { State, usePlayWhenReady, usePlaybackState } from 'react-native-track-player';

/** Playing as far as the user is concerned: still "playing" while a stream is (re)buffering, so the pause button never goes dead. */
export function useIsPlaying() {
  const { state } = usePlaybackState();
  const playWhenReady = usePlayWhenReady();
  return state === State.Playing || (!!playWhenReady && (state === State.Buffering || state === State.Loading));
}

/** Next/previous always start playback, and wrap around the ends of the queue. */
export async function skipNext() {
  const [queue, idx] = await Promise.all([TrackPlayer.getQueue(), TrackPlayer.getActiveTrackIndex()]);
  if (idx == null || idx >= queue.length - 1) await TrackPlayer.skip(0); else await TrackPlayer.skipToNext();
  await TrackPlayer.play(); // skipping always starts playback, like every player
}

/** `force` (swipe gestures) always goes to the previous song instead of restarting this one. */
export async function skipPrev(force = false) {
  const [playWhenReady, queue, idx] = await Promise.all([TrackPlayer.getPlayWhenReady(), TrackPlayer.getQueue(), TrackPlayer.getActiveTrackIndex()]);
  const { position } = await TrackPlayer.getProgress();
  if ((!force && position > 3) || idx == null || idx <= 0) { await TrackPlayer.seekTo(0); if (playWhenReady && queue.length) await TrackPlayer.play(); return; } // like every player: first tap restarts the song
  await TrackPlayer.skipToPrevious();
  await TrackPlayer.play();
}

let recovering = false;
/** After a long sleep the stream connection is often dead; reload the current track at the same spot. */
export async function recoverPlayback() {
  if (recovering) return;
  recovering = true;
  try {
    const [{ state }, idx, wantsPlay] = await Promise.all([TrackPlayer.getPlaybackState(), TrackPlayer.getActiveTrackIndex(), TrackPlayer.getPlayWhenReady()]);
    if (idx == null || (state !== State.Error && state !== State.Stopped && state !== State.None)) return;
    const { position } = await TrackPlayer.getProgress();
    await TrackPlayer.skip(idx, position);
    if (wantsPlay) await TrackPlayer.play();
  } catch {} finally { recovering = false; }
}

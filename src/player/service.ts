import TrackPlayer, { Event, RepeatMode } from 'react-native-track-player';

import { recoverPlayback, skipNext, skipPrev } from './controls';

/** Runs headless on iOS for lock-screen / Bluetooth / headphone events. */
export async function PlaybackService() {
  TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
  TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
  TrackPlayer.addEventListener(Event.RemoteNext, () => skipNext().catch(() => {}));
  TrackPlayer.addEventListener(Event.RemotePrevious, () => skipPrev().catch(() => {}));
  TrackPlayer.addEventListener(Event.RemoteSeek, (e) => TrackPlayer.seekTo(e.position));
  TrackPlayer.addEventListener(Event.RemoteStop, () => TrackPlayer.reset());
  // End of the list: go back to the top and keep playing (repeat-track mode never gets here).
  TrackPlayer.addEventListener(Event.PlaybackQueueEnded, async () => {
    if ((await TrackPlayer.getRepeatMode()) === RepeatMode.Track) return;
    try { await TrackPlayer.skip(0); await TrackPlayer.play(); } catch {}
  });
  TrackPlayer.addEventListener(Event.PlaybackError, () => { setTimeout(() => recoverPlayback(), 1500); });
}

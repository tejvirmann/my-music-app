import TrackPlayer, { AppKilledPlaybackBehavior, Capability, IOSCategoryMode } from 'react-native-track-player';

let ready = false;

export async function setupPlayer() {
  if (ready) return;
  try {
    await TrackPlayer.setupPlayer({ iosCategoryMode: IOSCategoryMode.Default });
  } catch (e: any) {
    if (!String(e?.message).includes('already been initialized')) throw e;
  }
  await TrackPlayer.updateOptions({
    android: { appKilledPlaybackBehavior: AppKilledPlaybackBehavior.ContinuePlayback },
    capabilities: [
      Capability.Play, Capability.Pause, Capability.SkipToNext,
      Capability.SkipToPrevious, Capability.SeekTo,
    ],
    progressUpdateEventInterval: 1,
  });
  ready = true;
}

import { registerRootComponent } from 'expo';
import TrackPlayer from 'react-native-track-player';

import App from './App';
import { PlaybackService } from './src/player/service';

TrackPlayer.registerPlaybackService(() => PlaybackService);
registerRootComponent(App);

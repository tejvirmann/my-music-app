import { DMMono_300Light, DMMono_400Regular, DMMono_500Medium } from '@expo-google-fonts/dm-mono';
import { InstrumentSerif_400Regular_Italic } from '@expo-google-fonts/instrument-serif';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueryClient, focusManager } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { navRef } from './src/navigation/ref';
import { recoverPlayback } from './src/player/controls';
import { useQueueSync } from './src/player/queue';
import { useRecordPlays } from './src/player/recents';
import { setupPlayer } from './src/player/setup';
import { AlbumScreen } from './src/screens/AlbumScreen';
import { backfillOfflineMeta } from './src/downloads';
import { useConnectionWatch, useOffline } from './src/state/offline';
import { ArtistScreen } from './src/screens/ArtistScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { LibraryScreen } from './src/screens/LibraryScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { MetadataScreen } from './src/screens/MetadataScreen';
import { NowPlayingScreen } from './src/screens/NowPlayingScreen';
import { PlaylistScreen } from './src/screens/PlaylistScreen';
import { QueueScreen } from './src/screens/QueueScreen';
import { SearchScreen } from './src/screens/SearchScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { SongInfoScreen } from './src/screens/SongInfoScreen';
import { shouldPersist, queryPersister } from './src/storage/queryCache';
import { useAuth } from './src/state/auth';
import { SheetHost } from './src/ui/sheets';
import { TabBar } from './src/ui/TabBar';
import { ToastHost } from './src/ui/toast';
import { useColors, useIsDark } from './src/ui/theme';

const DAY = 24 * 60 * 60_000;
// Cached data stays usable for a week and is shown at once; fetches that fail (home lab asleep) keep it on screen.
const qc = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 5 * 60_000, gcTime: 7 * DAY, networkMode: 'offlineFirst' } } });
const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function Tabs() {
  return (
    <Tab.Navigator tabBar={(p) => <TabBar {...p} />} screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Library" component={LibraryScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
    </Tab.Navigator>
  );
}

function Shell() {
  const c = useColors();
  const dark = useIsDark();
  const inset = useSafeAreaInsets();
  const theme = { ...(dark ? DarkTheme : DefaultTheme), colors: { ...(dark ? DarkTheme : DefaultTheme).colors, background: c.bg, card: c.bg, text: c.fg, border: c.line, primary: c.accent } };
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <NavigationContainer theme={theme} ref={navRef}>
        <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }}>
          <Stack.Screen name="Tabs" component={Tabs} />
          <Stack.Screen name="Album" component={AlbumScreen} />
          <Stack.Screen name="Artist" component={ArtistScreen} />
          <Stack.Screen name="Playlist" component={PlaylistScreen} />
          <Stack.Screen name="SongInfo" component={SongInfoScreen} />
          <Stack.Screen name="Queue" component={QueueScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="Metadata" component={MetadataScreen} />
          <Stack.Screen name="NowPlaying" component={NowPlayingScreen} options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        </Stack.Navigator>
      </NavigationContainer>
      <SheetHost />
      <ToastHost bottom={inset.bottom + 96} />
    </View>
  );
}

export default function App() {
  const c = useColors();
  const dark = useIsDark();
  const { session, booting, boot } = useAuth();
  const [fontsReady] = useFonts({ DMMono_300Light, DMMono_400Regular, DMMono_500Medium, InstrumentSerif_400Regular_Italic });
  useEffect(() => { boot(); setupPlayer(); }, [boot]);
  // Refetch stale data when the app returns to the foreground (React Query does not know about RN's AppState).
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => { focusManager.setFocused(st === 'active'); if (st === 'active') recoverPlayback(); });
    return () => sub.remove();
  }, []);
  useRecordPlays();
  useConnectionWatch();
  const client = useAuth((a) => a.client);
  const offline = useOffline((s) => s.offline);
  useEffect(() => { if (client && !offline) backfillOfflineMeta(client); }, [client, offline]);
  useQueueSync();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaProvider>
      <PersistQueryClientProvider client={qc} persistOptions={{
        persister: queryPersister, maxAge: 7 * DAY, buster: session?.userId ?? '',
        dehydrateOptions: { shouldDehydrateQuery: (q) => q.state.status === 'success' && shouldPersist(q.queryKey) },
      }}>
        <StatusBar style={dark ? 'light' : 'dark'} />
        {booting || !fontsReady ? <View style={{ flex: 1, backgroundColor: c.bg }} /> : !session ? <LoginScreen /> : <Shell />}
      </PersistQueryClientProvider>
    </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

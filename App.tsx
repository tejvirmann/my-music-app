import { NavigationContainer, DarkTheme, createNavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { MiniPlayer } from './src/ui/MiniPlayer';
import { Empty, colors } from './src/ui';
import { useRecordPlays } from './src/player/recents';
import { setupPlayer } from './src/player/setup';
import { AlbumScreen } from './src/screens/AlbumScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { LidarrScreen } from './src/screens/LidarrScreen';
import { MetadataScreen } from './src/screens/MetadataScreen';
import { SongInfoScreen } from './src/screens/SongInfoScreen';
import { LibraryScreen } from './src/screens/LibraryScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { NowPlayingScreen } from './src/screens/NowPlayingScreen';
import { PlaylistScreen } from './src/screens/PlaylistScreen';
import { QueueScreen } from './src/screens/QueueScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { useAuth } from './src/state/auth';
import { useSettings } from './src/state/settings';
import { SongMenuHost } from './src/ui/songMenu';

const qc = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 60_000 } } });
const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const nav = createNavigationContainerRef<any>();
const theme = { ...DarkTheme, colors: { ...DarkTheme.colors, background: colors.bg, card: colors.bg } };

function Tabs() {
  const showHome = useSettings((x) => x.showHome);
  return (
    <Tab.Navigator screenOptions={{
      tabBarActiveTintColor: colors.accent,
      headerRight: () => (
        <Pressable hitSlop={12} onPress={() => nav.isReady() && nav.navigate('Settings')} style={{ paddingRight: 16 }} accessibilityLabel="Settings">
          <Text style={{ color: colors.text, fontSize: 24 }}>⚙︎</Text>
        </Pressable>
      ),
    }}>
      {showHome && <Tab.Screen name="Home" component={HomeScreen} />}
      <Tab.Screen name="Library" component={LibraryScreen} />
      <Tab.Screen name="Queue" component={QueueScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const { session, booting, boot } = useAuth();
  useEffect(() => { boot(); setupPlayer(); }, [boot]);
  useRecordPlays();

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={qc}>
        <StatusBar style="light" />
        {booting ? <Empty loading /> : !session ? <LoginScreen /> : (
          <View style={{ flex: 1, backgroundColor: colors.bg }}>
            <NavigationContainer theme={theme} ref={nav}>
              <Stack.Navigator>
                <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
                <Stack.Screen name="Album" component={AlbumScreen} options={({ route }: any) => ({ title: route.params.name })} />
                <Stack.Screen name="Playlist" component={PlaylistScreen} options={({ route }: any) => ({ title: route.params.name })} />
                <Stack.Screen name="Settings" component={SettingsScreen} />
                <Stack.Screen name="FindMusic" component={LidarrScreen} options={{ title: 'Find new music' }} />
                <Stack.Screen name="Metadata" component={MetadataScreen} options={{ title: 'Metadata health' }} />
                <Stack.Screen name="SongInfo" component={SongInfoScreen} options={{ title: 'Song info' }} />
                <Stack.Screen name="NowPlaying" component={NowPlayingScreen} options={{ title: 'Now Playing', presentation: 'modal' }} />
              </Stack.Navigator>
            </NavigationContainer>
            <SongMenuHost onInfo={(id) => nav.isReady() && nav.navigate('SongInfo', { id })} />
            <MiniPlayer onOpen={() => nav.isReady() && nav.navigate('NowPlaying')} />
          </View>
        )}
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

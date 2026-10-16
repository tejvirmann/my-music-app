import { NavigationContainer, DarkTheme, createNavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { MiniPlayer } from './src/components/MiniPlayer';
import { Empty, colors } from './src/components/ui';
import { setupPlayer } from './src/player/setup';
import { AlbumScreen } from './src/screens/AlbumScreen';
import { AlbumsScreen } from './src/screens/AlbumsScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { NowPlayingScreen } from './src/screens/NowPlayingScreen';
import { PlaylistScreen } from './src/screens/PlaylistScreen';
import { PlaylistsScreen } from './src/screens/PlaylistsScreen';
import { QueueScreen } from './src/screens/QueueScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { useAuth } from './src/state/auth';

const qc = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 60_000 } } });
const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const nav = createNavigationContainerRef<any>();
const theme = { ...DarkTheme, colors: { ...DarkTheme.colors, background: colors.bg, card: colors.bg } };

function Tabs() {
  return (
    <Tab.Navigator screenOptions={{ tabBarActiveTintColor: colors.accent }}>
      <Tab.Screen name="Albums" component={AlbumsScreen} />
      <Tab.Screen name="Playlists" component={PlaylistsScreen} />
      <Tab.Screen name="Queue" component={QueueScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const { session, booting, boot } = useAuth();
  useEffect(() => { boot(); setupPlayer(); }, [boot]);

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
                <Stack.Screen name="NowPlaying" component={NowPlayingScreen} options={{ title: 'Now Playing', presentation: 'modal' }} />
              </Stack.Navigator>
            </NavigationContainer>
            <MiniPlayer onOpen={() => nav.isReady() && nav.navigate('NowPlaying')} />
          </View>
        )}
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

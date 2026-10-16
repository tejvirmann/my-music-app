import { useQueryClient } from '@tanstack/react-query';
import { Text, View } from 'react-native';
import TrackPlayer from 'react-native-track-player';

import { Btn, s } from '../components/ui';
import { totalBytes } from '../downloads';
import { useAuth } from '../state/auth';

export function SettingsScreen() {
  const { session, signOut } = useAuth();
  const qc = useQueryClient();
  return (
    <View style={[s.screen, s.pad]}>
      <Text style={s.h1}>Server</Text>
      <Text style={[s.dim, { marginBottom: 16 }]}>{session?.serverUrl}</Text>
      <Text style={s.text}>Offline downloads: {(totalBytes() / 1e6).toFixed(1)} MB</Text>
      <View style={[s.buttons, { paddingHorizontal: 0 }]}>
        <Btn title="Sync now (clear cache)" onPress={() => qc.invalidateQueries()} />
        <Btn title="Sign out" kind="danger" onPress={async () => { await TrackPlayer.reset(); qc.clear(); await signOut(); }} />
      </View>
    </View>
  );
}

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Alert, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import TrackPlayer from 'react-native-track-player';

import { LidarrClient } from '../api/lidarr';
import { totalBytes } from '../downloads';
import { useAuth } from '../state/auth';
import { useSettings } from '../state/settings';
import { clearLidarr, saveLidarr } from '../storage/lidarr';
import { Btn, colors, s } from '../ui';
import { useLidarrConfig } from './lidarrConfig';

export function SettingsScreen() {
  const { session, signOut } = useAuth();
  const qc = useQueryClient();
  const nav = useNavigation<any>();
  const { showHome, setShowHome } = useSettings();
  const saved = useLidarrConfig().data;
  const [lUrl, setLUrl] = useState('');
  const [lKey, setLKey] = useState('');
  useEffect(() => { if (saved) { setLUrl(saved.url); setLKey(saved.apiKey); } }, [saved]);

  const out = async () => { await TrackPlayer.reset(); qc.clear(); await signOut(); };
  const saveL = async () => {
    if (!lUrl.trim() || !lKey.trim()) return Alert.alert('Enter both the Lidarr URL and API key');
    const cfg = { url: lUrl.trim(), apiKey: lKey.trim() };
    try {
      const st = await new LidarrClient(cfg).test();
      await saveLidarr(cfg); qc.setQueryData(['lidarr-config'], cfg);
      Alert.alert('Connected', `Lidarr ${st.version}`);
    } catch (e: any) { Alert.alert('Could not connect', e.message); }
  };
  const clearL = async () => { await clearLidarr(); qc.setQueryData(['lidarr-config'], null); setLUrl(''); setLKey(''); };

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled">
      <Text style={s.h1}>Server</Text>
      <Text style={[s.dim, { marginBottom: 16 }]}>{session?.serverUrl}</Text>
      <Text style={s.text}>Offline downloads: {(totalBytes() / 1e6).toFixed(1)} MB</Text>
      <View style={[s.buttons, { paddingHorizontal: 0 }]}>
        <Btn title="Sync now (clear cache)" onPress={() => qc.invalidateQueries()} />
        <Btn title="Metadata health (missing art/tags)" onPress={() => nav.navigate('Metadata')} />
        <Btn title="Change server / sign in again" onPress={out} />
        <Btn title="Sign out" kind="danger" onPress={out} />
      </View>

      <Text style={[s.h1, { marginTop: 24, marginBottom: 8 }]}>Home tab</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <Text style={s.text}>Show Home tab</Text>
        <Switch value={showHome} onValueChange={setShowHome} trackColor={{ true: colors.accent }} />
      </View>
      <Text style={[s.dim, { marginBottom: 6 }]}>Lidarr for Home → Find new music (API key: Lidarr → Settings → General)</Text>
      <TextInput style={s.input} placeholder="http://192.168.1.x:8686" placeholderTextColor={colors.dim} autoCapitalize="none" autoCorrect={false} keyboardType="url" value={lUrl} onChangeText={setLUrl} />
      <TextInput style={s.input} placeholder="API key" placeholderTextColor={colors.dim} autoCapitalize="none" autoCorrect={false} secureTextEntry value={lKey} onChangeText={setLKey} />
      <View style={[s.buttons, { paddingHorizontal: 0 }]}>
        <Btn title="Save & test" kind="primary" onPress={saveL} />
        {!!saved && <Btn title="Remove" onPress={clearL} />}
      </View>
    </ScrollView>
  );
}

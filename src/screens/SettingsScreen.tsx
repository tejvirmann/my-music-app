import { useQueryClient } from '@tanstack/react-query';
import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { Alert, Pressable, TextInput, View } from 'react-native';
import TrackPlayer from 'react-native-track-player';

import { LidarrClient } from '../api/lidarr';
import { totalBytes } from '../downloads';
import { clearQueue } from '../player/queue';
import { useAuth } from '../state/auth';
import { useLibraryPrefs } from '../state/library';
import { useSettings } from '../state/settings';
import { clearLidarr, saveLidarr } from '../storage/lidarr';
import { Logo } from '../ui/Brand';
import { Body, Button, Screen, TopBar } from '../ui/layout';
import { Txt } from '../ui/text';
import { F, useColors, useThemeMode, type Mode } from '../ui/theme';
import { toast } from '../ui/toast';
import { useLidarrConfig } from './lidarrConfig';

function Group({ title }: { title: string }) {
  return <Txt v="h3" style={{ marginTop: 24, marginBottom: 2 }}>{title}</Txt>;
}

function Item({ label, sub, value, onPress, danger, children }: { label: string; sub?: string; value?: string; onPress?: () => void; danger?: boolean; children?: React.ReactNode }) {
  const c = useColors();
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.line, opacity: pressed ? 0.5 : 1, gap: 12 })}>
      <View style={{ flexShrink: 1 }}>
        <Txt color={danger ? c.accent : c.fg}>{label}</Txt>
        {!!sub && <Txt v="small" numberOfLines={1}>{sub}</Txt>}
      </View>
      {children ?? (!!value && <Txt v="mute">{value}</Txt>)}
    </Pressable>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  const c = useColors();
  return (
    <Pressable onPress={() => onChange(!on)} accessibilityRole="switch" accessibilityState={{ checked: on }}
      style={{ width: 40, height: 22, borderWidth: 1, borderColor: c.fg, backgroundColor: on ? c.fg : 'transparent', justifyContent: 'center', paddingHorizontal: 2, alignItems: on ? 'flex-end' : 'flex-start' }}>
      <View style={{ width: 16, height: 16, backgroundColor: on ? c.bg : c.fg }} />
    </Pressable>
  );
}

function Seg({ value, options, onChange }: { value: string; options: string[]; onChange: (v: any) => void }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', borderWidth: 1, borderColor: c.fg }}>
      {options.map((o) => (
        <Pressable key={o} onPress={() => onChange(o)} style={{ paddingHorizontal: 10, paddingVertical: 4, backgroundColor: value === o ? c.fg : 'transparent' }}>
          <Txt color={value === o ? c.bg : c.fg}>{o[0].toUpperCase() + o.slice(1)}</Txt>
        </Pressable>
      ))}
    </View>
  );
}

function Input(p: React.ComponentProps<typeof TextInput>) {
  const c = useColors();
  return <TextInput {...p} placeholderTextColor={c.mute} selectionColor={c.accent} autoCapitalize="none" autoCorrect={false}
    style={[{ fontFamily: F.mono, fontSize: 14, color: c.fg, borderBottomWidth: 1, borderBottomColor: c.fg, paddingVertical: 8, marginTop: 8 }, p.style]} />;
}

export function SettingsScreen({ navigation }: any) {
  const c = useColors();
  const { session, signOut } = useAuth();
  const qc = useQueryClient();
  const { mode, setMode } = useThemeMode();
  const { showDiscover, setShowDiscover, appName, setAppName, appImage, setAppImage } = useSettings();
  const hidden = useLibraryPrefs((s) => s.hidden);
  const unhideAll = useLibraryPrefs((s) => s.unhideAll);
  const saved = useLidarrConfig().data;
  const [name, setName] = useState(appName);
  const [lUrl, setLUrl] = useState('');
  const [lKey, setLKey] = useState('');
  useEffect(() => { if (saved) { setLUrl(saved.url); setLKey(saved.apiKey); } }, [saved]);

  const out = async () => { await TrackPlayer.reset(); qc.clear(); await signOut(); };
  const host = session?.serverUrl.replace(/^https?:\/\//, '');

  const pickImage = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (r.canceled || !r.assets[0]) return;
    try {
      const dest = new File(Paths.document, `brand-${Date.now()}.jpg`);
      new File(r.assets[0].uri).copy(dest);
      if (appImage) try { new File(appImage).delete(); } catch {}
      setAppImage(dest.uri);
      toast('App image updated');
    } catch (e: any) { Alert.alert('Could not save image', e.message); }
  };
  const imageMenu = () => Alert.alert('App image', 'Shown inside the app.', [
    { text: 'Choose from photos', onPress: pickImage },
    ...(appImage ? [{ text: 'Use initial letter', onPress: () => { try { new File(appImage).delete(); } catch {} setAppImage(null); } }] : []),
    { text: 'Cancel', style: 'cancel' as const },
  ]);

  const saveL = async () => {
    if (!lUrl.trim() || !lKey.trim()) return Alert.alert('Enter both the Lidarr URL and API key');
    const cfg = { url: lUrl.trim(), apiKey: lKey.trim() };
    try {
      const st = await new LidarrClient(cfg).test();
      await saveLidarr(cfg); qc.setQueryData(['lidarr-config'], cfg);
      toast('Connected to Lidarr', st.version);
    } catch (e: any) { Alert.alert('Could not connect', e.message); }
  };
  const clearL = async () => { await clearLidarr(); qc.setQueryData(['lidarr-config'], null); setLUrl(''); setLKey(''); };

  return (
    <Screen>
      <TopBar onBack={() => navigation.goBack()} />
      <Body bottom={60}>
        <Txt v="h2" style={{ marginBottom: 4 }}>Settings</Txt>

        <Group title="Appearance" />
        <Item label="Theme"><Seg value={mode} options={['light', 'dark', 'system']} onChange={(m: Mode) => setMode(m)} /></Item>

        <Group title="App" />
        <View style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.line }}>
          <Txt v="label">name</Txt>
          <Input value={name} onChangeText={setName} maxLength={24} onEndEditing={() => { setAppName(name); setName(name.trim() || 'Index of sound'); }} style={{ marginTop: 2 }} />
        </View>
        <Item label="Image" sub="shown inside the app" onPress={imageMenu}><Logo size={34} /></Item>
        <Txt v="small" style={{ marginTop: 8 }}>Changes the name and image inside the app. The home-screen name and icon are set when the app is built.</Txt>

        <Group title="Library" />
        <Item label="Server" sub={host} value="change ›" onPress={out} />
        <Item label="Sync now" sub="reload everything from Jellyfin" value="↻" onPress={() => { qc.invalidateQueries(); toast('Syncing with Jellyfin…'); }} />
        <Item label="Metadata health" sub="missing art, years, genres" value="›" onPress={() => navigation.navigate('Metadata')} />
        <Item label="Hidden playlists" value={`${hidden.length}${hidden.length ? ' · show all' : ''}`} onPress={hidden.length ? unhideAll : undefined} />
        <Item label="Show Discover in Search" sub="search & add new music via Lidarr"><Toggle on={showDiscover} onChange={setShowDiscover} /></Item>

        {showDiscover && (
          <>
            <Group title="Discover (Lidarr)" />
            <Txt v="small" style={{ marginTop: 4 }}>API key: Lidarr → Settings → General.</Txt>
            <Input value={lUrl} onChangeText={setLUrl} placeholder="http://192.168.1.x:8686" keyboardType="url" />
            <Input value={lKey} onChangeText={setLKey} placeholder="API key" secureTextEntry />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
              <Button title="Save & test" solid onPress={saveL} style={{ flex: 1 }} />
              {!!saved && <Button title="Remove" onPress={clearL} style={{ flex: 1 }} />}
            </View>
          </>
        )}

        <Group title="Downloads" />
        <Item label="Storage used" value={`${(totalBytes() / 1e6).toFixed(1)} MB`} />
        <Item label="Clear queue" onPress={() => clearQueue().then(() => toast('Queue cleared'))} />

        <Group title="Account" />
        <Item label="Sign out" value={host} danger onPress={out} />
      </Body>
    </Screen>
  );
}

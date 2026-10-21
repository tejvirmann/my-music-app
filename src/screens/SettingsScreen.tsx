import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Alert, Pressable, TextInput, View } from 'react-native';
import TrackPlayer from 'react-native-track-player';

import { LidarrClient } from '../api/lidarr';
import { Image } from 'expo-image';
import { APP_ICONS } from '../brand';
import { useAppIcon } from '../state/icon';
import { totalBytes } from '../downloads';
import { clearQueue } from '../player/queue';
import { useAuth } from '../state/auth';
import { DEFAULT_COVER, clearCover, pickCover, useCovers } from '../state/covers';
import { useLibraryPrefs } from '../state/library';
import { useSettings } from '../state/settings';
import { clearLidarr, saveLidarr } from '../storage/lidarr';
import { Body, Button, Screen, TopBar } from '../ui/layout';
import { Txt } from '../ui/text';
import { F, useColors, useThemeMode, type Mode } from '../ui/theme';
import { toast } from '../ui/toast';
import { APP_NAME } from '../brand';
import { greeting } from './hooks';
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

/** One default-image slot: shows the chosen image (or what applies instead), tap to pick, "reset" to clear. */
function CoverSlot({ slot, label, sub }: { slot: string; label: string; sub: string }) {
  const c = useColors();
  const uri = useCovers((s) => s.map[slot]);
  return (
    <Item label={label} sub={sub} onPress={() => pickCover(slot).then((ok) => ok && toast('Default updated')).catch((e) => Alert.alert('Could not set image', e.message))}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {uri ? <Image source={{ uri }} style={{ width: 40, height: 40, borderWidth: 1, borderColor: c.line }} contentFit="cover" /> : <Txt v="mute">choose ›</Txt>}
        {!!uri && <Txt color={c.accent} onPress={() => clearCover(slot)}>reset</Txt>}
      </View>
    </Item>
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
  const { id: icon, supported: iconSupported, choose: chooseIcon } = useAppIcon();
  const { mode, setMode } = useThemeMode();
  const { unownCovers, setUnownCovers, unownColor, setUnownColor, showDiscover, setShowDiscover, showGreeting, setShowGreeting, greetingText, setGreetingText, appTitle, setAppTitle } = useSettings();
  const hidden = useLibraryPrefs((s) => s.hidden);
  const unhideAll = useLibraryPrefs((s) => s.unhideAll);
  const saved = useLidarrConfig().data;
  const [lUrl, setLUrl] = useState('');
  const [lKey, setLKey] = useState('');
  useEffect(() => { if (saved) { setLUrl(saved.url); setLKey(saved.apiKey); } }, [saved]);

  const out = async () => { await TrackPlayer.reset(); qc.clear(); await signOut(); };
  const host = session?.serverUrl.replace(/^https?:\/\//, '');

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

        <Group title="App icon" />
        <View style={{ flexDirection: 'row', gap: 14, paddingVertical: 12 }}>
          {APP_ICONS.map((ic) => {
            const on = (icon ?? null) === ic.id;
            return (
              <Pressable key={ic.label} disabled={!iconSupported} accessibilityRole="button" accessibilityLabel={`${ic.label} icon`}
                onPress={() => chooseIcon(ic.id).catch((e) => Alert.alert('Could not change icon', e.message))} style={{ alignItems: 'center', gap: 6, opacity: iconSupported ? 1 : 0.4 }}>
                <Image source={ic.source} style={{ width: 68, height: 68, borderRadius: 15, borderWidth: on ? 2 : 1, borderColor: on ? c.accent : c.line }} contentFit="cover" />
                <Txt v="small" color={on ? c.accent : c.mute}>{ic.label}</Txt>
              </Pressable>
            );
          })}
        </View>
        <Txt v="small">Changes the home-screen icon. iOS shows a short confirmation. The name under the icon is set when the app is built.</Txt>

        <Group title="Home" />
        <View style={{ paddingVertical: 8 }}>
          <Txt v="label">app title</Txt>
          <Input value={appTitle} onChangeText={setAppTitle} maxLength={24} placeholder={`default: ${APP_NAME}`} style={{ marginTop: 2 }} />
        </View>
        <Item label="Show greeting"><Toggle on={showGreeting} onChange={setShowGreeting} /></Item>
        {showGreeting && (
          <View style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.line }}>
            <Txt v="label">greeting text</Txt>
            <Input value={greetingText} onChangeText={setGreetingText} maxLength={40} placeholder={`automatic: ${greeting()}`} style={{ marginTop: 2 }} />
            <Txt v="small" style={{ marginTop: 4 }}>Leave empty to follow the time of day.</Txt>
          </View>
        )}

        <Group title="Default covers" />
        <CoverSlot slot={DEFAULT_COVER.art} label="Songs & albums with no art" sub="used everywhere a cover is missing" />
        <CoverSlot slot={DEFAULT_COVER.clips} label="Clips playlist" sub="when the Clips playlist has no art" />
        <Item label="Unown for unknown playlists" sub="the Unown matching the playlist's first letter"><Toggle on={unownCovers} onChange={setUnownCovers} /></Item>
        <Item label="Unown in colour" sub="on: a colour picked from the name · off: black and white"><Toggle on={unownColor} onChange={setUnownColor} /></Item>
        <CoverSlot slot={DEFAULT_COVER.unknown} label="Unknown playlists" sub="one image for every playlist with no art (wins over Unown)" />
        <Txt v="small" style={{ marginTop: 4 }}>A cover you set on a playlist itself (⋯ → Set cover image) always wins.</Txt>

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

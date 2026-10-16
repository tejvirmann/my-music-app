import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../state/auth';
import { APP_NAME } from '../brand';
import { getLastServerUrl } from '../storage/prefs';
import { Logo } from '../ui/Brand';
import { Button } from '../ui/layout';
import { Txt } from '../ui/text';
import { F, useColors } from '../ui/theme';

function Field({ label, ...p }: { label: string } & React.ComponentProps<typeof TextInput>) {
  const c = useColors();
  return (
    <View style={{ borderBottomWidth: 1, borderBottomColor: c.fg, paddingVertical: 6, marginBottom: 16 }}>
      <Txt v="label">{label}</Txt>
      <TextInput {...p} placeholderTextColor={c.mute} selectionColor={c.accent}
        style={{ fontFamily: F.mono, fontSize: 15, color: c.fg, paddingVertical: 4 }} />
    </View>
  );
}

export function LoginScreen() {
  const c = useColors();
  const inset = useSafeAreaInsets();
  const signIn = useAuth((a) => a.signIn);
  const [url, setUrl] = useState(getLastServerUrl() || 'http://');
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState<string>();
  const [busy, setBusy] = useState(false);

  const go = async () => {
    if (busy) return;
    if (!url.trim() || url.trim() === 'http://') return setErr('Enter your server URL, e.g. http://192.168.1.50:8096');
    if (!user.trim()) return setErr('Enter your Jellyfin username');
    setBusy(true); setErr(undefined);
    try { await signIn(url, user.trim(), pass); } catch (e: any) { setErr(e?.message ?? String(e)); } finally { setBusy(false); }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, paddingTop: inset.top + 24, paddingBottom: inset.bottom + 24 }}>
        <View style={{ marginBottom: 18 }}><Logo size={48} /></View>
        <Txt v="h1" style={{ fontSize: 46, lineHeight: 46 }}>{APP_NAME}</Txt>
        <Txt v="mute" style={{ marginTop: 8, marginBottom: 36 }}>your library, your server</Txt>
        <Field label="server" value={url} onChangeText={setUrl} autoCapitalize="none" autoCorrect={false} keyboardType="url" placeholder="http://192.168.1.x:8096" />
        <Field label="username" value={user} onChangeText={setUser} autoCapitalize="none" autoCorrect={false} textContentType="username" />
        <Field label="password" value={pass} onChangeText={setPass} secureTextEntry autoCapitalize="none" textContentType="password" onSubmitEditing={go} returnKeyType="go" />
        {!!err && <Txt color={c.accent} style={{ marginBottom: 12 }}>{err}</Txt>}
        <Button title={busy ? 'Connecting…' : 'Sign in'} solid onPress={go} />
        <Txt v="mute" style={{ textAlign: 'center', marginTop: 14 }}>server address is remembered</Txt>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

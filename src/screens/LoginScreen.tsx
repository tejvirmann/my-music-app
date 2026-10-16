import { useState } from 'react';
import { KeyboardAvoidingView, ScrollView, Text, TextInput } from 'react-native';

import { Btn, colors, s } from '../ui';
import { useAuth } from '../state/auth';
import { getLastServerUrl } from '../storage/prefs';

export function LoginScreen() {
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
    <KeyboardAvoidingView behavior="padding" style={s.screen}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[s.center, { flexGrow: 1 }]}>
        <Text style={[s.h1, { marginBottom: 16 }]}>Connect to Jellyfin</Text>
        <Text style={s.dim}>Server URL (editable any time)</Text>
        <TextInput style={s.input} placeholder="http://192.168.1.x:8096" placeholderTextColor={colors.dim}
          autoCapitalize="none" autoCorrect={false} keyboardType="url" value={url} onChangeText={setUrl} />
        <TextInput style={s.input} placeholder="Username" placeholderTextColor={colors.dim}
          autoCapitalize="none" autoCorrect={false} value={user} onChangeText={setUser} />
        <TextInput style={s.input} placeholder="Password" placeholderTextColor={colors.dim}
          secureTextEntry autoCapitalize="none" value={pass} onChangeText={setPass} onSubmitEditing={go} />
        {!!err && <Text style={{ color: colors.danger, marginBottom: 10 }}>{err}</Text>}
        <Btn title={busy ? 'Connecting…' : 'Sign in'} kind="primary" onPress={go} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

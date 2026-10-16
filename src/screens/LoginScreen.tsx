import { useState } from 'react';
import { KeyboardAvoidingView, Text, TextInput, View } from 'react-native';

import { Btn, colors, s } from '../components/ui';
import { useAuth } from '../state/auth';

export function LoginScreen() {
  const signIn = useAuth((a) => a.signIn);
  const [url, setUrl] = useState('');
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState<string>();
  const [busy, setBusy] = useState(false);

  const go = async () => {
    setBusy(true); setErr(undefined);
    try { await signIn(url, user, pass); } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={[s.screen, s.center]}>
      <View style={{ width: '100%' }}>
        <Text style={[s.h1, { marginBottom: 16 }]}>Connect to Jellyfin</Text>
        <TextInput style={s.input} placeholder="Server URL (http://192.168.1.x:8096)" placeholderTextColor={colors.dim}
          autoCapitalize="none" autoCorrect={false} keyboardType="url" value={url} onChangeText={setUrl} />
        <TextInput style={s.input} placeholder="Username" placeholderTextColor={colors.dim}
          autoCapitalize="none" autoCorrect={false} value={user} onChangeText={setUser} />
        <TextInput style={s.input} placeholder="Password" placeholderTextColor={colors.dim}
          secureTextEntry value={pass} onChangeText={setPass} />
        {!!err && <Text style={{ color: colors.danger, marginBottom: 10 }}>{err}</Text>}
        <Btn title={busy ? 'Connecting…' : 'Sign in'} kind="primary" onPress={go} disabled={busy || !url || !user} />
      </View>
    </KeyboardAvoidingView>
  );
}

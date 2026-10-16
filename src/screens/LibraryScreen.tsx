import { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { colors, s } from '../ui';
import { AlbumsScreen } from './AlbumsScreen';
import { PlaylistsScreen } from './PlaylistsScreen';
import { SearchResults } from './SearchResults';

/** Library tab: search bar on top; Albums and Playlists below (replaced by results while searching). */
export function LibraryScreen({ navigation }: any) {
  const [tab, setTab] = useState<'playlists' | 'albums'>('playlists');
  const [text, setText] = useState('');
  const [term, setTerm] = useState('');
  useEffect(() => { const t = setTimeout(() => setTerm(text.trim()), 300); return () => clearTimeout(t); }, [text]);

  return (
    <View style={s.screen}>
      <TextInput style={[s.input, { margin: 12, marginBottom: 0 }]} placeholder="Search songs, albums, playlists" placeholderTextColor={colors.dim}
        value={text} onChangeText={setText} autoCapitalize="none" autoCorrect={false} clearButtonMode="while-editing" returnKeyType="search" />
      {term ? <SearchResults term={term} navigation={navigation} /> : (
        <>
          <View style={{ flexDirection: 'row', gap: 8, padding: 12, paddingBottom: 0 }}>
            {(['playlists', 'albums'] as const).map((t) => (
              <Pressable key={t} onPress={() => setTab(t)}
                style={[s.btn, { backgroundColor: tab === t ? colors.accent : colors.card, paddingHorizontal: 18 }]}>
                <Text style={[s.btnText, tab === t && { color: '#000' }]}>{t === 'albums' ? 'Albums' : 'Playlists'}</Text>
              </Pressable>
            ))}
          </View>
          {tab === 'albums' ? <AlbumsScreen navigation={navigation} /> : <PlaylistsScreen navigation={navigation} />}
        </>
      )}
    </View>
  );
}

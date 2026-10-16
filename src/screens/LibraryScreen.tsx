import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { colors, s } from '../ui';
import { AlbumsScreen } from './AlbumsScreen';
import { PlaylistsScreen } from './PlaylistsScreen';

/** Library tab: Albums and Playlists in one place. */
export function LibraryScreen({ navigation }: any) {
  const [tab, setTab] = useState<'playlists' | 'albums'>('playlists');
  return (
    <View style={s.screen}>
      <View style={{ flexDirection: 'row', gap: 8, padding: 12, paddingBottom: 0 }}>
        {(['playlists', 'albums'] as const).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)}
            style={[s.btn, { backgroundColor: tab === t ? colors.accent : colors.card, paddingHorizontal: 18 }]}>
            <Text style={[s.btnText, tab === t && { color: '#000' }]}>{t === 'albums' ? 'Albums' : 'Playlists'}</Text>
          </Pressable>
        ))}
      </View>
      {tab === 'albums' ? <AlbumsScreen navigation={navigation} /> : <PlaylistsScreen navigation={navigation} />}
    </View>
  );
}

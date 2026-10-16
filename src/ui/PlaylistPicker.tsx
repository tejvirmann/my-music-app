import { useQuery } from '@tanstack/react-query';
import { Alert, Modal, ScrollView, View } from 'react-native';

import { useAuth } from '../state/auth';
import { Btn, Empty, Row, colors, s } from '.';

/** Pick a playlist to add tracks to, or create a new one. */
export function PlaylistPicker({ visible, trackIds, onClose }: { visible: boolean; trackIds: string[]; onClose: () => void }) {
  const client = useAuth((a) => a.client)!;
  const { data, isLoading, refetch } = useQuery({ queryKey: ['playlists'], queryFn: () => client.playlists(), enabled: visible });

  const add = async (id: string) => {
    try { await client.addToPlaylist(id, trackIds); onClose(); } catch (e: any) { Alert.alert('Failed', e.message); }
  };
  const create = () =>
    Alert.prompt('New playlist', 'Name', async (name) => {
      if (!name?.trim()) return;
      try { await client.createPlaylist(name.trim(), trackIds); await refetch(); onClose(); } catch (e: any) { Alert.alert('Failed', e.message); }
    });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[s.screen, { paddingTop: 16 }]}>
        <View style={s.buttons}>
          <Btn title="New playlist…" kind="primary" onPress={create} />
          <Btn title="Cancel" onPress={onClose} />
        </View>
        {isLoading ? <Empty loading /> : (
          <ScrollView style={{ backgroundColor: colors.bg }}>
            {data?.Items.map((p) => <Row key={p.Id} title={p.Name} onPress={() => add(p.Id)} />)}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

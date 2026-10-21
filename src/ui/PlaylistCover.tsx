import { useQuery } from '@tanstack/react-query';
import { View } from 'react-native';

import { LIKED_NAME } from '../likes';
import { useAuth } from '../state/auth';
import { useCovers } from '../state/covers';
import { Art } from './Art';
import { Icon } from './Icon';
import { useColors } from './theme';

/** Cheap content fingerprint (FNV-1a) so identical images fetched from different Jellyfin items compare equal. */
function fingerprint(buf: ArrayBuffer) {
  const b = new Uint8Array(buf);
  let h = 2166136261;
  for (let i = 0; i < b.length; i++) h = Math.imul(h ^ b[i], 16777619);
  return `${b.length}:${h >>> 0}`;
}

/** Playlist cover: your own image if set, a fixed heart tile for Liked Songs, otherwise a 2×2 collage of the first songs' art. */
export function PlaylistCover({ id, name, size }: { id: string; name: string; size?: number }) {
  const c = useColors();
  const client = useAuth((a) => a.client)!;
  const custom = useCovers((s) => s.map[id]);
  const liked = name === LIKED_NAME;
  const { data } = useQuery({ queryKey: ['playlistCover', id], queryFn: () => client.playlistCover(id), enabled: !custom && !liked, staleTime: 30 * 60_000 });
  const first4 = [...new Set((data?.Items ?? []).slice(0, 4).map((t) => t.AlbumId ?? t.Id))];
  // Different album items can carry the very same picture (e.g. a playlist of one series); compare the pixels, not the ids.
  const { data: sameArt } = useQuery({
    queryKey: ['sameArt', id, first4.join(',')],
    enabled: !custom && !liked && first4.length > 1,
    staleTime: Infinity,
    queryFn: async () => {
      const prints = await Promise.all(first4.map(async (a) => fingerprint(await (await fetch(client.imageUrl(a, 160))).arrayBuffer())));
      return prints.every((p) => p === prints[0]);
    },
  });
  const box = size ? { width: size, height: size } : { width: '100%' as const, aspectRatio: 1 };

  if (custom) return <Art uri={custom} size={size} />;
  if (liked) {
    return (
      <View style={[box, { backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }]}>
        <Icon name="heart" size={size ? size * 0.45 : 48} color={c.bg} />
      </View>
    );
  }
  const albums = [...new Set((data?.Items ?? []).map((t) => t.AlbumId ?? t.Id))];
  if (albums.length < 2 || sameArt) return <Art uri={albums[0] ? client.imageUrl(albums[0], 320) : undefined} size={size} />;
  const w = size ? Math.max(160, size * 2) : 320;
  const cells = [0, 1, 2, 3].map((i) => albums[i] ?? albums[i % albums.length]);
  return (
    <View style={[box, { flexDirection: 'row', flexWrap: 'wrap', overflow: 'hidden', backgroundColor: c.card }]}>
      {cells.map((a, i) => (
        <View key={i} style={{ width: '50%', height: '50%' }}>
          <Art uri={client.imageUrl(a, w)} style={{ width: '100%', height: '100%', aspectRatio: undefined }} />
        </View>
      ))}
    </View>
  );
}

import { useQuery } from '@tanstack/react-query';
import { View } from 'react-native';

import { orLocal } from '../downloads';
import { LIKED_NAME } from '../likes';
import { useAuth } from '../state/auth';
import { DEFAULT_COVER, useCovers } from '../state/covers';
import { useSettings } from '../state/settings';
import { Art, UnownTile } from './Art';
import { Icon } from './Icon';
import { Txt } from './text';
import { useColors } from './theme';

/** Cheap content fingerprint (FNV-1a) so identical images fetched from different Jellyfin items compare equal. */
function fingerprint(buf: ArrayBuffer) {
  const b = new Uint8Array(buf);
  let h = 2166136261;
  for (let i = 0; i < b.length; i++) h = Math.imul(h ^ b[i], 16777619);
  return `${b.length}:${h >>> 0}`;
}

/**
 * Playlist cover. Order: your own image for it, a heart tile for Liked Songs, a collage of the first songs' art, then (when no song has art)
 * the default image from Settings (Clips has its own), an Unown, or a plain initial.
 */
export function PlaylistCover({ id, name, size }: { id: string; name: string; size?: number }) {
  const c = useColors();
  const client = useAuth((a) => a.client)!;
  const custom = useCovers((s) => s.map[id]);
  const liked = name === LIKED_NAME;
  const unownOn = useSettings((x) => x.unownCovers);
  const clipsImg = useCovers((x) => x.map[DEFAULT_COVER.clips]);
  const unknownImg = useCovers((x) => x.map[DEFAULT_COVER.unknown]);
  const isClips = name.trim().toLowerCase() === 'clips';
  const { data } = useQuery({ queryKey: ['playlistCover', id, 2], queryFn: () => orLocal(id, () => client.playlistCover(id)), enabled: !custom && !liked, staleTime: 30 * 60_000 });
  // Only tracks that really have a picture: voice clips etc. would otherwise leave blank squares in the collage.
  const artIds = (data?.Items ?? []).flatMap((t) => (t.AlbumPrimaryImageTag ? [t.AlbumId ?? t.Id] : t.ImageTags?.Primary ? [t.Id] : []));
  const first4 = [...new Set(artIds.slice(0, 4))];
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
  const albums = [...new Set(artIds)];
  if (data && !albums.length) {
    // No track has art, so no collage: Settings default, then an Unown, then a coloured initial.
    const img = (isClips && clipsImg) || unknownImg;
    if (img) return <Art uri={img} size={size} />;
    if (unownOn) return <UnownTile name={name} size={size} box={box} />;
    let h = 0;
    for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360;
    return (
      <View style={[box, { backgroundColor: `hsl(${h}, 32%, 38%)`, alignItems: 'center', justifyContent: 'center' }]}>
        <Txt v="h1" color="rgba(255,255,255,0.9)" style={size ? { fontSize: size * 0.45, lineHeight: size * 0.5 } : undefined}>
          {(name.trim()[0] ?? '♪').toUpperCase()}
        </Txt>
      </View>
    );
  }
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

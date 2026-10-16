import { useQuery } from '@tanstack/react-query';

import type { JfItem } from '../api/types';
import { useAuth } from '../state/auth';
import { useLibraryPrefs } from '../state/library';

/** Playlists as the user wants to see them: hidden ones removed (unless asked), pinned ones first in pin order. */
export function usePlaylists(includeHidden = false) {
  const client = useAuth((a) => a.client)!;
  const { pinned, hidden } = useLibraryPrefs();
  const q = useQuery({ queryKey: ['playlists'], queryFn: () => client.playlists() });
  const all = (q.data?.Items ?? []).filter((p) => includeHidden || !hidden.includes(p.Id));
  const items: JfItem[] = [
    ...pinned.map((id) => all.find((p) => p.Id === id)).filter((p): p is JfItem => !!p),
    ...all.filter((p) => !pinned.includes(p.Id)),
  ];
  return { ...q, items, pinned, hidden };
}

export function greeting() {
  const h = new Date().getHours();
  return h < 5 ? 'Late night' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

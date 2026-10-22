import { useQuery } from '@tanstack/react-query';

import type { JfItem } from '../api/types';
import { useAuth } from '../state/auth';
import { useDownloadedPlaylists, useLocalPlaylists } from '../downloads';
import { useLibraryPrefs } from '../state/library';
import { useOffline } from '../state/offline';

/** Playlists as the user wants to see them: hidden ones removed (unless asked), pinned ones first in pin order. */
export function usePlaylists(includeHidden = false) {
  const client = useAuth((a) => a.client)!;
  const { pinned, hidden } = useLibraryPrefs();
  const q = useQuery({ queryKey: ['playlists'], queryFn: () => client.playlists() });
  // Offline, only downloaded playlists can be opened, so those are all that is listed.
  const offline = useOffline((s) => s.offline);
  const local = useLocalPlaylists();
  const downloaded = useDownloadedPlaylists();
  // Downloads made before offline support have no saved name yet; the saved playlist list (kept from the last online visit) supplies it.
  const known = new Set(local.map((p) => p.Id));
  const offlineItems = [...local, ...(q.data?.Items ?? []).filter((p) => downloaded.has(p.Id) && !known.has(p.Id))];
  const all = (offline ? offlineItems : q.data?.Items ?? []).filter((p) => includeHidden || !hidden.includes(p.Id));
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

import { create } from 'zustand';

import { getHiddenPlaylists, getPinnedPlaylists, setHiddenPlaylists, setPinnedPlaylists } from '../storage/prefs';

/** Pinned (shown first) and hidden playlists. Local to this phone; Jellyfin is never told. */
export const useLibraryPrefs = create<{
  pinned: string[]; hidden: string[];
  togglePin: (id: string) => void; toggleHide: (id: string) => void; unhideAll: () => void;
}>((set, get) => ({
  pinned: getPinnedPlaylists(),
  hidden: getHiddenPlaylists(),
  togglePin: (id) => { const p = get().pinned; const n = p.includes(id) ? p.filter((x) => x !== id) : [...p, id]; setPinnedPlaylists(n); set({ pinned: n }); },
  toggleHide: (id) => { const h = get().hidden; const n = h.includes(id) ? h.filter((x) => x !== id) : [...h, id]; setHiddenPlaylists(n); set({ hidden: n }); },
  unhideAll: () => { setHiddenPlaylists([]); set({ hidden: [] }); },
}));

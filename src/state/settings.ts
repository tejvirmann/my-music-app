import { create } from 'zustand';

import { getAppImage, getAppName, getShowDiscover, setAppImage, setAppName, setShowDiscover } from '../storage/prefs';

interface Settings {
  showDiscover: boolean; setShowDiscover: (v: boolean) => void;
  appName: string; setAppName: (v: string) => void;
  appImage: string | null; setAppImage: (v: string | null) => void;
}

/** Local UI preferences (never sent to Jellyfin). */
export const useSettings = create<Settings>((set) => ({
  showDiscover: getShowDiscover(),
  setShowDiscover: (v) => { setShowDiscover(v); set({ showDiscover: v }); },
  appName: getAppName(),
  setAppName: (v) => { const n = v.trim() || 'Index of sound'; setAppName(n); set({ appName: n }); },
  appImage: getAppImage(),
  setAppImage: (v) => { setAppImage(v); set({ appImage: v }); },
}));

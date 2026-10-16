import { create } from 'zustand';

import { getShowHome, setShowHome } from '../storage/prefs';

/** Local UI preferences. showHome hides/shows the Home (Lidarr) tab. */
export const useSettings = create<{ showHome: boolean; setShowHome: (v: boolean) => void }>((set) => ({
  showHome: getShowHome(),
  setShowHome: (v) => { setShowHome(v); set({ showHome: v }); },
}));

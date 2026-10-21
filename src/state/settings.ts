import { create } from 'zustand';

import { getAppTitle, getGreetingText, getShowDiscover, getShowGreeting, getUnownCovers, setAppTitle, setGreetingText, setShowDiscover, setShowGreeting, setUnownCovers } from '../storage/prefs';

interface Settings {
  showDiscover: boolean; setShowDiscover: (v: boolean) => void;
  unownCovers: boolean; setUnownCovers: (v: boolean) => void;
  showGreeting: boolean; setShowGreeting: (v: boolean) => void;
  appTitle: string; setAppTitle: (v: string) => void;
  greetingText: string; setGreetingText: (v: string) => void;
}

/** Local UI preferences (never sent to Jellyfin). */
export const useSettings = create<Settings>((set) => ({
  showDiscover: getShowDiscover(),
  setShowDiscover: (v) => { setShowDiscover(v); set({ showDiscover: v }); },
  unownCovers: getUnownCovers(),
  setUnownCovers: (v) => { setUnownCovers(v); set({ unownCovers: v }); },
  showGreeting: getShowGreeting(),
  setShowGreeting: (v) => { setShowGreeting(v); set({ showGreeting: v }); },
  appTitle: getAppTitle(),
  setAppTitle: (v) => { setAppTitle(v); set({ appTitle: v }); },
  greetingText: getGreetingText(),
  setGreetingText: (v) => { setGreetingText(v); set({ greetingText: v }); },
}));

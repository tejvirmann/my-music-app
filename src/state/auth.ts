import { create } from 'zustand';

import { JellyfinClient, login } from '../api/jellyfin';
import type { Session } from '../api/types';
import { clearSession, loadSession, saveSession } from '../storage/session';

interface AuthState {
  session: Session | null;
  client: JellyfinClient | null;
  booting: boolean;
  boot: () => Promise<void>;
  signIn: (url: string, user: string, pass: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const newDeviceId = () => `mymusic-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;

export const useAuth = create<AuthState>((set, get) => ({
  session: null,
  client: null,
  booting: true,
  boot: async () => {
    const s = await loadSession();
    set({ session: s, client: s ? new JellyfinClient(s) : null, booting: false });
  },
  signIn: async (url, user, pass) => {
    const deviceId = get().session?.deviceId ?? newDeviceId();
    const s = await login(url, user, pass, deviceId);
    await saveSession(s);
    set({ session: s, client: new JellyfinClient(s) });
  },
  signOut: async () => {
    await clearSession();
    set({ session: null, client: null });
  },
}));

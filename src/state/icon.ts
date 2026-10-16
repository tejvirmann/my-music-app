import { getAppIconName, setAlternateAppIcon, supportsAlternateIcons } from 'expo-alternate-app-icons';
import { create } from 'zustand';

const current = (): string | null => { try { return getAppIconName(); } catch { return null; } };

/** The home-screen icon currently in effect (null = default). iOS owns the real state; this mirrors it for the UI. */
export const useAppIcon = create<{ id: string | null; supported: boolean; choose: (id: string | null) => Promise<void> }>((set) => ({
  id: current(),
  supported: (() => { try { return supportsAlternateIcons; } catch { return false; } })(),
  choose: async (id) => {
    await setAlternateAppIcon(id as any);
    set({ id });
  },
}));

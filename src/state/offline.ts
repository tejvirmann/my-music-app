import { useEffect } from 'react';
import { AppState } from 'react-native';
import { onlineManager } from '@tanstack/react-query';
import { create } from 'zustand';

import { useAuth } from './auth';

const PROBE_MS = 4000;
const RETRY_MS = 20_000;

/**
 * "Offline" here means Jellyfin cannot be reached (no internet, Tailscale down, home lab asleep), which is what matters to the app.
 * While offline the app shows only downloaded music and plays it from the phone.
 */
export const useOffline = create<{ offline: boolean }>(() => ({ offline: false }));
export const isOffline = () => useOffline.getState().offline;

export async function checkConnection() {
  const s = useAuth.getState().session;
  if (!s) return;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), PROBE_MS);
  let offline = false;
  try { await fetch(`${s.serverUrl}/System/Info/Public`, { signal: ctl.signal }); } catch { offline = true; } finally { clearTimeout(timer); }
  if (offline !== useOffline.getState().offline) {
    useOffline.setState({ offline });
    onlineManager.setOnline(!offline);
  }
}

/** Mount once: checks at launch, when the app comes to the foreground, and every so often while offline so it recovers by itself. */
export function useConnectionWatch() {
  const signedIn = useAuth((a) => !!a.session);
  const offline = useOffline((s) => s.offline);
  useEffect(() => {
    if (!signedIn) return;
    checkConnection();
    const sub = AppState.addEventListener('change', (st) => { if (st === 'active') checkConnection(); });
    return () => sub.remove();
  }, [signedIn]);
  useEffect(() => {
    if (!signedIn || !offline) return;
    const t = setInterval(checkConnection, RETRY_MS);
    return () => clearInterval(t);
  }, [signedIn, offline]);
}

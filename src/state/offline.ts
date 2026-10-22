import { useEffect } from 'react';
import { AppState } from 'react-native';
import { onlineManager } from '@tanstack/react-query';
import { create } from 'zustand';

import { watchReach } from '../api/jellyfin';
import { getConnMode, setConnModePref, type ConnMode } from '../storage/prefs';
import { useAuth } from './auth';

const RETRY_MS = 20_000;

/**
 * "Offline" here means Jellyfin cannot be reached (no internet, Tailscale down, home lab asleep), which is what matters to the app.
 * While offline the app shows only downloaded music and plays it from the phone.
 */
export const useOffline = create<{ offline: boolean; mode: ConnMode }>(() => ({ mode: getConnMode(), offline: getConnMode() === 'offline' }));
export const isOffline = () => useOffline.getState().offline;
onlineManager.setOnline(!useOffline.getState().offline); // a forced Offline mode from the last session applies from the first request

function setOffline(offline: boolean) {
  if (offline === useOffline.getState().offline) return;
  useOffline.setState({ offline });
  onlineManager.setOnline(!offline);
}

// Any real request that gets an answer proves the server is up, whatever the last check said (unless you forced offline mode).
watchReach((ok) => { if (ok && useOffline.getState().mode === 'auto') setOffline(false); });

/** Settings: Auto follows the connection, Online / Offline force it. */
export function setConnMode(mode: ConnMode) {
  setConnModePref(mode);
  useOffline.setState({ mode });
  if (mode === 'auto') checkConnection(); else setOffline(mode === 'offline');
}

/** Pings the server with the same login the app uses; two misses in a row (a blip is not "offline") flips to offline. */
export async function checkConnection() {
  const { mode } = useOffline.getState();
  if (mode !== 'auto') return setOffline(mode === 'offline');
  const client = useAuth.getState().client;
  if (!client) return;
  let ok = await client.ping();
  if (!ok) { await new Promise((r) => setTimeout(r, 1500)); ok = await client.ping(); }
  setOffline(!ok);
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

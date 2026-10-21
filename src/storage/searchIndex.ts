import Storage from 'expo-sqlite/kv-store';

import type { JfItem } from '../api/types';

const KEY = 'searchIndex';
const MAX_AGE_MS = 24 * 60 * 60_000;

export interface SavedIndex { userId: string; at: number; songs: JfItem[]; albums: JfItem[] }

export async function loadIndex(userId: string): Promise<SavedIndex | undefined> {
  try {
    const raw = await Storage.getItem(KEY);
    const v = raw ? (JSON.parse(raw) as SavedIndex) : undefined;
    return v && v.userId === userId ? v : undefined;
  } catch { return undefined; }
}

export function saveIndex(v: SavedIndex) { Storage.setItem(KEY, JSON.stringify(v)).catch(() => {}); }
export const isFresh = (v: SavedIndex) => Date.now() - v.at < MAX_AGE_MS;

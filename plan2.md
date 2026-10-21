# Plan 2 — Fixes & Improvements

Source: `fixes-and-fixes-cleaned.md`. Nothing here is implemented yet. Per project rule, no git add/commit/push or CI triggers without explicit permission.

## What I found in the code (relevant to the plan)

- **No persistent cache.** `App.tsx` creates a bare `QueryClient` (`staleTime: 60s`, `retry: 1`) with no persister. Every cold start refetches playlists, albums and playlist tracks (collages in `PlaylistCover` run one `playlistTracks` query per playlist).
- **No timeouts.** `JellyfinClient.req` (`src/api/jellyfin.ts`) uses plain `fetch` with no timeout or abort. If the home lab or Tailscale is mid-reconnect, requests hang for a long time. This is the likely cause of the "30 seconds, then it works" behaviour.
- **No AppState handling.** Nothing reacts to foreground/background. There is no connectivity check and no reconnect logic.
- **Session is read from SecureStore at boot.** This is fine, but the UI shows a blank screen (`booting`) until it resolves, then everything fetches.
- **Playback.** `src/player/setup.ts` and `service.ts` use react-native-track-player (RNTP) and register the remote events. `NowPlayingScreen` treats `state === State.Playing` as "playing", so Buffering/Loading/Stopped/Error all render as "paused". The stream URL is `/Audio/{id}/stream?static=true&ApiKey=token`, with no retry if the connection died while the phone slept.
- **Queue.** `playNow` adds all tracks and calls `play()`. `skipTo` calls `play()`. The lock-screen/remote handlers call `skipToNext()` with no `play()`. Repeat modes are Off/Queue/Track, defaulting to Off. The playlist context (id/type) is not stored, only `ctxName`.
- **"Spirit"** is not in the source; the app-side fix is the same-art rule in §4. Jellyfin data fixes (tracks, metadata, Clips cover) are out of scope.

## Phase 0 — Diagnose first (no behaviour changes)

1. Add temporary timing logs around boot, `/playlists`, and the first image loads. Reproduce "background, reopen" to confirm where the delay is (JS reload vs. hung fetch vs. refetch storm).
2. Log `usePlaybackState()` transitions and the active track while locked. Confirm what state the player is in when Pause greys out.

## Phase 1 — Startup, caching, reconnection (highest priority)

1. **Persist the query cache.** Use `@tanstack/query-async-storage-persister` and `PersistQueryClientProvider`, backed by the existing `expo-sqlite/kv-store`. Set `gcTime` to about 7 days, add a cache `buster` tied to the userId/server, and persist only library queries (playlists, albums, playlist tracks).
2. **Render from cache immediately.** Make `booting` non-blocking so cached data paints on the first frame. Refresh in the background with stale-while-revalidate.
3. **Network timeouts.** Add an `AbortController` timeout (about 8s) to `JellyfinClient.req`, with a clear "server unreachable" state. Use `networkMode: 'offlineFirst'` and suppress error UI when cached data exists.
4. **Lifecycle.** Add an `AppState` listener wired to React Query's `focusManager`, and a lightweight `/System/Ping` check before refetching on foreground. Debounce so reopening does not trigger duplicate full refreshes.
5. **Art caching.** `expo-image` already uses `cachePolicy="disk"`. Verify that image URLs are stable (no changing tokens) and add prefetching for visible covers. Fix the `PlaylistCover` collage so it does not refetch every playlist on launch. Persist the collage album IDs, or cache the composed cover.
6. **Auth reuse.** Keep the stored token. Only sign out on a confirmed 401, never on a timeout.

**Verify:** background and reopen 5× quickly. Airplane mode or Tailscale off, then cold start (library should show, art should show). Home lab back on (data refreshes silently).

## Phase 2 — Playback & lock-screen controls

1. **Pause greyed out.** Likely causes, in order of suspicion:
   - The stream stalled or died while the phone slept, so the player is in Buffering/Loading/Error and the OS shows the transport as disabled.
   - Missing `Capability.Stop` or `JumpForward`/`JumpBackward` options, or stale `updateOptions`.
   - The headless service not being registered after a JS reload. Check `index.ts` calls `TrackPlayer.registerPlaybackService`.
   
   Fix: handle `Event.PlaybackError` and `PlaybackState` Error/Stopped, so it retries the current track at the saved position. Treat Buffering/Loading as "playing intent" in the UI (read `playWhenReady`). Re-call `updateOptions` after (re)setup. Confirm `UIBackgroundModes: audio` (already present in `app.json`) survives the prebuild.
2. **Autoplay on skip.** Track `playWhenReady` and call `play()` after `skipToNext/Previous`, in both the in-app buttons and the remote handlers in `service.ts`.
3. **Loop playlist.** On `Event.PlaybackQueueEnded`, if repeat is Off, skip to 0 and play, since you want it to loop. Better: default repeat to Queue for playlist playback. Keep hand-queued songs and shuffle behaving (reshuffle on wrap if shuffle is on). Needs your call on whether looping should apply to albums too (see Questions).

**Verify (needs a real device):** lock the phone, wait 2+ min, pause/play from the lock screen. Skip tracks. Let a short playlist reach the end.

## Phase 3 — UI

1. **Playback context + clickable Now Playing.** Store `{ type: 'playlist' | 'album', id, name }` in `usePlayer` when `playNow` is called. On Now Playing, tapping the artwork or the "playing from" label opens that playlist or album. Fall back to the track's `albumId` when there is no context. If the context is a playlist, the album stays reachable from the track menu.
2. **Artist page.** Add an `Artist` screen and route, linked from `AlbumArtist` in the album/song rows. Hero image (Jellyfin artist image, or the first album art as a fallback), name, a Play/Shuffle button, a "Popular" list, and albums grouped below. Jellyfin has no real popularity data, so use play count (`UserData.PlayCount`) if present and otherwise omit "Popular". No invented bios.

## Phase 4 — Covers

1. **Same-art rule (done, `src/ui/PlaylistCover.tsx`).** If the first 4 songs of a playlist have identical cover art, the playlist shows that one image instead of a collage. Art is compared by image content (fingerprint of the 160px image), not by album id, because items like Spirit's have different ids with the same picture. Custom covers still win. Unverified on device.

## Order of work

1. Phase 0 diagnosis
2. Phase 1 caching/startup
3. Phase 2 playback
4. Phase 3 UI
5. Phase 4 covers

## Questions for you

1. Should "loop at end" apply only to playlists, or also to albums and single-song plays?
2. Which device or build do you test on? Lock-screen and background fixes can only be verified on a real device build, which means a CI/EAS build. I will not trigger one without your permission.

## Not verifiable here

Lock-screen controls, backgrounding and reconnect behaviour cannot be tested in a simulator or by me. I will mark them "implemented, unverified" until you test on a device.

## Status (implemented, none of it verified on a device)

- Phase 1: query cache persisted to sqlite (`src/storage/queryCache.ts`), 10s request timeout, AppState -> focusManager, cache shown first.
- Phase 2: `src/player/controls.ts` (skip keeps playing, wraps at the ends, `useIsPlaying`, `recoverPlayback`); queue-end loops to the top; remote next/previous use the same code; playback errors retry.
- Phase 3: `ctx` stored on play; Now Playing "playing from" and artist name are tappable; new `ArtistScreen`.
- Phase 4: same-art rule. Unown icons dropped (handled in Jellyfin).
- Not done: Phase 0 logging.

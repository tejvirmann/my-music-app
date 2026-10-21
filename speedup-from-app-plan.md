# Speed-up from the app — plan

Goal: make my-music-app put less load on Jellyfin and feel faster. Based on reading `src/api/jellyfin.ts`, `SearchScreen.tsx`, `PlaylistCover.tsx`, `HomeScreen.tsx`, `LibraryScreen.tsx`, `App.tsx` and `src/storage/queryCache.ts`. Nothing here is implemented yet. Per project rule: no git add/commit/push or CI builds without explicit permission.

The server-side plan is in `/Users/tejvirmann/Documents/homelab/jellyfin-speedup-plan.md`. The server DB is the main bottleneck, so every request the app avoids helps.

## What I found

1. **Search index downloads the whole library every cold start.** `useIndex()` runs `allSongs()` and `allAlbums()` (pages of 2,000, with `Genres,ProductionYear`, `SortBy=SortName`) as soon as the Search tab mounts. `songIndex` and `albumIndex` are deliberately not persisted (`queryCache.ts`), so each app launch pulls ~5k songs through the server's DB. The `SortBy` forces a sort on the server for no benefit, since the phone does the matching.
2. **One `playlistTracks` request per playlist cover.** `PlaylistCover` runs `client.playlistTracks(id)` with no limit (the entire playlist) just to read the first 4 tracks. It renders on Home tiles, the Library list and Search, so opening the app can fire dozens of full-playlist queries. Those results are persisted too (`'playlist'` is in `PERSISTED`), so the on-disk cache is large and gets re-serialised on changes.
3. **`sameArt` downloads 4 images per playlist with raw `fetch`**, outside expo-image's cache, then hashes every byte in JS (FNV loop). It is cached forever once computed, but the first run per playlist is heavy.
4. **Image URLs have no `tag` parameter** (`imageUrl()`), so Jellyfin cannot mark them as long-cacheable and clients may revalidate. Resized images are generated per size bucket, which is fine.
5. **List queries ask for more than they use.** Home/Library/Artist queries do not set `Fields`, `EnableUserData`, `EnableImages` or `EnableTotalRecordCount=false`. Paged and "latest N" queries pay for a COUNT query on SQLite every time.
6. **Everything goes stale after 60 s** (global `staleTime`), and a foreground event refetches all active queries. Library data that rarely changes is refetched constantly.
7. **`scanMetadata()` (Metadata screen)** loads every song and album in pages of 500 with `ProviderIds`, two big lists in parallel. `refreshMetadata(FullRefresh)` makes the server re-fetch from the internet (MusicBrainz), which is the slow path. Both are user-triggered, but easy to trigger repeatedly.

## Phase 1 — Cut requests (biggest win, low risk)

1. **Playlist covers:** call `/Playlists/{id}/Items` with `limit=4` (and `Fields=` minimal) for the cover query, with its own key (`['playlistCover', id]`). Only the playlist screen should fetch the full list. Keep `staleTime` long (hours) for covers.
2. **Search index:** drop `SortBy`; persist the index to expo-sqlite (a table, not the JSON query cache) and refresh it incrementally. On launch, show the saved index immediately, then do one cheap `Limit=1` check and compare `TotalRecordCount` (and the newest `DateCreated`) before re-downloading. Fetch the index only when the Search tab is first opened, not at app start.
3. **Minimal queries:** add `EnableTotalRecordCount=false` to the "latest N", `recentSongs`, `recentAlbums` and search calls. Add `EnableUserData=false` and `EnableImages=false` where art comes from `imageUrl()` anyway. Set explicit `Fields` everywhere.
4. **Query freshness:** raise `staleTime` for `albums`, `playlists`, `playlist`, `album` to about 10–30 min. Invalidate explicitly after the app's own writes (create/add/remove playlist), which it already does in places. Pull-to-refresh stays as the manual override.

**Verify:** count requests on a cold start before and after (Jellyfin log lines, or a temporary counter in `req`). Target: a cold start with a warm cache sends only a handful of requests.

## Phase 2 — Images

1. Add `&tag=<ImageTags.Primary>` to `imageUrl()` where the item has the tag (needs `ImageTags` in responses; or `PrimaryImageTag`). Lets Jellyfin send long cache headers and lets expo-image trust its disk cache.
2. Replace the raw `fetch` fingerprinting in `PlaylistCover`: use the album ids' `ImageTags` (or the first track's `AlbumPrimaryImageTag`) to decide "same art", instead of downloading pixels. Fall back to the current fingerprint only when tags are missing, and cap it to once per playlist.
3. Use `Image.prefetch` for the visible first screen of covers only; avoid prefetching whole lists.
4. Consider `format=webp` / lower `quality` (75) for 160px thumbnails.

## Phase 3 — Lighter UI

1. `SongRow` calls `useDownloadedTracks()` and `usePlayer(...)` per row. Make these selectors return a primitive for that one track (a boolean), so a download or track change does not re-render every row.
2. `LibraryScreen` album grid: set `getItemLayout` (fixed row height), `windowSize`, `initialNumToRender`, and use `React.memo` on the row components. Page size 200 is fine.
3. Persisted cache: stop persisting full `playlist` track lists. Persist only what the first screen needs (playlists, recentAlbums, recentSongs, `playlistCover`). Pass `throttleTime` (e.g. 5000) to the persister so large JSON is not rewritten on every change.
4. Replace the Metadata screen's two parallel full scans with sequential, cancellable paging, and show a warning before `FullRefresh` that it contacts the internet and is slow.

## Phase 4 — Playback

1. Streaming is already `static=true` (direct, no transcode). Keep it. Make sure the server never transcodes music by sending a device profile if any format is rejected.
2. Consider preloading the next track (RNTP queue already holds it; check buffer settings in `setup.ts`).
3. Check `useRecordPlays` / `useQueueSync` do not post to Jellyfin on every progress tick (only on start/stop/every ~10 s).

## Order of work

1. Phase 1.1 (playlist cover limit) and 1.2 (search index persistence) — these two likely remove most of the load
2. Phase 1.3–1.4
3. Phase 2
4. Phase 3
5. Phase 4

## How to tell it worked

- Temporary request counter/logging in `JellyfinClient.req` (path + ms). Compare cold-start counts and slowest requests before and after.
- Jellyfin log: no more bursts of `GetItemList` for every playlist at launch.
- Subjective: Home paints from cache instantly; Search is usable on first open.

## Related

The server-side half of this work (turn off MusicBrainz/AudioDB/Fanart fetchers, stop scheduled scans, move the Jellyfin config/DB off NFS, give the pod resources) is in `/Users/tejvirmann/Documents/homelab/jellyfin-speedup-plan.md`. Do that plan first or alongside this one: the app changes reduce load, but the database on NFS is the main bottleneck.

## Not verifiable here

Real-device timings, scroll performance and lock-screen behaviour need a device build. I will mark those "implemented, unverified" until you test.

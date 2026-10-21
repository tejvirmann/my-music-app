# Plan 3 — Unown covers, default-cover settings, search follow-ups

Follows `plan.md` and `plan2.md`. Per project rule: no git add/commit/push or CI builds without explicit permission. Nothing in the "To do" sections exists yet. The "Already done" items are in the working tree but not verified on a device.

## Already done (since plan 2)

| Item | Where | State |
|---|---|---|
| Now Playing: tap the artist or "playing from" to open the artist / playlist / album | `NowPlayingScreen.tsx`, `navigation/ref.ts` | Fixed. The old code navigated 50 ms after dismissing the modal, so the push was dropped. It now waits 500 ms and retries once. Each artist of a multi-artist song is its own link, and the links are underlined. **Unverified on device.** |
| Artist pages | `ArtistScreen.tsx` | Already existed (hero, play/shuffle, Popular, albums, all songs). |
| Better search | `src/search.ts`, `SearchScreen.tsx` | Done, see below. |
| Search type buttons (all / songs / albums / playlists) and "see all N" | `SearchScreen.tsx` | Done. |
| Search inside one playlist | `PlaylistScreen.tsx` | Done. Box appears on playlists with more than 6 songs. |
| Speed-up: fewer Jellyfin requests, saved search index, cheap playlist covers | `jellyfin.ts`, `searchIndex.ts`, `PlaylistCover.tsx`, `queryCache.ts` | Done and shipped in v0.1.1 / v0.1.2. |
| Search index notices a delete + add (fingerprint of total + newest item) | `SearchScreen.tsx` | Done, v0.1.2. |
| Covers: only tracks with real art feed the collage; no art at all gives a coloured tile with the playlist's initial | `PlaylistCover.tsx` | Done, uncommitted. |

### Has Spotify-style search been added?

Partly, and the matching part is done.

Done:
- Ignores case, accents and punctuation (`beyonce` finds Beyoncé, `dont stop` finds Don't Stop Believin').
- Matches the start of any word and the middle of words, and joined words (`lovestory`).
- Tolerates typos (`bohemain rapsody` finds Bohemian Rhapsody).
- Exact matches first, typo matches only added when exact ones are few.
- Searches songs, albums and playlists, with a type filter.

Not done (Spotify has these):
- An **Artists** section in results (tap to open the artist page).
- A **Top result** row.
- **Recent searches**.

### Your questions about search

- **"Do I need a filter box in the Library tab?"** No. The Search tab searches the whole library. The Library tab's albums load 200 at a time, so a filter there would miss unloaded albums.
- **"If I type a playlist name, does it show up?"** Yes, under Playlists. The same fuzzy matching applies, so `chil` or a typo still finds it.
- **"If I search a song, does a playlist it's in show up?"** No. Playlists match on their name only. See Phase C.

## To do

### Phase A — Unown icons as the default for unknown playlists

Source: `~/Desktop/unknown.png`, 1200×491, black glyphs on white, 28 Unown (A–Z, then `!` and `?`) in three rows of 10, 9 and 9.

1. **Crop script** `scripts/crop-unown.py` (run once, output committed):
   - Make the image a black/white mask, find the three rows by the blank bands between them, then split each row into glyphs at the blank columns between letters.
   - Glyphs like `i` and `!` have detached parts, so use a minimum gap width and check that exactly 10 / 9 / 9 pieces come out. Print a contact sheet to eyeball.
   - Save 28 square transparent PNGs at 256 px, padded, to `assets/unown/a.png` … `z.png`, `bang.png`, `question.png`.
   - Stored as black-on-transparent so the app can tint them for dark mode.
2. **`src/unown.ts`**: a static `require` map (Metro needs literal paths) and `unownFor(name)`.
3. **Picking which one:**
   - Default: the playlist's first letter picks the matching Unown, so "Spirit" gets S. Digits and symbols get `!` or `?`.
   - Alternative: a stable random pick from the playlist id.
4. **Render:** in `PlaylistCover.tsx`, replace the coloured initial tile with the Unown glyph, tinted, on a steady per-playlist background colour. Use the same crop everywhere (cover, sheets, mini rows).
5. **Precedence:** custom cover for that playlist → real art → Settings default (Phase B) → Unown → initial tile.

### Phase B — Default covers in Settings

New **Default covers** section in `SettingsScreen.tsx`, stored locally like `state/covers.ts` (pick from photos, square crop, copy into app storage, new filename each time so caches refresh).

| Slot | Used when | Setting |
|---|---|---|
| Clips | the playlist named "Clips" (voice clips etc.) | pick image / reset |
| Unknown playlists | a playlist has no art on any track | pick one image for all, or **Unown on/off** |
| Known playlists | see question 2 | pick image / reset |
| Cover (songs / albums) | a song or album has no art (`Art.tsx` placeholder) | pick image / reset |

- **Unown toggle:** turns the Unown auto-cover off. If off, the unknown slot's single image applies, and if none is set the plain initial tile shows.
- **Single image:** "just set one image as the default for that playlist" is kept as the existing per-playlist custom cover (⋯ menu). The unknown slot is the same idea for all unknown playlists at once.
- **Code:** new `src/state/defaultCovers.ts` (zustand + kv-store), new `Section` in Settings, read in `PlaylistCover.tsx` and `Art.tsx`.

### Phase C — Search follow-ups

1. **Artists section** in results: distinct artists matched by name, each opening `ArtistScreen`. Built from the existing index, so no new requests.
2. **Playlists containing a song** (the part Search can't do today):
   - Needs each playlist's track list. That is one request per playlist, so build it lazily: when Search opens, fetch each playlist's `Items` (ids only, no images or user data) once, save it like `searchIndex`, and refresh only when the playlist list or a playlist's `ChildCount` changes.
   - Then a song result shows "in: Gym, Chill" as chips, and a playlist matches if it contains a matching song (shown under Playlists with a "contains ‘Love Story’" note).
   - Cost: N requests on first run, then almost none. Fine for tens of playlists, heavy for hundreds.
3. **Top result** row and **recent searches** (small, local).

## Order of work

1. A (crop and Unown covers), because B depends on it.
2. B (Settings).
3. C1 (artists in search), then C2 if you want it.
4. Commit, tag (`v0.1.3` or later), pull the build with `scripts/download-latest-build.sh`. Only on your say-so.

## Questions for you

1. Unown pick: first letter of the playlist name, or a stable random one?
2. "Known playlists" default: do you mean playlists that *have* art (an override for all of them)? Or a fallback for playlists the app knows about but whose art failed to load? Which slot did you mean by "cover" and "known"?
3. Should the Clips slot match the playlist named "Clips" exactly, or a name you type in Settings?
4. Playlist-contains-song search: do you want it, given the extra requests on first run?

## Decisions

- The "known playlists" slot is dropped. In its place there is one global default for songs and albums with no art (`Art.tsx`).
- Unown pick is by the playlist's first letter.
- The Clips slot matches a playlist named "Clips" (case-insensitive), and applies only when the playlist has no art.
- Playlist-contains-song search: yes.

## Status (implemented, none of it verified on a device)

- Phase A: `scripts/crop-unown.py` cut `~/Desktop/unknown.png` into 28 glyphs in `assets/unown/` (the sheet is 10 / 9 / 9 glyphs per row). `src/unown.ts` maps a name to its glyph. `PlaylistCover.tsx` draws it, tinted white, on a per-playlist colour.
- Phase B: Settings → Default covers: songs/albums with no art, Clips, Unown on/off, one image for unknown playlists. Stored in `state/covers.ts` under `default:*` keys; the toggle is in `state/settings.ts`.
- Phase C: Artists section and filter in Search. Song rows show "in <playlist>" chips. Playlists that contain a matching song are listed under Playlists with "has “<song>”". Membership comes from `playlistIds()`, fetched once per playlist on first search and saved.
- Not done: Top result, recent searches.

## Not verifiable here

Everything visual (Unown crop quality, tint in dark mode, Settings layout) and the Now Playing navigation need a device build. I will mark them "implemented, unverified" until you test.

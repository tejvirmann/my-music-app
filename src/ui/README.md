# src/ui — visual layer (owned by the UI session)

Everything visual should live here so it can be restyled without touching app logic.

- `index.tsx` — theme `colors`, shared `s` styles, and primitives: `Btn`, `Row` (with swipe-right + download badge), `DownloadBadge`, `Empty`, `fmt`.
- `MiniPlayer.tsx`, `PlaylistPicker.tsx` — composite components.
- Screens live in `src/screens/*` and currently mix layout with behavior. The UI session may restyle/restructure
  them freely, but keep the behavior wired as-is.

## Don't change (logic)
`src/api/*`, `src/player/*`, `src/downloads.ts`, `src/downloadActions.ts`, `src/state/*`, `src/storage/*`.

## Behavior the UI must keep
- Swipe a track row right → add to queue (`Row.onSwipeRight`).
- Download state: green ↓ badge on downloaded tracks/playlists (`useDownloadedTracks`, `useDownloadedPlaylists`, `useDownloadProgress`).
- Library tab = Playlists | Albums. Playlists: pinned first (local), long-press menu: Pin / Download or Remove download / Hide.
- No "delete playlist from Jellyfin" button (deliberately removed).
- Playlist create/edit/reorder/remove-track go to Jellyfin; pin and hide are local to the phone.

## Placeholders to replace
Plain text glyphs for icons (↓ ✓ ↑ ✕), basic colors, no app icon/logo yet (set in app.json), no animations/typography.

## Added later
- `SongRow.tsx` (swipe = queue, ♥ = Liked, long-press menu, download badge), `songMenu.tsx` (long-press menu host).
- Library search (`screens/SearchResults.tsx`): sections Songs / Albums / Playlists, swipe-right queues each.
- Home tab (`screens/HomeScreen.tsx`): Lidarr search + "Add" / "♥ Add". Hidable in Settings.
- Song info (`screens/SongInfoScreen.tsx`): all Jellyfin metadata + "Refresh metadata".

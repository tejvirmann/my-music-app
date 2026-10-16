# UI layer — "Index of sound"

Design source: `mockups/app.html` (clickable) and `mockups/all.html` (every screen).

**Language:** warm paper (light) / near-black (dark), one vermillion accent, hairline borders, square art, DM Mono for text, Instrument Serif italic for headings. Lowercase tab labels. No shadows except on a dragged row.

## Where things live
- `theme.ts` — palette, `useColors()`, `useThemeMode()` (light/dark/system, persisted), font names (`F`).
- `text.tsx` — `Txt` with variants `body | med | mute | small | label | h1 | h2 | h3`. Use it for all text.
- `Icon.tsx` — SVG glyph set. `IconBtn.tsx` — tappable icon.
- `layout.tsx` — `Screen` (safe area, optional `mini` docked player), `Body`, `TopBar`, `Heading`, `Section`, `Pill`, `Button`, `Empty`.
- `rows.tsx` — `ListRow` (60px row), `SwipeRow` (swipe right → queue), `DlDot`, `Eq`.
- `SongRow.tsx` — song row with menu, queue swipe, playing state, offline dot.
- `Sheet.tsx` / `sheets.tsx` — bottom sheet + every action sheet (song, playlist, album, add-to-playlist). Open with `openSongMenu`, `openPlaylistMenu`, `openAlbumMenu`, `openAddToPlaylist`.
- `toast.tsx` — `toast('Added to queue', '#2 up next')`.
- `TabBar.tsx`, `MiniPlayer.tsx`, `Brand.tsx` (in-app logo), `Art.tsx` (cached cover).

## Rules
- No hard-coded colours; use `useColors()`.
- Keep rows a fixed height (`ROW_H`) — queue drag-reorder depends on it.
- Data/logic lives outside this folder (`src/api`, `player`, `downloads*`, `likes`, `state`, `storage`).

## Not built yet (in the mockup)
- Custom playlist cover from photos.
- Offline-first playlist edits that sync later ("↻ N changes waiting").
- Search by label and BPM (Jellyfin doesn't expose them reliably).
- Crossfade / normalize volume / streaming quality / cellular-download toggles (need player work).

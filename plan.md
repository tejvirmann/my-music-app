# Jellyfin Music --- Product & Implementation Plan

**Working name:** Jellyfin Music (rename later)\
**Platform:** iOS first\
**App stack:** React Native + Expo + TypeScript\
**Backend/source of truth:** Existing Jellyfin server\
**Goal:** A fast, highly customizable personal music player with a
distinctive UI, reliable playback, Jellyfin playlist support,
metadata/art enrichment, and a future natural-language agent.

------------------------------------------------------------------------

## 1. Product principles

1.  **Jellyfin remains the source of truth** for the music library,
    server-side playlists, authentication, and media streams wherever
    possible.
2.  **The app owns presentation and playback experience:** custom
    navigation, queue, car mode, caching, and optional local-only
    organization.
3.  **Use official APIs first.** Prefer Jellyfin APIs and supported
    metadata services over brittle HTML scraping. Scraping is a fallback
    only where permitted and necessary.
4.  **Build a thin vertical slice first.** Prove login → browse → play
    before implementing elaborate UI or agent features.
5.  **Keep the app easy to iterate on.** TypeScript, a small number of
    modules, clear types, and an API layer make AI-generated changes
    safer.
6.  **Do not make destructive actions ambiguous.** "Hide" and "delete
    from server" must be distinct actions.

## 2. Feature scope

### MVP / first working prototype

-   Connect to a user-supplied Jellyfin server URL.
-   Sign in using Jellyfin authentication.
-   Persist the server URL and credentials securely.
-   Load albums, artists, tracks, and existing playlists.
-   Show album artwork and basic track metadata from Jellyfin.
-   Play a track and provide play/pause, next/previous, seek, and volume
    where supported.
-   Display a queue and allow adding a track or album to it.
-   Refresh/resync library and playlist data from Jellyfin.
-   Basic loading, empty, offline, and error states.

### Personal-player release

-   Custom home screen and navigation.
-   Playlist creation and editing.
-   Reorder playlist tracks and persist the new order to Jellyfin where
    the server/API supports it.
-   Add/remove tracks from playlists.
-   Queue actions: Play Next, Add to Queue, clear queue, reorder, remove
    item, and play from queue.
-   "Hide playlist" behavior implemented as a local app preference; do
    not delete the Jellyfin playlist.
-   Manual refresh plus refresh-on-open and sensible background refresh
    behavior.
-   Artwork/metadata enrichment with caching and source attribution
    where practical.
-   Search across local cached library data and server results.
-   Favorites and recently played, using Jellyfin data where available.
-   Responsive layouts for compact and large iPhones.

### Daily-driver playback

-   Background audio and audio continuing while the phone is locked.
-   iOS Now Playing/lock-screen metadata and transport controls.
-   Headphone and car Bluetooth controls, including play/pause and
    next/previous.
-   Audio interruption handling (calls, Siri, other audio), route
    changes, and reconnect behavior.
-   Car Mode: large touch targets, simplified screens, high contrast,
    fewer interactions, and easy access to queue/search/favorites.
-   Optional offline downloads, with storage management and clear
    download status.
-   Recovery from network loss and expired credentials.

### Later / post-MVP

-   Natural-language agent: "Play my mellow Punjabi songs," "queue these
    three albums," or "make a road-trip queue."
-   Agent must translate requests into structured actions, show/confirm
    destructive changes, and use the same queue/playlist service as the
    UI.
-   Optional recommendations, smart mixes, richer lyrics, scrobbling,
    and additional metadata providers.
-   Android support if desired.

## 3. Recommended architecture

### App

-   **Expo + React Native + TypeScript**
-   **Expo Router** for navigation, if helpful.
-   **TanStack Query** for API caching, loading/error state, and
    refresh.
-   **Zustand** or a small React context for player/queue UI state.
-   **SQLite** for cached library indexes and local preferences.
-   **SecureStore** for credentials and sensitive connection details.
-   **Audio:** evaluate `expo-audio` for the first playback spike.
    Verify the current iOS background-audio support and limitations
    before committing. If it cannot provide reliable lock-screen
    controls and car/headphone behavior, use a maintained native audio
    module or add a small custom native module via an Expo development
    build. Do not assume Expo Go alone is sufficient for the final audio
    experience.

### Jellyfin integration

Create a dedicated `JellyfinClient` module. It should own:

-   Server URL and authentication/session details.
-   Device/app identification headers required by Jellyfin.
-   Typed wrappers for users, libraries, items, images, playlists,
    playlist contents, and audio stream URLs.
-   Pagination and error handling.
-   API capability checks and compatibility fallbacks.
-   Refresh/invalidation after writes.

Use Jellyfin's API and API documentation/OpenAPI schema as the source of
truth for exact endpoints and request bodies. Do not guess endpoint
behavior, especially for playlist reordering or deletion; verify it
against the server version and test it on a disposable playlist first.

### Data ownership

  -----------------------------------------------------------------------
  Data                    Primary owner           App behavior
  ----------------------- ----------------------- -----------------------
  Music files and library Jellyfin                Browse and stream
  metadata                                        

  Server playlists        Jellyfin                Create/update when
                                                  supported

  Playback queue          App/player session      Local and fast;
                                                  optionally persist
                                                  locally

  Hidden playlists        App-local SQLite        Hide from app without
                          preference              deleting on server

  Artwork/metadata        App cache initially;    Cache source, match,
  enrichment cache        optional helper service and result
                          later                   

  Credentials             iOS secure storage      Never commit to Git

  Agent action history    App-local initially     Keep auditable and
                                                  private
  -----------------------------------------------------------------------

## 4. Playlist and queue behavior

### Playlists

-   Fetch playlists from Jellyfin.
-   Create a playlist on Jellyfin.
-   Add/remove tracks.
-   Reorder tracks and save the order back to Jellyfin when supported by
    the server API.
-   Rename playlists where supported.
-   Hide a playlist locally using a `hiddenPlaylistIds` preference.
-   A hidden playlist remains on Jellyfin and may appear again if the
    user unhides it or resets local app data.
-   If offering true deletion, label it explicitly **Delete from
    Jellyfin** and ask for confirmation. Never interpret "hide" as
    server deletion.

### Queue

Treat the playback queue as a separate concept from a saved playlist.

-   Queue state includes track IDs, current index, repeat mode, shuffle
    mode, and playback position.
-   Support **Play Now**, **Play Next**, **Add to Queue**, **Remove**,
    **Reorder**, **Clear Queue**, and **Save Queue as Playlist**.
-   Queue changes should be immediate in the UI.
-   Avoid relying on the server's playlist order as the live playback
    queue.
-   Define how shuffle and repeat interact with manual reorder and "Play
    Next."

## 5. Sync and refresh strategy

Use explicit, predictable synchronization rather than repeatedly
downloading the entire library.

1.  On app launch, load cached UI data immediately.
2.  Refresh server status/session and request updated data.
3.  On opening a library or playlist, refresh that view when stale.
4.  After a create/update/remove operation, update the UI optimistically
    and invalidate the relevant cached queries.
5.  Provide a manual **Sync now** action with last-successful-sync time
    and a useful error message.
6.  Use server-supported update timestamps or item versions where
    available. Otherwise, refresh the relevant collections
    conservatively.
7.  Do not promise continuous background synchronization: iOS limits
    background execution, so sync should be best-effort and foreground
    refresh must always work.

## 6. Artwork and metadata enrichment

### Preferred order

1.  Use the image and metadata already supplied by Jellyfin.
2.  Query a reputable music metadata API such as MusicBrainz for
    release/artist matching.
3.  Use a compatible cover-art source such as Cover Art Archive where
    applicable.
4.  Add lyrics from a provider only after checking its API terms, rate
    limits, and licensing.
5.  Use web scraping only where permitted and where no stable API is
    suitable.

### Matching and safety

-   Match on artist, album title, release year, track list, and
    identifiers such as MusicBrainz IDs when available.
-   Never silently replace a cover based on a weak match.
-   Show a preview and let the user accept/reject uncertain matches.
-   Cache image URLs and downloaded thumbnails.
-   Respect rate limits, robots/terms, attribution requirements, and
    copyright.
-   Do not scrape sites that prohibit it or bypass access controls.
-   Keep the first version simple: improve album art for a selected
    album before building an automatic whole-library scanner.

### Where enrichment runs

Start with enrichment initiated by the app. If a later feature needs
long-running scans, scheduled jobs, or API keys that should not ship in
the client, add a small optional helper service. Do not add a backend
until the product needs one.

## 7. UI direction

Create a small design system so the UI can evolve without rewriting
playback logic.

### Direction A: Modern minimal

-   Large album artwork, restrained typography, generous spacing.
-   Dark and light themes.
-   A persistent mini-player and fast library search.
-   Clean album, artist, playlist, and queue screens.

### Direction B: iPod Classic-inspired

-   Compact information hierarchy and list-first navigation.
-   Click-wheel-inspired navigation as a visual motif, not a required
    literal hardware simulation.
-   High-contrast monochrome or carefully chosen accent color.
-   Album art and track metadata presented in a nostalgic but readable
    layout.

### Recommendation

Build a functional minimal interface first, but keep navigation and
theme components replaceable. Then prototype an iPod-inspired skin as a
separate design pass. Avoid spending the first day perfecting animation
before playback and playlist operations work.

## 8. Car Mode and Bluetooth

Car Mode should be a simplified in-app interface, not a replacement for
Apple's CarPlay entitlement or integration.

-   Large Play/Pause, Next, Previous, Queue, and Favorites controls.
-   High contrast, large text, minimal screen transitions.
-   Keep the main interaction flow short; avoid complex text entry while
    driving.
-   Support iOS background audio, lock-screen controls, Bluetooth
    headset buttons, and audio route changes.
-   If actual **Apple CarPlay** support is desired later, treat it as a
    separate project with Apple's eligibility, entitlement, and design
    requirements. Do not assume an ordinary app can simply publish a
    CarPlay interface.

## 9. Agent mode design (later)

The agent should not directly manipulate arbitrary app state. Give it a
narrow set of typed tools, for example:

-   `search_tracks(query)`
-   `search_artists(query)`
-   `get_playlist(playlistId)`
-   `get_queue()`
-   `add_to_queue(trackIds, position)`
-   `play_track(trackId)`
-   `create_playlist(name, trackIds)`
-   `reorder_playlist(playlistId, orderedTrackIds)`
-   `hide_playlist(playlistId)`

Require confirmation for server deletion, large-scale edits, or
uncertain matches. Validate all IDs and permissions in normal
application code. The agent should use the same service layer as the UI,
return a summary of actions, and never receive Jellyfin credentials
unnecessarily.

## 10. Repository structure

A practical starting layout:

``` text
jellyfin-music/
  app/
    (tabs)/
    album/[id].tsx
    artist/[id].tsx
    playlist/[id].tsx
    settings.tsx
  src/
    api/
      jellyfin-client.ts
      jellyfin-types.ts
    features/
      library/
      playlists/
      queue/
      player/
      artwork/
    components/
    design/
    storage/
      secure-storage.ts
      database.ts
    state/
    utils/
  assets/
  docs/
    PLAN.md
  .env.example
  README.md
```

Never commit server passwords, access tokens, or personal server URLs to
the repository. Keep secrets out of source control and use local
configuration or secure storage.

## 11. Efficient build sequence

### Phase 0 --- Environment and feasibility spike (10--30 minutes)

-   Create the Expo TypeScript app.
-   Launch it on the iPhone using Expo Go for the initial UI, or a
    development build if required.
-   Add a simple branded home screen.
-   Verify the iPhone can reach the Jellyfin server URL.
-   Check the current audio library/API and background-audio path before
    choosing a player library.

**Success:** app runs on the phone and can reach the server.

### Phase 1 --- Vertical slice (1--3 hours, if setup is ready)

-   Implement server URL entry and Jellyfin authentication.
-   Fetch a few albums and display their artwork.
-   Open an album and list its tracks.
-   Play one track; add play/pause and next/previous.
-   Add clear errors for invalid URL, unreachable server, and
    authentication failure.

**Success:** select an album, play a song, and hear it on the iPhone.

### Phase 2 --- Library and playlists (half day to 1 day)

-   Browse/search albums, artists, tracks, and playlists.
-   Create a playlist and add/remove tracks.
-   Test playlist reorder and verify the exact Jellyfin API behavior.
-   Add local hide/unhide behavior.
-   Add manual sync and cache invalidation.

**Success:** library and playlist changes survive refresh and agree with
Jellyfin.

### Phase 3 --- Queue and visual identity (half day to 1 day)

-   Implement queue actions and queue persistence.
-   Build the mini-player and Now Playing screen.
-   Choose the initial minimal or iPod-inspired visual direction.
-   Add responsive states, loading placeholders, and empty/error
    screens.

**Success:** the app is pleasant enough for a real listening session.

### Phase 4 --- Daily-driver audio (1--3+ days, depending on native work)

-   Validate background audio with the phone locked.
-   Add lock-screen metadata and transport controls.
-   Test Bluetooth buttons, route changes, calls, and app interruptions.
-   Move to a custom Expo development build/native module if needed.
-   Add Car Mode and test in a safe stationary setting.

**Success:** listening continues reliably with the screen locked and
controls work through headphones/car Bluetooth.

### Phase 5 --- Metadata enrichment (1--3 days for a useful first version)

-   Add a user-triggered artwork lookup for one album.
-   Show candidate matches and a preview.
-   Cache approved artwork/metadata and handle API limits.
-   Expand to batch enrichment only after matching quality is proven.

### Phase 6 --- Agent mode (later)

-   Define typed tools and strict validation.
-   Add natural-language intent parsing and execution summaries.
-   Require confirmation for destructive or ambiguous actions.
-   Test against a fake library before enabling real server writes.

## 12. Acceptance checklist

-   [ ] Sign in to a reachable Jellyfin server.
-   [ ] Browse albums and see artwork.
-   [ ] Play, pause, seek, skip, and view the queue.
-   [ ] Add, remove, and reorder queue items.
-   [ ] Load Jellyfin playlists and create a new one.
-   [ ] Reorder playlist tracks and verify the change on the server.
-   [ ] Hide a playlist without deleting it from Jellyfin.
-   [ ] Manually resync and recover from a network failure.
-   [ ] Keep playback going when the screen locks.
-   [ ] Test Bluetooth controls and car audio route changes.
-   [ ] Enrich artwork for a chosen album and review uncertain matches.
-   [ ] Verify no credentials or tokens are committed to GitHub.

## 13. Realistic timing

-   **10 minutes:** Expo project and first screen, assuming tools are
    already installed.
-   **1--3 hours:** a meaningful first prototype with Jellyfin login,
    album browsing, and one-track playback, if the server is reachable
    and no environment issues arise.
-   **1--3 days:** a useful early personal player with library browsing,
    playlists, queue, sync, and an initial custom design.
-   **Several more days or longer:** reliable background audio,
    lock-screen controls, Bluetooth/car behavior, offline downloads, and
    polish.
-   **Later:** agent mode and robust automatic metadata enrichment.

These are estimates, not guarantees. First prove the smallest vertical
slice. Do not implement the agent, broad scraping, offline downloads,
and elaborate animations before the app can reliably sign in and play
music.

## 14. First actions

1.  Confirm your Jellyfin server URL is reachable from the iPhone
    (locally on Wi-Fi and remotely if needed).
2.  Install/use Node.js and create an Expo TypeScript project.
3.  Run it on the iPhone.
4.  Implement the Jellyfin login and album-list screen.
5.  Test playback and background-audio feasibility before investing in
    the final UI.
6.  Commit a working checkpoint to GitHub before each large AI-assisted
    change.

**North star:** get a song playing from your own Jellyfin server as
quickly as possible; then make the player yours.

f I go back to the app, I have to load it a ton. Close the app a few times, then after 30 seconds it starts working again. 
artist page: like Spotify 
When I skip a song have it autoplay
When a playlist ends and reaches the bottom have it start from the top
On the now playingui. I can click the album of playlist being played and it goes to that playlist.maybe…
Clips default cover fix
Missing minmi. 2% wrong and other places
spirit playlist: pick one for each and console so all have one cover and have the playlist cover just the the one cover if they are all the same. 
For unknown playlist : have the unknown pokemon as the default cover. That would be cool. 

important:
When I close my phone and then try to enter the app, it isn’t instantly able to play music like Spotify and it reloads all of the playlists and art and stuff. How does Spotify do it? There isn’t a delay, I have to wait a minute for it to repull everything and reconnect with the home lab in guessing

When I close my phone I can play music but then the pause button grays out; so I can’t pause a song.

can you clean them up for me.

cleaned up version of what I am trying to fix:

another version of my message:

# Music App Bug Fixes & Improvements

Please review the existing React Native + Expo music app and implement the following fixes and improvements. Investigate the existing code and architecture before making changes. Reuse the current Jellyfin integration and avoid unnecessary rewrites.

## 1. Music Library Cleanup

### Incorrect or Missing Songs
- **“I Linger”** — The song should be “Graduation” by Kanye West. Determine whether the existing track can be corrected through Jellyfin metadata or whether I need to provide the correct audio file.
- **“Sugar” by BROCKHAMPTON** — The current track is incorrect. Determine whether it can be replaced or corrected through metadata, or whether I need to provide the correct audio file.
- **The Cranberries — “No Need to Argue”** — Delete this track.
- **Missing tracks:** Find and investigate missing tracks, including Minmi and “2%,” along with any other missing music. Determine whether these tracks are missing from Jellyfin, incorrectly tagged, or simply not appearing in the app.

For the incorrect tracks, don't guess which audio file is correct. Identify the relevant Jellyfin items and report which files or metadata need my input.

## 2. App Startup, Caching & Reconnection

### Slow App Re-entry
Currently, when I return to the app, it sometimes takes multiple attempts to load. After closing and reopening it several times, it may start working again after approximately 30 seconds.

Investigate and fix the underlying cause, including navigation state, app lifecycle handling, Jellyfin connection management, and initialization logic.

### Avoid Full Reloads
When I reopen the app after closing or backgrounding my phone, it reloads playlists, album art, and other library data. It can take up to a minute before everything is usable.

I want the app to behave more like Spotify:
- Display the existing library and playlists immediately when reopening the app.
- Persist cached playlist, album, artist, and track metadata locally.
- Cache album artwork and playlist covers so they don't need to be downloaded again on every launch.
- Reuse valid Jellyfin authentication and connections where possible.
- Refresh data in the background when necessary instead of blocking the UI.
- Handle temporary home-lab or network unavailability gracefully.
- Avoid redundant API requests and duplicate library refreshes.

Investigate the current caching and synchronization implementation first. Implement an appropriate local caching strategy that keeps the app responsive while still allowing it to synchronize changes from Jellyfin.

**Important:** Don't assume that a persistent network connection is necessary to keep the UI usable. The app should be able to display cached content even when the home lab is temporarily unreachable.

## 3. Playback & Background Audio

### Autoplay When Skipping
When I skip to the next track, playback should start automatically if the player was already playing. It shouldn't stop on the next song or require me to press Play again.

### Loop Playlists
When playback reaches the end of a playlist, automatically return to the first track and continue playing.

- Preserve the current playlist context.
- Avoid interrupting playback during the transition.
- Respect any existing shuffle or repeat settings where appropriate.

### Background Playback Controls
When my phone is locked or the app is in the background, music continues playing, but the Pause button becomes grayed out and unusable.

Fix background playback integration so that:
- Play and Pause controls remain functional on the lock screen and in the notification or system media controls, where supported.
- The app correctly reports the current playback state to the operating system.
- Lock-screen controls stay synchronized with the in-app player.
- Playback continues across normal backgrounding and screen-lock events.
- Audio session configuration and remote media controls are set up correctly for the current Expo/React Native audio implementation.

Investigate whether this is caused by the audio library, remote-control event handling, stale playback state, or incorrect background task configuration.

## 4. UI Improvements

### Artist Pages — Spotify-Inspired Design
Redesign artist pages to feel more like Spotify's artist pages while remaining consistent with the app's existing visual style.

Consider:
- Prominent artist artwork or a hero image.
- Artist name and relevant metadata.
- A clear, well-organized list of tracks.
- Popular tracks near the top.
- Albums and releases grouped in a visually clear way.
- Consistent artwork sizing, spacing, and typography.

Use the existing library metadata wherever possible. Don't invent artist biographies or popularity statistics.

### Now Playing — Clickable Album or Playlist
On the Now Playing screen, make the album artwork or album/playlist title clickable.

- If the current track belongs to an album, navigate to that album's page.
- If playback originated from a playlist, provide a way to navigate back to that playlist.
- If both contexts are available, use a sensible interaction that makes the destination clear.
- Ensure the correct album or playlist is opened based on the actual playback context, rather than just the track's metadata.

### Fix the Clips Default Cover
Investigate and correct the default cover artwork used for the Clips section. Ensure the intended cover displays consistently and doesn't get replaced by an incorrect fallback image.

## 5. Playlist Artwork

### Spirit Playlist
For the Spirit playlist:
- Select one appropriate cover for each item that currently needs a cover.
- Ensure every item has the intended cover and that the artwork displays consistently.
- If all items in the playlist share the same cover, use that single image as the playlist cover.
- Avoid unnecessary variations in artwork when the content is intended to share one cover.

Please clarify whether the shared artwork should be applied to individual tracks, the playlist itself, or both based on the existing data model.

### Unknown Playlist — Pokémon-Inspired Default
For playlists with unknown or missing artwork, use an image of the Unknown Pokémon (Unown) as the default cover.

- Apply it only when a playlist doesn't have valid artwork.
- Preserve explicitly assigned artwork.
- Use a consistent image and crop across unknown playlists.
- Make sure the fallback works both in the playlist list and on the playlist detail page.

## 6. Implementation & Verification

Before making changes:
1. Inspect the current player, Jellyfin API client, caching layer, navigation, and audio/background configuration.
2. Identify the root causes of the startup and background-control bugs.
3. Check which fixes require changes to Jellyfin metadata or audio files versus changes to the app itself.

After implementing:
1. Test repeated app backgrounding and reopening.
2. Test playback and Pause controls with the phone locked.
3. Test skipping tracks and reaching the end of a playlist.
4. Verify that cached playlists and artwork appear without waiting for a full library refresh.
5. Test with the home lab temporarily unavailable.
6. Verify navigation from Now Playing to albums and playlists.
7. Confirm that missing or incorrect tracks are reported clearly rather than silently replaced with guesses.

Work incrementally, preserve existing functionality, and report which changes were made, which issues were resolved, and which items require my input.

Don't claim a fix is complete unless it has been tested or clearly identify what remains unverified.

also: 
There is a .png on my desktop with 28 icons for unknown. If this is confusing don't do it. but if a song is 'unknown' then use one of the icons. You are going to have to somehow parse out these icons. This is a bonus thing, not as important as all the other stuff. 

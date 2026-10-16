# My Music

Custom iOS music player for a self-hosted Jellyfin server. React Native + Expo + TypeScript.
See [plan.md](plan.md) for the roadmap.

## Status
Backbone only: login, albums, playlists (create / add / remove / reorder / hide / delete),
queue, Now Playing, offline playlist downloads. Styling is placeholder.

## Develop
Needs a development build (not Expo Go) because of `react-native-track-player`.

    npm install
    npx tsc --noEmit

## Install on iPhone
1. Push a tag (`git tag v0.1.0 && git push --tags`) or run the **Build iOS** workflow manually.
2. Download `MyMusic-unsigned.ipa` from the release/artifact.
3. Install with Sideloadly, AltStore or SideStore using your Apple ID.
   A free Apple ID expires every 7 days; refresh with the same tool.

No credentials are stored in this repo. You enter the server URL and login in the app.

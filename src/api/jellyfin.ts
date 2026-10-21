import type { ItemsResponse, JfItem, Session } from './types';

const CLIENT = 'MyMusic';
const VERSION = '0.1.0';
const REQUEST_TIMEOUT_MS = 10_000;

function authHeader(deviceId: string, token?: string) {
  const base = `MediaBrowser Client="${CLIENT}", Device="iPhone", DeviceId="${deviceId}", Version="${VERSION}"`;
  return token ? `${base}, Token="${token}"` : base;
}

export function normalizeUrl(url: string) {
  let u = url.trim().replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(u)) u = `http://${u}`;
  return u;
}

export async function login(serverUrl: string, username: string, password: string, deviceId: string): Promise<Session> {
  const base = normalizeUrl(serverUrl);
  let res: Response;
  try {
    res = await fetch(`${base}/Users/AuthenticateByName`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': authHeader(deviceId) },
      body: JSON.stringify({ Username: username, Pw: password }),
    });
  } catch {
    throw new Error('Cannot reach server. Check the URL, Wi-Fi/Tailscale, and port.');
  }
  if (res.status === 401) throw new Error('Wrong username or password.');
  if (!res.ok) throw new Error(`Server error ${res.status}`);
  const data = await res.json();
  return { serverUrl: base, token: data.AccessToken, userId: data.User.Id, deviceId };
}

export class JellyfinClient {
  constructor(private s: Session) {}

  private async req<T>(path: string, init: RequestInit = {}): Promise<T> {
    // A sleeping home lab / reconnecting VPN would otherwise leave this hanging for a minute or more.
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), REQUEST_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(`${this.s.serverUrl}${path}`, {
        ...init,
        signal: ctl.signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader(this.s.deviceId, this.s.token),
          ...(init.headers ?? {}),
        },
      });
    } catch {
      throw new Error('Cannot reach server.');
    } finally {
      clearTimeout(timer);
    }
    if (res.status === 401) throw new Error('SESSION_EXPIRED');
    if (!res.ok) throw new Error(`Jellyfin ${res.status} on ${path}`);
    const text = await res.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }

  /** Widths snap to 3 buckets so each image is fetched (and cached) once per size, not once per call site. */
  imageUrl(id: string, maxWidth = 300) {
    const w = maxWidth <= 160 ? 160 : maxWidth <= 320 ? 320 : 640;
    return `${this.s.serverUrl}/Items/${id}/Images/Primary?maxWidth=${w}&quality=85`;
  }

  /** Direct (static) stream: no transcoding, so the server does almost no work. */
  streamUrl(id: string) {
    return `${this.s.serverUrl}/Audio/${id}/stream?static=true&ApiKey=${this.s.token}`;
  }

  albums(startIndex = 0, limit = 100, search?: string, sorted = true) {
    const q = new URLSearchParams({
      IncludeItemTypes: 'MusicAlbum', Recursive: 'true',
      Fields: 'ChildCount,ProductionYear', StartIndex: String(startIndex), Limit: String(limit),
    });
    if (sorted) q.set('SortBy', 'SortName');
    if (search) q.set('SearchTerm', search);
    return this.req<ItemsResponse>(`/Users/${this.s.userId}/Items?${q}`);
  }

  /** Cheap "has the library changed?" probe: one row, just the total. */
  async count(type: 'Audio' | 'MusicAlbum') {
    const q = new URLSearchParams({ IncludeItemTypes: type, Recursive: 'true', Limit: '1', EnableImages: 'false', EnableUserData: 'false' });
    return (await this.req<ItemsResponse>(`/Users/${this.s.userId}/Items?${q}`)).TotalRecordCount;
  }

  albumTracks(albumId: string) {
    const q = new URLSearchParams({
      ParentId: albumId, IncludeItemTypes: 'Audio', SortBy: 'ParentIndexNumber,IndexNumber', Fields: 'Genres,ProductionYear',
    });
    return this.req<ItemsResponse>(`/Users/${this.s.userId}/Items?${q}`);
  }

  searchTracks(term: string) {
    const q = new URLSearchParams({
      IncludeItemTypes: 'Audio', Recursive: 'true', SearchTerm: term, Limit: '50', EnableTotalRecordCount: 'false',
    });
    return this.req<ItemsResponse>(`/Users/${this.s.userId}/Items?${q}`);
  }

  /** Whole song list (paged) for the on-device search index. Only the fields search needs. */
  async allSongs() {
    const out: JfItem[] = [];
    for (let i = 0; ; i += 2000) {
      const q = new URLSearchParams({
        IncludeItemTypes: 'Audio', Recursive: 'true', Fields: 'Genres,ProductionYear',
        StartIndex: String(i), Limit: '2000', EnableImages: 'false',
      });
      const r = await this.req<ItemsResponse>(`/Users/${this.s.userId}/Items?${q}`);
      out.push(...r.Items);
      if (out.length >= r.TotalRecordCount || !r.Items.length) return out;
    }
  }

  async allAlbums() {
    const out: JfItem[] = [];
    for (let i = 0; ; i += 2000) {
      const r = await this.albums(i, 2000, undefined, false);
      out.push(...r.Items);
      if (out.length >= r.TotalRecordCount || !r.Items.length) return out;
    }
  }

  recentAlbums(limit = 20) {
    const q = new URLSearchParams({ IncludeItemTypes: 'MusicAlbum', Recursive: 'true', SortBy: 'DateCreated', SortOrder: 'Descending', Limit: String(limit), EnableTotalRecordCount: 'false' });
    return this.req<ItemsResponse>(`/Users/${this.s.userId}/Items?${q}`);
  }

  recentSongs(limit = 20) {
    const q = new URLSearchParams({ IncludeItemTypes: 'Audio', Recursive: 'true', SortBy: 'DateCreated', SortOrder: 'Descending', Limit: String(limit), EnableTotalRecordCount: 'false' });
    return this.req<ItemsResponse>(`/Users/${this.s.userId}/Items?${q}`);
  }

  /** One request per type so the UI can show Songs / Albums / Playlists sections. */
  async search(term: string) {
    const one = (type: string, limit: number) => {
      const q = new URLSearchParams({ IncludeItemTypes: type, Recursive: 'true', SearchTerm: term, Limit: String(limit), Fields: 'ChildCount', EnableTotalRecordCount: 'false' });
      return this.req<ItemsResponse>(`/Users/${this.s.userId}/Items?${q}`);
    };
    const [songs, albums, playlists] = await Promise.all([one('Audio', 30), one('MusicAlbum', 15), one('Playlist', 10)]);
    return { songs: songs.Items, albums: albums.Items, playlists: playlists.Items };
  }

  /** Artist item by name (Jellyfin keys artists by name). */
  artist(name: string) {
    return this.req<JfItem>(`/Artists/${encodeURIComponent(name)}?userId=${this.s.userId}`);
  }

  albumsByArtist(artistId: string) {
    const q = new URLSearchParams({ IncludeItemTypes: 'MusicAlbum', Recursive: 'true', ArtistIds: artistId, SortBy: 'ProductionYear,SortName', SortOrder: 'Descending' });
    return this.req<ItemsResponse>(`/Users/${this.s.userId}/Items?${q}`);
  }

  /** Every song by the artist, most played first (then A–Z). */
  songsByArtist(artistId: string) {
    const q = new URLSearchParams({ IncludeItemTypes: 'Audio', Recursive: 'true', ArtistIds: artistId, SortBy: 'PlayCount,SortName', SortOrder: 'Descending,Ascending', Fields: 'ProductionYear' });
    return this.req<ItemsResponse>(`/Users/${this.s.userId}/Items?${q}`);
  }

  /** Full metadata for one item (song info screen). */
  item(id: string) {
    const q = new URLSearchParams({ Fields: 'Genres,MediaSources,Path,ProviderIds,ProductionYear,DateCreated' });
    return this.req<JfItem>(`/Users/${this.s.userId}/Items/${id}?${q}`);
  }

  /** Ask Jellyfin to re-read tags and re-fetch metadata/images for an item. */
  refreshMetadata(id: string, replaceAll = false) {
    const q = new URLSearchParams({
      MetadataRefreshMode: 'FullRefresh', ImageRefreshMode: 'FullRefresh', ReplaceAllMetadata: String(replaceAll), ReplaceAllImages: String(replaceAll),
    });
    return this.req<void>(`/Items/${id}/Refresh?${q}`, { method: 'POST' });
  }

  /** Lightweight library-wide scan of what's missing. Pages of 500, only the fields we check. */
  async scanMetadata() {
    const page = async (type: string, fields: string, start: number) => {
      const q = new URLSearchParams({ IncludeItemTypes: type, Recursive: 'true', Fields: fields, StartIndex: String(start), Limit: '500', EnableImages: 'true', ImageTypeLimit: '1', EnableImageTypes: 'Primary' });
      return this.req<ItemsResponse>(`/Users/${this.s.userId}/Items?${q}`);
    };
    const all = async (type: string, fields: string) => {
      const out: JfItem[] = [];
      for (let i = 0; ; i += 500) { const r = await page(type, fields, i); out.push(...r.Items); if (out.length >= r.TotalRecordCount || !r.Items.length) break; }
      return out;
    };
    const [songs, albums] = await Promise.all([all('Audio', 'Genres,ProductionYear,ProviderIds'), all('MusicAlbum', 'Genres,ProductionYear,ProviderIds')]);
    return { songs, albums };
  }

  playlists() {
    const q = new URLSearchParams({ IncludeItemTypes: 'Playlist', Recursive: 'true', SortBy: 'SortName' });
    return this.req<ItemsResponse>(`/Users/${this.s.userId}/Items?${q}`);
  }

  playlistTracks(playlistId: string) {
    return this.req<ItemsResponse>(`/Playlists/${playlistId}/Items?userId=${this.s.userId}`);
  }

  /** First few entries only: enough to draw a cover without pulling the whole playlist. */
  playlistCover(playlistId: string) {
    const q = new URLSearchParams({ userId: this.s.userId, limit: '16', enableImages: 'false', enableUserData: 'false' });
    return this.req<ItemsResponse>(`/Playlists/${playlistId}/Items?${q}`);
  }

  createPlaylist(name: string, trackIds: string[] = []) {
    return this.req<{ Id: string }>('/Playlists', {
      method: 'POST',
      body: JSON.stringify({ Name: name, Ids: trackIds, UserId: this.s.userId, MediaType: 'Audio' }),
    });
  }

  addToPlaylist(playlistId: string, trackIds: string[]) {
    return this.req<void>(`/Playlists/${playlistId}/Items?ids=${trackIds.join(',')}&userId=${this.s.userId}`, { method: 'POST' });
  }

  /** entryIds are PlaylistItemId values, NOT track ids. */
  removeFromPlaylist(playlistId: string, entryIds: string[]) {
    return this.req<void>(`/Playlists/${playlistId}/Items?entryIds=${entryIds.join(',')}`, { method: 'DELETE' });
  }

  moveInPlaylist(playlistId: string, playlistItemId: string, newIndex: number) {
    return this.req<void>(`/Playlists/${playlistId}/Items/${playlistItemId}/Move/${newIndex}`, { method: 'POST' });
  }

  /** Permanent server-side delete. Distinct from hiding. */
  deletePlaylist(playlistId: string) {
    return this.req<void>(`/Items/${playlistId}`, { method: 'DELETE' });
  }
}

export type { JfItem };

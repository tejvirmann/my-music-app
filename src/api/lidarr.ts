export interface LidarrConfig { url: string; apiKey: string }

export interface LidarrAlbum {
  id: number; // 0 = not in Lidarr yet
  title: string;
  foreignAlbumId: string;
  releaseDate?: string;
  albumType?: string;
  images?: { coverType: string; url?: string; remoteUrl?: string }[];
  artist: { artistName: string; id?: number; [k: string]: unknown };
  statistics?: { trackFileCount: number; trackCount: number; percentOfTracks: number };
  [k: string]: unknown;
}

const clean = (u: string) => {
  let x = u.trim().replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(x)) x = `http://${x}`;
  return x;
};

export class LidarrClient {
  private base: string;
  constructor(private c: LidarrConfig) { this.base = clean(c.url); }

  private async req<T>(path: string, init: RequestInit = {}): Promise<T> {
    let res: Response;
    try {
      res = await fetch(`${this.base}/api/v1${path}`, { ...init, headers: { 'Content-Type': 'application/json', 'X-Api-Key': this.c.apiKey } });
    } catch { throw new Error('Cannot reach Lidarr. Check the URL and that you are on the home network / Tailscale.'); }
    if (res.status === 401) throw new Error('Lidarr rejected the API key.');
    if (!res.ok) throw new Error(`Lidarr ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const text = await res.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }

  test() { return this.req<{ version: string }>('/system/status'); }

  lookupAlbums(term: string) { return this.req<LidarrAlbum[]>(`/album/lookup?term=${encodeURIComponent(term)}`); }

  /** Monitor the album and tell Lidarr to search for it now. Uses the first quality/metadata profile and root folder. */
  async addAlbum(album: LidarrAlbum) {
    const [roots, quality, metadata] = await Promise.all([
      this.req<{ path: string }[]>('/rootfolder'),
      this.req<{ id: number }[]>('/qualityprofile'),
      this.req<{ id: number }[]>('/metadataprofile'),
    ]);
    if (!roots[0] || !quality[0] || !metadata[0]) throw new Error('Lidarr has no root folder / quality profile / metadata profile configured.');
    return this.req('/album', {
      method: 'POST',
      body: JSON.stringify({
        ...album,
        monitored: true,
        anyReleaseOk: true,
        addOptions: { searchForNewAlbum: true },
        artist: {
          ...album.artist,
          qualityProfileId: quality[0].id,
          metadataProfileId: metadata[0].id,
          rootFolderPath: roots[0].path,
          monitored: true,
          addOptions: { monitor: 'none', searchForMissingAlbums: false },
        },
      }),
    });
  }
}

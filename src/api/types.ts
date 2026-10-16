export interface Session {
  serverUrl: string;
  token: string;
  userId: string;
  deviceId: string;
}

export interface JfItem {
  Id: string;
  Name: string;
  Type: string;
  AlbumArtist?: string;
  Album?: string;
  AlbumId?: string;
  Artists?: string[];
  RunTimeTicks?: number;
  IndexNumber?: number;
  ChildCount?: number;
  PlaylistItemId?: string; // only on playlist entries; needed for remove/move
  ImageTags?: { Primary?: string };
  // Detail fields (only present when requested via Fields=...)
  Genres?: string[];
  ProductionYear?: number;
  ParentIndexNumber?: number;
  Path?: string;
  ProviderIds?: Record<string, string>;
  MediaSources?: {
    Container?: string; Size?: number; Bitrate?: number;
    MediaStreams?: { Type: string; Codec?: string; BitRate?: number; SampleRate?: number; Channels?: number; BitDepth?: number }[];
  }[];
}

export interface ItemsResponse {
  Items: JfItem[];
  TotalRecordCount: number;
}

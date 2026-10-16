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
}

export interface ItemsResponse {
  Items: JfItem[];
  TotalRecordCount: number;
}

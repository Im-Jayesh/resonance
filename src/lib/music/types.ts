export interface SongMetadata {
  id: string;
  title: string;
  artist: string;
  album?: string;
  coverArt?: string;
  duration?: number;
  lyrics?: string;
  previewUrl?: string;
}

export interface MusicProvider {
  searchSongs(query: string): Promise<SongMetadata[]>;
  getSong(id: string): Promise<SongMetadata>;
  getLyrics(id: string): Promise<string>;
  getStreamUrl(id: string): Promise<string>;
}

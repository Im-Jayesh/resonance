import { MusicProvider, SongMetadata } from "../types";

export class MusicApiAdapter implements MusicProvider {
  // Broad list of instances with different hosting providers
  private instances = [
    "https://saavn.dev",
    "https://saavn.sumit.co",
    "https://jiosaavn-api-v3.vercel.app",
    "https://jiosaavn-api-privatecvc2.vercel.app",
    "https://jiosaavn-api.vercel.app",
    "https://jiosaavn-api-sigma-six.vercel.app",
    "https://jiosaavn-apix.arcadopredator.workers.dev"
  ];

  private async fetchWithRetry(path: string, options: RequestInit = {}): Promise<any> {
    // Attempt instances in sequence with a faster timeout per attempt
    for (const instance of this.instances) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000); // 4s per instance

      try {
        // Try both /api/path and /path since different instances have different bases
        const pathsToTry = path.startsWith("/api") ? [path, path.replace("/api", "")] : [path, `/api${path}`];
        
        for (const p of pathsToTry) {
          try {
            const url = `${instance}${p}`;
            console.log(`🎵 Music API: Trying ${url}`);
            const res = await fetch(url, { ...options, signal: controller.signal });
            
            if (res.ok) {
              const data = await res.json();
              // Check if the data structure is what we expect (success: true or status: 200)
              if (data.success || data.status === 200 || data.results || data.data) {
                clearTimeout(timeoutId);
                return data;
              }
            }
          } catch (e) {
            // inner try failed, continue to next path or outer loop
          }
        }
      } catch (error: any) {
        console.warn(`⚠️ Music API: Instance ${instance} failed:`, error.message);
      } finally {
        clearTimeout(timeoutId);
      }
    }
    
    throw new Error("All Music API instances failed or timed out.");
  }

  private extractArtist(item: any): string {
    if (item.primaryArtists) return item.primaryArtists;
    if (item.singers) return item.singers;
    if (item.artist) return item.artist;
    if (Array.isArray(item.artists?.primary)) {
      return item.artists.primary.map((a: any) => a.name).join(", ");
    }
    return "Unknown Artist";
  }

  async searchSongs(query: string): Promise<SongMetadata[]> {
    try {
      const data = await this.fetchWithRetry(`/api/search/songs?query=${encodeURIComponent(query)}`);

      const results = data.data?.results || data.results || data.response || [];

      if (!Array.isArray(results)) return [];

      return results.map((item: any) => ({
        id: item.id || item.song_id,
        title: item.name || item.title,
        artist: this.extractArtist(item),
        album: item.album?.name || item.album,
        coverArt: this.extractImageUrl(item),
        previewUrl: this.extractDownloadUrl(item),
        duration: item.duration ? parseInt(item.duration) : undefined,
      }));
    } catch (error) {
      console.error("❌ Music API search failed:", error);
      // As a last resort, try iTunes API for metadata (highly reliable)
      return this.fallbackSearchITunes(query);
    }
  }

  private extractImageUrl(item: any): string {
    const images = item.image || item.img;
    if (Array.isArray(images)) {
      return images[images.length - 1]?.link || images[images.length - 1]?.url || "";
    }
    return typeof images === "string" ? images : "";
  }

  private extractDownloadUrl(item: any): string {
    const urls = item.downloadUrl || item.download_url;
    if (Array.isArray(urls)) {
      return urls[urls.length - 1]?.link || urls[urls.length - 1]?.url || "";
    }
    return typeof urls === "string" ? urls : "";
  }

  private async fallbackSearchITunes(query: string): Promise<SongMetadata[]> {
    try {
      console.log("🍏 Music API: Using iTunes fallback...");
      const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=10`);
      const data = await res.json();
      return data.results.map((item: any) => ({
        id: `itunes-${item.trackId}`,
        title: item.trackName,
        artist: item.artistName,
        album: item.collectionName,
        coverArt: item.artworkUrl100.replace("100x100", "600x600"),
        previewUrl: item.previewUrl,
        duration: Math.floor(item.trackTimeMillis / 1000),
      }));
    } catch (e) {
      return [];
    }
  }

  async getSong(id: string): Promise<SongMetadata> {
    if (id.startsWith("itunes-")) {
       const trackId = id.replace("itunes-", "");
       const res = await fetch(`https://itunes.apple.com/lookup?id=${trackId}`);
       const data = await res.json();
       const item = data.results[0];
       if (!item) throw new Error("iTunes track not found");
       return {
         id,
         title: item.trackName,
         artist: item.artistName,
         album: item.collectionName,
         coverArt: item.artworkUrl100.replace("100x100", "600x600"),
         previewUrl: item.previewUrl,
       };
    }

    const data = await this.fetchWithRetry(`/api/songs?id=${id}`);
    const item = data.data?.[0] || data[0] || data.response?.[0];
    if (!item) throw new Error("Song not found");

    return {
      id: item.id,
      title: item.name,
      artist: this.extractArtist(item),
      album: item.album?.name || item.album,
      coverArt: this.extractImageUrl(item),
      previewUrl: this.extractDownloadUrl(item),
    };
  }

  async getLyrics(id: string, title?: string, artist?: string): Promise<string> {
    let songMetadata: { title: string; artist: string } | null = null;
    
    if (title && artist) {
      songMetadata = { title, artist };
    }

    try {
      // 1. Try primary JioSaavn lyrics for non-iTunes tracks
      if (!id.startsWith("itunes-")) {
        try {
          const data = await this.fetchWithRetry(`/api/songs/${id}/lyrics`);
          const lyrics = data.data?.lyrics || data.lyrics;
          if (lyrics && lyrics !== "Lyrics not available") {
            return this.cleanLyrics(lyrics);
          }
        } catch (e) {
          console.warn("⚠️ Music API: JioSaavn lyrics lookup failed.");
        }
      }

      // 2. If JioSaavn failed or skipped, we need metadata for other fallbacks
      if (!songMetadata) {
        try {
          const meta = await this.getSong(id);
          songMetadata = { title: meta.title, artist: meta.artist };
        } catch (e) {
          console.warn("⚠️ Music API: Could not fetch song metadata for lyrics fallback.");
        }
      }

      // 3. Fallback: Try LRCLIB
      if (songMetadata) {
        console.log(`🎵 Music API: Trying LRCLIB fallback for ${songMetadata.title}`);
        const lrclibUrl = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(songMetadata.artist)}&track_name=${encodeURIComponent(songMetadata.title)}`;
        const res = await fetch(lrclibUrl);
        if (res.ok) {
          const data = await res.json();
          const lyrics = data.plainLyrics || data.syncedLyrics;
          if (lyrics) return this.cleanLyrics(lyrics);
        }
      }

      // 4. Last Resort: lyrics.ovh
      if (songMetadata) {
        const ovhUrl = `https://api.lyrics.ovh/v1/${encodeURIComponent(songMetadata.artist)}/${encodeURIComponent(songMetadata.title)}`;
        const ovhRes = await fetch(ovhUrl);
        if (ovhRes.ok) {
          const ovhData = await ovhRes.json();
          if (ovhData.lyrics) return ovhData.lyrics;
        }
      }

      return "Lyrics not available for this track.";
    } catch (error) {
      console.error("❌ Music API: All lyrics sources failed:", error);
      return "Lyrics not available.";
    }
  }

  private cleanLyrics(lyrics: string): string {
    return lyrics
      .replace(/<br\s*\/?>/gi, "\n") // HTML breaks
      .replace(/\[\d{2}:\d{2}\.\d{2}\]/g, "") // LRC timestamps
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .trim();
  }

  async getStreamUrl(id: string): Promise<string> {
    const song = await this.getSong(id);
    return song.previewUrl || "";
  }
}

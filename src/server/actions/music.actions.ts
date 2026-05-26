"use server";

import { MusicApiAdapter } from "@/lib/music/adapters/music-api.adapter";
import { prisma } from "@/lib/db/prisma";

const musicProvider = new MusicApiAdapter();

export async function searchSongsAction(query: string) {
  if (!query) return [];
  return musicProvider.searchSongs(query);
}

export async function getLyricsAction(id: string, title?: string, artist?: string) {
  try {
    // 1. Check if we have the song and lyrics in the DB
    const songWithLyrics = await prisma.song.findUnique({
      where: { externalId: id },
      include: {
        snapshots: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        }
      }
    });

    const cachedLyrics = songWithLyrics?.snapshots[0]?.lyrics;
    
    if (cachedLyrics) {
      console.log(`💾 Cache: Returning lyrics from DB for ${id}`);
      return cachedLyrics;
    }

    // 2. Not in cache, fetch from API
    const lyrics = await musicProvider.getLyrics(id, title, artist);

    // 3. If we got real lyrics, store them
    if (lyrics && !lyrics.includes("Lyrics not available")) {
      try {
        // Find or Create song to associate with snapshot
        const song = await prisma.song.upsert({
          where: { externalId: id },
          update: {},
          create: {
            externalId: id,
            title: title || "Unknown Title",
            artist: artist || "Unknown Artist",
          }
        });

        // Create a snapshot with lyrics
        await prisma.songSnapshot.create({
          data: {
            songId: song.id,
            lyrics: lyrics,
          }
        });
        console.log(`✅ Cache: Saved lyrics to DB for ${id}`);
      } catch (saveError) {
        console.warn("⚠️ Cache: Failed to save lyrics to DB:", saveError);
      }
    }

    return lyrics;
  } catch (error) {
    console.error("❌ getLyricsAction failed:", error);
    return "Lyrics not available.";
  }
}

export async function getSongDetailsAction(id: string) {
  return musicProvider.getSong(id);
}

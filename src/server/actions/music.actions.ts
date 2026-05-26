"use server";

import { MusicApiAdapter } from "@/lib/music/adapters/music-api.adapter";

const musicProvider = new MusicApiAdapter();

export async function searchSongsAction(query: string) {
  if (!query) return [];
  return musicProvider.searchSongs(query);
}

export async function getLyricsAction(id: string, title?: string, artist?: string) {
  return musicProvider.getLyrics(id, title, artist);
}

export async function getSongDetailsAction(id: string) {
  return musicProvider.getSong(id);
}

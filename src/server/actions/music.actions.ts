"use server";

import { MusicApiAdapter } from "@/lib/music/adapters/music-api.adapter";

const musicProvider = new MusicApiAdapter();

export async function searchSongsAction(query: string) {
  if (!query) return [];
  return musicProvider.searchSongs(query);
}

export async function getSongDetailsAction(id: string) {
  return musicProvider.getSong(id);
}

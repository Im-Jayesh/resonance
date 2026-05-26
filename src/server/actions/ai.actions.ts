"use server";

import { GeminiAdapter } from "@/lib/ai/adapters/gemini.adapter";
import { prisma } from "@/lib/db/prisma";

const aiProvider = new GeminiAdapter();

export async function getSongMeaningAction(songId: string, title: string, artist: string, lyrics?: string) {
  try {
    const analysis = await aiProvider.analyzeSong(title, artist, lyrics);
    return analysis;
  } catch (error: any) {
    console.error("AI Analysis Action Failed:", error);
    throw new Error(error.message);
  }
}

export async function askAiAction(songId: string, title: string, artist: string, question: string, lyrics?: string) {
  try {
    const response = await aiProvider.askQuestion(title, artist, question, lyrics);
    return { response };
  } catch (error: any) {
    console.error("AI Ask Action Failed:", error);
    throw new Error(error.message);
  }
}

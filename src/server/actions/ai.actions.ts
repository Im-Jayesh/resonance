"use server";

import { GeminiAdapter } from "@/lib/ai/adapters/gemini.adapter";
import { prisma } from "@/lib/db/prisma";

const aiProvider = new GeminiAdapter();

export async function getSongMeaningAction(songId: string, title: string, artist: string, lyrics?: string) {
  try {
    const song = await prisma.song.upsert({
      where: { externalId: songId },
      update: { title, artist },
      create: {
        externalId: songId,
        title,
        artist,
      },
    });

    const existing = await prisma.songMeaning.findUnique({ where: { songId: song.id } });
    if (existing) return existing;

    const analysis = await aiProvider.analyzeSong(title, artist, lyrics);

    return await prisma.songMeaning.create({
      data: {
        songId: song.id,
        summary: analysis.summary,
        emotionalThemes: analysis.emotionalThemes,
        prompts: analysis.journalingPrompts,
      },
    });
  } catch (error: any) {
    console.error("AI Meaning Action Failed:", error);
    throw new Error(error.message);
  }
}

export async function askAiAction(songId: string, title: string, artist: string, question: string) {
  try {
    const response = await aiProvider.askQuestion(title, artist, question);
    return { response };
  } catch (error: any) {
    console.error("AI Ask Action Failed:", error);
    throw new Error(error.message);
  }
}

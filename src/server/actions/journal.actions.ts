"use server";

import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function createJournalEntryAction(
  songId: string, 
  title: string, 
  artist: string, 
  content: string, 
  mood?: string, 
  previewUrl?: string, 
  coverArt?: string
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  console.log("Journal: Upserting song metadata for", songId, { title, artist, hasPreview: !!previewUrl });

  try {
    // Explicitly define the data to ensure no accidental undefined/NaN values
    const songData = {
      externalId: songId,
      title: title || "Unknown Title",
      artist: artist || "Unknown Artist",
      previewUrl: previewUrl || null,
      coverArt: coverArt || null,
    };

    const song = await prisma.song.upsert({
      where: { externalId: songId },
      update: { 
        title: songData.title, 
        artist: songData.artist, 
        previewUrl: songData.previewUrl, 
        coverArt: songData.coverArt 
      },
      create: songData,
    });

    console.log("Journal: Song upserted, creating entry...");

    // Defensive check for mood being an array (some UI components might return an array)
    const sanitizedMood = Array.isArray(mood) ? mood[0] : mood;

    const entry = await prisma.journalEntry.create({
      data: {
        userId: session.user.id,
        songId: song.id,
        content,
        mood: sanitizedMood || null,
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/reflections");
    revalidatePath("/playlists");
    return entry;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("❌ Journal creation failed:", message);
    throw new Error(`Failed to save entry: ${message}`);
  }
}

export async function updateJournalEntryAction(id: string, content: string, mood?: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const sanitizedMood = Array.isArray(mood) ? mood[0] : mood;

  try {
    const entry = await prisma.journalEntry.update({
      where: { id, userId: session.user.id },
      data: { content, mood: sanitizedMood || null },
    });

    revalidatePath("/dashboard");
    revalidatePath("/reflections");
    return entry;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Journal update failed:", message);
    throw new Error(`Failed to update entry: ${message}`);
  }
}

export async function deleteJournalEntryAction(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  try {
    await prisma.journalEntry.delete({
      where: { id, userId: session.user.id },
    });

    revalidatePath("/dashboard");
    revalidatePath("/reflections");
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Journal deletion failed:", message);
    throw new Error(`Failed to delete entry: ${message}`);
  }
}

export async function getJournalEntriesAction() {
  const session = await auth();
  if (!session?.user?.id) return [];

  return prisma.journalEntry.findMany({
    where: { userId: session.user.id },
    include: { song: true },
    orderBy: { createdAt: "desc" },
  });
}

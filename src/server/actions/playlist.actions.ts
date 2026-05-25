"use server";

import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function createPlaylistAction(name: string, description?: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  try {
    const playlist = await prisma.playlist.create({
      data: {
        userId: session.user.id,
        name,
        description,
      },
    });
    revalidatePath("/playlists");
    return playlist;
  } catch (error: any) {
    throw new Error(`Failed to create playlist: ${error.message}`);
  }
}

export async function getPlaylistsAction() {
  const session = await auth();
  if (!session?.user?.id) {
    console.warn("Playlists: No session user ID found. Session state:", !!session);
    return [];
  }

  const userId = session.user.id;
  console.log(`Playlists: Fetching for user ID: ${userId}`);

  try {
    const playlists = await prisma.playlist.findMany({
      where: { userId: userId },
      include: {
        songs: {
          include: {
            song: true,
          },
          orderBy: { order: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    console.log(`Playlists: Successfully fetched ${playlists.length} playlists for ${userId}`);
    return playlists;
  } catch (error: any) {
    console.error("Playlists: Database fetch failed:", error.message);
    throw new Error(`Failed to fetch playlists: ${error.message}`);
  }
}

export async function addSongToPlaylistAction(
  playlistId: string, 
  songMetadata: { 
    id: string; 
    title: string; 
    artist: string; 
    coverArt?: string; 
    previewUrl?: string; 
  }
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  try {
    // 1. Ensure song exists locally
    const song = await prisma.song.upsert({
      where: { externalId: songMetadata.id },
      update: {
        title: songMetadata.title,
        artist: songMetadata.artist,
        coverArt: songMetadata.coverArt,
        previewUrl: songMetadata.previewUrl,
      },
      create: {
        externalId: songMetadata.id,
        title: songMetadata.title,
        artist: songMetadata.artist,
        coverArt: songMetadata.coverArt,
        previewUrl: songMetadata.previewUrl,
      },
    });

    // 2. Get current max order
    const lastSong = await prisma.playlistSong.findFirst({
      where: { playlistId },
      orderBy: { order: "desc" },
    });

    const newOrder = (lastSong?.order ?? -1) + 1;

    // 3. Add to playlist
    const playlistSong = await prisma.playlistSong.create({
      data: {
        playlistId,
        songId: song.id,
        order: newOrder,
      },
    });

    revalidatePath("/playlists");
    return playlistSong;
  } catch (error: any) {
    throw new Error(`Failed to add song to playlist: ${error.message}`);
  }
}

export async function removeSongFromPlaylistAction(playlistSongId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  try {
    await prisma.playlistSong.delete({
      where: { id: playlistSongId },
    });
    revalidatePath("/playlists");
    return { success: true };
  } catch (error: any) {
    throw new Error(`Failed to remove song: ${error.message}`);
  }
}

export async function deletePlaylistAction(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  try {
    await prisma.playlist.delete({
      where: { id, userId: session.user.id },
    });
    revalidatePath("/playlists");
    return { success: true };
  } catch (error: any) {
    throw new Error(`Failed to delete playlist: ${error.message}`);
  }
}

export async function updatePlaylistOrderAction(playlistId: string, songIds: string[]) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  try {
    await prisma.$transaction(
      songIds.map((id, index) =>
        prisma.playlistSong.update({
          where: { id },
          data: { order: index },
        })
      )
    );
    revalidatePath("/playlists");
    return { success: true };
  } catch (error: any) {
    throw new Error(`Failed to update order: ${error.message}`);
  }
}

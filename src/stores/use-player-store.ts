import { create } from "zustand";
import { SongMetadata } from "@/lib/music/types";

export type LoopMode = "none" | "one" | "all";

interface PlayerState {
  currentSong: SongMetadata | null;
  isPlaying: boolean;
  queue: SongMetadata[];
  currentIndex: number;
  volume: number;
  loopMode: LoopMode;
  
  setCurrentSong: (song: SongMetadata) => void;
  togglePlay: () => void;
  setPlaying: (playing: boolean) => void;
  addToQueue: (song: SongMetadata) => void;
  setQueue: (songs: SongMetadata[]) => void;
  next: () => void;
  previous: () => void;
  setVolume: (volume: number) => void;
  setLoopMode: (mode: LoopMode) => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  currentSong: null,
  isPlaying: false,
  queue: [],
  currentIndex: -1,
  volume: 0.7,
  loopMode: "none",

  setCurrentSong: (song) => set((state) => {
    const exists = state.queue.findIndex((s) => s.id === song.id);
    if (exists !== -1) {
      return { currentSong: song, isPlaying: true, currentIndex: exists };
    }
    return { 
      currentSong: song, 
      isPlaying: true, 
      queue: [...state.queue, song],
      currentIndex: state.queue.length
    };
  }),

  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
  setPlaying: (playing) => set({ isPlaying: playing }),
  
  addToQueue: (song) => set((state) => ({ 
    queue: [...state.queue, song] 
  })),

  setQueue: (songs) => set({ queue: songs, currentIndex: 0, currentSong: songs[0], isPlaying: true }),

  next: () => set((state) => {
    if (state.loopMode === "one") {
      return { ...state }; // audio element will handle the reset via event
    }

    if (state.currentIndex < state.queue.length - 1) {
      const nextIndex = state.currentIndex + 1;
      return { currentIndex: nextIndex, currentSong: state.queue[nextIndex] };
    } else if (state.loopMode === "all" && state.queue.length > 0) {
      return { currentIndex: 0, currentSong: state.queue[0] };
    }
    return { isPlaying: false };
  }),

  previous: () => set((state) => {
    if (state.currentIndex > 0) {
      const nextIndex = state.currentIndex - 1;
      return { currentIndex: nextIndex, currentSong: state.queue[nextIndex] };
    } else if (state.loopMode === "all" && state.queue.length > 0) {
       const lastIndex = state.queue.length - 1;
       return { currentIndex: lastIndex, currentSong: state.queue[lastIndex] };
    }
    return state;
  }),

  setVolume: (volume) => set({ volume }),
  setLoopMode: (loopMode) => set({ loopMode }),
}));

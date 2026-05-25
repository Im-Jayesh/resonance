import { create } from "zustand";
import { SongMetadata } from "@/lib/music/types";

interface PlayerState {
  currentSong: SongMetadata | null;
  isPlaying: boolean;
  queue: SongMetadata[];
  currentIndex: number;
  volume: number;
  
  setCurrentSong: (song: SongMetadata) => void;
  togglePlay: () => void;
  setPlaying: (playing: boolean) => void;
  addToQueue: (song: SongMetadata) => void;
  next: () => void;
  previous: () => void;
  setVolume: (volume: number) => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  currentSong: null,
  isPlaying: false,
  queue: [],
  currentIndex: -1,
  volume: 0.7,

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

  next: () => set((state) => {
    if (state.currentIndex < state.queue.length - 1) {
      const nextIndex = state.currentIndex + 1;
      return { currentIndex: nextIndex, currentSong: state.queue[nextIndex] };
    }
    return state;
  }),

  previous: () => set((state) => {
    if (state.currentIndex > 0) {
      const nextIndex = state.currentIndex - 1;
      return { currentIndex: nextIndex, currentSong: state.queue[nextIndex] };
    }
    return state;
  }),

  setVolume: (volume) => set({ volume }),
}));

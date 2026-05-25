export const queryKeys = {
  songs: {
    all: ["songs"] as const,
    search: (query: string) => [...queryKeys.songs.all, "search", query] as const,
    detail: (id: string) => [...queryKeys.songs.all, "detail", id] as const,
  },
  journal: {
    all: ["journal"] as const,
    entries: (userId: string) => [...queryKeys.journal.all, "entries", userId] as const,
    entry: (id: string) => [...queryKeys.journal.all, "entry", id] as const,
  },
  ai: {
    all: ["ai"] as const,
    analysis: (songId: string) => [...queryKeys.ai.all, "analysis", songId] as const,
  },
  playlists: {
    all: ["playlists"] as const,
  },
};

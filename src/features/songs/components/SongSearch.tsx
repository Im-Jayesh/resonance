"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { searchSongsAction } from "@/server/actions/music.actions";
import { queryKeys } from "@/lib/api/query-keys";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Play, PenLine } from "lucide-react";
import { usePlayerStore } from "@/stores/use-player-store";
import { motion } from "framer-motion";
import { JournalModal } from "@/features/journal/components/JournalModal";
import { AddToPlaylistModal } from "@/features/songs/components/AddToPlaylistModal";

export function SongSearch() {
  const [query, setQuery] = useState("");
  const { setCurrentSong } = usePlayerStore();

  const { data: songs, isLoading } = useQuery({
    queryKey: queryKeys.songs.search(query),
    queryFn: () => searchSongsAction(query),
    enabled: query.length > 2,
  });

  return (
    <div className="space-y-6 w-full max-w-4xl mx-auto">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search for a song, artist, or album..."
          className="pl-10 h-12 bg-secondary/50 border-white/5"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="grid gap-3 md:gap-4">
        {isLoading && <p className="text-center text-muted-foreground animate-pulse">Searching for harmony...</p>}
        {songs?.map((song) => (
          <motion.div
            key={song.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col sm:flex-row sm:items-center justify-between p-3 md:p-4 rounded-2xl glass border-white/5 hover:bg-white/5 transition-colors group gap-4"
          >
            <div className="flex items-center gap-4 flex-1">
              <div className="h-14 w-14 md:h-16 md:w-16 rounded-xl overflow-hidden bg-secondary relative shrink-0 shadow-lg">
                {song.coverArt && <img src={song.coverArt} alt={song.title} className="h-full w-full object-cover" />}
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute inset-0 opacity-0 md:group-hover:opacity-100 bg-black/40 text-white rounded-none transition-opacity"
                  onClick={() => setCurrentSong(song)}
                >
                  <Play className="h-6 w-6 fill-current" />
                </Button>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-semibold text-base md:text-lg truncate pr-4">{song.title}</span>
                <span className="text-xs md:text-sm text-muted-foreground truncate">{song.artist}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="flex-1 sm:flex-none">
                <AddToPlaylistModal song={song} trigger={
                   <Button variant="outline" className="w-full h-10 md:h-11 rounded-xl border-white/10 gap-2 text-xs md:text-sm">
                      Record to Playlist
                   </Button>
                } />
              </div>
              <div className="flex-1 sm:flex-none">
                <JournalModal song={song} trigger={
                  <Button className="w-full h-10 md:h-11 rounded-xl shadow-lg shadow-primary/20 gap-2 text-xs md:text-sm">
                    <PenLine className="h-3.5 w-3.5" /> Journal
                  </Button>
                } />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

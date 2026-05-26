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
    <div className="space-y-4 w-full max-w-4xl mx-auto px-1 sm:px-0">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
        <Input
          placeholder="Search for a song, artist, or album..."
          className="pl-9 h-11 bg-secondary/50 border-white/5 rounded-xl text-sm focus-visible:ring-zinc-500"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="grid gap-2 sm:gap-3">
        {isLoading && (
          <p className="text-center text-xs text-muted-foreground py-2 animate-pulse">
            Searching for harmony...
          </p>
        )}
        
        {songs?.map((song) => (
          <motion.div
            key={song.id}
            initial={{ opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 sm:p-4 rounded-xl glass border-white/5 hover:bg-white/5 transition-all group gap-3 sm:gap-4"
          >
            {/* Left Side: Art & Metadata container (always row on all viewports) */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div 
                className="h-11 w-11 sm:h-16 sm:w-16 rounded-lg sm:rounded-xl overflow-hidden bg-secondary relative shrink-0 shadow-md cursor-pointer"
                onClick={() => setCurrentSong(song)}
              >
                {song.coverArt && (
                  <img src={song.coverArt} alt={song.title} className="h-full w-full object-cover" />
                )}
                {/* Desktop Hover State Overlay */}
                <div className="absolute inset-0 hidden md:flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity">
                  <Play className="h-5 w-5 fill-white text-white" />
                </div>
              </div>

              <div className="flex flex-col min-w-0 flex-1">
                <span className="font-bold text-sm sm:text-base text-foreground truncate pr-1">
                  {song.title}
                </span>
                <span className="text-[11px] sm:text-xs text-muted-foreground truncate mt-0.5">
                  {song.artist}
                </span>
              </div>

              {/* Mobile Only: Inline play trigger button targets */}
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 rounded-lg md:hidden shrink-0 border border-white/5 bg-secondary/30"
                onClick={() => setCurrentSong(song)}
              >
                <Play className="h-3 w-3 fill-current text-foreground" />
              </Button>
            </div>

            {/* Right Side: Grid split actions (optimized side-by-side layouts for high density devices) */}
            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 border-t border-white/5 sm:border-none pt-2.5 sm:pt-0">
              <div className="flex-1 sm:flex-none">
                <AddToPlaylistModal song={song} trigger={
                   <Button variant="outline" className="w-full h-8 sm:h-10 rounded-lg border-white/10 text-[11px] sm:text-xs px-2.5">
                      Playlist
                   </Button>
                } />
              </div>
              <div className="flex-1 sm:flex-none">
                <JournalModal song={song} trigger={
                  <Button className="w-full h-8 sm:h-10 rounded-lg shadow-md shadow-primary/10 gap-1 text-[11px] sm:text-xs px-3">
                    <PenLine className="h-3 w-3" /> Journal
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
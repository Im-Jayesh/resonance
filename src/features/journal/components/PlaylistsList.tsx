"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  getPlaylistsAction, 
  deletePlaylistAction, 
  removeSongFromPlaylistAction, 
  updatePlaylistOrderAction,
  createPlaylistAction
} from "@/server/actions/playlist.actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Play, Music, ChevronUp, ChevronDown, X, ListMusic, Plus, Loader2 } from "lucide-react";
import { usePlayerStore } from "@/stores/use-player-store";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { queryKeys } from "@/lib/api/query-keys";

export function PlaylistsList() {
  const queryClient = useQueryClient();
  const { setQueue } = usePlayerStore();

  const { data: playlists, isLoading, error } = useQuery({
    queryKey: queryKeys.playlists.all,
    queryFn: async () => {
      console.log("Playlists: Fetching...");
      const result = await getPlaylistsAction();
      console.log("Playlists: Result received", result);
      return result;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePlaylistAction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.playlists.all });
      toast.success("Playlist deleted.");
    },
  });

  const removeSongMutation = useMutation({
    mutationFn: (id: string) => removeSongFromPlaylistAction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.playlists.all });
      toast.success("Song removed.");
    },
  });

  const updateOrderMutation = useMutation({
    mutationFn: (data: { playlistId: string; songIds: string[] }) => 
      updatePlaylistOrderAction(data.playlistId, data.songIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.playlists.all });
    },
  });

  const moveSong = (playlist: any, index: number, direction: "up" | "down") => {
    const newSongs = [...playlist.songs];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newSongs.length) return;

    [newSongs[index], newSongs[targetIndex]] = [newSongs[targetIndex], newSongs[index]];
    updateOrderMutation.mutate({ 
      playlistId: playlist.id, 
      songIds: newSongs.map((ps: any) => ps.id) 
    });
  };

  if (isLoading) return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {[1,2,3].map(i => <div key={i} className="h-64 rounded-[2.5rem] glass animate-pulse" />)}
    </div>
  );

  if (error) {
    return (
      <div className="py-20 text-center text-destructive">
        <p>Failed to load playlists. Please refresh.</p>
        <p className="text-xs opacity-50 mt-2">{(error as Error).message}</p>
      </div>
    );
  }

  if (!playlists || playlists.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center space-y-8 glass border-white/5 rounded-[3rem] border-dashed border-2">
        <div className="p-10 rounded-full bg-primary/5">
          <ListMusic className="h-16 w-16 text-primary/40" />
        </div>
        <div className="space-y-2">
          <h3 className="text-3xl font-bold tracking-tight">Your library is quiet</h3>
          <p className="text-muted-foreground max-w-sm mx-auto text-lg leading-relaxed">Start your journey by creating your first playlist or searching for your favorite tracks.</p>
        </div>
        <Button 
          size="lg" 
          onClick={async () => {
            const name = prompt("Name your new collection:");
            if (name) {
              try {
                await createPlaylistAction(name);
                queryClient.invalidateQueries({ queryKey: queryKeys.playlists.all });
                toast.success("Playlist created!");
              } catch (e: any) {
                toast.error(e.message);
              }
            }
          }}
          className="rounded-[1.5rem] h-16 px-10 text-lg font-bold shadow-2xl shadow-primary/30 hover:scale-105 transition-transform"
        >
          <Plus className="h-6 w-6 mr-3" />
          Create First Playlist
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-3">
      {playlists?.map((playlist) => (
        <Card key={playlist.id} className="glass border-white/5 overflow-hidden flex flex-col group rounded-[2.5rem] shadow-2xl hover:border-primary/20 transition-all duration-500">
          <CardHeader className="p-8 pb-4">
            <div className="flex justify-between items-start">
               <div className="space-y-1.5 min-w-0">
                 <CardTitle className="text-2xl font-bold truncate">{playlist.name}</CardTitle>
                 <p className="text-[10px] font-bold text-primary uppercase tracking-[0.3em]">{playlist.songs.length} Selections</p>
               </div>
               <Button 
                variant="ghost" 
                size="icon" 
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full h-10 w-10 transition-colors"
                onClick={() => confirm(`Delete "${playlist.name}"?`) && deleteMutation.mutate(playlist.id)}
               >
                 <Trash2 className="h-5 w-5" />
               </Button>
            </div>
          </CardHeader>
          <CardContent className="p-8 pt-0 flex-1 flex flex-col gap-8">
            <div className="flex-1 space-y-2 max-h-72 overflow-y-auto pr-4 scrollbar-none min-h-[180px]">
              {playlist.songs.map((ps: any, index: number) => (
                <div key={ps.id} className="flex items-center justify-between group/song p-3 rounded-2xl hover:bg-white/5 transition-all">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center shrink-0 shadow-inner">
                       <Music className="h-4 w-4 text-primary/40" />
                    </div>
                    <span className="text-sm truncate font-semibold text-foreground/80">{ps.song.title}</span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover/song:opacity-100 transition-opacity">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 rounded-lg hover:bg-white/10"
                      disabled={index === 0}
                      onClick={() => moveSong(playlist, index, "up")}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 rounded-lg hover:bg-white/10"
                      disabled={index === playlist.songs.length - 1}
                      onClick={() => moveSong(playlist, index, "down")}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                      onClick={() => removeSongMutation.mutate(ps.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {playlist.songs.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center py-12 opacity-30">
                  <Music className="h-10 w-10 mb-3" />
                  <p className="text-sm font-medium">Select songs from search</p>
                </div>
              )}
            </div>
            
            <Button 
              className="w-full rounded-[1.25rem] h-14 shadow-xl shadow-primary/20 font-bold text-base hover:scale-[1.02] active:scale-[0.98] transition-all"
              disabled={playlist.songs.length === 0}
              onClick={() => {
                const songs = playlist.songs.map((ps: any) => ({
                  id: ps.song.externalId,
                  title: ps.song.title,
                  artist: ps.song.artist,
                  coverArt: ps.song.coverArt || undefined,
                  previewUrl: ps.song.previewUrl || undefined,
                }));
                setQueue(songs);
                toast.success(`Resonance starting: ${playlist.name}`);
              }}
            >
              <Play className="h-5 w-5 mr-3 fill-current" />
              Play Masterlist
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

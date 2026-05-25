"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createPlaylistAction, getPlaylistsAction, addSongToPlaylistAction } from "@/server/actions/playlist.actions";
import { queryKeys } from "@/lib/api/query-keys";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Plus, ListMusic, Music, Check, Loader2 } from "lucide-react";
import { SongMetadata } from "@/lib/music/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AddToPlaylistModalProps {
  song: SongMetadata;
  trigger?: React.ReactNode;
}

export function AddToPlaylistModal({ song, trigger }: AddToPlaylistModalProps) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");

  const { data: playlists, isLoading } = useQuery({
    queryKey: queryKeys.playlists.all,
    queryFn: () => getPlaylistsAction(),
    enabled: isOpen,
  });

  const addMutation = useMutation({
    mutationFn: (playlistId: string) => addSongToPlaylistAction(playlistId, song),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.playlists.all });
      toast.success(`Added to playlist`);
      setIsOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const createMutation = useMutation({
    mutationFn: () => createPlaylistAction(newPlaylistName),
    onSuccess: (playlist) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.playlists.all });
      addMutation.mutate(playlist.id);
      setIsCreating(false);
      setNewPlaylistName("");
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md glass border-white/10 shadow-2xl">
        <DialogHeader>
          <DialogTitle>Add to Playlist</DialogTitle>
          <DialogDescription>Choose a playlist or create a new one.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-white/5">
             <div className="h-12 w-12 rounded-lg overflow-hidden bg-secondary">
               {song.coverArt && <img src={song.coverArt} alt={song.title} className="h-full w-full object-cover" />}
             </div>
             <div className="flex flex-col min-w-0">
               <span className="text-sm font-bold truncate">{song.title}</span>
               <span className="text-xs text-muted-foreground truncate">{song.artist}</span>
             </div>
          </div>

          <ScrollArea className="h-64 pr-4">
            <div className="space-y-2">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : playlists?.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-8">No playlists found.</p>
              ) : (
                playlists?.map((playlist) => {
                  const isAdded = playlist.songs.some((ps: any) => ps.song.externalId === song.id);
                  return (
                    <Button
                      key={playlist.id}
                      variant="ghost"
                      className={cn(
                        "w-full justify-between h-12 px-4 rounded-xl group",
                        isAdded && "text-primary bg-primary/5"
                      )}
                      onClick={() => !isAdded && addMutation.mutate(playlist.id)}
                      disabled={isAdded || addMutation.isPending}
                    >
                      <div className="flex items-center gap-3">
                        <ListMusic className="h-4 w-4 opacity-40" />
                        <span className="text-sm font-medium">{playlist.name}</span>
                      </div>
                      {isAdded ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Plus className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </Button>
                  );
                })
              )}
            </div>
          </ScrollArea>

          <div className="pt-4 border-t border-white/5">
            {isCreating ? (
              <div className="flex gap-2">
                <Input
                  autoFocus
                  placeholder="Playlist name..."
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  className="h-10 bg-white/5 border-white/10"
                />
                <Button 
                  size="sm" 
                  onClick={() => createMutation.mutate()}
                  disabled={!newPlaylistName.trim() || createMutation.isPending}
                >
                  Create
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setIsCreating(false)}>Cancel</Button>
              </div>
            ) : (
              <Button 
                variant="outline" 
                className="w-full h-10 border-dashed border-white/10 hover:bg-white/5" 
                onClick={() => setIsCreating(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New Playlist
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

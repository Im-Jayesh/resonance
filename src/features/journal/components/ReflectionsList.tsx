"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getJournalEntriesAction, updateJournalEntryAction } from "@/server/actions/journal.actions";
import { queryKeys } from "@/lib/api/query-keys";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { 
  Search, 
  Calendar as CalendarIcon, 
  Smile, 
  Frown, 
  Zap, 
  Cloud, 
  Heart, 
  Ghost,
  Play,
  Music,
  Filter,
  ChevronRight,
  PenLine,
  Save,
  X,
  Edit3,
  Loader2
} from "lucide-react";
import { format, isSameDay } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { usePlayerStore } from "@/stores/use-player-store";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";

interface Song {
  id: string;
  externalId: string;
  title: string;
  artist: string;
  coverArt: string | null;
  previewUrl: string | null;
}

interface JournalEntry {
  id: string;
  content: string;
  mood: string | null;
  createdAt: Date;
  song: Song;
}

const MOOD_ICONS: Record<string, { icon: any; label: string }> = {
  happy: { icon: Smile, label: "Happy" },
  sad: { icon: Frown, label: "Sad" },
  energetic: { icon: Zap, label: "Energetic" },
  calm: { icon: Cloud, label: "Calm" },
  loved: { icon: Heart, label: "Loved" },
  melancholy: { icon: Ghost, label: "Melancholy" },
};

export function ReflectionsList() {
  const { setCurrentSong } = usePlayerStore();
  const [search, setSearch] = useState("");
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  const { data: entries, isLoading } = useQuery({
    queryKey: queryKeys.journal.all,
    queryFn: () => getJournalEntriesAction() as Promise<JournalEntry[]>,
  });

  const filteredEntries = entries?.filter((entry) => {
    const matchesSearch = 
      entry.content.toLowerCase().includes(search.toLowerCase()) ||
      entry.song.title.toLowerCase().includes(search.toLowerCase()) ||
      entry.song.artist.toLowerCase().includes(search.toLowerCase());
    
    const matchesMood = !selectedMood || entry.mood === selectedMood;
    const matchesDate = !selectedDate || isSameDay(new Date(entry.createdAt), selectedDate);

    return matchesSearch && matchesMood && matchesDate;
  });

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-64 rounded-2xl glass animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search your reflections..." 
            className="pl-10 h-12 bg-secondary/30 border-white/5 rounded-xl focus-visible:ring-primary/40"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("h-12 px-4 rounded-xl border-white/5 bg-secondary/30", selectedMood && "text-primary border-primary/20")}>
                <Filter className="h-4 w-4 mr-2" />
                {selectedMood ? selectedMood.charAt(0).toUpperCase() + selectedMood.slice(1) : "Mood"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2 glass border-white/10 shadow-2xl">
              <div className="grid gap-1">
                <Button variant="ghost" size="sm" className="justify-start text-xs h-9" onClick={() => setSelectedMood(null)}>All Moods</Button>
                {Object.keys(MOOD_ICONS).map((m) => {
                  const Icon = MOOD_ICONS[m].icon;
                  return (
                    <Button key={m} variant="ghost" size="sm" className="justify-start text-xs h-9 gap-2" onClick={() => setSelectedMood(m)}>
                      <Icon className="h-3.5 w-3.5" />
                      <span className="capitalize">{m}</span>
                    </Button>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("h-12 px-4 rounded-xl border-white/5 bg-secondary/30", selectedDate && "text-primary border-primary/20")}>
                <CalendarIcon className="h-4 w-4 mr-2" />
                {selectedDate ? format(selectedDate, "MMM d") : "Date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 glass border-white/10 shadow-2xl">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                initialFocus
              />
              {selectedDate && (
                <div className="p-2 border-t border-white/5">
                   <Button variant="ghost" size="sm" className="w-full text-[10px] h-7" onClick={() => setSelectedDate(undefined)}>Clear Date</Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <AnimatePresence mode="popLayout">
        {filteredEntries?.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center space-y-4"
          >
            <div className="p-6 rounded-full bg-secondary/30">
              <Music className="h-10 w-10 text-muted-foreground/40" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-bold">No reflections found</h3>
              <p className="text-muted-foreground text-sm max-w-xs mx-auto">Try adjusting your filters or search terms.</p>
            </div>
            <Button variant="outline" className="rounded-xl border-white/5" onClick={() => { setSearch(""); setSelectedMood(null); setSelectedDate(undefined); }}>
              Clear all filters
            </Button>
          </motion.div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredEntries?.map((entry) => (
              <ReflectionCard key={entry.id} entry={entry} onPlay={() => {
                setCurrentSong({
                  id: entry.song.externalId,
                  title: entry.song.title,
                  artist: entry.song.artist,
                  coverArt: entry.song.coverArt || undefined,
                  previewUrl: entry.song.previewUrl || undefined,
                });
              }} />
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ReflectionCard({ entry, onPlay }: { entry: JournalEntry; onPlay: () => void }) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(entry.content);
  const [editMood, setEditMood] = useState(entry.mood || "");
  
  const updateMutation = useMutation({
    mutationFn: (data: { content: string; mood: string }) => 
      updateJournalEntryAction(entry.id, data.content, data.mood || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.journal.all });
      setIsEditing(false);
      toast.success("Reflection updated.");
    }
  });

  const moodData = entry.mood ? MOOD_ICONS[entry.mood] : null;
  const MoodIcon = moodData?.icon;

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="group cursor-pointer"
        onClick={() => setIsOpen(true)}
      >
        <Card className="h-full glass border-white/5 group-hover:border-primary/20 group-hover:bg-primary/[0.02] transition-all duration-500 overflow-hidden flex flex-col shadow-lg hover:shadow-2xl hover:shadow-primary/5 relative">
          <CardHeader className="p-5 pb-3">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-lg overflow-hidden bg-secondary relative shrink-0 ring-1 ring-white/5">
                  {entry.song.coverArt && <img src={entry.song.coverArt} alt={entry.song.title} className="h-full w-full object-cover" />}
                </div>
                <div className="flex flex-col min-w-0">
                  <CardTitle className="text-sm font-bold truncate pr-2">{entry.song.title}</CardTitle>
                  <span className="text-[10px] text-muted-foreground truncate uppercase tracking-wider">{entry.song.artist}</span>
                </div>
              </div>
              {MoodIcon && (
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 shadow-sm border border-primary/5">
                  <MoodIcon className="h-4 w-4" />
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0 flex-1 flex flex-col space-y-3 min-h-0">
            <div className="text-xs text-foreground/70 leading-relaxed line-clamp-4 font-serif italic prose prose-invert prose-xs">
               <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {entry.content}
               </ReactMarkdown>
            </div>
          </CardContent>
          <CardFooter className="p-5 pt-0 flex items-center justify-between mt-auto">
            <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">
              {format(new Date(entry.createdAt), "MMMM d, yyyy")}
            </span>
            <div className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
               <ChevronRight className="h-4 w-4 text-primary" />
            </div>
          </CardFooter>
        </Card>
      </motion.div>

      <Dialog open={isOpen} onOpenChange={(val) => {
        setIsOpen(val);
        if (!val) setIsEditing(false);
      }}>
        <DialogContent className="max-w-[90vw] w-full h-[95vh] p-0 overflow-hidden glass border-white/10 shadow-2xl flex flex-col">
          <DialogHeader className="p-8 border-b border-white/5 bg-background/40 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="h-20 w-20 rounded-xl overflow-hidden bg-secondary shadow-2xl ring-1 ring-white/10 relative group">
                  {entry.song.coverArt && <img src={entry.song.coverArt} alt={entry.song.title} className="h-full w-full object-cover" />}
                  <Button 
                    size="icon" 
                    className="absolute inset-0 bg-primary/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-none"
                    onClick={(e) => { e.stopPropagation(); onPlay(); }}
                  >
                    <Play className="h-8 w-8 fill-current" />
                  </Button>
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <DialogTitle className="text-3xl font-bold tracking-tight">{entry.song.title}</DialogTitle>
                    {isEditing ? (
                      <ToggleGroup type="single" value={editMood} onValueChange={(v) => setEditMood(v || "")} className="bg-white/5 rounded-full p-1 gap-1">
                         {Object.keys(MOOD_ICONS).map((m) => {
                           const Icon = MOOD_ICONS[m].icon;
                           return (
                             <ToggleGroupItem key={m} value={m} className="h-8 w-8 rounded-full p-0 border-none data-[state=on]:bg-primary/20" title={MOOD_ICONS[m].label}>
                               <Icon className="h-3.5 w-3.5" />
                             </ToggleGroupItem>
                           );
                         })}
                      </ToggleGroup>
                    ) : (
                      MoodIcon && (
                        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 gap-1.5 px-3 py-1 capitalize">
                          <MoodIcon className="h-3 w-3" /> {entry.mood}
                        </Badge>
                      )
                    )}
                  </div>
                  <DialogDescription className="text-lg font-medium">{entry.song.artist}</DialogDescription>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Button variant="outline" onClick={onPlay} className="rounded-full px-6 gap-2 border-white/10 hover:bg-white/5">
                  <Play className="h-4 w-4 fill-current" /> Play Track
                </Button>
                <div className="h-8 w-px bg-white/10" />
                {isEditing ? (
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => { setIsEditing(false); setEditContent(entry.content); setEditMood(entry.mood || ""); }} className="rounded-xl h-11 px-6">
                      <X className="h-4 w-4 mr-2" /> Cancel
                    </Button>
                    <Button onClick={() => updateMutation.mutate({ content: editContent, mood: editMood })} disabled={updateMutation.isPending} className="rounded-xl h-11 px-8 shadow-xl shadow-primary/20">
                      {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                      Save Changes
                    </Button>
                  </div>
                ) : (
                  <Button variant="secondary" onClick={() => setIsEditing(true)} className="rounded-xl h-11 px-8">
                    <Edit3 className="h-4 w-4 mr-2" /> Edit Reflection
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex bg-background/20">
            <ScrollArea className="flex-1">
              <div className="p-16 pb-40 max-w-5xl mx-auto space-y-10">
                <div className="flex items-center gap-4 mb-6 opacity-30">
                  <PenLine className="h-6 w-6 text-primary" />
                  <span className="text-sm font-bold uppercase tracking-[0.5em]">{isEditing ? "Editing Reflection" : "My Reflection"}</span>
                </div>
                
                {isEditing ? (
                  <Textarea 
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full bg-transparent border-none focus-visible:ring-0 p-0 text-3xl leading-relaxed font-serif min-h-[600px] resize-none"
                    placeholder="Support Markdown: **bold**, *italic*, # headings"
                  />
                ) : (
                  <div className="prose prose-invert prose-2xl max-w-none font-serif leading-relaxed italic text-foreground/90">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {entry.content}
                    </ReactMarkdown>
                  </div>
                )}
                
                {!isEditing && (
                  <div className="pt-10 border-t border-white/5 flex items-center gap-2 text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                    Recorded on {format(new Date(entry.createdAt), "EEEE, MMMM do, yyyy 'at' h:mm a")}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
          
          <div className="p-6 border-t border-white/5 bg-secondary/30 flex justify-end">
            <Button variant="ghost" onClick={() => setIsOpen(false)}>Close Reflection</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

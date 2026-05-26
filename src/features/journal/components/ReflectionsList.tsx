"use client";

import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getJournalEntriesAction, updateJournalEntryAction, deleteJournalEntryAction } from "@/server/actions/journal.actions";
import { queryKeys } from "@/lib/api/query-keys";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { 
  Search, Calendar as CalendarIcon, Smile, Frown, Zap, Cloud, Heart, Ghost,
  Play, Music, Filter, ChevronRight, PenLine, Trash2, Loader2, Bold, Italic, 
  Underline, Palette, Heading1, Heading2, Quote, Link as LinkIcon, Type, CaseUpper, List, ListOrdered
} from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { usePlayerStore } from "@/stores/use-player-store";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Color from '@tiptap/extension-color';
import {TextStyle} from '@tiptap/extension-text-style';
import UnderlineExtension from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import FontFamily from '@tiptap/extension-font-family';
import Placeholder from '@tiptap/extension-placeholder';
import { Extension } from '@tiptap/core';

// Custom Font Size Extension
const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() { return { types: ['textStyle'] }; },
  addGlobalAttributes() {
    return [{
      types: this.options.types,
      attributes: {
        fontSize: {
          default: null,
          parseHTML: element => element.style.fontSize?.replace(/['"]+/g, ''),
          renderHTML: attributes => {
            if (!attributes.fontSize) return {};
            return { style: `font-size: ${attributes.fontSize}` };
          },
        },
      },
    }];
  },
  addCommands() {
    return {
      setFontSize: (fontSize: string) => ({ chain }) => chain().setMark('textStyle', { fontSize }).run(),
      unsetFontSize: () => ({ chain }) => chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run(),
    };
  },
});

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (size: string) => ReturnType;
      unsetFontSize: () => ReturnType;
    };
  }
}

const FONTS = [
  { label: 'Serif', value: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif' },
  { label: 'Sans', value: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' },
  { label: 'Mono', value: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' },
];
const FONT_SIZES = ['12px', '14px', '16px', '18px', '20px', '24px', '30px', '36px', '48px', '60px'];

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
    const entryDate = new Date(entry.createdAt);
    
    const matchesSearch = 
      entry.content.toLowerCase().includes(search.toLowerCase()) ||
      entry.song.title.toLowerCase().includes(search.toLowerCase()) ||
      entry.song.artist.toLowerCase().includes(search.toLowerCase());
    
    const matchesMood = !selectedMood || String(entry.mood).toLowerCase() === selectedMood.toLowerCase();
    
    const matchesDate = !selectedDate || (
      entryDate.getFullYear() === selectedDate.getFullYear() &&
      entryDate.getMonth() === selectedDate.getMonth() &&
      entryDate.getDate() === selectedDate.getDate()
    );

    return matchesSearch && matchesMood && matchesDate;
  });

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-64 rounded-xl bg-zinc-100 dark:bg-zinc-900 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input 
            placeholder="Search your reflections..." 
            className="pl-10 h-11 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 rounded-md focus-visible:ring-zinc-400 dark:focus-visible:ring-zinc-600 shadow-sm transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                className={cn(
                  "h-11 px-4 rounded-md border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm text-zinc-700 dark:text-zinc-300",
                  selectedMood && "text-zinc-900 dark:text-zinc-50 border-zinc-400 dark:border-zinc-600"
                )}
              >
                <Filter className="h-4 w-4 mr-2" />
                {selectedMood ? selectedMood.charAt(0).toUpperCase() + selectedMood.slice(1) : "Mood"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-xl rounded-md">
              <div className="grid gap-1">
                <Button variant="ghost" size="sm" className="justify-start text-xs h-9 text-zinc-600 dark:text-zinc-400" onClick={() => setSelectedMood(null)}>All Moods</Button>
                {Object.keys(MOOD_ICONS).map((m) => {
                  const Icon = MOOD_ICONS[m].icon;
                  return (
                    <Button key={m} variant="ghost" size="sm" className="justify-start text-xs h-9 gap-2 text-zinc-700 dark:text-zinc-300" onClick={() => setSelectedMood(m)}>
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
              <Button 
                variant="outline" 
                className={cn(
                  "h-11 px-4 rounded-md border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm text-zinc-700 dark:text-zinc-300",
                  selectedDate && "text-zinc-900 dark:text-zinc-50 border-zinc-400 dark:border-zinc-600"
                )}
              >
                <CalendarIcon className="h-4 w-4 mr-2" />
                {selectedDate ? format(selectedDate, "MMM d") : "Date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-xl rounded-md">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
              />
              {selectedDate && (
                <div className="p-2 border-t border-zinc-200 dark:border-zinc-800">
                   <Button variant="ghost" size="sm" className="w-full text-xs h-8 text-zinc-600 dark:text-zinc-400" onClick={() => setSelectedDate(undefined)}>Clear Date</Button>
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
            <div className="p-6 rounded-full bg-zinc-50 dark:bg-zinc-900/50">
              <Music className="h-10 w-10 text-zinc-400 dark:text-zinc-600" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">No reflections found</h3>
              <p className="text-zinc-500 text-sm max-w-xs mx-auto">Try adjusting your filters or search terms.</p>
            </div>
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
  const [editMood, setEditMood] = useState(entry.mood || "");
  
  const editor = useEditor({
    extensions: [
      StarterKit, UnderlineExtension, TextStyle, Color, FontFamily, FontSize,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: 'Edit your story...' }),
    ],
    content: entry.content,
    editorProps: {
      attributes: {
        class: 'journal-editor focus:outline-none min-h-[400px] prose dark:prose-invert max-w-none text-zinc-900 dark:text-zinc-100',
      },
    },
  });

  useEffect(() => {
    if (editor && isEditing) {
      editor.commands.setContent(entry.content);
    }
  }, [isEditing, entry.content, editor]);

  const updateMutation = useMutation({
    mutationFn: (data: { content: string; mood: string }) => 
      updateJournalEntryAction(entry.id, data.content, data.mood || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.journal.all });
      setIsEditing(false);
      toast.success("Reflection updated.");
    }
  });

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this reflection?")) {
      try {
        await deleteJournalEntryAction(entry.id);
        queryClient.invalidateQueries({ queryKey: queryKeys.journal.all });
        setIsOpen(false);
        toast.success("Reflection deleted.");
      } catch (e) {
        toast.error("Failed to delete.");
      }
    }
  };

  const moodData = entry.mood ? MOOD_ICONS[entry.mood] : null;
  const MoodIcon = moodData?.icon;

  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);
    if (url === null) return;
    if (url === '') { editor.chain().focus().extendMarkRange('link').unsetLink().run(); return; }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="group cursor-pointer h-full"
        onClick={() => setIsOpen(true)}
      >
        <Card className="h-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-300 overflow-hidden flex flex-col shadow-sm hover:shadow-md relative rounded-lg">
          <CardHeader className="p-4 pb-3">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-md overflow-hidden bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shrink-0">
                  {entry.song.coverArt && <img src={entry.song.coverArt} alt={entry.song.title} className="h-full w-full object-cover" />}
                </div>
                <div className="flex flex-col min-w-0">
                  <CardTitle className="text-sm font-bold truncate pr-2 text-zinc-900 dark:text-zinc-50">{entry.song.title}</CardTitle>
                  <span className="text-[10px] text-zinc-500 truncate uppercase tracking-wider">{entry.song.artist}</span>
                </div>
              </div>
              {MoodIcon && <MoodIcon className="h-4 w-4 text-zinc-400 dark:text-zinc-500 shrink-0" />}
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0 flex-1 overflow-hidden">
            <div 
              className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed line-clamp-4 font-serif prose dark:prose-invert prose-xs"
              dangerouslySetInnerHTML={{ __html: entry.content }}
            />
          </CardContent>
          <CardFooter className="p-4 pt-0 flex items-center justify-between mt-auto">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              {format(new Date(entry.createdAt), "MMM d, yyyy")}
            </span>
            <ChevronRight className="h-4 w-4 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </CardFooter>
        </Card>
      </motion.div>

      <Dialog open={isOpen} onOpenChange={(val) => {
        setIsOpen(val);
        if (!val) setIsEditing(false);
      }}>
        <DialogContent className="w-full sm:max-w-[95vw] h-full sm:h-[95vh] p-0 overflow-hidden bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 border border-zinc-200 dark:border-zinc-800 shadow-xl flex flex-col rounded-none sm:rounded-lg">
          <style jsx global>{`
            .journal-editor::selection {
              background: rgba(0, 0, 0, 0.1) !important;
            }
            .dark .journal-editor::selection {
              background: rgba(255, 255, 255, 0.15) !important;
            }
            .journal-editor p.is-editor-empty:first-child::before {
              content: attr(data-placeholder);
              float: left;
              color: #a1a1aa;
              pointer-events: none;
              height: 0;
            }
            .dark .journal-editor p.is-editor-empty:first-child::before {
              color: #52525b;
            }
            .journal-editor h1 { font-size: 2.25rem; font-weight: 700; margin-bottom: 1rem; tracking: -0.02em; color: inherit; }
            .journal-editor h2 { font-size: 1.75rem; font-weight: 600; margin-bottom: 0.75rem; tracking: -0.01em; color: inherit; }
            .journal-editor blockquote { 
              border-left: 3px solid #e4e4e7; 
              padding-left: 1rem; 
              font-style: italic; 
              margin-bottom: 1rem;
              color: #71717a;
            }
            .dark .journal-editor blockquote {
              border-left-color: #27272a;
              color: #a1a1aa;
            }
            .journal-editor ul { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 1rem; }
            .journal-editor ol { list-style-type: decimal; padding-left: 1.5rem; margin-bottom: 1rem; }
            .journal-editor a { color: inherit; text-decoration: underline; text-underline-offset: 4px; }
          `}</style>
          
          <DialogHeader className="px-4 py-3 md:px-12 md:py-6 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shrink-0">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
              <div className="flex items-center gap-4 min-w-0">
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-md overflow-hidden bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 relative group shrink-0">
                  {entry.song.coverArt && <img src={entry.song.coverArt} alt={entry.song.title} className="h-full w-full object-cover" />}
                  <Button size="icon" className="absolute inset-0 bg-zinc-900/60 dark:bg-zinc-100/60 opacity-0 md:group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); onPlay(); }}>
                    <Play className="h-5 w-5 fill-white dark:fill-zinc-900 text-white dark:text-zinc-900" />
                  </Button>
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-3">
                    <DialogTitle className="text-sm md:text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50 truncate leading-tight">{entry.song.title}</DialogTitle>
                    {!isEditing && MoodIcon && (
                      <Badge variant="outline" className="h-5 px-1.5 text-[9px] bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 capitalize flex items-center gap-1 font-medium">
                        <MoodIcon className="h-3 w-3" /> {entry.mood}
                      </Badge>
                    )}
                  </div>
                  <DialogDescription className="text-[9px] md:text-xs font-normal text-zinc-400 dark:text-zinc-500 truncate tracking-wider uppercase mt-0.5">{entry.song.artist}</DialogDescription>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!isEditing && (
                  <Button variant="outline" onClick={onPlay} className="hidden md:flex h-8 text-xs gap-1.5 rounded-md border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900">
                    <Play className="h-3 w-3 fill-current" /> Play
                  </Button>
                )}
                <div className="hidden md:block w-px h-6 bg-zinc-200 dark:bg-zinc-800 mx-1" />
                {isEditing ? (
                  <div className="flex gap-2 w-full md:w-auto">
                    <Button variant="ghost" onClick={() => setIsEditing(false)} className="flex-1 md:flex-none h-8 text-xs font-medium rounded-md text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 px-4 transition-all">Cancel</Button>
                    <Button onClick={() => updateMutation.mutate({ content: editor?.getHTML() || "", mood: editMood })} disabled={updateMutation.isPending} className="flex-1 md:flex-none h-8 text-xs font-semibold rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all active:scale-95 shadow-none px-6">
                      {updateMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                      Save Details
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2 w-full md:w-auto">
                    <Button variant="ghost" onClick={handleDelete} className="h-8 w-8 p-0 rounded-md text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button variant="secondary" onClick={() => setIsEditing(true)} className="flex-1 md:flex-none h-8 text-xs font-semibold rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 hover:bg-zinc-200 dark:hover:bg-zinc-700 px-6">
                      Edit
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-zinc-950 relative overflow-hidden">
            {isEditing && editor && (
              <BubbleMenu editor={editor}>
                <motion.div 
                  initial={{ opacity: 0, scale: 0.98, y: 4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className="flex items-center gap-0.5 p-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md shadow-md max-w-[90vw]"
                >
                  <div className="flex items-center gap-0.5 px-0.5 border-r border-zinc-200 dark:border-zinc-800">
                    <Button variant="ghost" size="icon" className={cn("h-7 w-7 rounded-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800", editor.isActive('bold') && "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50")} onClick={() => editor.chain().focus().toggleBold().run()}>
                      <Bold className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className={cn("h-7 w-7 rounded-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800", editor.isActive('italic') && "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50")} onClick={() => editor.chain().focus().toggleItalic().run()}>
                      <Italic className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className={cn("h-7 w-7 rounded-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800", editor.isActive('underline') && "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
                      <Underline className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-0.5 px-0.5 border-r border-zinc-200 dark:border-zinc-800">
                    <Button variant="ghost" size="icon" className={cn("h-7 w-7 rounded-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800", editor.isActive('heading', { level: 1 }) && "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50")} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
                      <Heading1 className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className={cn("h-7 w-7 rounded-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800", editor.isActive('heading', { level: 2 }) && "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50")} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
                      <Heading2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className={cn("h-7 w-7 rounded-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800", editor.isActive('blockquote') && "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
                      <Quote className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-0.5 px-0.5 border-r border-zinc-200 dark:border-zinc-800">
                    <Select onValueChange={(val) => editor.chain().focus().setFontFamily(val as string).run()}>
                      <SelectTrigger className="w-[70px] h-7 bg-transparent border-none text-[11px] font-medium text-zinc-600 dark:text-zinc-400 focus:ring-0 px-1">
                        <Type className="h-3 w-3 mr-1" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-md">
                        {FONTS.map(f => <SelectItem key={f.value} value={f.value} className="text-xs">{f.label}</SelectItem>)}
                      </SelectContent>
                    </Select>

                    <Select onValueChange={(val) => editor.chain().focus().setFontSize(val as string).run()}>
                      <SelectTrigger className="w-[65px] h-7 bg-transparent border-none text-[11px] font-medium text-zinc-600 dark:text-zinc-400 focus:ring-0 px-1">
                        <CaseUpper className="h-3 w-3 mr-1" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-md">
                        {FONT_SIZES.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-0.5 px-0.5 border-r border-zinc-200 dark:border-zinc-800">
                    <Button variant="ghost" size="icon" className={cn("h-7 w-7 rounded-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800", editor.isActive('link') && "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50")} onClick={setLink}>
                      <LinkIcon className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-0.5 px-0.5">
                     <div className="relative group p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-sm transition-colors cursor-pointer">
                        <Palette className="h-3.5 w-3.5 text-zinc-500" />
                        <input 
                          type="color" 
                          onInput={(e) => editor.chain().focus().setColor((e.target as HTMLInputElement).value).run()}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                     </div>
                  </div>
                </motion.div>
              </BubbleMenu>
            )}
            
            <ScrollArea className="h-full w-full">
              <div className="p-4 md:p-8 lg:p-12 pb-20 max-w-4xl mx-auto space-y-6">
                <div className="flex items-center gap-2 opacity-40">
                  <PenLine className="h-4 w-4 text-zinc-500" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    {isEditing ? "Editing Reflection" : "Recorded on " + format(new Date(entry.createdAt), "MMMM do, yyyy")}
                  </span>
                </div>
                
                {isEditing ? (
                  <EditorContent editor={editor} className="font-serif text-xl md:text-2xl leading-relaxed min-h-[400px] text-zinc-900 dark:text-zinc-50" />
                ) : (
                  <div 
                    className="prose dark:prose-invert font-serif text-xl md:text-2xl leading-relaxed max-w-none text-zinc-900 dark:text-zinc-50"
                    dangerouslySetInnerHTML={{ __html: entry.content }}
                  />
                )}
              </div>
            </ScrollArea>
          </div>

          {isEditing && (
            <div className="p-2 md:p-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shrink-0 flex flex-col md:flex-row gap-4 md:justify-between md:items-center px-6 md:px-12">
              <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
                <div className="flex items-center gap-3">
                   <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Update Mood</span>
                   <ToggleGroup type="single" value={editMood ? [editMood] : []} onValueChange={(val: string[]) => setEditMood(val[0] || "")} className="gap-1">
                     {Object.keys(MOOD_ICONS).map((m) => {
                       const Icon = MOOD_ICONS[m].icon;
                       return (
                         <ToggleGroupItem 
                          key={m} 
                          value={m} 
                          className="h-8 w-8 rounded-md p-0 border border-transparent transition-all hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-400 data-[state=on]:bg-zinc-900 data-[pressed]:bg-zinc-900 dark:data-[state=on]:bg-white dark:data-[pressed]:bg-white data-[state=on]:text-white data-[pressed]:text-white dark:data-[state=on]:text-zinc-950 dark:data-[pressed]:text-zinc-950"
                          title={MOOD_ICONS[m].label}
                         >
                           <Icon className="h-4 w-4" />
                         </ToggleGroupItem>
                       );
                     })}
                   </ToggleGroup>
                </div>
                <div className="hidden md:block h-5 w-px bg-zinc-200 dark:bg-zinc-800" />
                <div className="hidden lg:flex items-center gap-2 opacity-40">
                   <div className="w-1.5 h-1.5 rounded-full bg-zinc-400 dark:bg-zinc-600" />
                   <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Encrypted</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

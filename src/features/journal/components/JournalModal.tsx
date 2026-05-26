"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SongMetadata } from "@/lib/music/types";
import { createJournalEntryAction } from "@/server/actions/journal.actions";
import { getSongMeaningAction, askAiAction } from "@/server/actions/ai.actions";
import { 
  Sparkles, PenLine, Loader2, MessageSquare, Send, Bot, X, Info, HelpCircle, 
  Smile, Frown, Zap, Cloud, Heart, Ghost, 
  Bold, Italic, Underline, Palette, Heading1, Heading2, List, ListOrdered,
  Quote, Link as LinkIcon, Type, CaseUpper
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
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
  addOptions() {
    return {
      types: ['textStyle'],
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: element => element.style.fontSize.replace(/['"]+/g, ''),
            renderHTML: attributes => {
              if (!attributes.fontSize) return {};
              return { style: `font-size: ${attributes.fontSize}` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize: (fontSize: string) => ({ chain }) => {
        return chain().setMark('textStyle', { fontSize }).run();
      },
      unsetFontSize: () => ({ chain }) => {
        return chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run();
      },
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

interface Message {
  role: "user" | "ai";
  content: string;
}

interface AIAnalysis {
  summary: string;
  emotionalThemes: string[];
  prompts: string[];
}

const MOODS = [
  { value: "happy", icon: Smile, label: "Happy" },
  { value: "sad", icon: Frown, label: "Sad" },
  { value: "energetic", icon: Zap, label: "Energetic" },
  { value: "calm", icon: Cloud, label: "Calm" },
  { value: "loved", icon: Heart, label: "Loved" },
  { value: "melancholy", icon: Ghost, label: "Melancholy" },
];

const FONTS = [
  { label: 'Serif', value: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif' },
  { label: 'Sans', value: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' },
  { label: 'Mono', value: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' },
  { label: 'Cursive', value: 'cursive' },
  { label: 'Fantasy', value: 'fantasy' },
];

const FONT_SIZES = ['12px', '14px', '16px', '18px', '20px', '24px', '30px', '36px', '48px', '60px'];

export function JournalModal({ song, trigger }: { song: SongMetadata; trigger?: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mood, setMood] = useState<string>(""); 
  const [isSaving, setIsSaving] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  
  const [isAiOpen, setIsAiOpen] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [isEditorEmpty, setIsEditorEmpty] = useState(true);

  const chatScrollRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      UnderlineExtension,
      TextStyle,
      Color,
      FontFamily,
      FontSize,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: 'Write your story...' }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'journal-editor focus:outline-none min-h-[600px] prose dark:prose-invert max-w-none text-zinc-900 dark:text-zinc-100',
      },
    },
    onUpdate: ({ editor }) => {
    // This forces React to re-render and check if there is actual text or HTML
    setIsEditorEmpty(editor.isEmpty);
  },
  });

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, isLoadingAi]);

  const handleAction = async (type: "lyrics" | "insights") => {
    setIsAiOpen(true);
    setIsLoadingAi(true);
    const prompt = type === "lyrics" ? "Explain the lyrics of this song." : "Give me some emotional insights and themes for this track.";
    
    setMessages(prev => [...prev, { role: "user", content: prompt }]);

    try {
      const result = await getSongMeaningAction(song.id, song.title, song.artist) as unknown as AIAnalysis;
      const content = type === "lyrics" ? result.summary : `Themes: ${result.emotionalThemes.join(", ")}. \n\nReflections: ${result.prompts.join("\n")}`;
      setMessages(prev => [...prev, { role: "ai", content }]);
    } catch (e: unknown) {
      toast.error("AI failed to respond.");
    } finally {
      setIsLoadingAi(false);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoadingAi) return;

    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setIsLoadingAi(true);

    try {
      const { response } = await askAiAction(song.id, song.title, song.artist, userMsg);
      setMessages(prev => [...prev, { role: "ai", content: response }]);
    } catch (e: unknown) {
      toast.error("AI failed to respond.");
    } finally {
      setIsLoadingAi(false);
    }
  };

  const handleSave = async () => {
    if (!editor) return;
    const html = editor.getHTML();
    if (editor.isEmpty) return toast.error("Write a reflection first.");
    
    setIsSaving(true);
    try {
      await createJournalEntryAction(
        song.id, 
        song.title, 
        song.artist, 
        html, 
        mood || undefined,
        song.previewUrl,
        song.coverArt
      );
      toast.success("Reflection saved.");
      setIsOpen(false);
      editor.commands.clearContent();
      setMood("");
    } catch (e: unknown) {
      toast.error("Failed to save.");
    } finally {
      setIsSaving(false);
    }
  };

  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);

    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  if (!editor) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="h-8 text-xs gap-2 rounded-md border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-900">
            <PenLine className="h-3 w-3" /> Journal
          </Button>
        )}
      </DialogTrigger>
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
        
        <DialogHeader className="px-4 py-1 md:px-12 md:py-6 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shrink-0">
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-4 min-w-0">
              <div className="h-5 w-5 md:h-10 md:w-10 rounded-md overflow-hidden bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shrink-0">
                {song.coverArt && <img src={song.coverArt} alt={song.title} className="h-full w-full object-cover" />}
              </div>
              <div className="flex flex-col min-w-0">
                <DialogTitle className="text-sm md:text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50 truncate leading-tight">{song.title}</DialogTitle>
                <DialogDescription className="text-[9px] md:text-xs font-normal text-zinc-400 dark:text-zinc-500 truncate tracking-wider uppercase">{song.artist}</DialogDescription>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-2">
               <div className="flex p-0.5 bg-zinc-100 dark:bg-zinc-900 rounded-md border border-zinc-200 dark:border-zinc-800">
                 <Button 
                   variant="ghost" 
                   size="sm" 
                   className={cn("h-7 text-xs rounded-sm px-4 transition-all text-zinc-600 dark:text-zinc-400 font-medium", !isPreview && "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 shadow-sm")}
                   onClick={() => setIsPreview(false)}
                 >
                   Edit
                 </Button>
                 <Button 
                   variant="ghost" 
                   size="sm" 
                   className={cn("h-7 text-xs rounded-sm px-4 transition-all text-zinc-600 dark:text-zinc-400 font-medium", isPreview && "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 shadow-sm")}
                   onClick={() => setIsPreview(true)}
                 >
                   Preview
                 </Button>
               </div>
               <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-800 mx-1" />
               <Button variant="outline" size="sm" onClick={() => handleAction("lyrics")} className="h-8 text-xs gap-1.5 rounded-md border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900">
                 <Info className="h-3.5 w-3.5" /> Explain
               </Button>
               <Button variant="outline" size="sm" onClick={() => handleAction("insights")} className="h-8 text-xs gap-1.5 rounded-md border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900">
                 <HelpCircle className="h-3.5 w-3.5" /> Insights
               </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 flex overflow-hidden min-h-0 relative bg-white dark:bg-zinc-950">
          {editor && (
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
          
          <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-zinc-950 relative">
             <ScrollArea className="h-full w-full">
               <div className="p-1 md:p-2 lg:p-2 pb-4 max-w-[98%] mx-auto space-y-2">
                 <div className="flex items-center gap-2 opacity-40">
                    <PenLine className="h-4 w-4 text-zinc-500" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      {isPreview ? "Preview" : "Draft"}
                    </span>
                 </div>
                 
                 {isPreview ? (
                   <div className="prose dark:prose-invert max-w-none font-serif leading-relaxed text-zinc-800 dark:text-zinc-200">
                      <div dangerouslySetInnerHTML={{ __html: editor.getHTML() || "<p class='italic text-zinc-400'>Empty entry...</p>" }} />
                   </div>
                 ) : (
                   <EditorContent editor={editor} className="font-serif text-xl md:text-2xl leading-relaxed min-h-[600px] text-zinc-900 dark:text-zinc-50" />
                 )}
               </div>
             </ScrollArea>
          </div>

          <AnimatePresence>
            {isAiOpen && (
              <motion.div 
                key="ai-sidebar"
                initial={{ width: 0, opacity: 0 }}
                animate={{ 
                  width: window.innerWidth < 768 ? "100%" : 400, 
                  opacity: 1,
                  position: window.innerWidth < 768 ? "absolute" : "relative",
                  zIndex: 50
                }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ type: "tween", duration: 0.2 }}
                className="inset-0 border-l border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex flex-col shadow-sm min-h-0"
              >
                <div className="p-4 md:p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0 bg-zinc-50 dark:bg-zinc-900/50">
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4 text-zinc-500" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">Resonance AI</span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-md" onClick={() => setIsAiOpen(false)}>
                    <X className="h-4 w-4 text-zinc-500" />
                  </Button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 scrollbar-none min-h-0" ref={chatScrollRef}>
                  {messages.length === 0 && !isLoadingAi && (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-40 space-y-4 p-4">
                      <MessageSquare className="h-10 w-10 text-zinc-400" />
                      <p className="text-xs font-medium leading-normal max-w-[220px] text-zinc-500">Ask anything about the lyrics, themes, or emotions of this song.</p>
                    </div>
                  )}
                  {messages.map((m, i) => (
                    <div 
                      key={i} 
                      className={cn("flex flex-col gap-1.5", m.role === "user" ? "items-end" : "items-start")}
                    >
                      <div className={cn(
                        "max-w-[90%] rounded-md px-3.5 py-2 text-xs md:text-sm leading-relaxed",
                        m.role === "user" 
                          ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-sm" 
                          : "bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-800"
                      )}>
                        {m.content.split('\n').map((line, j) => (
                          <p key={j} className={line.trim() === "" ? "h-3" : "mb-1.5 last:mb-0"}>{line}</p>
                        ))}
                      </div>
                    </div>
                  ))}
                  {isLoadingAi && (
                    <div className="flex gap-2 items-center text-zinc-400 dark:text-zinc-500 text-[10px] uppercase tracking-wider font-semibold pl-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Processing
                    </div>
                  )}
                </div>

                <form onSubmit={handleSendMessage} className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shrink-0">
                  <div className="relative flex items-center">
                    <Input 
                      placeholder="Ask anything..." 
                      className="h-9 pl-3 pr-10 bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-xs md:text-sm rounded-md focus-visible:ring-zinc-400 dark:focus-visible:ring-zinc-600 focus-visible:bg-white dark:focus-visible:bg-zinc-900 transition-all shadow-none" 
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      disabled={isLoadingAi}
                    />
                    <Button 
                      type="submit" 
                      size="icon" 
                      className="absolute right-1 top-1 h-7 w-7 rounded-sm bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all active:scale-95 shadow-none" 
                      disabled={isLoadingAi || !input.trim()}
                    >
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {!isAiOpen && (
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="absolute right-6 bottom-6 z-50">
              <Button 
                variant="outline" 
                size="icon" 
                className="h-10 w-10 rounded-md shadow-sm bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all"
                onClick={() => setIsAiOpen(true)}
              >
                <Sparkles className="h-4 w-4" />
              </Button>
            </motion.div>
          )}
        </div>

        <div className="p-2 md:p-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shrink-0 flex flex-col md:flex-row gap-4 md:justify-between md:items-center px-6 md:px-12">
          <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
            <div className="flex items-center gap-3">
               <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Mood</span>
               <ToggleGroup type="single" value={mood ? [mood] : []} onValueChange={(val: string[]) => setMood(val[0] || "")} className="gap-1">
                 {MOODS.map((m) => (
                   <ToggleGroupItem 
                    key={m.value} 
                    value={m.value} 
                    className="h-8 w-8 rounded-md p-0 border border-transparent transition-all hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-400 data-[state=on]:bg-zinc-900 data-[pressed]:bg-zinc-900 dark:data-[state=on]:bg-white dark:data-[pressed]:bg-white data-[state=on]:text-white data-[pressed]:text-white dark:data-[state=on]:text-zinc-950 dark:data-[pressed]:text-zinc-950"
                    title={m.label}
                   >
                     <m.icon className="h-4 w-4" />
                   </ToggleGroupItem>
                 ))}
               </ToggleGroup>
            </div>
            <div className="hidden md:block h-5 w-px bg-zinc-200 dark:bg-zinc-800" />
            <div className="hidden lg:flex items-center gap-2 opacity-40">
               <div className=" w-1.5 h-1.5 rounded-full bg-zinc-400 dark:bg-zinc-600" />
               <span className=" text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Encrypted</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setIsOpen(false)} className="flex-1 md:flex-none text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 px-4 h-9 rounded-md text-xs transition-all font-medium">Discard</Button>
            <Button onClick={handleSave} disabled={isSaving || editor.isEmpty || isEditorEmpty} className="flex-[2] md:flex-none md:px-6 h-9 text-xs font-semibold rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all active:scale-95 shadow-none">
              {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <PenLine className="h-3.5 w-3.5 mr-1.5" />}
              Publish
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

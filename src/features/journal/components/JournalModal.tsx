"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { SongMetadata } from "@/lib/music/types";
import { createJournalEntryAction } from "@/server/actions/journal.actions";
import { getSongMeaningAction, askAiAction } from "@/server/actions/ai.actions";
import { Sparkles, PenLine, Loader2, MessageSquare, Send, Bot, X, Info, HelpCircle, Smile, Frown, Zap, Cloud, Heart, Ghost } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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

export function JournalModal({ song, trigger }: { song: SongMetadata; trigger?: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [reflection, setReflection] = useState("");
  const [mood, setMood] = useState<string>(""); 
  const [isSaving, setIsSaving] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  
  const [isAiOpen, setIsAiOpen] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

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
    if (!reflection.trim()) return toast.error("Write a reflection first.");
    setIsSaving(true);
    try {
      await createJournalEntryAction(
        song.id, 
        song.title, 
        song.artist, 
        reflection, 
        mood || undefined,
        song.previewUrl,
        song.coverArt
      );
      toast.success("Reflection saved.");
      setIsOpen(false);
      setReflection("");
      setMood("");
    } catch (e: unknown) {
      toast.error("Failed to save.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="h-8 text-xs gap-2">
            <PenLine className="h-3 w-3" /> Journal
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-[90vw] min-w-[90vw] h-[95vh] p-0 overflow-hidden glass border-white/10 shadow-2xl flex flex-col">
        <DialogHeader className="p-6 border-b border-white/5 bg-background/40 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg overflow-hidden bg-secondary ring-1 ring-white/10">
                {song.coverArt && <img src={song.coverArt} alt={song.title} className="h-full w-full object-cover" />}
              </div>
              <div className="flex flex-col">
                <DialogTitle className="text-lg font-bold">{song.title}</DialogTitle>
                <DialogDescription className="text-xs">{song.artist}</DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-4 pr-8">
               <div className="flex items-center gap-2">
                 <Button 
                   variant={!isPreview ? "secondary" : "ghost"} 
                   size="sm" 
                   className="h-8 text-xs rounded-full px-4"
                   onClick={() => setIsPreview(false)}
                 >
                   Write
                 </Button>
                 <Button 
                   variant={isPreview ? "secondary" : "ghost"} 
                   size="sm" 
                   className="h-8 text-xs rounded-full px-4"
                   onClick={() => setIsPreview(true)}
                 >
                   Preview
                 </Button>
               </div>
               <div className="h-4 w-px bg-white/10 mx-2" />
               <Button variant="outline" size="sm" onClick={() => handleAction("lyrics")} className="h-8 text-xs gap-2 rounded-full border-primary/20 hover:bg-primary/10">
                 <Info className="h-3 w-3 text-primary" /> Explain Lyrics
               </Button>
               <Button variant="outline" size="sm" onClick={() => handleAction("insights")} className="h-8 text-xs gap-2 rounded-full border-primary/20 hover:bg-primary/10">
                 <HelpCircle className="h-3 w-3 text-primary" /> AI Insights
               </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 flex overflow-hidden min-h-0">
          <div className="flex-1 flex flex-col min-w-0 bg-background/20 relative">
             <ScrollArea className="h-full w-full">
               <div className="p-16 pb-40 max-w-5xl mx-auto space-y-10">
                 <div className="flex items-center gap-4 mb-4 opacity-30">
                    <PenLine className="h-6 w-6 text-primary" />
                    <span className="text-sm font-bold uppercase tracking-[0.5em]">
                      {isPreview ? "Reflection Preview" : "Deep Reflection"}
                    </span>
                 </div>
                 
                 {isPreview ? (
                   <div className="prose prose-invert prose-2xl max-w-none font-serif leading-relaxed italic text-foreground/90">
                     <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {reflection || "*Empty reflection...*"}
                     </ReactMarkdown>
                   </div>
                 ) : (
                   <Textarea 
                     placeholder="Start writing your thoughts here... (Supports Markdown: **bold**, *italic*, # headings)"
                     className="w-full bg-transparent border-none focus-visible:ring-0 p-0 text-3xl leading-relaxed placeholder:text-muted-foreground/10 resize-none font-serif min-h-[700px]"
                     value={reflection}
                     onChange={(e) => setReflection(e.target.value)}
                   />
                 )}
               </div>
             </ScrollArea>
          </div>

          <AnimatePresence mode="wait">
            {isAiOpen ? (
              <motion.div 
                key="ai-sidebar"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 520, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="border-l border-white/10 bg-secondary/10 backdrop-blur-3xl flex flex-col shadow-2xl relative min-h-0"
              >
                <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3 text-primary">
                    <div className="p-2 rounded-xl bg-primary/10">
                      <Bot className="h-5 w-5" />
                    </div>
                    <span className="text-sm font-bold uppercase tracking-widest">Resonance AI</span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-white/5 rounded-full" onClick={() => setIsAiOpen(false)}>
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-none min-h-0" ref={chatScrollRef}>
                  {messages.length === 0 && !isLoadingAi && (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-30 space-y-4 px-10">
                      <div className="p-5 rounded-full bg-primary/5">
                        <MessageSquare className="h-12 w-12 text-primary" />
                      </div>
                      <p className="text-sm font-medium leading-relaxed">Ask about the song&apos;s meaning, emotional themes, or lyrical analysis.</p>
                    </div>
                  )}
                  {messages.map((m, i) => (
                    <div key={i} className={cn("flex flex-col gap-2", m.role === "user" ? "items-end" : "items-start")}>
                      <div className={cn(
                        "max-w-[92%] rounded-2xl px-5 py-4 text-sm leading-relaxed shadow-sm",
                        m.role === "user" 
                          ? "bg-primary text-primary-foreground shadow-primary/20" 
                          : "bg-white/5 text-foreground/90 border border-white/5"
                      )}>
                        {m.content.split('\n').map((line, j) => (
                          <p key={j} className={line.trim() === "" ? "h-3" : "mb-1 last:mb-0"}>{line}</p>
                        ))}
                      </div>
                    </div>
                  ))}
                  {isLoadingAi && (
                    <div className="flex gap-3 items-center text-muted-foreground text-[10px] uppercase tracking-widest pl-3">
                      <div className="flex gap-1.5">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" />
                        <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.2s]" />
                        <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.4s]" />
                      </div>
                      AI is composing
                    </div>
                  )}
                </div>

                <form onSubmit={handleSendMessage} className="p-6 border-t border-white/5 bg-background/40 shrink-0">
                  <div className="relative">
                    <Input 
                      placeholder="Ask anything about the song..." 
                      className="h-14 pl-5 pr-14 bg-white/5 border-white/10 text-sm rounded-2xl focus-visible:ring-primary/40 focus-visible:bg-white/10 transition-all" 
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      disabled={isLoadingAi}
                    />
                    <Button 
                      type="submit" 
                      size="icon" 
                      className="absolute right-2 top-2 h-10 w-10 rounded-xl transition-all active:scale-90 shadow-lg shadow-primary/30" 
                      disabled={isLoadingAi || !input.trim()}
                    >
                      <Send className="h-5 w-5" />
                    </Button>
                  </div>
                </form>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {!isAiOpen && (
            <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="absolute right-8 bottom-8">
              <Button 
                variant="secondary" 
                size="icon" 
                className="h-14 w-14 rounded-full shadow-2xl bg-primary text-primary-foreground hover:scale-110 transition-transform active:scale-95 group"
                onClick={() => setIsAiOpen(true)}
              >
                <Sparkles className="h-6 w-6 group-hover:rotate-12 transition-transform" />
              </Button>
            </motion.div>
          )}
        </div>

        <div className="p-6 border-t border-white/5 bg-secondary/30 shrink-0 flex justify-between items-center px-10">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
              <span className="w-2 h-2 rounded-full bg-green-500/50 animate-pulse" />
              Private Workspace
            </div>
            <div className="h-4 w-px bg-white/10" />
            <div className="flex items-center gap-3">
               <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Mood</span>
               <ToggleGroup type="single" value={mood} onValueChange={(val) => setMood(val || "")} className="gap-1">
                 {MOODS.map((m) => (
                   <ToggleGroupItem key={m.value} value={m.value} className="h-8 w-8 rounded-full p-0 border-none data-[state=on]:bg-primary/20" title={m.label}>
                     <m.icon className="h-4 w-4" />
                   </ToggleGroupItem>
                 ))}
               </ToggleGroup>
            </div>
          </div>
          <div className="flex gap-4">
            <Button variant="ghost" onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground">Discard</Button>
            <Button onClick={handleSave} disabled={isSaving || !reflection.trim()} className="px-10 h-11 text-sm font-bold shadow-2xl shadow-primary/20 rounded-xl">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <PenLine className="h-4 w-4 mr-2" />}
              Save Reflection
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

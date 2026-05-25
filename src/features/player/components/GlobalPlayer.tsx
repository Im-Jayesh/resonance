"use client";

import { usePlayerStore } from "@/stores/use-player-store";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  Maximize2, 
  Repeat, 
  Repeat1,
  ChevronUp,
  ChevronDown,
  LayoutList,
  X,
  Music
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getSongMeaningAction } from "@/server/actions/ai.actions";
import { getLyricsAction } from "@/server/actions/music.actions";
import { ScrollArea } from "@/components/ui/scroll-area";

interface LRCLine {
  time: number;
  text: string;
}

export function GlobalPlayer() {
  const { 
    currentSong, 
    isPlaying, 
    togglePlay, 
    next, 
    previous, 
    volume, 
    setVolume, 
    loopMode, 
    setLoopMode 
  } = usePlayerStore();
  
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [lyricsRaw, setLyricsRaw] = useState<string | null>(null);
  const [isLoadingLyrics, setIsLoadingLyrics] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lyricsScrollRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Parse LRC lyrics
  const parsedLyrics = useMemo(() => {
    if (!lyricsRaw) return [];
    const lines = lyricsRaw.split("\n");
    const result: LRCLine[] = [];
    const lrcRegex = /^\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/;

    lines.forEach(line => {
      const match = line.match(lrcRegex);
      if (match) {
        const minutes = parseInt(match[1]);
        const seconds = parseInt(match[2]);
        const milliseconds = parseInt(match[3]);
        const time = minutes * 60 + seconds + milliseconds / 1000;
        result.push({ time, text: match[4].trim() });
      }
    });

    return result;
  }, [lyricsRaw]);

  // Find active lyric line
  const activeLineIndex = useMemo(() => {
    if (parsedLyrics.length === 0) return -1;
    let index = -1;
    for (let i = 0; i < parsedLyrics.length; i++) {
      if (currentTime >= parsedLyrics[i].time) {
        index = i;
      } else {
        break;
      }
    }
    return index;
  }, [parsedLyrics, currentTime]);

  const seekTo = useCallback((time: number) => {
    if (audioRef.current && isFinite(time)) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  // Auto-scroll lyrics
  useEffect(() => {
    if (activeLineIndex !== -1 && lyricsScrollRef.current) {
      const activeElement = lyricsScrollRef.current.querySelector(`[data-index="${activeLineIndex}"]`);
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [activeLineIndex]);

  const fetchLyrics = useCallback(async () => {
    if (!currentSong) return;
    setIsLoadingLyrics(true);
    try {
      const lyrics = await getLyricsAction(currentSong.id);
      setLyricsRaw(lyrics);
    } catch {
      setLyricsRaw("Lyrics not available for this track.");
    } finally {
      setIsLoadingLyrics(false);
    }
  }, [currentSong]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    if (currentSong && audioRef.current) {
      audioRef.current.src = currentSong.previewUrl || ""; 
      if (isPlaying) {
         audioRef.current.play().catch(() => console.warn("Playback prevented"));
      }
      setLyricsRaw(null);
    }
  }, [currentSong, isPlaying]);

  useEffect(() => {
    if (showLyrics && currentSong && !lyricsRaw && !isLoadingLyrics) {
      const timer = setTimeout(() => fetchLyrics(), 0);
      return () => clearTimeout(timer);
    }
  }, [showLyrics, currentSong, lyricsRaw, isLoadingLyrics, fetchLyrics]);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(() => console.warn("Playback prevented"));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  const handleTimeUpdate = () => {
    if (audioRef.current && audioRef.current.duration && !isDragging) {
      const current = audioRef.current.currentTime;
      const total = audioRef.current.duration;
      if (isFinite(current) && isFinite(total) && total > 0) {
        setCurrentTime(current);
        setProgress((current / total) * 100);
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      const d = audioRef.current.duration;
      if (isFinite(d)) setDuration(d);
    }
  };

  const handleSliderChange = (value: number | readonly number[]) => {
    const val = Array.isArray(value) ? value[0] : value;
    setIsDragging(true);
    if (typeof val !== "number" || !isFinite(val)) return;
    
    setProgress(val);
    if (isFinite(duration) && duration > 0) {
      setCurrentTime((val / 100) * duration);
    }
  };

  const handleSliderCommit = () => {
    if (audioRef.current && isFinite(duration) && duration > 0) {
      const targetTime = (progress / 100) * duration;
      if (isFinite(targetTime)) {
        audioRef.current.currentTime = targetTime;
        setCurrentTime(targetTime);
      }
    }
    setTimeout(() => {
      if (mountedRef.current) setIsDragging(false);
    }, 100);
  };

  const handleVolumeChange = (value: number | readonly number[]) => {
    const val = Array.isArray(value) ? value[0] : value;
    if (typeof val !== "number" || !isFinite(val)) return;
    
    const clampedValue = Math.min(Math.max(val, 0), 100);
    const newVolume = clampedValue / 100;
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const toggleLoop = () => {
    if (loopMode === "none") setLoopMode("all");
    else if (loopMode === "all") setLoopMode("one");
    else setLoopMode("none");
  };

  const formatTime = (time: number) => {
    if (typeof time !== "number" || isNaN(time) || !isFinite(time)) return "0:00";
    const totalSeconds = Math.max(0, Math.floor(time));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  if (!currentSong) return null;

  return (
    <>
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="fixed bottom-0 left-0 right-0 h-24 glass border-t border-white/5 z-50 px-4 md:px-8 flex items-center justify-between"
      >
        <div className="flex items-center gap-4 w-1/3">
          <div 
            className="h-14 w-14 rounded-md overflow-hidden bg-secondary cursor-pointer group relative shadow-lg"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {currentSong.coverArt && <img src={currentSong.coverArt} alt={currentSong.title} className="h-full w-full object-cover group-hover:scale-110 transition-transform" />}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
               <ChevronUp className="h-4 w-4 text-white" />
            </div>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-medium text-sm truncate max-w-[200px]">{currentSong.title}</span>
            <span className="text-xs text-muted-foreground truncate max-w-[200px]">{currentSong.artist}</span>
          </div>
        </div>

        <div className="flex flex-col items-center gap-2 w-1/3">
          <div className="flex items-center gap-6">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={toggleLoop} className={cn("h-8 w-8", loopMode !== "none" && "text-primary")}>
                  {loopMode === "one" ? <Repeat1 className="h-4 w-4" /> : <Repeat className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Loop: {loopMode}</TooltipContent>
            </Tooltip>

            <Button variant="ghost" size="icon" onClick={previous} className="text-muted-foreground hover:text-foreground">
              <SkipBack className="h-5 w-5 fill-current" />
            </Button>
            <Button size="icon" onClick={togglePlay} className="h-10 w-10 rounded-full shadow-lg shadow-primary/20 bg-primary text-primary-foreground">
              {isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current ml-0.5" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={next} className="text-muted-foreground hover:text-foreground">
              <SkipForward className="h-5 w-5 fill-current" />
            </Button>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={cn("h-8 w-8", showLyrics && "text-primary")}
                  onClick={() => {
                    const nextVal = !showLyrics;
                    setShowLyrics(nextVal);
                  }}
                >
                  <LayoutList className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Lyrics</TooltipContent>
            </Tooltip>
          </div>
          <div className="w-full flex items-center gap-2 max-w-md">
            <span className="text-[10px] text-muted-foreground min-w-[30px] text-right">{formatTime(currentTime)}</span>
            <Slider 
              value={[progress]} 
              max={100} 
              step={0.1} 
              className="w-full" 
              onValueChange={handleSliderChange}
              onValueCommitted={handleSliderCommit}
            />
            <span className="text-[10px] text-muted-foreground min-w-[30px]">{formatTime(duration)}</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-4 w-1/3">
          <div className="flex items-center gap-2 w-32">
            <Volume2 className="h-4 w-4 text-muted-foreground" />
            <Slider 
              value={[volume * 100]} 
              max={100} 
              step={1} 
              onValueChange={handleVolumeChange} 
            />
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className={cn(isExpanded && "text-primary")}
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <Maximize2 className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
        
        <audio 
          ref={audioRef} 
          onEnded={() => {
            if (loopMode === "one") {
              if (audioRef.current) {
                audioRef.current.currentTime = 0;
                audioRef.current.play();
              }
            } else {
              next();
            }
          }} 
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
        />
      </motion.div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 bg-background/95 backdrop-blur-3xl z-[60] flex flex-col p-8 md:p-16"
          >
            <div className="flex justify-between items-center mb-12 shrink-0">
               <Button variant="ghost" size="icon" onClick={() => setIsExpanded(false)} className="rounded-full hover:bg-white/5 h-12 w-12">
                 <ChevronDown className="h-8 w-8" />
               </Button>
               <div className="text-center">
                 <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-primary mb-1">Now Playing</p>
                 <p className="text-sm font-medium opacity-40 truncate max-w-xs">{currentSong.album || "Single"}</p>
               </div>
               <div className="w-12" />
            </div>

            <div className="flex-1 flex flex-col md:flex-row items-center justify-center gap-12 md:gap-24 max-w-7xl mx-auto w-full overflow-hidden">
              <div className="w-full md:w-2/5 aspect-square max-w-lg rounded-[3rem] overflow-hidden shadow-2xl shadow-primary/20 ring-1 ring-white/10 shrink-0">
                {currentSong.coverArt && <img src={currentSong.coverArt} alt={currentSong.title} className="h-full w-full object-cover" />}
              </div>
              
              <div className="w-full md:w-3/5 space-y-16 flex flex-col justify-center min-w-0 h-full">
                <div className="flex justify-between items-end gap-8">
                  <div className="space-y-4 min-w-0 flex-1">
                    <h2 className="text-6xl font-bold tracking-tighter leading-tight truncate">{currentSong.title}</h2>
                    <p className="text-3xl text-muted-foreground truncate">{currentSong.artist}</p>
                  </div>
                  <Button variant="outline" size="icon" onClick={() => setShowLyrics(!showLyrics)} className={cn("h-14 w-14 rounded-2xl border-white/10", showLyrics && "bg-primary text-primary-foreground border-none")}>
                     <LayoutList className="h-6 w-6" />
                  </Button>
                </div>

                <div className="space-y-10">
                  <div className="space-y-4">
                    <Slider 
                      value={[progress]} 
                      max={100} 
                      step={0.1} 
                      className="w-full h-3" 
                      onValueChange={handleSliderChange}
                      onValueCommitted={handleSliderCommit}
                    />
                    <div className="flex justify-between text-xs font-bold opacity-30 uppercase tracking-[0.2em]">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-14">
                    <Button variant="ghost" size="icon" onClick={toggleLoop} className={cn("h-12 w-12 rounded-full", loopMode !== "none" && "text-primary bg-primary/5")}>
                       {loopMode === "one" ? <Repeat1 className="h-6 w-6" /> : <Repeat className="h-6 w-6" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={previous} className="h-16 w-16 rounded-full hover:bg-white/5">
                      <SkipBack className="h-10 w-10 fill-current" />
                    </Button>
                    <Button size="icon" onClick={togglePlay} className="h-28 w-28 rounded-full shadow-2xl shadow-primary/40 bg-primary text-primary-foreground hover:scale-105 transition-transform active:scale-95">
                      {isPlaying ? <Pause className="h-12 w-12 fill-current" /> : <Play className="h-12 w-12 fill-current ml-2" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={next} className="h-16 w-16 rounded-full hover:bg-white/5">
                      <SkipForward className="h-10 w-10 fill-current" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-12 w-12 rounded-full hover:bg-white/5 text-muted-foreground">
                       <Music className="h-6 w-6" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Synced Lyrics Sidebar / Overlay */}
      <AnimatePresence>
        {showLyrics && (
          <motion.div
            initial={{ opacity: 0, x: isExpanded ? 0 : 40, y: isExpanded ? 0 : 20 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: isExpanded ? 0 : 40, y: isExpanded ? 0 : 20 }}
            className={cn(
              "glass border border-white/10 shadow-2xl z-[70] flex flex-col",
              isExpanded 
                ? "fixed top-1/2 -translate-y-1/2 right-12 w-[30%] h-[70vh] rounded-[2.5rem]" 
                : "fixed bottom-28 right-8 w-80 h-[450px] rounded-2xl"
            )}
          >
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5 shrink-0">
               <div className="flex items-center gap-2">
                 <LayoutList className="h-4 w-4 text-primary" />
                 <span className="text-[10px] font-bold uppercase tracking-widest">Real-time Lyrics</span>
               </div>
               <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setShowLyrics(false)}>
                 <X className="h-4 w-4" />
               </Button>
            </div>
            <ScrollArea className="flex-1" ref={lyricsScrollRef}>
               <div className="p-8 space-y-6">
                 {isLoadingLyrics ? (
                   <div className="space-y-6 py-10">
                     {[1,2,3,4,5].map(i => (
                        <div key={i} className={cn("h-4 bg-white/5 animate-pulse rounded-full", i % 2 === 0 ? "w-full" : "w-3/4")} />
                     ))}
                   </div>
                 ) : parsedLyrics.length > 0 ? (
                   parsedLyrics.map((line, i) => (
                     <p 
                        key={i} 
                        data-index={i}
                        className={cn(
                          "text-2xl font-bold leading-tight transition-all duration-500 cursor-pointer hover:text-foreground",
                          i === activeLineIndex ? "text-primary scale-105 origin-left" : "text-muted-foreground/30 blur-[0.5px]"
                        )}
                        onClick={() => seekTo(line.time)}
                      >
                       {line.text}
                     </p>
                   ))
                 ) : (
                   <div className="py-20 text-center space-y-4">
                     <p className="text-sm text-muted-foreground italic leading-relaxed">
                        {lyricsRaw || "Lyrics not available for this track."}
                     </p>
                   </div>
                 )}
               </div>
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

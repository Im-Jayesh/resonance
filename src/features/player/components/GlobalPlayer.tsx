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
import { useEffect, useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getLyricsAction } from "@/server/actions/music.actions";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchLyrics = useCallback(async () => {
    if (!currentSong) return;
    setIsLoadingLyrics(true);
    try {
      // Direct call to music provider for plain-text lyrics
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
        className="fixed bottom-0 left-0 right-0 h-20 md:h-24 glass border-t border-white/5 z-50 px-4 md:px-8 flex items-center justify-between safe-pb no-select"
        onClick={() => {
          if (window.innerWidth < 768) setIsExpanded(true);
        }}
      >
        {/* Left: Song Info */}
        <div className="flex items-center gap-3 md:gap-4 flex-1 md:w-1/3 min-w-0">
          <div 
            className="h-12 w-12 md:h-14 md:w-14 rounded-md overflow-hidden bg-secondary cursor-pointer group relative shadow-lg shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            {currentSong.coverArt && <img src={currentSong.coverArt} alt={currentSong.title} className="h-full w-full object-cover group-hover:scale-110 transition-transform" />}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 md:group-hover:opacity-100 transition-opacity">
               <ChevronUp className="h-4 w-4 text-white" />
            </div>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-semibold text-sm md:text-base truncate pr-2">{currentSong.title}</span>
            <span className="text-xs text-muted-foreground truncate">{currentSong.artist}</span>
          </div>
        </div>

        {/* Center: Controls */}
        <div className="flex flex-col items-center gap-1 md:gap-2 md:w-1/3 shrink-0">
          <div className="flex items-center gap-4 md:gap-6">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); toggleLoop(); }} className={cn("h-8 w-8 hidden md:flex", loopMode !== "none" && "text-primary")}>
                  {loopMode === "one" ? <Repeat1 className="h-4 w-4" /> : <Repeat className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Loop: {loopMode}</TooltipContent>
            </Tooltip>

            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); previous(); }} className="text-muted-foreground hover:text-foreground hidden md:flex">
              <SkipBack className="h-5 w-5 fill-current" />
            </Button>
            
            <div className="flex items-center gap-2">
              <Button 
                size="icon" 
                onClick={(e) => { e.stopPropagation(); togglePlay(); }} 
                className="h-10 w-10 md:h-12 md:w-12 rounded-full shadow-lg shadow-primary/20 bg-primary text-primary-foreground"
              >
                {isPlaying ? <Pause className="h-5 w-5 md:h-6 md:w-6 fill-current" /> : <Play className="h-5 w-5 md:h-6 md:w-6 fill-current ml-0.5" />}
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={(e) => { e.stopPropagation(); next(); }} 
                className="text-muted-foreground hover:text-foreground md:hidden"
              >
                <SkipForward className="h-6 w-6 fill-current" />
              </Button>
            </div>

            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); next(); }} className="text-muted-foreground hover:text-foreground hidden md:flex">
              <SkipForward className="h-5 w-5 fill-current" />
            </Button>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={cn("h-8 w-8 hidden md:flex", showLyrics && "text-primary")}
                  onClick={(e) => { e.stopPropagation(); setShowLyrics(!showLyrics); }}
                >
                  <LayoutList className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Lyrics</TooltipContent>
            </Tooltip>
          </div>
          <div className="w-full hidden md:flex items-center gap-2 max-w-md px-4">
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

        {/* Right: Volume/Maximize */}
        <div className="hidden md:flex items-center justify-end gap-4 w-1/3">
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
            onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
          >
            <Maximize2 className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>

        {/* Progress Bar (Mobile only) */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/5 md:hidden">
          <div 
            className="h-full bg-primary transition-all duration-300" 
            style={{ width: `${progress}%` }} 
          />
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
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.y > 150) setIsExpanded(false);
            }}
            className="fixed inset-0 bg-background/95 backdrop-blur-3xl z-[60] flex flex-col p-6 md:p-16 no-select"
          >
            {/* Handle for drag indicator on mobile */}
            <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-8 md:hidden shrink-0" />

            <div className="flex justify-between items-center mb-6 md:mb-12 shrink-0">
               <Button variant="ghost" size="icon" onClick={() => setIsExpanded(false)} className="rounded-full hover:bg-white/5 h-10 w-10 md:h-12 md:w-12">
                 <ChevronDown className="h-6 w-6 md:h-8 md:w-8" />
               </Button>
               <div className="text-center">
                 <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-primary mb-1">Now Playing</p>
                 <p className="text-xs md:text-sm font-medium opacity-40 truncate max-w-[150px] md:max-w-xs">{currentSong.album || "Single"}</p>
               </div>
               <div className="w-10 md:w-12" />
            </div>

            <div className="flex-1 flex flex-col md:flex-row items-center justify-center gap-8 md:gap-24 max-w-7xl mx-auto w-full overflow-hidden pb-12 md:pb-0">
              <div className="w-full md:w-2/5 aspect-square max-w-[320px] md:max-w-lg rounded-[2rem] md:rounded-[3rem] overflow-hidden shadow-2xl shadow-primary/20 ring-1 ring-white/10 shrink-0">
                {currentSong.coverArt && <img src={currentSong.coverArt} alt={currentSong.title} className="h-full w-full object-cover" />}
              </div>
              
              <div className="w-full md:w-3/5 space-y-8 md:space-y-16 flex flex-col justify-center min-w-0 h-auto md:h-full">
                <div className="flex justify-between items-end gap-4 md:gap-8">
                  <div className="space-y-2 md:space-y-4 min-w-0 flex-1">
                    <h2 className="text-3xl md:text-6xl font-bold tracking-tighter leading-tight truncate">{currentSong.title}</h2>
                    <p className="text-xl md:text-3xl text-muted-foreground truncate">{currentSong.artist}</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => setShowLyrics(!showLyrics)} 
                    className={cn(
                      "h-12 w-12 md:h-14 md:w-14 rounded-xl md:rounded-2xl border-white/10 shrink-0", 
                      showLyrics && "bg-primary text-primary-foreground border-none"
                    )}
                  >
                     <LayoutList className="h-5 w-5 md:h-6 md:w-6" />
                  </Button>
                </div>

                <div className="space-y-6 md:space-y-10">
                  <div className="space-y-3 md:space-y-4">
                    <Slider 
                      value={[progress]} 
                      max={100} 
                      step={0.1} 
                      className="w-full h-2 md:h-3" 
                      onValueChange={handleSliderChange}
                      onValueCommitted={handleSliderCommit}
                    />
                    <div className="flex justify-between text-[10px] md:text-xs font-bold opacity-30 uppercase tracking-[0.2em]">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-center gap-4 md:gap-14">
                    <Button variant="ghost" size="icon" onClick={toggleLoop} className={cn("h-10 w-10 md:h-12 md:w-12 rounded-full", loopMode !== "none" && "text-primary bg-primary/5")}>
                       {loopMode === "one" ? <Repeat1 className="h-5 w-5 md:h-6 md:w-6" /> : <Repeat className="h-5 w-5 md:h-6 md:w-6" />}
                    </Button>
                    
                    <div className="flex items-center gap-6 md:gap-12">
                      <Button variant="ghost" size="icon" onClick={previous} className="h-12 w-12 md:h-16 md:w-16 rounded-full hover:bg-white/5">
                        <SkipBack className="h-8 w-8 md:h-10 md:w-10 fill-current" />
                      </Button>
                      <Button size="icon" onClick={togglePlay} className="h-20 w-20 md:h-28 md:w-28 rounded-full shadow-2xl shadow-primary/40 bg-primary text-primary-foreground hover:scale-105 transition-transform active:scale-95">
                        {isPlaying ? <Pause className="h-10 w-10 md:h-12 md:w-12 fill-current" /> : <Play className="h-10 w-10 md:h-12 md:w-12 fill-current ml-1.5 md:ml-2" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={next} className="h-12 w-12 md:h-16 md:w-16 rounded-full hover:bg-white/5">
                        <SkipForward className="h-8 w-8 md:h-10 md:w-10 fill-current" />
                      </Button>
                    </div>

                    <Button variant="ghost" size="icon" className="h-10 w-10 md:h-12 md:w-12 rounded-full hover:bg-white/5 text-muted-foreground">
                       <Music className="h-5 w-5 md:h-6 md:w-6" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLyrics && (
          <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className={cn(
              "glass border border-white/10 shadow-2xl z-[70] flex flex-col no-select",
              isExpanded 
                ? "fixed bottom-0 left-0 right-0 h-[85vh] md:top-1/2 md:-translate-y-1/2 md:right-12 md:left-auto md:w-[30%] md:h-[70vh] md:rounded-[2.5rem] rounded-t-[2.5rem]" 
                : "fixed bottom-0 left-0 right-0 h-[60vh] md:bottom-28 md:right-8 md:left-auto md:w-80 md:h-[450px] md:rounded-2xl rounded-t-[2.5rem]"
            )}
          >
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5 shrink-0">
               <div className="flex items-center gap-2">
                 <LayoutList className="h-4 w-4 text-primary" />
                 <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/60">Lyrics</span>
               </div>
               <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setShowLyrics(false)}>
                 <X className="h-4 w-4" />
               </Button>
            </div>
            <ScrollArea className="flex-1">
               <div className="p-8 pb-12">
                 {isLoadingLyrics ? (
                   <div className="space-y-6 py-10">
                     {[1,2,3,4,5].map(i => (
                        <div key={i} className={cn("h-4 bg-white/5 animate-pulse rounded-full", i % 2 === 0 ? "w-full" : "w-3/4")} />
                     ))}
                   </div>
                 ) : (
                   <p className="text-lg md:text-xl font-medium leading-relaxed text-foreground/90 font-serif italic whitespace-pre-wrap">
                     {lyricsRaw || "Lyrics not available for this track."}
                   </p>
                 )}
               </div>
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

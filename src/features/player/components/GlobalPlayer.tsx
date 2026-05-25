"use client";

import { usePlayerStore } from "@/stores/use-player-store";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, SkipBack, SkipForward, Volume2, Maximize2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";

export function GlobalPlayer() {
  const { currentSong, isPlaying, togglePlay, next, previous, volume, setVolume } = usePlayerStore();
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (currentSong && audioRef.current) {
      audioRef.current.src = currentSong.previewUrl || ""; 
      if (isPlaying) audioRef.current.play().catch(e => console.error("Playback failed:", e));
    }
  }, [currentSong]);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) audioRef.current.play().catch(e => console.error("Playback failed:", e));
      else audioRef.current.pause();
    }
  }, [isPlaying]);

  const handleTimeUpdate = () => {
    if (audioRef.current && audioRef.current.duration) {
      setCurrentTime(audioRef.current.currentTime);
      const newProgress = (audioRef.current.currentTime / audioRef.current.duration) * 100;
      setProgress(isNaN(newProgress) ? 0 : newProgress);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSliderChange = (value: number[]) => {
    if (audioRef.current) {
      const newTime = (value[0] / 100) * duration;
      audioRef.current.currentTime = newTime;
      setProgress(value[0]);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  if (!currentSong) return null;

  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="fixed bottom-0 left-0 right-0 h-24 glass border-t border-white/5 z-50 px-4 md:px-8 flex items-center justify-between"
    >
      <div className="flex items-center gap-4 w-1/3">
        <div className="h-14 w-14 rounded-md overflow-hidden bg-secondary">
          {currentSong.coverArt && <img src={currentSong.coverArt} alt={currentSong.title} className="h-full w-full object-cover" />}
        </div>
        <div className="flex flex-col">
          <span className="font-medium text-sm truncate max-w-[200px]">{currentSong.title}</span>
          <span className="text-xs text-muted-foreground truncate max-w-[200px]">{currentSong.artist}</span>
        </div>
      </div>

      <div className="flex flex-col items-center gap-2 w-1/3">
        <div className="flex items-center gap-6">
          <Button variant="ghost" size="icon" onClick={previous} className="text-muted-foreground hover:text-foreground">
            <SkipBack className="h-5 w-5 fill-current" />
          </Button>
          <Button size="icon" onClick={togglePlay} className="h-10 w-10 rounded-full">
            {isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current ml-0.5" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={next} className="text-muted-foreground hover:text-foreground">
            <SkipForward className="h-5 w-5 fill-current" />
          </Button>
        </div>
        <div className="w-full flex items-center gap-2 max-w-md">
          <span className="text-[10px] text-muted-foreground min-w-[30px]">{formatTime(currentTime)}</span>
          <Slider 
            value={[progress]} 
            max={100} 
            step={0.1} 
            className="w-full" 
            onValueChange={handleSliderChange} 
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
            onValueChange={(val) => setVolume(val[0] / 100)} 
          />
        </div>
        <Button variant="ghost" size="icon">
          <Maximize2 className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>
      
      <audio 
        ref={audioRef} 
        onEnded={next} 
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
      />
    </motion.div>
  );
}

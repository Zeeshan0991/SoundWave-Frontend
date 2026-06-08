import {
  Play,
  Pause,
  SkipForward,
  Volume2,
} from 'lucide-react';

import { usePlayer } from '../context/PlayerContext';

export default function Player() {
  const {
    currentTrack,
    isPlaying,
    togglePlay,
    progress,
    duration,
    seek,
    volume,
    changeVolume,   // FIX 1: was `setVolume` — PlayerContext exports changeVolume
    playNext,
  } = usePlayer();

  if (!currentTrack) return null;

  const formatTime = (time) => {
    if (!time) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 h-24 bg-[#181818] border-t border-[#282828] px-6 flex items-center justify-between z-50">

      {/* LEFT */}
      <div className="flex items-center gap-4 w-[30%] min-w-0">
        <div className="w-14 h-14 rounded bg-[#282828] flex items-center justify-center shrink-0">
          <div className="w-8 h-8 rounded-full bg-spotify-green flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-black" />
          </div>
        </div>

        <div className="min-w-0">
          <p className="text-white text-sm font-semibold truncate">
            {currentTrack.title}
          </p>
          <p className="text-xs text-spotify-muted truncate">
            {currentTrack.artist?.username || 'Unknown Artist'}
          </p>
        </div>
      </div>

      {/* CENTER */}
      <div className="flex flex-col items-center gap-2 w-[40%]">
        <div className="flex items-center gap-4">
          <button
            onClick={togglePlay}
            className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition"
          >
            {isPlaying ? (
              <Pause size={18} fill="black" />
            ) : (
              <Play size={18} fill="black" />
            )}
          </button>

          <button
            onClick={playNext}
            className="text-spotify-muted hover:text-white"
          >
            <SkipForward size={20} />
          </button>
        </div>

        <div className="flex items-center gap-2 w-full">
          <span className="text-xs text-spotify-muted">
            {formatTime(progress)}
          </span>

          <input
            type="range"
            min={0}
            max={duration || 0}
            value={progress}
            onChange={(e) => seek(parseFloat(e.target.value))}  // FIX 2: was string, seek needs a number
            className="flex-1 accent-white"
          />

          <span className="text-xs text-spotify-muted">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-3 w-[30%] justify-end">
        <Volume2
          size={18}
          className="text-spotify-muted"
        />

        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(e) => changeVolume(parseFloat(e.target.value))}  // FIX 3: was setVolume(string), now changeVolume(number)
          className="w-24 accent-white"
        />
      </div>
    </div>
  );
}
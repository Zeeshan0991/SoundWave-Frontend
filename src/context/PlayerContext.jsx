// src/context/PlayerContext.jsx
// ─────────────────────────────────────────────────────────────────────────────
// CURRENT CHANGES (Smart Playlist — Part 2):
//   1. sessionPlayed ref — tracks all _id values played in the current session.
//      Resets only when the user explicitly starts a brand-new queue via
//      playSong(track, trackList) — i.e. when a new mood playlist loads.
//      Does NOT reset when navigating pages or toggling shuffle/repeat.
//
//   2. hasPlayedInSession(trackId) — public helper exposed on context.
//      UI can use this to dim already-played tracks in the queue drawer.
//
//   3. _loadAndPlay — marks track as played in sessionPlayed before starting.
//
//   4. playSong — when called with a new trackList (new mood playlist),
//      sessionPlayed is cleared so the new session starts fresh.
//
//   All other logic completely unchanged.
// ─────────────────────────────────────────────────────────────────────────────

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import api from "../api";

const PlayerContext = createContext(null);

export const usePlayer = () => {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within PlayerProvider");
  return ctx;
};

/* ── Volume persistence helpers ──────────────────────────────── */
const VOL_KEY  = "sw_volume";
const MUTE_KEY = "sw_muted";

const getSavedVolume = () => {
  try {
    const v = parseFloat(localStorage.getItem(VOL_KEY));
    return isNaN(v) ? 0.75 : Math.min(1, Math.max(0, v));
  } catch {
    return 0.75;
  }
};

const getSavedMute = () => {
  try {
    return localStorage.getItem(MUTE_KEY) === "true";
  } catch {
    return false;
  }
};

export function PlayerProvider({ children }) {
  const [queue, setQueue]               = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying]       = useState(false);
  const [progress, setProgress]         = useState(0);
  const [duration, setDuration]         = useState(0);
  const [volume, setVolume]             = useState(getSavedVolume);
  const [isMuted, setIsMuted]           = useState(getSavedMute);
  const [isShuffled, setIsShuffled]     = useState(false);
  const [repeatMode, setRepeatMode]     = useState("none");
  const [isLoading, setIsLoading]       = useState(false);
  const [liked, setLiked]               = useState(new Set());

  /* Store last non-zero volume so mute/unmute never destroys the
     user's chosen level.                                         */
  const lastVolume = useRef(getSavedVolume());

  const audioRef = useRef(null);
  const shuffleHistory = useRef([]);

  // ── FIX: keep a ref in sync with the queue state ──────────────
  const queueRef        = useRef(queue);
  const currentIndexRef = useRef(currentIndex);

  useEffect(() => { queueRef.current = queue; },        [queue]);
  useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);

  // ── CURRENT: Session deduplication ────────────────────────────
  // Tracks all song _ids played in the current listening session.
  // Cleared when the user starts a brand-new playlist (new trackList
  // passed to playSong). Survives shuffle, repeat, and page navigation.
  const sessionPlayed = useRef(new Set());

  /* ── Create audio element once ───────────────────────────── */
  useEffect(() => {
    const audio = new Audio();
    audio.crossOrigin = "anonymous";
    audio.preload     = "metadata";

    const initVol  = getSavedVolume();
    const initMute = getSavedMute();
    audio.volume   = initMute ? 0 : initVol;
    audio.muted    = false;

    audioRef.current = audio;

    const onTime    = () => setProgress(audio.currentTime);
    const onDur     = () => setDuration(isNaN(audio.duration) ? 0 : audio.duration);
    const onPlay    = () => setIsPlaying(true);
    const onPause   = () => setIsPlaying(false);
    const onWaiting = () => setIsLoading(true);
    const onCanPlay = () => setIsLoading(false);
    const onError   = () => { setIsLoading(false); setIsPlaying(false); };
    const onEnded   = () => handleEndedRef.current();

    audio.addEventListener("timeupdate",     onTime);
    audio.addEventListener("durationchange", onDur);
    audio.addEventListener("play",           onPlay);
    audio.addEventListener("pause",          onPause);
    audio.addEventListener("waiting",        onWaiting);
    audio.addEventListener("canplay",        onCanPlay);
    audio.addEventListener("error",          onError);
    audio.addEventListener("ended",          onEnded);

    return () => {
      audio.removeEventListener("timeupdate",     onTime);
      audio.removeEventListener("durationchange", onDur);
      audio.removeEventListener("play",           onPlay);
      audio.removeEventListener("pause",          onPause);
      audio.removeEventListener("waiting",        onWaiting);
      audio.removeEventListener("canplay",        onCanPlay);
      audio.removeEventListener("error",          onError);
      audio.removeEventListener("ended",          onEnded);
      audio.pause();
      audio.src = "";
    };
  }, []); // runs exactly once

  /* ── Sync audio.volume whenever volume or isMuted changes ─── */
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const effective = isMuted ? 0 : Math.min(1, Math.max(0, volume));
    audio.volume = effective;
  }, [volume, isMuted]);

  /* ── Persist volume / mute ───────────────────────────────── */
  useEffect(() => {
    try { localStorage.setItem(VOL_KEY, String(volume)); } catch {}
  }, [volume]);

  useEffect(() => {
    try { localStorage.setItem(MUTE_KEY, String(isMuted)); } catch {}
  }, [isMuted]);

  /* ── Derived ──────────────────────────────────────────────── */
  const currentTrack = queue[currentIndex] ?? null;

  /* ── handleEnded via ref — avoids stale closures ─────────── */
  const handleEndedRef = useRef(() => {});
  useEffect(() => {
    handleEndedRef.current = () => {
      if (repeatMode === "one") {
        const audio = audioRef.current;
        if (audio) { audio.currentTime = 0; audio.play().catch(() => {}); }
        return;
      }
      const q   = queueRef.current;
      const idx = currentIndexRef.current;
      if (!q.length) return;

      // ── CURRENT: prefer unplayed tracks when choosing next ────
      // When shuffle is on, try to pick a song not yet in sessionPlayed.
      // When sequential, just advance normally (order is intentional).
      const next = (() => {
        if (isShuffled) return getShuffledNextFromRefs();
        const n = idx + 1;
        if (n >= q.length) return repeatMode === "all" ? 0 : -1;
        return n;
      })();

      if (next < 0) {
        setIsPlaying(false);
        setProgress(0);
        return;
      }
      _loadAndPlay(next);
    };
  }, [repeatMode, isShuffled]);

  /* getShuffledNext — prefers unplayed tracks in current session */
  const getShuffledNextFromRefs = useCallback(() => {
    const q   = queueRef.current;
    const idx = currentIndexRef.current;
    if (q.length <= 1) return 0;

    // ── CURRENT: try to pick an unplayed track first ──────────
    // Build list of candidate indices that haven't been played yet.
    const unplayed = q
      .map((t, i) => i)
      .filter((i) => i !== idx && !sessionPlayed.current.has(String(q[i]._id)));

    if (unplayed.length > 0) {
      // Pick randomly from unplayed candidates
      const pick = unplayed[Math.floor(Math.random() * unplayed.length)];
      shuffleHistory.current.push(pick);
      return pick;
    }

    // All tracks played — fall back to any different track (repeat mode)
    let n;
    do { n = Math.floor(Math.random() * q.length); } while (n === idx);
    shuffleHistory.current.push(n);
    return n;
  }, []);

  /* ── _loadAndPlay — marks track as played in sessionPlayed ── */
  const _loadAndPlay = useCallback((index) => {
    const q     = queueRef.current;
    const track = q[index];
    if (!track) return;
    const audio = audioRef.current;
    if (!audio) return;

    setCurrentIndex(index);
    setProgress(0);
    setDuration(0);
    setIsLoading(true);

    // ── CURRENT: record this track as played in the session ───
    if (track._id) {
      sessionPlayed.current.add(String(track._id));
    }

    const src = track.audioUrl || track.url || "";
    if (!src) { setIsLoading(false); return; }

    audio.src = src;
    audio.load();
    audio.play()
      .then(() => setIsLoading(false))
      .catch(() => { setIsLoading(false); setIsPlaying(false); });
  }, []);

  /* ── Public: play a song (optionally with a new queue) ───── */
  const playSong = useCallback((track, trackList = null) => {
    if (trackList) {
      // ── CURRENT: new playlist = new session, clear history ──
      // Only clear when a genuinely new playlist is loaded (mood
      // playlist, album, search result). Keeps session intact when
      // the user just picks a different song from the current queue.
      sessionPlayed.current.clear();

      setQueue(trackList);
      queueRef.current = trackList;
    }

    const list   = trackList ?? queueRef.current;
    const idx    = list.findIndex((t) => t._id === track._id);
    const target = idx >= 0 ? idx : 0;

    const audio = audioRef.current;
    if (!audio) return;

    setCurrentIndex(target);
    currentIndexRef.current = target;
    setProgress(0);
    setDuration(0);
    setIsLoading(true);

    // ── CURRENT: mark starting track as played ────────────────
    if (track._id) {
      sessionPlayed.current.add(String(track._id));
    }

    const src = track.audioUrl || track.url || "";
    if (!src) { setIsLoading(false); return; }

    audio.src = src;
    audio.load();
    audio.play()
      .then(() => setIsLoading(false))
      .catch(() => { setIsLoading(false); setIsPlaying(false); });
  }, []);

  /* ── Toggle play / pause ─────────────────────────────────── */
  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const track = queueRef.current[currentIndexRef.current];
    if (!track) return;

    if (audio.paused === false) {
      audio.pause();
    } else {
      if (!audio.src || audio.src === window.location.href) {
        const src = track.audioUrl || track.url || "";
        if (src) { audio.src = src; audio.load(); }
      }
      audio.play().catch(() => {});
    }
  }, []);

  /* ── Next / Prev ─────────────────────────────────────────── */
  const playNext = useCallback(() => {
    const q   = queueRef.current;
    const idx = currentIndexRef.current;
    if (!q.length) return;
    const next = isShuffled
      ? getShuffledNextFromRefs()
      : (idx + 1) % q.length;
    _loadAndPlay(next);
  }, [isShuffled, getShuffledNextFromRefs, _loadAndPlay]);

  const playPrev = useCallback(() => {
    const q     = queueRef.current;
    const idx   = currentIndexRef.current;
    if (!q.length) return;
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      setProgress(0);
      return;
    }
    if (isShuffled && shuffleHistory.current.length > 1) {
      shuffleHistory.current.pop();
      const prev = shuffleHistory.current[shuffleHistory.current.length - 1];
      _loadAndPlay(prev);
      return;
    }
    const prev = idx <= 0 ? q.length - 1 : idx - 1;
    _loadAndPlay(prev);
  }, [isShuffled, _loadAndPlay]);

  /* ── Seek ────────────────────────────────────────────────── */
  const seek = useCallback((seconds) => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = seconds;
      setProgress(seconds);
    }
  }, []);

  /* ── Volume — never lets mute clobber saved level ────────── */
  const changeVolume = useCallback((val) => {
    const v = Math.min(1, Math.max(0, val));
    setVolume(v);
    if (v > 0) {
      lastVolume.current = v;
      setIsMuted(false);
    }
  }, []);

  /* ── Mute — restores lastVolume on unmute ────────────────── */
  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      if (!next) {
        const restore = lastVolume.current > 0 ? lastVolume.current : 0.5;
        setVolume(restore);
      }
      return next;
    });
  }, []);

  /* ── Shuffle / Repeat ────────────────────────────────────── */
  const toggleShuffle = useCallback(() => {
    setIsShuffled((s) => {
      if (!s) shuffleHistory.current = [currentIndexRef.current];
      return !s;
    });
  }, []);

  const toggleRepeat = useCallback(() => {
    setRepeatMode((m) => (m === "none" ? "all" : m === "all" ? "one" : "none"));
  }, []);

  /* ── Queue management ────────────────────────────────────── */
  const addToQueue = useCallback((track) => {
    setQueue((q) => {
      if (q.find((t) => t._id === track._id)) return q;
      const next = [...q, track];
      queueRef.current = next;
      return next;
    });
  }, []);

  const removeFromQueue = useCallback((trackId) => {
    setQueue((q) => {
      const idx  = q.findIndex((t) => t._id === trackId);
      if (idx === -1) return q;
      const next = q.filter((t) => t._id !== trackId);
      queueRef.current = next;
      const ci = currentIndexRef.current;
      if (idx < ci) {
        setCurrentIndex((i) => { currentIndexRef.current = i - 1; return i - 1; });
      } else if (idx === ci && idx >= next.length) {
        const ni = next.length - 1;
        setCurrentIndex(ni);
        currentIndexRef.current = ni;
      }
      return next;
    });
  }, []);

  /* ── Likes ───────────────────────────────────────────────── */
  const toggleLike = useCallback(async (trackId) => {
    setLiked((prev) => {
      const n = new Set(prev);
      n.has(trackId) ? n.delete(trackId) : n.add(trackId);
      return n;
    });
    try {
      await api.post(`/music/like/${trackId}`);
    } catch {
      setLiked((prev) => {
        const n = new Set(prev);
        n.has(trackId) ? n.delete(trackId) : n.add(trackId);
        return n;
      });
    }
  }, []);

  const isLiked = useCallback((trackId) => liked.has(trackId), [liked]);

  // ── CURRENT: session deduplication helper for UI ──────────
  // Returns true if the given trackId has already been played
  // in the current session. Used by QueueDrawer to dim played tracks.
  const hasPlayedInSession = useCallback(
    (trackId) => sessionPlayed.current.has(String(trackId)),
    []
  );

  /* ── Util ────────────────────────────────────────────────── */
  const formatTime = useCallback((secs) => {
    if (!secs || isNaN(secs)) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }, []);

  return (
    <PlayerContext.Provider
      value={{
        queue,
        currentTrack,
        currentIndex,
        isPlaying,
        progress,
        duration,
        volume,
        isMuted,
        isShuffled,
        repeatMode,
        isLoading,
        playSong,
        togglePlay,
        playNext,
        playPrev,
        seek,
        changeVolume,
        toggleMute,
        toggleShuffle,
        toggleRepeat,
        addToQueue,
        removeFromQueue,
        toggleLike,
        isLiked,
        formatTime,
        hasPlayedInSession, // ← CURRENT: exposed for QueueDrawer UI
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}
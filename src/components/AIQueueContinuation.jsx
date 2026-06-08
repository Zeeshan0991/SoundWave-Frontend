// src/components/AIQueueContinuation.jsx
// ─────────────────────────────────────────────────────────────────────────────
// AI Queue Continuation — SOUNDWAVE's portfolio differentiator feature.
//
// What it does:
//   When the queue has ≤ 1 song remaining AND the player is active,
//   this component appears as a subtle card (fixed, bottom-right, above the
//   NowPlayingBar). It analyzes the current listening session and suggests
//   3–5 songs that fit the vibe — one click appends them to the queue.
//
// How it works:
//   1. Watches PlayerContext: queue, currentIndex, currentTrack, isPlaying
//   2. When queue is near-empty → calls GET /api/mood/continuation
//      with session metadata (titles + genres of recently played tracks)
//   3. Backend uses Gemini to pick fitting songs from the full library
//   4. Returns suggestions as full track objects
//   5. User clicks "Add to Queue" → addToQueue() for each track
//   6. Card auto-dismisses after tracks are added
//
// Architecture:
//   • Zero changes to PlayerContext
//   • Zero changes to NowPlayingBar
//   • Uses only: queue, currentIndex, currentTrack, isPlaying, addToQueue
//   • Tracks session history internally via useRef — no global state changes
//   • The "continuation" mood is a special backend handler (added to
//     mood.controller.js) that accepts POST with session context
//
// Placement:
//   Rendered inside AppLayout.jsx (or NowPlayingBar's parent) so it's
//   always available regardless of which page the user is on.
// ─────────────────────────────────────────────────────────────────────────────

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  memo,
} from "react";
import { usePlayer } from "../context/PlayerContext";
import { getQueueContinuation } from "../api";

// ── Constants ─────────────────────────────────────────────────────────────────
const TRIGGER_THRESHOLD   = 1;   // songs remaining before we trigger
const SESSION_HISTORY_MAX = 10;  // max songs to send as "session context"
const COOLDOWN_MS         = 30000; // don't re-trigger within 30s of a dismiss

// ── AIQueueContinuation ───────────────────────────────────────────────────────
export default function AIQueueContinuation() {
  const {
    queue,
    currentIndex,
    currentTrack,
    isPlaying,
    addToQueue,
  } = usePlayer();

  // ── Component state ──────────────────────────────────────────────────────
  const [visible,      setVisible]      = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [suggestions,  setSuggestions]  = useState([]);  // Track[]
  const [error,        setError]        = useState(null);
  const [adding,       setAdding]       = useState(false);
  const [added,        setAdded]        = useState(false);

  // ── Refs — no re-renders needed ──────────────────────────────────────────
  const sessionHistory  = useRef([]);   // tracks played this session
  const hasTriggered    = useRef(false); // prevent duplicate fetches per queue-end
  const lastDismissed   = useRef(0);    // timestamp of last dismiss
  const prevTrackId     = useRef(null); // detect track changes

  // ── Track session history ─────────────────────────────────────────────────
  // Whenever currentTrack changes, push it to session history
  useEffect(() => {
    if (!currentTrack) return;
    if (currentTrack._id === prevTrackId.current) return;

    prevTrackId.current = currentTrack._id;

    sessionHistory.current = [
      ...sessionHistory.current.filter((t) => t._id !== currentTrack._id),
      {
        _id:        currentTrack._id,
        title:      currentTrack.title,
        genre:      currentTrack.genre      || "",
        mood:       currentTrack.mood       || "",
        language:   currentTrack.language   || "",
        category:   currentTrack.category   || "music",
        artistName: currentTrack.artistName || currentTrack.artist?.username || "",
      },
    ].slice(-SESSION_HISTORY_MAX); // keep last N only
  }, [currentTrack]);

  // ── Trigger logic ─────────────────────────────────────────────────────────
  // Fire when: playing + queue near-empty + not already triggered + not in cooldown
  useEffect(() => {
    if (!isPlaying)     return;
    if (!currentTrack)  return;
    if (queue.length === 0) return;

    const remaining = queue.length - 1 - currentIndex;

    if (remaining > TRIGGER_THRESHOLD) {
      // Queue has plenty — reset trigger so it fires again next time
      if (hasTriggered.current) {
        hasTriggered.current = false;
        setVisible(false);
        setSuggestions([]);
        setAdded(false);
        setError(null);
      }
      return;
    }

    if (hasTriggered.current) return; // already fetching/showing for this queue-end
    if (added)              return; // user already added tracks this cycle
    if (visible)            return; // already showing

    // Cooldown check
    const now = Date.now();
    if (now - lastDismissed.current < COOLDOWN_MS) return;

    // Need at least 2 songs in history to make a meaningful suggestion
    if (sessionHistory.current.length < 2) return;

    hasTriggered.current = true;
    fetchContinuation();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue.length, currentIndex, isPlaying, currentTrack, added, visible]);

  // ── Fetch suggestions from backend ───────────────────────────────────────
  const fetchContinuation = useCallback(async () => {
    setLoading(true);
    setError(null);
    setVisible(true); // show card in loading state immediately

    try {
      const sessionMeta = sessionHistory.current.slice(-SESSION_HISTORY_MAX);
      const data = await getQueueContinuation(sessionMeta);

      if (!data.suggestions || data.suggestions.length === 0) {
        setError("No new suggestions right now.");
        setLoading(false);
        return;
      }

      setSuggestions(data.suggestions);
    } catch (err) {
      const isUnavailable = err?.response?.status === 503;
      setError(
        isUnavailable
          ? "AI unavailable. Try again soon."
          : "Couldn't load suggestions."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Add all suggestions to queue ─────────────────────────────────────────
  const handleAddToQueue = useCallback(async () => {
    if (suggestions.length === 0) return;
    setAdding(true);

    for (const track of suggestions) {
      addToQueue(track); // addToQueue deduplicates by _id automatically
    }

    setAdding(false);
    setAdded(true);

    // Auto-dismiss after 2s
    setTimeout(() => {
      setVisible(false);
      setSuggestions([]);
      setAdded(false);
    }, 2000);
  }, [suggestions, addToQueue]);

  // ── Dismiss ───────────────────────────────────────────────────────────────
  const handleDismiss = useCallback(() => {
    lastDismissed.current = Date.now();
    setVisible(false);
    setSuggestions([]);
    setError(null);
    setAdded(false);
    setLoading(false);
  }, []);

  // ── Don't render if not visible ──────────────────────────────────────────
  if (!visible) return null;

  return (
    <QueueContinuationCard
      loading={loading}
      suggestions={suggestions}
      error={error}
      adding={adding}
      added={added}
      onAddToQueue={handleAddToQueue}
      onDismiss={handleDismiss}
      sessionLength={sessionHistory.current.length}
    />
  );
}

// ── QueueContinuationCard ─────────────────────────────────────────────────────
// Pure presentational component — no logic
const QueueContinuationCard = memo(function QueueContinuationCard({
  loading,
  suggestions,
  error,
  adding,
  added,
  onAddToQueue,
  onDismiss,
  sessionLength,
}) {
  return (
    <div
      role="dialog"
      aria-label="AI queue suggestions"
      style={{
        position:     "fixed",
        bottom:       "100px",   // sits above NowPlayingBar (~88px tall)
        right:        "20px",
        width:        "clamp(280px, 90vw, 340px)",
        zIndex:       200,
        background:   "var(--bg-surface)",
        border:       "1px solid var(--border-subtle)",
        borderRadius: "16px",
        boxShadow:    "0 8px 40px rgba(0,0,0,0.3), 0 0 0 1px var(--border-faint)",
        overflow:     "hidden",
        animation:    "slideUpFade 0.3s cubic-bezier(0.34,1.56,0.64,1) both",
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          display:        "flex",
          alignItems:     "center",
          justifyContent: "space-between",
          padding:        "14px 16px 10px",
          borderBottom:   "1px solid var(--border-faint)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {/* Animated waveform icon */}
          <WaveformIcon loading={loading} />
          <div>
            <div
              style={{
                fontSize:   "13px",
                fontWeight: 700,
                color:      "var(--text-primary)",
                lineHeight: 1.2,
              }}
            >
              Up Next from AI
            </div>
            <div
              style={{
                fontSize: "11px",
                color:    "var(--text-muted)",
                marginTop:"1px",
              }}
            >
              Based on your last {sessionLength} tracks
            </div>
          </div>
        </div>

        <button
          onClick={onDismiss}
          aria-label="Dismiss suggestions"
          style={{
            background:   "none",
            border:       "none",
            cursor:       "pointer",
            color:        "var(--text-muted)",
            fontSize:     "18px",
            lineHeight:   1,
            padding:      "4px 6px",
            borderRadius: "6px",
            transition:   "color 0.15s, background 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color       = "var(--text-primary)";
            e.currentTarget.style.background  = "var(--bg-elevated)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color       = "var(--text-muted)";
            e.currentTarget.style.background  = "transparent";
          }}
        >
          ×
        </button>
      </div>

      {/* ── Body ── */}
      <div style={{ padding: "10px 16px 14px" }}>

        {/* Loading state */}
        {loading && (
          <div
            style={{
              display:        "flex",
              alignItems:     "center",
              gap:            "10px",
              padding:        "10px 0",
              color:          "var(--text-muted)",
              fontSize:       "13px",
            }}
          >
            <LoadingDots />
            <span>Analyzing your session…</span>
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div
            style={{
              fontSize:  "13px",
              color:     "var(--text-muted)",
              padding:   "8px 0",
              textAlign: "center",
            }}
          >
            {error}
          </div>
        )}

        {/* Added state */}
        {!loading && added && (
          <div
            style={{
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              gap:            "8px",
              padding:        "10px 0",
              fontSize:       "13px",
              color:          "var(--cyan)",
              fontWeight:     600,
            }}
          >
            <span style={{ fontSize: "16px" }}>✓</span>
            Added to queue!
          </div>
        )}

        {/* Suggestions list */}
        {!loading && !error && !added && suggestions.length > 0 && (
          <>
            <div
              style={{
                display:       "flex",
                flexDirection: "column",
                gap:           "2px",
                marginBottom:  "12px",
              }}
            >
              {suggestions.map((track, i) => (
                <SuggestionRow key={track._id} track={track} index={i} />
              ))}
            </div>

            {/* Add to Queue button */}
            <button
              onClick={onAddToQueue}
              disabled={adding}
              style={{
                width:        "100%",
                padding:      "10px",
                background:   adding
                  ? "var(--bg-elevated)"
                  : "var(--cyan-dim, hsla(186,90%,50%,0.12))",
                border:       "1px solid var(--cyan-border, hsla(186,90%,50%,0.25))",
                borderRadius: "10px",
                color:        adding ? "var(--text-muted)" : "var(--cyan)",
                fontSize:     "13px",
                fontWeight:   700,
                cursor:       adding ? "not-allowed" : "pointer",
                transition:   "all 0.18s ease",
                display:      "flex",
                alignItems:   "center",
                justifyContent: "center",
                gap:          "8px",
              }}
              onMouseEnter={(e) => {
                if (!adding) {
                  e.currentTarget.style.background = "var(--cyan-dim, hsla(186,90%,50%,0.2))";
                }
              }}
              onMouseLeave={(e) => {
                if (!adding) {
                  e.currentTarget.style.background = "var(--cyan-dim, hsla(186,90%,50%,0.12))";
                }
              }}
            >
              {adding ? (
                <>
                  <MiniSpinner />
                  Adding…
                </>
              ) : (
                <>
                  <span style={{ fontSize: "14px" }}>+</span>
                  Add {suggestions.length} songs to queue
                </>
              )}
            </button>
          </>
        )}
      </div>

      {/* ── Keyframes ── */}
      <style>{`
        @keyframes slideUpFade {
          from {
            opacity:   0;
            transform: translateY(16px) scale(0.96);
          }
          to {
            opacity:   1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes bounce {
          0%, 80%, 100% { transform: scaleY(0.4); }
          40%           { transform: scaleY(1.0); }
        }
        @keyframes dotPulse {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
          40%           { opacity: 1;   transform: scale(1);   }
        }
      `}</style>
    </div>
  );
});

// ── SuggestionRow ─────────────────────────────────────────────────────────────
const SuggestionRow = memo(function SuggestionRow({ track, index }) {
  const artistName =
    track.artist?.username || track.artistName || "Unknown";

  return (
    <div
      style={{
        display:     "flex",
        alignItems:  "center",
        gap:         "10px",
        padding:     "6px 8px",
        borderRadius:"8px",
        transition:  "background 0.15s ease",
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.background = "var(--bg-elevated)")
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.background = "transparent")
      }
    >
      {/* Index number */}
      <span
        style={{
          width:    "16px",
          fontSize: "11px",
          color:    "var(--text-muted)",
          textAlign:"center",
          flexShrink: 0,
        }}
      >
        {index + 1}
      </span>

      {/* Cover */}
      <div
        style={{
          width:        "34px",
          height:       "34px",
          borderRadius: "6px",
          overflow:     "hidden",
          flexShrink:   0,
          background:   "var(--bg-raised)",
          border:       "1px solid var(--border-faint)",
        }}
      >
        {track.coverUrl ? (
          <img
            src={track.coverUrl}
            alt={track.title}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div
            style={{
              width:          "100%",
              height:         "100%",
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              fontSize:       "13px",
              color:          "var(--text-muted)",
            }}
          >
            ♪
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          className="truncate"
          style={{
            fontSize:   "13px",
            fontWeight: 500,
            color:      "var(--text-primary)",
            lineHeight: 1.3,
          }}
        >
          {track.title}
        </div>
        <div
          className="truncate"
          style={{
            fontSize: "11px",
            color:    "var(--text-muted)",
          }}
        >
          {artistName}
        </div>
      </div>

      {/* AI reason */}
      {track.aiReason && (
        <span
          style={{
            fontSize:     "10px",
            color:        "var(--text-muted)",
            background:   "var(--bg-elevated)",
            border:       "1px solid var(--border-faint)",
            borderRadius: "999px",
            padding:      "2px 7px",
            whiteSpace:   "nowrap",
            maxWidth:     "90px",
            overflow:     "hidden",
            textOverflow: "ellipsis",
            flexShrink:   0,
          }}
        >
          {track.aiReason}
        </span>
      )}
    </div>
  );
});

// ── WaveformIcon — animates while loading ─────────────────────────────────────
function WaveformIcon({ loading }) {
  const bars = [0.4, 1, 0.6, 0.9, 0.5];
  return (
    <div
      style={{
        display:    "flex",
        alignItems: "center",
        gap:        "2px",
        height:     "18px",
      }}
    >
      {bars.map((h, i) => (
        <div
          key={i}
          style={{
            width:         "3px",
            height:        `${h * 18}px`,
            borderRadius:  "2px",
            background:    "var(--cyan)",
            animation:     loading
              ? `bounce 1.2s ease-in-out ${i * 0.12}s infinite`
              : "none",
            transform:     loading ? "none" : `scaleY(${h})`,
            transformOrigin: "center",
            transition:    "transform 0.3s ease",
            opacity:       loading ? 1 : 0.6,
          }}
        />
      ))}
    </div>
  );
}

// ── LoadingDots ───────────────────────────────────────────────────────────────
function LoadingDots() {
  return (
    <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            width:        "5px",
            height:       "5px",
            borderRadius: "50%",
            background:   "var(--cyan)",
            animation:    `dotPulse 1.4s ease-in-out ${i * 0.16}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

// ── MiniSpinner ───────────────────────────────────────────────────────────────
function MiniSpinner() {
  return (
    <div
      style={{
        width:        "12px",
        height:       "12px",
        border:       "2px solid var(--cyan-border, hsla(186,90%,50%,0.3))",
        borderTop:    "2px solid var(--cyan)",
        borderRadius: "50%",
        animation:    "spin 0.7s linear infinite",
      }}
    />
  );
}
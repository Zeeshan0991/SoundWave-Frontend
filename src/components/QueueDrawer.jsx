// src/components/QueueDrawer.jsx
// ─────────────────────────────────────────────────────────────────────────────
// PHASE 3 FIXES (unchanged):
//   1. REMOVE BUTTON OPACITY STUCK
//   2. ART FALLBACK DARK HSL VALUES
//   3. DURATION MISSING ON "NOW PLAYING" ITEM
//   4. DRAWER OVERLAPS NOWPLAYINGBAR
//
// PHASE 5 CHANGES (unchanged):
//   5. AI MOOD BADGE IN NOW PLAYING HEADER
//   6. AI REASON ON NOW PLAYING ITEM
//
// RESPONSIVE CHANGES:
//   7. MOBILE BOTTOM SHEET MODE
//      On mobile (< 640px) the drawer renders as a bottom sheet instead of
//      a right-side panel:
//        • Slides up from the bottom, 85vh tall
//        • Full width, rounded top corners
//        • Drag handle at top
//        • Close button in header
//        • Backdrop unchanged
//        • Sits above the compact player bar and BottomNav via z-index
//        • bottom: 0 so it reaches the screen edge (safe-area padding handles
//          iOS home indicator)
//
//   Desktop/Tablet: renders exactly as before — zero changes.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef } from "react";
import { usePlayer }  from "../context/PlayerContext";
import { useToast }   from "../context/ToastContext";
import { useBreakpoint } from "../hooks/UseBreakpoint";

// Mood meta — mirrors AIMoodSection for accent colours
const MOOD_META = {
  coding:   { emoji: "💻", hue: 200 },
  study:    { emoji: "📖", hue: 240 },
  focus:    { emoji: "🎯", hue: 180 },
  gym:      { emoji: "🏋️", hue: 0   },
  relax:    { emoji: "🌿", hue: 140 },
  sleep:    { emoji: "🌙", hue: 260 },
  roadtrip: { emoji: "🚗", hue: 35  },
  naat:     { emoji: "🕌", hue: 45  },
};

export default function QueueDrawer({ onClose, aiMoodContext = null }) {
  const { isMobile } = useBreakpoint();
  const toast     = useToast();
  const drawerRef = useRef(null);
  const {
    queue, currentIndex, currentTrack,
    playSong, removeFromQueue, formatTime,
  } = usePlayer();

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target)) onClose();
    };
    const id = setTimeout(() => document.addEventListener("mousedown", handler), 50);
    return () => { clearTimeout(id); document.removeEventListener("mousedown", handler); };
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const upNext = queue.slice(currentIndex + 1);
  const played = queue.slice(0, currentIndex);

  const handleRemove = (track) => {
    removeFromQueue(track._id);
    toast.info(`Removed "${track.title}" from queue`);
  };

  // Phase 5: mood accent colours
  const moodMeta        = aiMoodContext ? (MOOD_META[aiMoodContext.moodKey] ?? {}) : {};
  const moodHue         = moodMeta.hue ?? 186;
  const moodAccent      = aiMoodContext ? `hsl(${moodHue}, 65%, 55%)` : "var(--cyan)";
  const moodAccentDim   = aiMoodContext ? `hsla(${moodHue}, 65%, 55%, 0.12)` : "var(--cyan-dim, hsla(186,90%,50%,0.08))";
  const moodAccentBorder= aiMoodContext ? `hsla(${moodHue}, 65%, 55%, 0.3)` : "var(--cyan-border)";

  // ── MOBILE: bottom sheet ───────────────────────────────────────────────────
  const drawerStyles = isMobile ? {
    position:      "fixed",
    bottom:        0,
    left:          0,
    right:         0,
    height:        "85vh",
    zIndex:        502,
    background:    "var(--bg-surface)",
    borderRadius:  "20px 20px 0 0",
    borderTop:     "1px solid var(--border-subtle)",
    display:       "flex",
    flexDirection: "column",
    animation:     "slideUpDrawer 0.3s cubic-bezier(0.34,1.2,0.64,1) both",
    boxShadow:     "0 -8px 40px rgba(0,0,0,0.4)",
    paddingBottom: "env(safe-area-inset-bottom, 0px)",
  } : {
    // Desktop/tablet: original right panel (FIX 4: bottom = var(--player-h))
    position:      "fixed",
    top:           0,
    right:         0,
    bottom:        "var(--player-h)",
    width:         "340px",
    zIndex:        501,
    background:    "var(--bg-surface)",
    borderLeft:    "1px solid var(--border-faint)",
    display:       "flex",
    flexDirection: "column",
    animation:     "slideInRight 0.28s cubic-bezier(0.34,1.56,0.64,1) both",
  };

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position:       "fixed",
          inset:          0,
          zIndex:         500,
          background:     "rgba(0,0,0,0.4)",
          backdropFilter: "blur(2px)",
          animation:      "fadeIn 0.15s ease both",
        }}
        onClick={onClose}
      />

      {/* Drawer / Sheet */}
      <div ref={drawerRef} style={drawerStyles}>

        {/* Drag handle — mobile only */}
        {isMobile && (
          <div style={{
            width:"36px", height:"4px", borderRadius:"2px",
            background:"var(--border-subtle)",
            margin:"12px auto 4px", flexShrink:0,
          }} />
        )}

        {/* Header */}
        <div style={{
          display:        "flex",
          alignItems:     "center",
          justifyContent: "space-between",
          padding:        isMobile ? "8px 20px 14px" : "20px 20px 16px",
          borderBottom:   "1px solid var(--border-faint)",
          flexShrink:     0,
        }}>
          <div>
            <h2 style={{
              fontFamily:    "var(--font-display)",
              fontSize:      "16px",
              fontWeight:    700,
              letterSpacing: "-0.3px",
            }}>Queue</h2>
            <p style={{ fontSize:"12px", color:"var(--text-muted)", marginTop:"2px" }}>
              {upNext.length} track{upNext.length !== 1 ? "s" : ""} up next
            </p>
          </div>
          <button onClick={onClose} style={{
            width:"32px", height:"32px", borderRadius:"50%",
            background:"var(--bg-hover)", border:"none",
            color:"var(--text-muted)", display:"flex",
            alignItems:"center", justifyContent:"center",
            cursor:"pointer", transition:"all var(--t-fast)",
          }}
            onMouseEnter={e => { e.currentTarget.style.color = "var(--text-primary)"; e.currentTarget.style.background = "var(--bg-elevated)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "var(--text-muted)";   e.currentTarget.style.background = "var(--bg-hover)";     }}
          >
            <CloseIcon />
          </button>
        </div>

        {/* Scrollable content */}
        <div style={{ flex:1, overflowY:"auto", padding:"12px 0", WebkitOverflowScrolling:"touch" }}>

          {/* Now Playing */}
          {currentTrack && (
            <div style={{ padding:"0 16px 12px" }}>
              <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"8px", padding:"0 4px" }}>
                <SectionLabelText>Now Playing</SectionLabelText>
                {aiMoodContext && (
                  <span title={aiMoodContext.fallback ? `${aiMoodContext.moodLabel} (local picks)` : `${aiMoodContext.moodLabel} (Gemini)`}
                    style={{
                      display:"inline-flex", alignItems:"center", gap:"4px",
                      fontSize:"10px", fontWeight:600, color:moodAccent,
                      background:moodAccentDim, border:`1px solid ${moodAccentBorder}`,
                      borderRadius:"999px", padding:"2px 7px",
                      whiteSpace:"nowrap", cursor:"default",
                    }}>
                    {moodMeta.emoji ?? "🎵"} {aiMoodContext.moodLabel}
                    {aiMoodContext.fallback && <span style={{ opacity:0.7, fontSize:"9px" }}>&nbsp;· Local</span>}
                  </span>
                )}
              </div>
              <QueueItem
                track={currentTrack}
                isActive
                onPlay={() => playSong(currentTrack, queue)}
                formatTime={formatTime}
                aiReason={aiMoodContext ? currentTrack.aiReason : null}
                accentColor={aiMoodContext ? moodAccent : undefined}
                accentBorder={aiMoodContext ? moodAccentBorder : undefined}
              />
            </div>
          )}

          {/* Up Next */}
          {upNext.length > 0 && (
            <div style={{ padding:"0 16px" }}>
              <SectionLabel>Up Next</SectionLabel>
              {upNext.map((track, i) => (
                <QueueItem key={`${track._id}-${i}`} track={track}
                  onPlay={() => playSong(track, queue)}
                  onRemove={() => handleRemove(track)}
                  formatTime={formatTime}
                />
              ))}
            </div>
          )}

          {/* Previously played */}
          {played.length > 0 && (
            <div style={{ padding:"12px 16px 0" }}>
              <SectionLabel>Previously Played</SectionLabel>
              {played.map((track, i) => (
                <QueueItem key={`prev-${track._id}-${i}`} track={track} dimmed
                  onPlay={() => playSong(track, queue)}
                  formatTime={formatTime}
                />
              ))}
            </div>
          )}

          {/* Empty */}
          {queue.length === 0 && (
            <div style={{ padding:"48px 24px", textAlign:"center" }}>
              <div style={{ fontSize:"40px", marginBottom:"12px", opacity:0.4 }}>♪</div>
              <p style={{ fontSize:"14px", color:"var(--text-muted)", lineHeight:1.6 }}>
                Your queue is empty.
                <br />
                <span style={{ fontSize:"13px" }}>Add tracks with the + button.</span>
              </p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes slideUpDrawer {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </>
  );
}

/* ── Section label helpers ───────────────────────────────────────────────── */
function SectionLabelText({ children }) {
  return (
    <span style={{
      fontSize:"11px", fontWeight:700, letterSpacing:"1px",
      textTransform:"uppercase", color:"var(--text-muted)",
    }}>{children}</span>
  );
}
function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize:"11px", fontWeight:700, letterSpacing:"1px",
      textTransform:"uppercase", color:"var(--text-muted)",
      marginBottom:"8px", padding:"0 4px",
    }}>{children}</div>
  );
}

/* ── Queue Item ──────────────────────────────────────────────────────────── */
function QueueItem({ track, isActive=false, dimmed=false, onPlay, onRemove, formatTime, aiReason=null, accentColor=null, accentBorder=null }) {
  const activeBorder = accentBorder ?? "var(--cyan-border)";
  const activeTitle  = accentColor  ?? "var(--cyan)";

  return (
    <div style={{
      display:"flex", alignItems:"center", gap:"10px",
      padding:"8px", borderRadius:"10px", marginBottom:"2px",
      background: isActive ? "var(--bg-active)" : "transparent",
      border: isActive ? `1px solid ${activeBorder}` : "1px solid transparent",
      opacity: dimmed ? 0.45 : 1,
      transition:"all var(--t-fast)", cursor:"default",
    }}
      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "var(--bg-hover)"; }}
      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
    >
      {/* Art — FIX 2: CSS vars not hardcoded hsl */}
      <div onClick={onPlay} style={{
        width:"38px", height:"38px", borderRadius:"8px", flexShrink:0,
        background:"linear-gradient(135deg, var(--bg-elevated), var(--bg-raised))",
        border:`1px solid ${isActive ? activeBorder : "var(--border-faint)"}`,
        overflow:"hidden", cursor:"pointer",
        display:"flex", alignItems:"center", justifyContent:"center",
      }}>
        {track.coverUrl || track.coverImage
          ? <img src={track.coverUrl || track.coverImage} alt={track.title} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
          : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round">
              <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
            </svg>
        }
      </div>

      {/* Info */}
      <div style={{ flex:1, minWidth:0 }}>
        <div className="truncate" style={{
          fontSize:"13px", fontWeight: isActive ? 600 : 500,
          color: isActive ? activeTitle : "var(--text-primary)",
          lineHeight:1.3,
        }}>{track.title}</div>
        <div className="truncate" style={{ fontSize:"11px", color:"var(--text-muted)", marginTop:"2px" }}>
          {track.artist?.username || track.artistName || "Unknown Artist"}
        </div>
        {/* Phase 5: AI reason on now playing */}
        {isActive && aiReason && (
          <div title={aiReason} className="truncate" style={{
            fontSize:"10px", color: accentColor ?? "var(--cyan)",
            marginTop:"3px", opacity:0.8, lineHeight:1.3, fontStyle:"italic",
          }}>{aiReason}</div>
        )}
      </div>

      {/* Duration — FIX 3 */}
      {formatTime && (
        <span style={{ fontSize:"11px", color:"var(--text-muted)", flexShrink:0, fontVariantNumeric:"tabular-nums" }}>
          {formatTime(track.duration)}
        </span>
      )}

      {/* Remove — FIX 1: opacity reset */}
      {onRemove && (
        <button onClick={onRemove} title="Remove from queue" style={{
          width:"24px", height:"24px", borderRadius:"50%",
          background:"none", border:"none", color:"var(--text-muted)",
          display:"flex", alignItems:"center", justifyContent:"center",
          cursor:"pointer", flexShrink:0, transition:"all var(--t-fast)", opacity:0,
        }}
          onMouseEnter={e => { e.currentTarget.style.color = "var(--coral)"; e.currentTarget.style.background = "var(--bg-hover)"; e.currentTarget.style.opacity = "1"; }}
          onMouseLeave={e => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.background = "none"; e.currentTarget.style.opacity = "0"; }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  );
}

/* ── Icons ───────────────────────────────────────────────────────────────── */
function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
// src/components/TrackRow.jsx
// ─────────────────────────────────────────────────────────────────────────────
// PHASE 3 FIX:
//
//   QUEUE TOAST (handleQueue)
//   - Root cause: addToQueue() returns undefined (setQueue has no return value)
//     so `const added = addToQueue(track)` was always falsy — the "already in
//     queue" toast branch never fired and the "added" toast never showed either.
//   - Fix: check queue membership via `queue.find()` BEFORE calling addToQueue.
//     No PlayerContext changes needed (Phase 4 owns that file).
//
// Previous fixes (Phase 2) preserved unchanged:
//   - buildGridCols() shared between header + rows (alignment single source)
//   - resolveAlbumTitle() / resolveAlbumId() multi-field fallback
//   - Duration column 60px right-aligned under clock icon
//   - Actions column 96px
//   - Consistent 0 16px horizontal padding on header and rows
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { usePlayer } from "../context/PlayerContext";
import { useToast } from "../context/ToastContext";

// ── Single source of truth for column widths ──────────────────────────────
function buildGridCols(showArt, showAlbum) {
  return [
    "40px",                          // # / play button
    showArt ? "44px" : null,         // album art thumbnail
    "1fr",                           // title + artist
    showAlbum ? "minmax(100px,180px)" : null, // album title
    "60px",                          // duration
    "96px",                          // actions
  ]
    .filter(Boolean)
    .join(" ");
}

// ── Resolve album title from multiple possible field shapes ───────────────
function resolveAlbumTitle(track) {
  return (
    track.album?.title ||
    track.albumTitle   ||
    track.albumName    ||
    null
  );
}

function resolveAlbumId(track) {
  return track.album?._id || track.albumId || null;
}

/* ═══════════════════════════════════════════════════════════════════════════
   TrackRow
═══════════════════════════════════════════════════════════════════════════ */
export default function TrackRow({
  track,
  index     = 0,
  trackList = [],
  showAlbum = false,
  showArt   = true,
  onDelete  = null,
  compact   = false,
}) {
  const navigate = useNavigate();
  const toast    = useToast();

  const {
    playSong,
    currentTrack,
    isPlaying,
    togglePlay,
    toggleLike,
    isLiked,
    addToQueue,
    queue,          // FIX: destructure queue so we can check membership
    formatTime,
  } = usePlayer();

  const [hovered, setHovered] = useState(false);

  const isActive   = currentTrack?._id === track._id;
  const liked      = isLiked(track._id);
  const rowPad     = compact ? "6px 16px" : "10px 16px";
  const gridCols   = buildGridCols(showArt, showAlbum);
  const albumTitle = resolveAlbumTitle(track);
  const albumId    = resolveAlbumId(track);

  const handlePlay = useCallback(
    (e) => {
      e?.stopPropagation();
      if (isActive) togglePlay();
      else playSong(track, trackList.length ? trackList : [track]);
    },
    [isActive, togglePlay, playSong, track, trackList],
  );

  // FIX: check queue membership before calling addToQueue.
  // addToQueue() returns undefined (setQueue has no return value), so
  // branching on its return value never worked. Read `queue` from context
  // and test membership here instead — fully self-contained.
  const handleQueue = useCallback(
    (e) => {
      e.stopPropagation();
      const alreadyQueued = queue.some((t) => t._id === track._id);
      if (alreadyQueued) {
        toast.info(`"${track.title}" is already in queue`);
        return;
      }
      addToQueue(track);
      toast.success(`"${track.title}" added to queue`);
    },
    [queue, addToQueue, track, toast],
  );

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "grid",
        gridTemplateColumns: gridCols,
        alignItems: "center",
        gap: "12px",
        padding: rowPad,
        borderRadius: "10px",
        background: isActive
          ? "var(--bg-active)"
          : hovered
            ? "var(--bg-hover)"
            : "transparent",
        border: isActive
          ? "1px solid var(--cyan-border)"
          : "1px solid transparent",
        transition: "background var(--t-fast)",
        cursor: "default",
      }}
    >
      {/* ── # / Play ────────────────────────────────────────────────── */}
      <div
        style={{
          width: "40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {isActive && !hovered ? (
          <EqualizerBars isPlaying={isPlaying} />
        ) : hovered ? (
          <button
            onClick={handlePlay}
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              background: isActive
                ? "linear-gradient(135deg, var(--cyan), var(--violet))"
                : "var(--bg-raised)",
              border: "none",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "transform var(--t-fast)",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.1)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            {isActive && isPlaying ? <PauseIcon size={11} /> : <PlayIcon size={11} />}
          </button>
        ) : (
          <span
            style={{
              fontSize: "13px",
              color: isActive ? "var(--cyan)" : "var(--text-muted)",
              fontVariantNumeric: "tabular-nums",
              fontWeight: isActive ? 600 : 400,
            }}
          >
            {index + 1}
          </span>
        )}
      </div>

      {/* ── Album art ───────────────────────────────────────────────── */}
      {showArt && (
        <div
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "7px",
            overflow: "hidden",
            background: "var(--bg-raised)",
            flexShrink: 0,
            border: isActive
              ? "1px solid var(--cyan-border)"
              : "1px solid var(--border-faint)",
          }}
        >
          {track.coverImage || track.coverUrl ? (
            <img
              src={track.coverImage || track.coverUrl}
              alt={track.title}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <PlaceholderArt />
          )}
        </div>
      )}

      {/* ── Title + Artist ──────────────────────────────────────────── */}
      <div style={{ minWidth: 0 }}>
        <div
          className="truncate"
          style={{
            fontSize: "14px",
            fontWeight: isActive ? 600 : 500,
            color: isActive ? "var(--cyan)" : "var(--text-primary)",
            lineHeight: 1.3,
          }}
        >
          {track.title}
        </div>
        <div className="truncate" style={{ marginTop: "3px" }}>
          <span
            onClick={
              track.artist?._id
                ? (e) => { e.stopPropagation(); navigate(`/artist/${track.artist._id}`); }
                : undefined
            }
            style={{
              fontSize: "12px",
              color: "var(--text-muted)",
              cursor: track.artist?._id ? "pointer" : "default",
              display: "inline",
            }}
            onMouseEnter={(e) => {
              if (track.artist?._id) e.currentTarget.style.color = "var(--text-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--text-muted)";
            }}
          >
            {track.artist?.username || track.artistName || "Unknown Artist"}
          </span>
        </div>
      </div>

      {/* ── Album ───────────────────────────────────────────────────── */}
      {showAlbum && (
        <div
          className="truncate"
          style={{
            fontSize: "13px",
            color: "var(--text-muted)",
            cursor: albumId ? "pointer" : "default",
            opacity: albumTitle ? 1 : 0.4,
          }}
          onClick={
            albumId
              ? (e) => { e.stopPropagation(); navigate(`/album/${albumId}`); }
              : undefined
          }
          onMouseEnter={(e) => {
            if (albumId) e.currentTarget.style.color = "var(--text-primary)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "var(--text-muted)";
          }}
        >
          {albumTitle || "—"}
        </div>
      )}

      {/* ── Duration ────────────────────────────────────────────────── */}
      <div
        style={{
          fontSize: "13px",
          color: "var(--text-muted)",
          textAlign: "right",
          fontVariantNumeric: "tabular-nums",
          flexShrink: 0,
        }}
      >
        {formatTime(track.duration)}
      </div>

      {/* ── Actions ─────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: "4px",
          opacity: hovered || liked ? 1 : 0,
          transition: "opacity var(--t-fast)",
        }}
      >
        <ActionButton
          onClick={(e) => { e.stopPropagation(); toggleLike(track._id); }}
          title={liked ? "Remove from favourites" : "Add to favourites"}
          color={liked ? "var(--coral)" : "var(--text-muted)"}
          hoverColor="var(--coral)"
        >
          <HeartIcon filled={liked} size={14} />
        </ActionButton>

        <ActionButton
          onClick={handleQueue}
          title="Add to queue"
          color="var(--text-muted)"
          hoverColor="var(--cyan)"
        >
          <PlusIcon size={14} />
        </ActionButton>

        {onDelete && (
          <ActionButton
            onClick={(e) => { e.stopPropagation(); onDelete(track); }}
            title="Delete track"
            color="var(--text-muted)"
            hoverColor="var(--coral)"
          >
            <TrashIcon size={13} />
          </ActionButton>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   TrackListHeader
   Uses buildGridCols() — header can never drift from rows
═══════════════════════════════════════════════════════════════════════════ */
export function TrackListHeader({ showAlbum = false, showArt = true }) {
  const gridCols = buildGridCols(showArt, showAlbum);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: gridCols,
        alignItems: "center",
        gap: "12px",
        padding: "0 16px 10px",
        borderBottom: "1px solid var(--border-faint)",
        marginBottom: "4px",
      }}
    >
      <div style={hStyle}>#</div>
      {showArt && <div />}
      <div style={hStyle}>Title</div>
      {showAlbum && <div style={hStyle}>Album</div>}
      <div style={{ ...hStyle, textAlign: "right" }}>
        <DurationIcon />
      </div>
      <div />
    </div>
  );
}

/* ── Shared header cell style ─────────────────────────────────────────────── */
const hStyle = {
  fontSize: "11px",
  fontWeight: 700,
  letterSpacing: "1px",
  textTransform: "uppercase",
  color: "var(--text-muted)",
};

/* ── Inline equalizer (replaces Equalizer import for self-containment) ─────
   Used only in the # column when the track is active and not hovered.
   Keeps the same visual as before — three animated bars.
────────────────────────────────────────────────────────────────────────────── */
function EqualizerBars({ isPlaying }) {
  const barStyle = (delay) => ({
    width: "3px",
    borderRadius: "2px",
    background: "var(--cyan)",
    animation: isPlaying
      ? `eqBar 0.8s ease-in-out ${delay}s infinite alternate`
      : "none",
    height: isPlaying ? undefined : "4px",
  });

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: "2px",
        height: "16px",
      }}
    >
      <div style={{ ...barStyle(0),    height: "10px" }} />
      <div style={{ ...barStyle(0.15), height: "16px" }} />
      <div style={{ ...barStyle(0.3),  height: "7px"  }} />
      <style>{`
        @keyframes eqBar {
          from { transform: scaleY(0.3); }
          to   { transform: scaleY(1);   }
        }
      `}</style>
    </div>
  );
}

/* ── Action Button ────────────────────────────────────────────────────────── */
function ActionButton({ onClick, title, color, hoverColor, children }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: "28px",
        height: "28px",
        borderRadius: "50%",
        background: "none",
        border: "none",
        color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        transition: "all var(--t-fast)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color      = hoverColor;
        e.currentTarget.style.background = "var(--bg-hover)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color      = color;
        e.currentTarget.style.background = "none";
      }}
    >
      {children}
    </button>
  );
}

/* ── Placeholder art ──────────────────────────────────────────────────────── */
function PlaceholderArt() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "linear-gradient(135deg, var(--bg-raised), var(--bg-elevated))",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--text-muted)"
        strokeWidth="1.5"
        strokeLinecap="round"
      >
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
      </svg>
    </div>
  );
}

/* ── Icons ────────────────────────────────────────────────────────────────── */
function PlayIcon({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <polygon points="6 3 20 12 6 21 6 3" />
    </svg>
  );
}
function PauseIcon({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  );
}
function HeartIcon({ filled, size = 14 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
    </svg>
  );
}
function PlusIcon({ size = 14 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5"  y1="12" x2="19" y2="12" />
    </svg>
  );
}
function TrashIcon({ size = 14 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
    </svg>
  );
}
function DurationIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
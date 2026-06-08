// src/components/AIMoodSection.jsx
// ─────────────────────────────────────────────────────────────────────────────
// CURRENT CHANGES:
//   1. PlaylistPreview stays visible after dismissal — replaced "×" dismiss
//      with a minimize/expand toggle. Users can collapse the panel but it
//      never fully disappears while the AI playlist is active in queue.
//      Fixes: users losing track of what songs are in their AI queue.
//
//   2. "Switch song" click on any row in the preview — clicking a track row
//      in the preview now calls playSong(track, playlist) to jump directly
//      to that song. Fixes: users not knowing they can switch songs.
//
//   3. "Now Playing" row tracks PlayerContext.currentTrack — the highlighted
//      row follows the actual playing song, not always row 0. So when the
//      user clicks Next or a different row, the panel updates correctly.
//
//   4. Collapsed state shows a mini pill — "💻 Coding · 8 tracks ▾" so the
//      user always knows the AI playlist is loaded even when panel is closed.
//
//   All other logic (handleMoodClick, MoodChip, error state, Gemini call,
//   fallback handling, AIDJBanner) is completely unchanged from Phase 5.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback, memo } from "react";
import { usePlayer } from "../context/PlayerContext";
import { getMoodPlaylist } from "../api";

const MOODS = [
  {
    key: "coding",
    label: "Coding",
    emoji: "💻",
    hue: 200,
    vibe: "Deep focus beats to keep you in the zone",
  },
  {
    key: "study",
    label: "Study",
    emoji: "📖",
    hue: 240,
    vibe: "Calm instrumentals for clear thinking",
  },
  {
    key: "focus",
    label: "Focus",
    emoji: "🎯",
    hue: 180,
    vibe: "Minimal ambient flow, zero distractions",
  },
  {
    key: "gym",
    label: "Gym",
    emoji: "🏋️",
    hue: 0,
    vibe: "High-energy bangers to push through",
  },
  {
    key: "relax",
    label: "Relax",
    emoji: "🌿",
    hue: 140,
    vibe: "Soft, mellow sounds to unwind",
  },
  {
    key: "sleep",
    label: "Sleep",
    emoji: "🌙",
    hue: 260,
    vibe: "Peaceful tones for a restful night",
  },
  {
    key: "roadtrip",
    label: "Road Trip",
    emoji: "🚗",
    hue: 35,
    vibe: "Feel-good anthems for the open road",
  },
  {
    key: "naat",
    label: "Naat",
    emoji: "🕌",
    hue: 45,
    vibe: "Devotional naats and nasheeds",
  },
];

const MOOD_MAP = Object.fromEntries(MOODS.map((m) => [m.key, m]));

// ── MoodChip — unchanged from Phase 5 ────────────────────────────────────────
const MoodChip = memo(function MoodChip({
  mood,
  isActive,
  isLoading,
  isAnyLoading,
  onClick,
}) {
  const [hovered, setHovered] = useState(false);
  const accent = `hsl(${mood.hue}, 65%, 55%)`;
  const accentDim = `hsla(${mood.hue}, 65%, 55%, 0.12)`;
  const accentBorder = `hsla(${mood.hue}, 65%, 55%, 0.35)`;
  const isDisabled = isAnyLoading && !isLoading;

  return (
    <button
      onClick={() => !isDisabled && !isLoading && onClick(mood.key)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label={`Play ${mood.label} mood playlist`}
      aria-busy={isLoading}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "10px 18px",
        borderRadius: "999px",
        border: `1px solid ${isActive ? accentBorder : hovered ? "var(--border-subtle)" : "var(--border-faint)"}`,
        background: isActive
          ? accentDim
          : hovered
            ? "var(--bg-elevated)"
            : "var(--bg-surface)",
        color: isActive ? accent : "var(--text-secondary)",
        fontSize: "13px",
        fontWeight: isActive ? 700 : 500,
        cursor: isDisabled ? "not-allowed" : "pointer",
        opacity: isDisabled ? 0.45 : 1,
        transition: "all 0.18s ease",
        whiteSpace: "nowrap",
        boxShadow: isActive
          ? `0 0 0 1px ${accentBorder}, 0 4px 20px ${accentDim}`
          : hovered
            ? "0 2px 12px rgba(0,0,0,0.15)"
            : "none",
        transform: hovered && !isDisabled ? "translateY(-1px)" : "none",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {isLoading && (
        <span
          style={{
            width: "14px",
            height: "14px",
            border: `2px solid ${accentBorder}`,
            borderTop: `2px solid ${accent}`,
            borderRadius: "50%",
            display: "inline-block",
            animation: "spin 0.7s linear infinite",
            flexShrink: 0,
          }}
        />
      )}
      {!isLoading && (
        <span style={{ fontSize: "15px", lineHeight: 1 }}>{mood.emoji}</span>
      )}
      <span>{mood.label}</span>
      {isActive && !isLoading && (
        <span
          style={{
            width: "5px",
            height: "5px",
            borderRadius: "50%",
            background: accent,
            marginLeft: "2px",
            animation: "pulseGlow 1.5s ease-in-out infinite",
          }}
        />
      )}
    </button>
  );
});

// ── AIDJBanner — unchanged from Phase 5 ──────────────────────────────────────
const AIDJBanner = memo(function AIDJBanner({
  moodKey,
  moodLabel,
  trackCount,
  fallback,
  onToggleCollapse,
  collapsed,
}) {
  const moodDef = MOOD_MAP[moodKey] || {};
  const accent = `hsl(${moodDef.hue ?? 186}, 65%, 55%)`;
  const bars = [0.45, 1, 0.65, 0.9, 0.55];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        marginBottom: collapsed ? 0 : "16px",
        gap: "12px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "12px",
          flex: 1,
          minWidth: 0,
        }}
      >
        {/* Waveform */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "2px",
            height: "28px",
            flexShrink: 0,
            marginTop: "2px",
          }}
        >
          {bars.map((h, i) => (
            <div
              key={i}
              style={{
                width: "3px",
                height: `${h * 24}px`,
                borderRadius: "2px",
                background: accent,
                animation: `djBounce 1.4s ease-in-out ${i * 0.14}s infinite`,
                transformOrigin: "center",
                opacity: 0.85,
              }}
            />
          ))}
        </div>
        {/* Text */}
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontSize: "14px",
                fontWeight: 700,
                color: "var(--text-primary)",
                lineHeight: 1.2,
              }}
            >
              {moodDef.emoji ?? ""} {moodLabel}
            </span>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: accent,
                background: `hsla(${moodDef.hue ?? 186}, 65%, 55%, 0.12)`,
                border: `1px solid hsla(${moodDef.hue ?? 186}, 65%, 55%, 0.25)`,
                borderRadius: "999px",
                padding: "2px 8px",
                lineHeight: 1.4,
                whiteSpace: "nowrap",
              }}
            >
              {trackCount} track{trackCount !== 1 ? "s" : ""}
            </span>
            {fallback ? (
              <span
                title="Gemini was busy — playlist built from your library metadata"
                style={{
                  fontSize: "10px",
                  fontWeight: 600,
                  color: "var(--coral, #ff6b6b)",
                  background: "hsla(0,75%,60%,0.1)",
                  border: "1px solid hsla(0,75%,60%,0.25)",
                  borderRadius: "999px",
                  padding: "2px 7px",
                  letterSpacing: "0.3px",
                  textTransform: "uppercase",
                  whiteSpace: "nowrap",
                  cursor: "help",
                }}
              >
                Local Picks
              </span>
            ) : (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "3px",
                  fontSize: "10px",
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border-faint)",
                  borderRadius: "999px",
                  padding: "2px 7px",
                  letterSpacing: "0.3px",
                  textTransform: "uppercase",
                  whiteSpace: "nowrap",
                }}
              >
                <GeminiIcon /> Gemini
              </span>
            )}
          </div>
          {!collapsed && moodDef.vibe && (
            <p
              style={{
                fontSize: "12px",
                color: "var(--text-muted)",
                margin: "4px 0 0",
                lineHeight: 1.5,
              }}
            >
              {moodDef.vibe}
            </p>
          )}
        </div>
      </div>

      {/* ── CURRENT: collapse/expand toggle replaces dismiss ── */}
      <button
        onClick={onToggleCollapse}
        aria-label={collapsed ? "Expand playlist" : "Collapse playlist"}
        title={collapsed ? "Show playlist" : "Hide playlist"}
        style={{
          background: "none",
          border: "1px solid var(--border-faint)",
          cursor: "pointer",
          color: "var(--text-muted)",
          fontSize: "12px",
          lineHeight: 1,
          padding: "4px 8px",
          borderRadius: "6px",
          transition: "all 0.15s ease",
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "var(--text-primary)";
          e.currentTarget.style.borderColor = "var(--border-subtle)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "var(--text-muted)";
          e.currentTarget.style.borderColor = "var(--border-faint)";
        }}
      >
        {collapsed ? "▾ Show" : "▴ Hide"}
      </button>
    </div>
  );
});

// ── CURRENT: PlaylistPreview — collapsible + clickable rows ───────────────────
const PlaylistPreview = memo(function PlaylistPreview({
  tracks,
  moodKey,
  moodLabel,
  fallback,
  currentTrackId,
}) {
  const { playSong } = usePlayer();
  const [collapsed, setCollapsed] = useState(false);

  if (!tracks || tracks.length === 0) return null;

  const moodDef = MOOD_MAP[moodKey] || {};
  const accent = `hsl(${moodDef.hue ?? 186}, 65%, 55%)`;

  // ── CURRENT: find which row is currently playing ──────────────────────────
  // currentTrackId comes from PlayerContext.currentTrack._id
  // Defaults to tracks[0] if none match (playlist just started)
  const nowPlayingIndex = currentTrackId
    ? tracks.findIndex((t) => String(t._id) === String(currentTrackId))
    : 0;
  const activeIndex = nowPlayingIndex >= 0 ? nowPlayingIndex : 0;

  return (
    <div
      style={{
        marginTop: "16px",
        padding: "16px 20px",
        background: "var(--bg-surface)",
        border: "1px solid var(--border-faint)",
        borderRadius: "14px",
        animation: "fadeUp 0.3s ease both",
      }}
    >
      {/* ── Banner with collapse toggle ── */}
      <AIDJBanner
        moodKey={moodKey}
        moodLabel={moodLabel}
        trackCount={tracks.length}
        fallback={fallback}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
      />

      {/* ── Collapsible track list ── */}
      {!collapsed && (
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          {tracks.slice(0, 8).map((track, i) => {
            const artistName =
              track.artist?.username || track.artistName || "Unknown";
            const isNowPlaying = i === activeIndex;
            const showUpNextLabel = i === activeIndex + 1;

            return (
              <div key={track._id}>
                {showUpNextLabel && (
                  <div
                    style={{
                      fontSize: "10px",
                      fontWeight: 700,
                      letterSpacing: "0.8px",
                      textTransform: "uppercase",
                      color: "var(--text-muted)",
                      padding: "8px 8px 4px",
                      opacity: 0.7,
                    }}
                  >
                    Up Next
                  </div>
                )}

                {/* ── CURRENT: entire row is clickable to switch song ── */}
                <div
                  onClick={() => playSong(track, tracks)}
                  title={`Play "${track.title}"`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: isNowPlaying ? "8px 8px 8px 12px" : "6px 8px",
                    borderRadius: "9px",
                    borderLeft: isNowPlaying
                      ? `3px solid ${accent}`
                      : "3px solid transparent",
                    background: isNowPlaying
                      ? "var(--bg-elevated)"
                      : "transparent",
                    transition: "background 0.15s ease",
                    marginBottom: isNowPlaying ? "6px" : 0,
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => {
                    if (!isNowPlaying)
                      e.currentTarget.style.background = "var(--bg-elevated)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isNowPlaying)
                      e.currentTarget.style.background = "transparent";
                  }}
                >
                  {/* Index / waveform indicator */}
                  <div
                    style={{
                      width: "28px",
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {isNowPlaying ? (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "1.5px",
                          height: "14px",
                        }}
                      >
                        {[0.5, 1, 0.7].map((h, bi) => (
                          <div
                            key={bi}
                            style={{
                              width: "2.5px",
                              height: `${h * 14}px`,
                              borderRadius: "2px",
                              background: accent,
                              animation: `djBounce 1.2s ease-in-out ${bi * 0.18}s infinite`,
                              transformOrigin: "center",
                            }}
                          />
                        ))}
                      </div>
                    ) : (
                      <span
                        style={{
                          fontSize: "11px",
                          color: "var(--text-muted)",
                          textAlign: "center",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {i + 1}
                      </span>
                    )}
                  </div>

                  {/* Cover */}
                  <div
                    style={{
                      width: "34px",
                      height: "34px",
                      borderRadius: "7px",
                      overflow: "hidden",
                      flexShrink: 0,
                      background: "var(--bg-raised)",
                      border: `1px solid ${isNowPlaying ? `hsla(${moodDef.hue ?? 186}, 65%, 55%, 0.3)` : "var(--border-faint)"}`,
                      boxShadow: isNowPlaying
                        ? `0 0 10px hsla(${moodDef.hue ?? 186}, 65%, 55%, 0.15)`
                        : "none",
                    }}
                  >
                    {track.coverUrl ? (
                      <img
                        src={track.coverUrl}
                        alt={track.title}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "var(--text-muted)",
                          fontSize: "12px",
                        }}
                      >
                        ♪
                      </div>
                    )}
                  </div>

                  {/* Title + artist */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      className="truncate"
                      style={{
                        fontSize: "13px",
                        fontWeight: isNowPlaying ? 600 : 400,
                        color: isNowPlaying ? accent : "var(--text-secondary)",
                        lineHeight: 1.3,
                      }}
                    >
                      {track.title}
                    </div>
                    <div
                      className="truncate"
                      style={{
                        fontSize: "11px",
                        color: "var(--text-muted)",
                        marginTop: "1px",
                      }}
                    >
                      {artistName}
                    </div>
                  </div>

                  {/* AI reason tag */}
                  {track.aiReason && (
                    <span
                      title={track.aiReason}
                      style={{
                        fontSize: "11px",
                        color: "var(--text-secondary)",
                        background: "var(--bg-elevated)",
                        border: "1px solid var(--border-subtle)",
                        borderLeft: `3px solid ${accent}`,
                        borderRadius: "6px",
                        padding: "3px 8px",
                        whiteSpace: "nowrap",
                        maxWidth: "140px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        flexShrink: 0,
                        lineHeight: 1.4,
                      }}
                    >
                      {track.aiReason}
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {tracks.length > 8 && (
            <div
              style={{
                fontSize: "12px",
                color: "var(--text-muted)",
                padding: "8px 8px 2px",
                textAlign: "center",
                borderTop: "1px solid var(--border-faint)",
                marginTop: "4px",
              }}
            >
              + {tracks.length - 8} more in queue
            </div>
          )}
        </div>
      )}
    </div>
  );
});

// ── AIMoodSection (main export) ───────────────────────────────────────────────
export default function AIMoodSection() {
  const { playSong, currentTrack } = usePlayer(); // ← added currentTrack

  const [loadingMood, setLoadingMood] = useState(null);
  const [activeMood, setActiveMood] = useState(null);
  const [playlist, setPlaylist] = useState([]);
  const [moodLabel, setMoodLabel] = useState("");
  const [error, setError] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [fallback, setFallback] = useState(false);

  const handleMoodClick = useCallback(
    async (moodKey) => {
      if (moodKey === activeMood && playlist.length > 0) {
        playSong(playlist[0], playlist);
        return;
      }

      setLoadingMood(moodKey);
      setError(null);
      setShowPreview(false);

      try {
        const data = await getMoodPlaylist(moodKey);

        if (!data.playlist || data.playlist.length === 0) {
          setError("No songs found for this mood. Try another!");
          setLoadingMood(null);
          return;
        }

        const tracks = data.playlist;
        setActiveMood(moodKey);
        setPlaylist(tracks);
        setMoodLabel(data.mood || moodKey);
        setFallback(!!data.fallback);
        setShowPreview(true);
        playSong(tracks[0], tracks);
      } catch (err) {
        const msg =
          err?.response?.status === 503
            ? "AI is temporarily unavailable. Try again in a moment."
            : err?.response?.status === 404
              ? "No songs available yet. Upload some tracks first!"
              : "Couldn't generate playlist. Check your connection.";
        setError(msg);
      } finally {
        setLoadingMood(null);
      }
    },
    [activeMood, playlist, playSong],
  );

  const isAnyLoading = loadingMood !== null;

  return (
    <div
      style={{ marginBottom: "48px", animation: "fadeUp 0.4s ease 0.25s both" }}
    >
      {/* Section header */}
      <div className="section-header">
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <h2 className="section-title" style={{ margin: 0 }}>
            AI Mood Playlists
          </h2>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "2px 8px",
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-faint)",
              borderRadius: "999px",
              fontSize: "10px",
              fontWeight: 600,
              color: "var(--text-muted)",
              letterSpacing: "0.5px",
              textTransform: "uppercase",
            }}
          >
            <GeminiIcon /> Gemini
          </span>
        </div>
      </div>

      <p
        style={{
          fontSize: "13px",
          color: "var(--text-muted)",
          marginBottom: "18px",
          marginTop: "-4px",
        }}
      >
        Pick a mood. AI curates your queue instantly. Click any song to jump to
        it.
      </p>

      {/* Mood chips */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
        {MOODS.map((mood) => (
          <MoodChip
            key={mood.key}
            mood={mood}
            isActive={mood.key === activeMood && !isAnyLoading}
            isLoading={mood.key === loadingMood}
            isAnyLoading={isAnyLoading}
            onClick={handleMoodClick}
          />
        ))}
      </div>

      {/* Error state */}
      {error && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginTop: "14px",
            padding: "12px 16px",
            background: "var(--bg-surface)",
            border: "1px solid var(--border-faint)",
            borderRadius: "10px",
            fontSize: "13px",
            color: "var(--text-muted)",
            animation: "fadeUp 0.25s ease both",
          }}
        >
          <span style={{ fontSize: "16px" }}>⚠️</span>
          <span style={{ flex: 1 }}>{error}</span>
          <button
            onClick={() => setError(null)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-muted)",
              fontSize: "16px",
              lineHeight: 1,
              padding: "0 4px",
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* ── CURRENT: PlaylistPreview — persistent, collapsible, clickable ── */}
      {showPreview && playlist.length > 0 && (
        <PlaylistPreview
          tracks={playlist}
          moodKey={activeMood}
          moodLabel={moodLabel}
          fallback={fallback}
          currentTrackId={currentTrack?._id} // ← tracks active song
        />
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50%       { opacity: 1;   transform: scale(1.3); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
        @keyframes djBounce {
          0%, 80%, 100% { transform: scaleY(0.4); }
          40%           { transform: scaleY(1.0); }
        }
      `}</style>
    </div>
  );
}

function GeminiIcon() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ opacity: 0.7 }}
    >
      <path d="M12 2 L12 22 M2 12 L22 12" strokeWidth="2" opacity="0.5" />
      <circle
        cx="12"
        cy="12"
        r="4"
        fill="currentColor"
        stroke="none"
        opacity="0.8"
      />
    </svg>
  );
}

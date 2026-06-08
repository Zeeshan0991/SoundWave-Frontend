// src/pages/FavoritesPage.jsx
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { usePlayer } from "../context/PlayerContext";
import { useToast } from "../context/ToastContext";
import api from "../api";
import TrackRow, { TrackListHeader } from "../components/TrackRow";

export default function FavoritesPage() {
  const navigate = useNavigate();
  const { playSong, toggleLike } = usePlayer(); // ✅ FIX — playSong not playTrack
  const toast = useToast();

  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("recent");

  /* ── Fetch ───────────────────────────────────────────────── */
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get("/music/favorites");
        setTracks(data?.tracks || []);
      } catch {
        toast.error("Failed to load favourites.");
      } finally {
        setLoading(false);
      }
    })();
  }, []); // eslint-disable-line

  /* ── Sort ────────────────────────────────────────────────── */
  const sorted = [...tracks].sort((a, b) => {
    if (sortBy === "title") return a.title.localeCompare(b.title);
    if (sortBy === "artist") {
      const an = a.artist?.username || a.artistName || "";
      const bn = b.artist?.username || b.artistName || "";
      return an.localeCompare(bn);
    }
    return 0;
  });

  /* ── Optimistic unlike ───────────────────────────────────── */
  const handleUnlike = useCallback(
    async (track) => {
      setTracks((prev) => prev.filter((t) => t._id !== track._id));
      await toggleLike(track._id);
    },
    [toggleLike],
  );

  /* ── Play helpers ────────────────────────────────────────── */
  const handlePlayAll = () => {
    if (sorted.length) playSong(sorted[0], sorted); // ✅ FIX
  };

  const handleShuffle = () => {
    if (!sorted.length) return;
    const shuffled = [...sorted].sort(() => Math.random() - 0.5);
    playSong(shuffled[0], shuffled); // ✅ FIX
  };

  /* ── Total duration ──────────────────────────────────────── */
  const totalSecs = tracks.reduce((acc, t) => acc + (t.duration || 0), 0);
  const fmtTotal = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (h > 0) return `${h} hr ${m} min`;
    return `${m} min`;
  };

  return (
    <div
      style={{ padding: "32px 32px 120px", animation: "fadeUp 0.4s ease both" }}
    >
      {/* ── Hero ─────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: "28px",
          marginBottom: "36px",
          padding: "28px 32px",
          background:
            "linear-gradient(135deg, rgba(255,107,107,0.07), rgba(123,94,167,0.07))",
          border: "1px solid rgba(255,107,107,0.15)",
          borderRadius: "20px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Glow */}
        <div
          style={{
            position: "absolute",
            top: "-80px",
            right: "-80px",
            width: "280px",
            height: "280px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(255,107,107,0.1), transparent)",
            filter: "blur(50px)",
            pointerEvents: "none",
          }}
        />

        {/* Icon */}
        <div
          style={{
            width: "96px",
            height: "96px",
            borderRadius: "18px",
            flexShrink: 0,
            background:
              "linear-gradient(135deg, rgba(255,107,107,0.22), rgba(123,94,167,0.18))",
            border: "1px solid rgba(255,107,107,0.28)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 8px 32px rgba(255,107,107,0.18)",
          }}
        >
          <HeartFilledIcon size={44} />
        </div>

        {/* Info */}
        <div style={{ flex: 1, position: "relative", zIndex: 1 }}>
          <p
            style={{
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "1.5px",
              textTransform: "uppercase",
              color: "var(--coral)",
              marginBottom: "6px",
            }}
          >
            Playlist
          </p>

          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(28px,4vw,42px)",
              fontWeight: 800,
              letterSpacing: "-1px",
              lineHeight: 1.05,
              marginBottom: "10px",
            }}
          >
            Liked Songs
          </h1>

          <p
            style={{
              fontSize: "13.5px",
              color: "var(--text-secondary)",
              marginBottom: "20px",
            }}
          >
            {loading
              ? "Loading…"
              : tracks.length === 0
                ? "No liked songs yet"
                : `${tracks.length} song${tracks.length !== 1 ? "s" : ""}${totalSecs > 0 ? ` · ${fmtTotal(totalSecs)}` : ""}`}
          </p>

          {!loading && tracks.length > 0 && (
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button
                onClick={handlePlayAll}
                className="btn-primary"
                style={{ padding: "11px 24px", fontSize: "14px", gap: "9px" }}
              >
                <PlayIcon /> Play All
              </button>
              <button
                onClick={handleShuffle}
                className="btn-ghost"
                style={{ padding: "10px 20px", fontSize: "14px", gap: "9px" }}
              >
                <ShuffleIcon /> Shuffle
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Sort bar ─────────────────────────────────────── */}
      {!loading && tracks.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "16px",
          }}
        >
          <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
            {sorted.length} track{sorted.length !== 1 ? "s" : ""}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              Sort:
            </span>
            {[
              { value: "recent", label: "Recent" },
              { value: "title", label: "Title" },
              { value: "artist", label: "Artist" },
            ].map((opt) => (
              <SortBtn
                key={opt.value}
                label={opt.label}
                active={sortBy === opt.value}
                onClick={() => setSortBy(opt.value)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Track list ───────────────────────────────────── */}
      {loading ? (
        <FavSkeletons />
      ) : tracks.length === 0 ? (
        <EmptyFavorites onExplore={() => navigate("/search")} />
      ) : (
        <div
          style={{
            background: "var(--bg-surface)",
            borderRadius: "14px",
            border: "1px solid var(--border-faint)",
            overflow: "hidden",
          }}
        >
          <TrackListHeader showAlbum showArt />
          {sorted.map((track, i) => (
            <TrackRow
              key={track._id}
              track={track}
              index={i}
              trackList={sorted}
              showAlbum
              showArt
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Sort button ──────────────────────────────────────────────── */
function SortBtn({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "5px 12px",
        borderRadius: "999px",
        border: `1px solid ${active ? "var(--cyan-border)" : "var(--border-faint)"}`,
        background: active ? "var(--cyan-dim)" : "transparent",
        color: active ? "var(--cyan)" : "var(--text-muted)",
        fontSize: "12px",
        fontWeight: active ? 700 : 400,
        cursor: "pointer",
        transition: "all var(--t-fast)",
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.borderColor = "var(--border-subtle)";
          e.currentTarget.style.color = "var(--text-secondary)";
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.borderColor = "var(--border-faint)";
          e.currentTarget.style.color = "var(--text-muted)";
        }
      }}
    >
      {label}
    </button>
  );
}

/* ── Empty state ──────────────────────────────────────────────── */
function EmptyFavorites({ onExplore }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "80px 20px",
        textAlign: "center",
        gap: "16px",
      }}
    >
      <div
        style={{
          width: "80px",
          height: "80px",
          borderRadius: "50%",
          background: "rgba(255,107,107,0.06)",
          border: "1px solid rgba(255,107,107,0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          animation: "floatY 3s ease-in-out infinite",
        }}
      >
        <HeartFilledIcon
          size={36}
          style={{ opacity: 0.3, color: "var(--coral)" }}
        />
      </div>
      <h3
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "20px",
          fontWeight: 700,
          color: "var(--text-secondary)",
        }}
      >
        No liked songs yet
      </h3>
      <p
        style={{
          fontSize: "14px",
          color: "var(--text-muted)",
          maxWidth: "300px",
          lineHeight: 1.6,
        }}
      >
        Hit the ♥ on any track to save it here. Your favourites live in one
        place.
      </p>
      <button
        onClick={onExplore}
        className="btn-primary"
        style={{ marginTop: "8px", padding: "11px 26px", gap: "8px" }}
      >
        <SearchIcon /> Explore Music
      </button>
    </div>
  );
}

/* ── Skeletons ────────────────────────────────────────────────── */
function FavSkeletons() {
  return (
    <div
      style={{
        background: "var(--bg-surface)",
        borderRadius: "14px",
        border: "1px solid var(--border-faint)",
        overflow: "hidden",
      }}
    >
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            padding: "12px 16px",
            borderBottom: i < 7 ? "1px solid var(--border-faint)" : "none",
          }}
        >
          <div
            className="skeleton"
            style={{ width: "20px", height: "14px", borderRadius: "4px" }}
          />
          <div
            className="skeleton"
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "8px",
              flexShrink: 0,
            }}
          />
          <div style={{ flex: 1 }}>
            <div
              className="skeleton"
              style={{
                height: "14px",
                width: `${38 + ((i * 9) % 30)}%`,
                marginBottom: "6px",
                borderRadius: "4px",
              }}
            />
            <div
              className="skeleton"
              style={{
                height: "12px",
                width: `${20 + ((i * 7) % 20)}%`,
                borderRadius: "4px",
              }}
            />
          </div>
          <div
            className="skeleton"
            style={{ height: "12px", width: "100px", borderRadius: "4px" }}
          />
          <div
            className="skeleton"
            style={{ height: "12px", width: "36px", borderRadius: "4px" }}
          />
        </div>
      ))}
    </div>
  );
}

/* ── Icons ────────────────────────────────────────────────────── */
function HeartFilledIcon({ size = 44 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="var(--coral)"
      stroke="var(--coral)"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
    </svg>
  );
}
function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="6 3 20 12 6 21 6 3" />
    </svg>
  );
}
function ShuffleIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="16 3 21 3 21 8" />
      <line x1="4" y1="20" x2="21" y2="3" />
      <polyline points="21 16 21 21 16 21" />
      <line x1="15" y1="15" x2="21" y2="21" />
      <line x1="4" y1="4" x2="9" y2="9" />
    </svg>
  );
}
function SearchIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

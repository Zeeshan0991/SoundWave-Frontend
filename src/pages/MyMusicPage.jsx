// src/pages/MyMusicPage.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useBreakpoint } from "../hooks/UseBreakpoint";
import api from "../api";
import TrackRow, { TrackListHeader } from "../components/TrackRow";
import AlbumCard from "../components/AlbumCard";
import ConfirmDialog from "../components/ConfirmDialog";

const TABS = [
  { key: "tracks", label: "My Tracks" },
  { key: "albums", label: "My Albums" },
];

export default function MyMusicPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const { isMobile, isTablet } = useBreakpoint();

  const [activeTab, setActiveTab] = useState("tracks");
  const [tracks, setTracks] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [stats, setStats] = useState({ plays: 0, likes: 0, tracks: 0, albums: 0 });

  /* ── Fetch ───────────────────────────────────────────────── */
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [tracksRes, albumsRes] = await Promise.all([
          api.get("/music/my-songs"),
          api.get("/music/my-albums"),
        ]);
        const t = tracksRes.data?.songs || [];
        const a = albumsRes.data?.albums || [];
        setTracks(t);
        setAlbums(a);
        setStats({
          tracks: t.length,
          albums: a.length,
          plays: t.reduce((acc, s) => acc + (s.plays || 0), 0),
          likes: t.reduce((acc, s) => acc + (s.likesCount || 0), 0),
        });
      } catch {
        toast.error("Failed to load your music.");
      } finally {
        setLoading(false);
      }
    })();
  }, []); // eslint-disable-line

  /* ── Delete ──────────────────────────────────────────────── */
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (deleteTarget.type === "track") {
        await api.delete(`/music/${deleteTarget.item._id}`);
        setTracks((prev) => prev.filter((t) => t._id !== deleteTarget.item._id));
        setStats((s) => ({ ...s, tracks: s.tracks - 1 }));
      } else {
        await api.delete(`/music/albums/${deleteTarget.item._id}`);
        setAlbums((prev) => prev.filter((a) => a._id !== deleteTarget.item._id));
        setStats((s) => ({ ...s, albums: s.albums - 1 }));
      }
      toast.success(`"${deleteTarget.item.title}" deleted.`);
      setDeleteTarget(null);
    } catch {
      toast.error(`Failed to delete ${deleteTarget.type}.`);
    } finally {
      setDeleting(false);
    }
  };

  // ── Responsive values ──────────────────────────────────────
  const pagePadding = isMobile ? "20px 16px 140px" : isTablet ? "24px 24px 120px" : "32px 32px 120px";
  const titleSize   = isMobile ? "26px" : isTablet ? "28px" : "32px";
  // Stats: 2-col on mobile, 4-col on tablet+
  const statsGrid   = isMobile
    ? "repeat(2, 1fr)"
    : "repeat(4, 1fr)";

  return (
    <>
      <div style={{ padding: pagePadding, animation: "fadeUp 0.4s ease both" }}>

        {/* ── Header ───────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: "24px",
            flexWrap: "wrap",
            gap: "14px",
          }}
        >
          <div>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: titleSize,
                fontWeight: 800,
                letterSpacing: "-0.5px",
                marginBottom: "4px",
              }}
            >
              My Music
            </h1>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
              Manage your uploaded tracks and albums
            </p>
          </div>

          {/* Buttons — row on tablet+, full-width stack on mobile */}
          <div
            style={{
              display: "flex",
              gap: "8px",
              flexDirection: isMobile ? "column" : "row",
              width: isMobile ? "100%" : "auto",
            }}
          >
            <button
              onClick={() => navigate("/create-album")}
              className="btn-ghost"
              style={{
                padding: "10px 16px",
                fontSize: "13px",
                gap: "7px",
                width: isMobile ? "100%" : "auto",
                justifyContent: "center",
              }}
            >
              <AlbumPlusIcon /> New Album
            </button>
            <button
              onClick={() => navigate("/upload")}
              className="btn-primary"
              style={{
                padding: "10px 18px",
                fontSize: "13px",
                gap: "7px",
                width: isMobile ? "100%" : "auto",
                justifyContent: "center",
              }}
            >
              <UploadIcon /> Upload Track
            </button>
          </div>
        </div>

        {/* ── Stats ────────────────────────────────────── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: statsGrid,
            gap: isMobile ? "10px" : "14px",
            marginBottom: "28px",
          }}
        >
          {[
            { label: "Tracks",      value: stats.tracks,          icon: <TrackIcon />, color: "var(--cyan)"  },
            { label: "Albums",      value: stats.albums,          icon: <AlbumIcon />, color: "var(--violet)"},
            { label: "Total Plays", value: fmtNum(stats.plays),   icon: <PlayIcon />,  color: "var(--green)" },
            { label: "Likes",       value: fmtNum(stats.likes),   icon: <HeartIcon />, color: "var(--coral)" },
          ].map((s, i) => (
            <div
              key={i}
              style={{
                padding: isMobile ? "14px" : "18px 20px",
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-faint)",
                borderRadius: "14px",
                display: "flex",
                alignItems: "center",
                gap: isMobile ? "10px" : "14px",
                animation: `fadeUp 0.3s ease ${i * 0.06}s both`,
              }}
            >
              <div
                style={{
                  width: isMobile ? "34px" : "40px",
                  height: isMobile ? "34px" : "40px",
                  borderRadius: "10px",
                  background: s.color + "18",
                  border: `1px solid ${s.color}30`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: s.color,
                  flexShrink: 0,
                }}
              >
                {s.icon}
              </div>
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: isMobile ? "18px" : "22px",
                    fontWeight: 800,
                    lineHeight: 1,
                  }}
                >
                  {loading ? "—" : s.value}
                </div>
                <div
                  style={{
                    fontSize: isMobile ? "11px" : "12px",
                    color: "var(--text-muted)",
                    marginTop: "3px",
                  }}
                >
                  {s.label}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Tabs ─────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            gap: "2px",
            borderBottom: "1px solid var(--border-faint)",
            marginBottom: "20px",
          }}
        >
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: isMobile ? "9px 14px" : "10px 20px",
                fontFamily: "var(--font-display)",
                fontWeight: activeTab === tab.key ? 700 : 500,
                fontSize: "13.5px",
                color: activeTab === tab.key ? "var(--cyan)" : "var(--text-muted)",
                background: "none",
                border: "none",
                borderBottom: activeTab === tab.key ? "2px solid var(--cyan)" : "2px solid transparent",
                marginBottom: "-1px",
                cursor: "pointer",
                transition: "all var(--t-fast)",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => { if (activeTab !== tab.key) e.currentTarget.style.color = "var(--text-primary)"; }}
              onMouseLeave={(e) => { if (activeTab !== tab.key) e.currentTarget.style.color = "var(--text-muted)"; }}
            >
              {tab.label}
              <span
                style={{
                  marginLeft: "6px",
                  padding: "1px 7px",
                  borderRadius: "999px",
                  background: activeTab === tab.key ? "var(--cyan-dim)" : "var(--bg-elevated)",
                  border: activeTab === tab.key ? "1px solid var(--cyan-border)" : "1px solid var(--border-faint)",
                  fontSize: "11px",
                  fontWeight: 700,
                  color: activeTab === tab.key ? "var(--cyan)" : "var(--text-muted)",
                }}
              >
                {tab.key === "tracks" ? tracks.length : albums.length}
              </span>
            </button>
          ))}
        </div>

        {/* ── Tracks tab ───────────────────────────────── */}
        {activeTab === "tracks" &&
          (loading ? (
            <TrackSkeletons isMobile={isMobile} />
          ) : tracks.length === 0 ? (
            <div className="empty-state">
              <MusicEmptyIcon />
              <h3>No tracks uploaded yet</h3>
              <p>Upload your first track to start building your catalogue.</p>
              <button
                className="btn-primary"
                onClick={() => navigate("/upload")}
                style={{ marginTop: "8px", gap: "8px" }}
              >
                <UploadIcon /> Upload Track
              </button>
            </div>
          ) : (
            /* Scrollable wrapper on mobile so long track lists don't overflow */
            <div
              style={{
                background: "var(--bg-surface)",
                borderRadius: "14px",
                border: "1px solid var(--border-faint)",
                overflow: "hidden",
                animation: "fadeUp 0.3s ease both",
                /* horizontal scroll on very narrow screens */
                overflowX: isMobile ? "auto" : "visible",
                WebkitOverflowScrolling: "touch",
              }}
            >
              {/* Hide ALBUM column on mobile — pass showAlbum={false} */}
              <TrackListHeader showAlbum={!isMobile} showArt />
              {tracks.map((track, i) => (
                <TrackRow
                  key={track._id}
                  track={track}
                  index={i}
                  trackList={tracks}
                  showAlbum={!isMobile}
                  showArt
                  onDelete={(t) => setDeleteTarget({ type: "track", item: t })}
                />
              ))}
            </div>
          ))}

        {/* ── Albums tab ───────────────────────────────── */}
        {activeTab === "albums" &&
          (loading ? (
            <AlbumSkeletons isMobile={isMobile} />
          ) : albums.length === 0 ? (
            <div className="empty-state">
              <AlbumEmptyIcon />
              <h3>No albums created yet</h3>
              <p>Group your tracks into albums or EPs.</p>
              <button
                className="btn-primary"
                onClick={() => navigate("/create-album")}
                style={{ marginTop: "8px", gap: "8px" }}
              >
                <AlbumPlusIcon /> Create Album
              </button>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                /* mobile: 2 cols, tablet: 3 cols, desktop: auto-fill */
                gridTemplateColumns: isMobile
                  ? "repeat(2, 1fr)"
                  : isTablet
                  ? "repeat(3, 1fr)"
                  : "repeat(auto-fill, minmax(200px, 1fr))",
                gap: isMobile ? "12px" : "20px",
                animation: "fadeUp 0.3s ease both",
              }}
            >
              {albums.map((album) => (
                <AlbumManageCard
                  key={album._id}
                  album={album}
                  isMobile={isMobile}
                  onEdit={() => navigate(`/create-album?edit=${album._id}`)}
                  onDelete={() => setDeleteTarget({ type: "album", item: album })}
                />
              ))}
            </div>
          ))}
      </div>

      {deleteTarget && (
        <ConfirmDialog
          title={`Delete ${deleteTarget.type}?`}
          message={
            deleteTarget.type === "track"
              ? `"${deleteTarget.item.title}" will be permanently removed. This cannot be undone.`
              : `The album "${deleteTarget.item.title}" will be removed. Tracks inside will NOT be deleted.`
          }
          confirmText="Delete"
          variant="danger"
          loading={deleting}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </>
  );
}

/* ── AlbumManageCard ──────────────────────────────────────────── */
function AlbumManageCard({ album, onEdit, onDelete, isMobile }) {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);
  const hue = [...(album.title || "")].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  const cover = album.coverImage || album.coverUrl || "";
  const trackCount = album.musics?.length || 0;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "var(--bg-elevated)",
        border: `1px solid ${hovered ? "var(--border-subtle)" : "var(--border-faint)"}`,
        borderRadius: "16px",
        overflow: "hidden",
        transition: "all var(--t-smooth)",
        transform: hovered ? "translateY(-3px)" : "none",
        boxShadow: hovered ? "var(--glow-card)" : "none",
      }}
    >
      {/* Cover */}
      <div
        onClick={() => navigate(`/album/${album._id}`)}
        style={{
          width: "100%",
          paddingBottom: "100%",
          position: "relative",
          overflow: "hidden",
          cursor: "pointer",
          background: `linear-gradient(135deg,hsl(${hue},50%,18%),hsl(${(hue + 60) % 360},40%,12%))`,
        }}
      >
        {cover && (
          <img
            src={cover}
            alt={album.title}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: hovered ? "scale(1.05)" : "scale(1)",
              transition: "transform var(--t-smooth)",
            }}
          />
        )}
        {!cover && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={`hsl(${hue},55%,55%)`} strokeWidth="1" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>
        )}
        <div
          style={{
            position: "absolute",
            top: "8px",
            right: "8px",
            padding: "3px 8px",
            background: "rgba(2,4,8,0.75)",
            backdropFilter: "blur(8px)",
            borderRadius: "999px",
            fontSize: "10px",
            fontWeight: 600,
            color: "var(--text-secondary)",
            border: "1px solid var(--border-faint)",
          }}
        >
          {trackCount} track{trackCount !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: isMobile ? "10px 10px 12px" : "12px 14px 14px" }}>
        <div
          className="truncate"
          style={{ fontSize: isMobile ? "13px" : "14px", fontWeight: 600, marginBottom: "3px" }}
        >
          {album.title}
        </div>
        <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "10px" }}>
          {album.genre || "Album"}
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          <button
            onClick={onEdit}
            style={{
              flex: 1,
              padding: isMobile ? "6px" : "7px",
              borderRadius: "8px",
              background: "var(--bg-hover)",
              border: "1px solid var(--border-faint)",
              color: "var(--text-secondary)",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "5px",
              transition: "all var(--t-fast)",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-medium)"; e.currentTarget.style.color = "var(--text-primary)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-faint)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
          >
            <EditIcon size={12} /> Edit
          </button>
          <button
            onClick={onDelete}
            style={{
              width: "32px",
              padding: "7px",
              borderRadius: "8px",
              background: "none",
              border: "1px solid var(--border-faint)",
              color: "var(--text-muted)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all var(--t-fast)",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--coral-dim)"; e.currentTarget.style.borderColor = "rgba(255,107,107,0.3)"; e.currentTarget.style.color = "var(--coral)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.borderColor = "var(--border-faint)"; e.currentTarget.style.color = "var(--text-muted)"; }}
          >
            <TrashIcon size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Skeletons ────────────────────────────────────────────────── */
function TrackSkeletons({ isMobile }) {
  return (
    <div style={{ background: "var(--bg-surface)", borderRadius: "14px", border: "1px solid var(--border-faint)", overflow: "hidden" }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: isMobile ? "10px 14px" : "12px 16px",
            borderBottom: i < 5 ? "1px solid var(--border-faint)" : "none",
          }}
        >
          <div className="skeleton" style={{ width: "20px", height: "14px", borderRadius: "4px" }} />
          <div className="skeleton" style={{ width: "40px", height: "40px", borderRadius: "8px", flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div className="skeleton" style={{ height: "14px", width: `${38 + ((i * 7) % 28)}%`, marginBottom: "6px", borderRadius: "4px" }} />
            <div className="skeleton" style={{ height: "12px", width: `${20 + ((i * 5) % 18)}%`, borderRadius: "4px" }} />
          </div>
          {/* Hide album skeleton column on mobile */}
          {!isMobile && <div className="skeleton" style={{ height: "12px", width: "90px", borderRadius: "4px" }} />}
          <div className="skeleton" style={{ height: "12px", width: "36px", borderRadius: "4px" }} />
        </div>
      ))}
    </div>
  );
}

function AlbumSkeletons({ isMobile }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(auto-fill,minmax(200px,1fr))",
      gap: isMobile ? "12px" : "20px",
    }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i}>
          <div className="skeleton" style={{ width: "100%", paddingBottom: "100%", borderRadius: "14px", marginBottom: "12px" }} />
          <div className="skeleton" style={{ height: "14px", width: "75%", marginBottom: "6px", borderRadius: "4px" }} />
          <div className="skeleton" style={{ height: "12px", width: "45%", marginBottom: "12px", borderRadius: "4px" }} />
          <div className="skeleton" style={{ height: "32px", borderRadius: "8px" }} />
        </div>
      ))}
    </div>
  );
}

/* ── Helpers ──────────────────────────────────────────────────── */
function fmtNum(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
}

/* ── Icons ────────────────────────────────────────────────────── */
function UploadIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}
function AlbumPlusIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  );
}
function TrackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
    </svg>
  );
}
function AlbumIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function PlayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}
function HeartIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
    </svg>
  );
}
function EditIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}
function TrashIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
    </svg>
  );
}
function MusicEmptyIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round">
      <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
    </svg>
  );
}
function AlbumEmptyIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round">
      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" />
    </svg>
  );
}
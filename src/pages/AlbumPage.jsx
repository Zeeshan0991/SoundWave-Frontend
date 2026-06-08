// src/pages/AlbumPage.jsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePlayer } from "../context/PlayerContext";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import api from "../api";
import TrackRow, { TrackListHeader } from "../components/TrackRow";
import ConfirmDialog from "../components/ConfirmDialog";

export default function AlbumPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isArtist } = useAuth();
  const { playSong, currentTrack, isPlaying, togglePlay } = usePlayer(); // ✅ FIX playSong
  const toast = useToast();

  const [album, setAlbum] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleteTrack, setDeleteTrack] = useState(null);
  const [deleting, setDeleting] = useState(false);

  /* ── Fetch ───────────────────────────────────────────────── */
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/music/albums/${id}`);
        setAlbum(data?.album || data);
      } catch {
        toast.error("Album not found.");
        navigate("/library");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]); // eslint-disable-line

  /* ── Derived ─────────────────────────────────────────────── */
  // ✅ FIX — schema uses musics not tracks/songs
  const tracks = album?.musics || [];
  const isOwner =
    isArtist && user?._id === (album?.artist?._id || album?.artistId);
  const hue =
    [...(album?.title || "")].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;

  // ✅ FIX — schema uses coverImage not coverUrl
  const cover = album?.coverImage || album?.coverUrl || "";

  const totalSecs = tracks.reduce((acc, t) => acc + (t.duration || 0), 0);
  const fmtDur = (s) => {
    const h = Math.floor(s / 3600),
      m = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h} hr ${m} min` : `${m} min`;
  };

  /* Enrich tracks with albumId + fallback cover */
  const enriched = tracks.map((t) => ({
    ...t,
    albumId: album?._id,
    coverUrl: t.coverUrl || cover,
  }));

  const isAlbumPlaying = enriched.some((t) => t._id === currentTrack?._id);

  const handlePlayAll = () => {
    if (!enriched.length) return;
    if (isAlbumPlaying) {
      togglePlay();
      return;
    }
    playSong(enriched[0], enriched); // ✅ FIX
  };

  const handleShuffle = () => {
    if (!enriched.length) return;
    const sh = [...enriched].sort(() => Math.random() - 0.5);
    playSong(sh[0], sh); // ✅ FIX
  };

  /* ── Delete track ────────────────────────────────────────── */
  const confirmDelete = async () => {
    if (!deleteTrack) return;
    setDeleting(true);
    try {
      await api.delete(`/music/${deleteTrack._id}`); // ✅ FIX correct endpoint
      setAlbum((prev) => ({
        ...prev,
        musics: prev.musics.filter((t) => t._id !== deleteTrack._id),
      }));
      toast.success(`"${deleteTrack.title}" deleted.`);
      setDeleteTrack(null);
    } catch {
      toast.error("Failed to delete track.");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <AlbumSkeleton />;
  if (!album) return null;

  return (
    <>
      <div style={{ animation: "fadeUp 0.4s ease both" }}>
        {/* ── Hero ─────────────────────────────────────── */}
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            minHeight: "320px",
            display: "flex",
            alignItems: "flex-end",
          }}
        >
          {/* Background */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: cover
                ? "transparent"
                : `linear-gradient(135deg,hsl(${hue},40%,10%),hsl(${(hue + 60) % 360},30%,6%))`,
            }}
          >
            {cover && (
              <img
                src={cover}
                alt=""
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  filter: "blur(28px) brightness(0.28) saturate(1.4)",
                  transform: "scale(1.1)",
                }}
              />
            )}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(to bottom, transparent 0%, rgba(5,9,15,0.7) 60%, var(--bg-deep) 100%)",
              }}
            />
          </div>

          {/* Content */}
          <div
            style={{
              position: "relative",
              zIndex: 1,
              padding: "48px 32px 32px",
              display: "flex",
              gap: "28px",
              alignItems: "flex-end",
              width: "100%",
            }}
          >
            {/* Cover */}
            <div
              style={{
                width: "180px",
                height: "180px",
                borderRadius: "16px",
                flexShrink: 0,
                overflow: "hidden",
                background: `linear-gradient(135deg,hsl(${hue},50%,22%),hsl(${(hue + 60) % 360},40%,14%))`,
                border: "1px solid rgba(255,255,255,0.1)",
                boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
              }}
            >
              {cover ? (
                <img
                  src={cover}
                  alt={album.title}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <PlaceholderCover hue={hue} title={album.title} />
              )}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "1.5px",
                  textTransform: "uppercase",
                  color: "var(--text-muted)",
                  marginBottom: "8px",
                }}
              >
                {album.type === "single" ? "Single" : "Album"}
                {album.genre && ` · ${album.genre}`}
              </div>

              <h1
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(28px,4vw,48px)",
                  fontWeight: 800,
                  letterSpacing: "-1px",
                  lineHeight: 1.0,
                  marginBottom: "14px",
                  wordBreak: "break-word",
                }}
              >
                {album.title}
              </h1>

              {/* Artist link */}
              <button
                onClick={() => navigate(`/artist/${album.artist?._id}`)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  marginBottom: "14px",
                  padding: 0,
                }}
              >
                <div
                  style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    overflow: "hidden",
                    background: `linear-gradient(135deg,hsl(${hue},55%,30%),hsl(${(hue + 80) % 360},45%,22%))`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "10px",
                    fontWeight: 700,
                    color: `hsl(${hue},70%,75%)`,
                    flexShrink: 0,
                  }}
                >
                  {album.artist?.avatar ? (
                    <img
                      src={album.artist.avatar}
                      alt=""
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    (album.artist?.username?.[0] || "?").toUpperCase()
                  )}
                </div>
                <span
                  style={{
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    transition: "color var(--t-fast)",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = "var(--cyan)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = "var(--text-primary)")
                  }
                >
                  {album.artist?.username || "Unknown Artist"}
                </span>
              </button>

              <p
                style={{
                  fontSize: "13px",
                  color: "var(--text-muted)",
                  marginBottom: "22px",
                }}
              >
                {tracks.length} track{tracks.length !== 1 ? "s" : ""}
                {totalSecs > 0 && ` · ${fmtDur(totalSecs)}`}
                {album.createdAt &&
                  ` · ${new Date(album.createdAt).getFullYear()}`}
              </p>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  flexWrap: "wrap",
                }}
              >
                <button
                  onClick={handlePlayAll}
                  className="btn-primary"
                  style={{ padding: "11px 26px", fontSize: "14px", gap: "9px" }}
                >
                  {isAlbumPlaying && isPlaying ? (
                    <>
                      <PauseIcon /> Pause
                    </>
                  ) : (
                    <>
                      <PlayIcon /> Play
                    </>
                  )}
                </button>
                <button
                  onClick={handleShuffle}
                  className="btn-ghost"
                  style={{ padding: "10px 20px", fontSize: "14px", gap: "9px" }}
                >
                  <ShuffleIcon /> Shuffle
                </button>
                {isOwner && (
                  <button
                    onClick={() => navigate(`/create-album?edit=${album._id}`)}
                    className="btn-ghost"
                    style={{
                      padding: "10px 18px",
                      fontSize: "14px",
                      gap: "8px",
                    }}
                  >
                    <EditIcon /> Edit
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Track list ───────────────────────────────── */}
        <div style={{ padding: "8px 32px 120px" }}>
          {tracks.length === 0 ? (
            <div className="empty-state" style={{ paddingTop: "60px" }}>
              <MusicIcon />
              <h3>No tracks yet</h3>
              <p>
                {isOwner
                  ? "Upload tracks to populate this album."
                  : "This album has no tracks yet."}
              </p>
              {isOwner && (
                <button
                  className="btn-primary"
                  onClick={() => navigate("/upload")}
                  style={{ marginTop: "8px" }}
                >
                  Upload Track
                </button>
              )}
            </div>
          ) : (
            <div
              style={{
                background: "var(--bg-surface)",
                borderRadius: "14px",
                border: "1px solid var(--border-faint)",
                overflow: "hidden",
              }}
            >
              <TrackListHeader showArt={false} />
              {enriched.map((track, i) => (
                <TrackRow
                  key={track._id}
                  track={track}
                  index={i}
                  trackList={enriched}
                  showArt={false}
                  onDelete={isOwner ? (t) => setDeleteTrack(t) : null}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {deleteTrack && (
        <ConfirmDialog
          title="Delete track?"
          message={`"${deleteTrack.title}" will be permanently removed. This cannot be undone.`}
          confirmText="Delete"
          variant="danger"
          loading={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTrack(null)}
        />
      )}
    </>
  );
}

/* ── Skeleton ─────────────────────────────────────────────────── */
function AlbumSkeleton() {
  return (
    <div>
      <div
        style={{
          padding: "48px 32px 32px",
          display: "flex",
          gap: "28px",
          alignItems: "flex-end",
          minHeight: "320px",
          background: "var(--bg-surface)",
        }}
      >
        <div
          className="skeleton"
          style={{
            width: "180px",
            height: "180px",
            borderRadius: "16px",
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1 }}>
          <div
            className="skeleton"
            style={{
              height: "13px",
              width: "80px",
              marginBottom: "12px",
              borderRadius: "4px",
            }}
          />
          <div
            className="skeleton"
            style={{
              height: "48px",
              width: "60%",
              marginBottom: "16px",
              borderRadius: "8px",
            }}
          />
          <div
            className="skeleton"
            style={{
              height: "14px",
              width: "140px",
              marginBottom: "12px",
              borderRadius: "4px",
            }}
          />
          <div
            className="skeleton"
            style={{
              height: "12px",
              width: "180px",
              marginBottom: "24px",
              borderRadius: "4px",
            }}
          />
          <div style={{ display: "flex", gap: "10px" }}>
            <div
              className="skeleton"
              style={{ height: "42px", width: "110px", borderRadius: "999px" }}
            />
            <div
              className="skeleton"
              style={{ height: "42px", width: "110px", borderRadius: "999px" }}
            />
          </div>
        </div>
      </div>
      <div
        style={{
          padding: "8px 32px",
          background: "var(--bg-surface)",
          margin: "8px 32px 0",
          borderRadius: "14px",
          border: "1px solid var(--border-faint)",
          overflow: "hidden",
        }}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "12px 16px",
              borderBottom: i < 5 ? "1px solid var(--border-faint)" : "none",
            }}
          >
            <div
              className="skeleton"
              style={{ width: "20px", height: "14px", borderRadius: "4px" }}
            />
            <div style={{ flex: 1 }}>
              <div
                className="skeleton"
                style={{
                  height: "14px",
                  width: `${40 + ((i * 8) % 25)}%`,
                  marginBottom: "6px",
                  borderRadius: "4px",
                }}
              />
              <div
                className="skeleton"
                style={{
                  height: "12px",
                  width: `${20 + ((i * 6) % 15)}%`,
                  borderRadius: "4px",
                }}
              />
            </div>
            <div
              className="skeleton"
              style={{ height: "13px", width: "36px", borderRadius: "4px" }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Helpers ──────────────────────────────────────────────────── */
function PlaceholderCover({ hue, title }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: `linear-gradient(135deg,hsl(${hue},50%,22%),hsl(${(hue + 60) % 360},40%,14%))`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "10px",
      }}
    >
      <svg
        width="52"
        height="52"
        viewBox="0 0 24 24"
        fill="none"
        stroke={`hsl(${hue},60%,55%)`}
        strokeWidth="1"
        strokeLinecap="round"
      >
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="3" />
      </svg>
      <span
        style={{
          fontSize: "11px",
          fontWeight: 600,
          color: `hsl(${hue},55%,55%)`,
          padding: "0 12px",
          textAlign: "center",
          lineHeight: 1.3,
        }}
      >
        {title?.slice(0, 18)}
      </span>
    </div>
  );
}

function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="6 3 20 12 6 21 6 3" />
    </svg>
  );
}
function PauseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
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
function EditIcon() {
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
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}
function MusicIcon() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
    >
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}

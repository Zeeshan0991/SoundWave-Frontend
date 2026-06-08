// src/pages/ArtistPage.jsx
// ─────────────────────────────────────────────────────────────────────────────
// FIX: playTrack → playSong (matches PlayerContext export)
//      Added proper null guards, loading states, error boundaries
// PHASE 2 FIX: Theme-aware hero — readable in both dark and light mode
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePlayer } from "../context/PlayerContext";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useTheme } from "../context/ThemeContext"; // ✅ PHASE 2: added
import api from "../api";
import AlbumCard from "../components/AlbumCard";
import TrackRow, { TrackListHeader } from "../components/TrackRow";

const TABS = [
  { key: "tracks", label: "Tracks" },
  { key: "albums", label: "Albums" },
  { key: "about", label: "About" },
];

export default function ArtistPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const { isDark } = useTheme(); // ✅ PHASE 2: added

  const { playSong, currentTrack, isPlaying, togglePlay } = usePlayer();

  const [artist, setArtist] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("tracks");

  const isOwnProfile = user?._id === id;
  const hue =
    [...(artist?.username || "A")].reduce((a, c) => a + c.charCodeAt(0), 0) %
    360;

  /* ── Fetch ──────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!id) {
      navigate("/search");
      return;
    }

    const fetchAll = async () => {
      setLoading(true);
      setError(null);
      try {
        const [artistRes, tracksRes, albumsRes] = await Promise.all([
          api.get(`/auth/artists/${id}`),
          api.get(`/music?artist=${id}&limit=50`),
          api.get(`/music/albums?artist=${id}`),
        ]);

        const artistData = artistRes.data?.artist || artistRes.data;
        if (!artistData) throw new Error("Artist not found");

        setArtist(artistData);
        setTracks(
          tracksRes.data?.musics ||
            tracksRes.data?.songs ||
            tracksRes.data ||
            [],
        );
        setAlbums(albumsRes.data?.albums || albumsRes.data || []);
      } catch (err) {
        const msg =
          err.response?.status === 404
            ? "This artist doesn't exist."
            : "Failed to load artist.";
        setError(msg);
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [id, navigate, toast]);

  /* ── Actions ────────────────────────────────────────────────────────────── */
  const handlePlayAll = () => {
    if (!tracks.length) return;
    playSong(tracks[0], tracks);
  };

  const handleShuffle = () => {
    if (!tracks.length) return;
    const shuffled = [...tracks].sort(() => Math.random() - 0.5);
    playSong(shuffled[0], shuffled);
  };

  const followerLabel = (() => {
    const n = artist?.followerCount || artist?.followers || 0;
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return `${n}`;
  })();

  /* ── States ─────────────────────────────────────────────────────────────── */
  if (loading) return <ArtistSkeleton />;

  if (error || !artist) {
    return (
      <div className="empty-state" style={{ padding: "80px 32px" }}>
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>🎤</div>
        <h3>Artist not found</h3>
        <p>{error || "This artist doesn't exist or has been removed."}</p>
        <button
          className="btn-primary"
          onClick={() => navigate("/search")}
          style={{ marginTop: "16px" }}
        >
          Browse Artists
        </button>
      </div>
    );
  }

  /* ── PHASE 2: Theme-aware hero values ───────────────────────────────────── */

  // Fallback background lightness: dark enough for dark mode, light for light mode
  const bgLightnessA = isDark ? "10%" : "88%";
  const bgLightnessB = isDark ? "6%" : "82%";

  // Orb lightness: visible but subtle in both modes
  const orbLightnessA = isDark ? "35%" : "65%";
  const orbLightnessB = isDark ? "30%" : "60%";
  const orbOpacityA = isDark ? 0.4 : 0.3;
  const orbOpacityB = isDark ? 0.3 : 0.2;

  // Avatar fallback: readable letter color on the gradient background
  const avatarLetterColor = isDark
    ? `hsl(${hue},70%,75%)`
    : `hsl(${hue},60%,30%)`;

  // Hero text is ALWAYS white (over blurred dark image or darkened overlay)
  // We force white via an explicit color + text-shadow for contrast on any bg
  const heroTextColor = "#ffffff";
  const heroTextShadow =
    "0 1px 8px rgba(0,0,0,0.7), 0 2px 24px rgba(0,0,0,0.5)";

  return (
    <div>
      {/* ══ HERO ═════════════════════════════════════════════════════════════ */}
      <div
        style={{
          position: "relative",
          minHeight: "340px",
          overflow: "hidden",
          display: "flex",
          alignItems: "flex-end",
        }}
      >
        {/* ── Background ──────────────────────────────────────────────────── */}
        <div style={{ position: "absolute", inset: 0 }}>
          {artist.banner || artist.avatar ? (
            <img
              src={artist.banner || artist.avatar}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                // ✅ PHASE 2: use CSS var so dark/light mode each gets correct brightness
                filter: `blur(20px) brightness(var(--hero-cover-brightness)) saturate(1.5)`,
                transform: "scale(1.1)",
              }}
            />
          ) : (
            // ✅ PHASE 2: theme-aware lightness for the fallback gradient
            <div
              style={{
                width: "100%",
                height: "100%",
                background: `linear-gradient(135deg,
                  hsl(${hue},40%,${bgLightnessA}) 0%,
                  hsl(${(hue + 60) % 360},30%,${bgLightnessB}) 100%)`,
              }}
            />
          )}

          {/* ✅ PHASE 2: theme-aware orbs */}
          <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
            <div
              style={{
                position: "absolute",
                width: "400px",
                height: "400px",
                borderRadius: "50%",
                background: `radial-gradient(circle, hsl(${hue},60%,${orbLightnessA}), transparent 70%)`,
                top: "-100px",
                left: "-80px",
                filter: "blur(60px)",
                opacity: orbOpacityA,
              }}
            />
            <div
              style={{
                position: "absolute",
                width: "300px",
                height: "300px",
                borderRadius: "50%",
                background: `radial-gradient(circle, hsl(${(hue + 120) % 360},50%,${orbLightnessB}), transparent 70%)`,
                bottom: "-60px",
                right: "10%",
                filter: "blur(50px)",
                opacity: orbOpacityB,
              }}
            />
          </div>

          {/* ✅ PHASE 2: scrim uses CSS vars defined per-theme in index.css
              --hero-scrim-mid  = semi-transparent dark (dark) / light (light)
              --hero-scrim-strong = near-opaque dark / light
              Result: text at bottom always sits on a consistent surface        */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: `linear-gradient(to bottom,
                transparent 0%,
                var(--hero-scrim-mid) 45%,
                var(--hero-scrim-strong) 100%)`,
            }}
          />
        </div>

        {/* ── Hero content ────────────────────────────────────────────────── */}
        <div
          style={{
            position: "relative",
            zIndex: 1,
            padding: "48px 32px 32px",
            display: "flex",
            gap: "28px",
            alignItems: "flex-end",
            width: "100%",
            flexWrap: "wrap",
          }}
        >
          {/* Avatar */}
          <div
            style={{
              width: "160px",
              height: "160px",
              borderRadius: "50%",
              flexShrink: 0,
              overflow: "hidden",
              border: "3px solid rgba(255,255,255,0.20)",
              background: `linear-gradient(135deg,
                hsl(${hue},55%,${isDark ? "28%" : "55%"}),
                hsl(${(hue + 80) % 360},45%,${isDark ? "20%" : "45%"}))`,
              boxShadow: `0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px hsl(${hue},50%,${isDark ? "30%" : "50%"})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: "56px",
              // ✅ PHASE 2: letter color is theme-aware
              color: avatarLetterColor,
            }}
          >
            {artist.avatar ? (
              <img
                src={artist.avatar}
                alt={artist.username}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              (artist.username?.[0] || "?").toUpperCase()
            )}
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: "200px" }}>
            {/* "Artist" label */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "8px",
              }}
            >
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "1.5px",
                  textTransform: "uppercase",
                  // ✅ PHASE 2: always white in hero (scrim ensures contrast)
                  color: "rgba(255,255,255,0.70)",
                  textShadow: heroTextShadow,
                }}
              >
                Artist
              </span>
              {artist.verified && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "2px 8px",
                    background: "var(--cyan-dim)",
                    border: "1px solid var(--cyan-border)",
                    borderRadius: "999px",
                    fontSize: "10px",
                    fontWeight: 700,
                    color: "var(--cyan)",
                  }}
                >
                  <svg
                    width="9"
                    height="9"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Verified
                </span>
              )}
            </div>

            {/* ✅ PHASE 2: artist name always white + shadow for contrast on any bg */}
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(32px,5vw,60px)",
                fontWeight: 800,
                letterSpacing: "-2px",
                lineHeight: 1.0,
                marginBottom: "16px",
                wordBreak: "break-word",
                color: heroTextColor,
                textShadow: heroTextShadow,
              }}
            >
              {artist.username}
            </h1>

            {/* ✅ PHASE 2: stats always white + shadow in hero */}
            <div
              style={{
                display: "flex",
                gap: "24px",
                marginBottom: "22px",
                flexWrap: "wrap",
              }}
            >
              {[
                { label: "Followers", value: followerLabel, color: "#d1d5db" },
                { label: "Tracks", value: tracks.length, color: "var(--cyan)" },
                { label: "Albums", value: albums.length, color: "var(--cyan)" },
              ].map((stat) => (
                <div key={stat.label}>
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "20px",
                      fontWeight: 800,
                      lineHeight: 1,
                      color: heroTextColor, // ✅ PHASE 2: always white in hero
                      textShadow: heroTextShadow,
                    }}
                  >
                    {stat.value}
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#374151",
                      marginTop: "3px",
                    }}
                  >
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              {tracks.length > 0 && (
                <>
                  <button
                    onClick={handlePlayAll}
                    className="btn-primary"
                    style={{
                      padding: "10px 22px",
                      fontSize: "13.5px",
                      gap: "8px",
                    }}
                  >
                    <PlayIcon /> Play All
                  </button>
                  <button
                    onClick={handleShuffle}
                    className="btn-ghost"
                    style={{
                      padding: "9px 18px",
                      fontSize: "13.5px",
                      gap: "8px",
                    }}
                  >
                    <ShuffleIcon /> Shuffle
                  </button>
                </>
              )}
              {isOwnProfile && (
                <button
                  onClick={() => navigate("/my-music")}
                  className="btn-ghost"
                  style={{
                    padding: "9px 18px",
                    fontSize: "13.5px",
                    gap: "8px",
                  }}
                >
                  <EditIcon /> Manage Music
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ══ TABS + CONTENT ══════════════════════════════════════════════════ */}
      {/* Everything below the hero inherits normal theme colors — no changes needed */}
      <div style={{ padding: "0 32px 40px" }}>
        <div
          style={{
            display: "flex",
            gap: "2px",
            borderBottom: "1px solid var(--border-faint)",
            marginBottom: "24px",
          }}
        >
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: "12px 20px",
                fontFamily: "var(--font-display)",
                fontWeight: activeTab === tab.key ? 700 : 500,
                fontSize: "13.5px",
                color:
                  activeTab === tab.key ? "var(--cyan)" : "var(--text-muted)",
                background: "none",
                border: "none",
                borderBottom:
                  activeTab === tab.key
                    ? "2px solid var(--cyan)"
                    : "2px solid transparent",
                marginBottom: "-1px",
                cursor: "pointer",
                transition: "all var(--t-fast)",
              }}
              onMouseEnter={(e) => {
                if (activeTab !== tab.key)
                  e.currentTarget.style.color = "var(--text-primary)";
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab.key)
                  e.currentTarget.style.color = "var(--text-muted)";
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tracks */}
        {activeTab === "tracks" &&
          (tracks.length === 0 ? (
            <div className="empty-state">
              <MusicIcon />
              <h3>No tracks yet</h3>
              <p>
                {isOwnProfile
                  ? "Upload your first track to get started."
                  : "This artist hasn't uploaded any tracks yet."}
              </p>
              {isOwnProfile && (
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
            <div style={{ animation: "fadeUp 0.3s ease both" }}>
              <TrackListHeader showAlbum showArt />
              {tracks.map((track, i) => (
                <TrackRow
                  key={track._id}
                  track={track}
                  index={i}
                  trackList={tracks}
                  showAlbum
                  showArt
                />
              ))}
            </div>
          ))}

        {/* Albums */}
        {activeTab === "albums" &&
          (albums.length === 0 ? (
            <div className="empty-state">
              <AlbumIcon />
              <h3>No albums yet</h3>
              <p>
                {isOwnProfile
                  ? "Create your first album."
                  : "This artist hasn't released any albums yet."}
              </p>
              {isOwnProfile && (
                <button
                  className="btn-primary"
                  onClick={() => navigate("/create-album")}
                  style={{ marginTop: "8px" }}
                >
                  Create Album
                </button>
              )}
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
                gap: "24px",
                animation: "fadeUp 0.3s ease both",
              }}
            >
              {albums.map((album) => (
                <AlbumCard key={album._id} album={album} />
              ))}
            </div>
          ))}

        {/* About */}
        {activeTab === "about" && (
          <div
            style={{ maxWidth: "640px", animation: "fadeUp 0.3s ease both" }}
          >
            <div
              style={{
                padding: "24px",
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-faint)",
                borderRadius: "16px",
                marginBottom: "16px",
              }}
            >
              <h3
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "var(--text-muted)",
                  letterSpacing: "1px",
                  textTransform: "uppercase",
                  marginBottom: "12px",
                }}
              >
                Bio
              </h3>
              <p
                style={{
                  fontSize: "15px",
                  color: artist.bio
                    ? "var(--text-secondary)"
                    : "var(--text-muted)",
                  lineHeight: 1.75,
                  fontStyle: artist.bio ? "normal" : "italic",
                  fontWeight: 300,
                }}
              >
                {artist.bio || "This artist hasn't written a bio yet."}
              </p>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
              }}
            >
              {[
                { label: "Genre", value: artist.genre || "—" },
                {
                  label: "Joined",
                  value: artist.createdAt
                    ? new Date(artist.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                      })
                    : "—",
                },
                { label: "Tracks", value: `${tracks.length} uploaded` },
                { label: "Albums", value: `${albums.length} released` },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    padding: "16px 20px",
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border-faint)",
                    borderRadius: "12px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      letterSpacing: "1px",
                      textTransform: "uppercase",
                      color: "var(--text-muted)",
                      marginBottom: "6px",
                    }}
                  >
                    {item.label}
                  </div>
                  <div
                    style={{
                      fontSize: "15px",
                      fontWeight: 600,
                      color: "var(--text-primary)",
                    }}
                  >
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Skeleton ─────────────────────────────────────────────────────────────── */
function ArtistSkeleton() {
  return (
    <div>
      <div
        style={{
          padding: "48px 32px 32px",
          display: "flex",
          gap: "28px",
          alignItems: "flex-end",
          minHeight: "340px",
          background: "var(--bg-surface)",
        }}
      >
        <div
          className="skeleton"
          style={{
            width: "160px",
            height: "160px",
            borderRadius: "50%",
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1 }}>
          <div
            className="skeleton"
            style={{ height: "12px", width: "60px", marginBottom: "12px" }}
          />
          <div
            className="skeleton"
            style={{ height: "60px", width: "55%", marginBottom: "18px" }}
          />
          <div style={{ display: "flex", gap: "24px", marginBottom: "24px" }}>
            {[0, 1, 2].map((i) => (
              <div key={i}>
                <div
                  className="skeleton"
                  style={{ height: "20px", width: "40px", marginBottom: "5px" }}
                />
                <div
                  className="skeleton"
                  style={{ height: "12px", width: "55px" }}
                />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <div
              className="skeleton"
              style={{ height: "40px", width: "110px", borderRadius: "999px" }}
            />
            <div
              className="skeleton"
              style={{ height: "40px", width: "110px", borderRadius: "999px" }}
            />
          </div>
        </div>
      </div>
      <div style={{ padding: "0 32px 40px" }}>
        <div
          style={{
            display: "flex",
            gap: "4px",
            borderBottom: "1px solid var(--border-faint)",
            marginBottom: "24px",
          }}
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="skeleton"
              style={{
                height: "42px",
                width: "80px",
                borderRadius: "4px",
                margin: "0 4px",
              }}
            />
          ))}
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "10px 16px",
              marginBottom: "4px",
            }}
          >
            <div
              className="skeleton"
              style={{ width: "28px", height: "14px" }}
            />
            <div
              className="skeleton"
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "7px",
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1 }}>
              <div
                className="skeleton"
                style={{
                  height: "14px",
                  width: `${38 + ((i * 9) % 22)}%`,
                  marginBottom: "6px",
                }}
              />
              <div
                className="skeleton"
                style={{ height: "12px", width: `${20 + ((i * 7) % 16)}%` }}
              />
            </div>
            <div
              className="skeleton"
              style={{ height: "13px", width: "36px" }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Icons ────────────────────────────────────────────────────────────────── */
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
      strokeLinejoin="round"
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
function AlbumIcon() {
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
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

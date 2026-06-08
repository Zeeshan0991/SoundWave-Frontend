// src/pages/HomePage.jsx
// ─────────────────────────────────────────────────────────────────────────────
// CURRENT CHANGES:
//   1. Filter Naat/Nasheed/devotional songs OUT of trending + recent sections.
//      These categories feel out of place mixed with Pop/Hip-Hop.
//      category values filtered: "naat", "nasheed"
//      genre values filtered:    "Naat", "Nasheed", "Hamd", "Qawwali"
//
//   2. New `naatSongs` state — holds the filtered devotional tracks.
//
//   3. New "Spiritual & Devotional" section — renders ONLY when naatSongs
//      exist. Sits between Featured Artists and Recently Added.
//      Uses the same Section + TrackRow pattern as all other sections.
//      Completely hidden when no naat/nasheed content exists.
//
//   All other logic — greeting, fetchError, FeaturedHero, albums, artists,
//   AIMoodSection, empty state, skeleton — completely unchanged.
//
// FIX (Naats bleeding into Trending/Recently Added):
//   - isDevotional() now also checks song.tags[] array for devotional keywords
//   - Extended DEVOTIONAL_GENRES to include "sufi", "devotional", "islamic",
//     "qasida", "munajat" — covers genres that may be set by Jamendo or
//     manually uploaded tracks without a category field.
//   - Extended DEVOTIONAL_CATEGORIES to include "islamic", "devotional"
//   - This ensures ALL devotional content is routed to the Spiritual section
//     regardless of which field was populated.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { usePlayer } from "../context/PlayerContext";
import { getDisplayName } from "../api";
import api from "../api";
import AlbumCard from "../components/AlbumCard";
import ArtistCard from "../components/ArtistCard";
import TrackRow, { TrackListHeader } from "../components/TrackRow";
import AIMoodSection from "../components/AIMoodSection";

// ── Devotional filter helper ──────────────────────────────────────────────────
// Returns true if a song belongs to devotional/naat content.
// Checks category field, genre field, AND tags[] array.
//
// FIX: Extended sets + tags check so songs without a category but with a
// devotional genre or tag still get routed to the Spiritual section instead
// of appearing in Trending Now / Recently Added.
const DEVOTIONAL_CATEGORIES = new Set([
  "naat", "nasheed", "islamic", "devotional",
]);
const DEVOTIONAL_GENRES = new Set([
  "naat", "nasheed", "hamd", "qawwali", "sufi",
  "devotional", "islamic", "qasida", "munajat",
]);
const DEVOTIONAL_TAGS = new Set([
  "naat", "nasheed", "hamd", "qawwali", "sufi", "devotional",
  "islamic", "qasida", "munajat", "spiritual",
]);

function isDevotional(song) {
  const cat   = (song.category || "").toLowerCase().trim();
  const genre = (song.genre    || "").toLowerCase().trim();

  if (DEVOTIONAL_CATEGORIES.has(cat))   return true;
  if (DEVOTIONAL_GENRES.has(genre))     return true;

  // Also check tags[] array — covers songs uploaded before category was set
  if (Array.isArray(song.tags)) {
    for (const tag of song.tags) {
      if (DEVOTIONAL_TAGS.has(String(tag).toLowerCase().trim())) return true;
    }
  }

  return false;
}

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { playSong } = usePlayer();

  const [featured, setFeatured] = useState(null);
  const [recent, setRecent] = useState([]);
  const [trending, setTrending] = useState([]);
  const [naatSongs, setNaatSongs] = useState([]); // ← NEW
  const [newAlbums, setNewAlbums] = useState([]);
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  /* ── Time-aware greeting ─────────────────────────────────── */
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 5) return "Still up?";
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    if (h < 21) return "Good evening";
    return "Good night";
  })();

  /* ── Fetch ───────────────────────────────────────────────── */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setFetchError(false);
      try {
        const [musicsRes, albumsRes, artistsRes] = await Promise.all([
          api.get("/music?limit=50"), // fetch more so filtering doesn't starve sections
          api.get("/music/albums?limit=8"),
          api.get("/auth/artists?limit=8"),
        ]);
        if (cancelled) return;

        const allSongs = musicsRes.data?.musics || [];
        const albums = albumsRes.data?.albums || [];
        const artistList = artistsRes.data?.artists || [];

        // ── Split songs into general vs devotional ────────────────────────
        const generalSongs = allSongs.filter((s) => !isDevotional(s));
        const devotionalSongs = allSongs.filter((s) => isDevotional(s));

        // Featured hero — from general songs only
        if (generalSongs.length) {
          const pick = generalSongs.slice(0, 5);
          setFeatured(pick[Math.floor(Math.random() * pick.length)]);
        } else if (allSongs.length) {
          // Edge case: all songs are devotional — still show something
          setFeatured(allSongs[0]);
        }

        setTrending(generalSongs.slice(0, 8));
        setRecent(generalSongs.slice(8, 14));
        setNaatSongs(devotionalSongs.slice(0, 8)); // ← NEW
        setNewAlbums(albums);
        setArtists(artistList);
      } catch (err) {
        if (!cancelled) {
          console.error("HomePage fetch:", err?.response?.data || err.message);
          setFetchError(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <HomeSkeletons />;

  const isEmpty = trending.length === 0 && newAlbums.length === 0;

  return (
    <div style={{ padding: "32px 32px 120px" }}>
      {/* ── Greeting ──────────────────────────────────────── */}
      <div style={{ marginBottom: "36px", animation: "fadeUp 0.4s ease both" }}>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(26px, 4vw, 36px)",
            fontWeight: 800,
            letterSpacing: "-0.5px",
            lineHeight: 1.1,
            display: "flex",
            alignItems: "baseline",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          {greeting},
          <span className="gradient-text">{getDisplayName(user)}</span>
        </h1>
        <p
          style={{
            fontSize: "14px",
            color: "var(--text-secondary)",
            marginTop: "6px",
          }}
        >
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
          {user?.role === "artist" && (
            <span
              style={{
                marginLeft: "10px",
                padding: "2px 8px",
                background: "var(--violet-dim)",
                border: "1px solid var(--violet-border)",
                borderRadius: "999px",
                fontSize: "11px",
                color: "var(--violet)",
                fontWeight: 600,
              }}
            >
              🎤 Artist
            </span>
          )}
        </p>
      </div>

      {/* ── Fetch error ────────────────────────────────────── */}
      {fetchError && (
        <div
          style={{
            padding: "16px 20px",
            background: "var(--bg-surface)",
            border: "1px solid var(--border-faint)",
            borderRadius: "14px",
            marginBottom: "32px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            color: "var(--text-muted)",
            fontSize: "14px",
          }}
        >
          <span style={{ fontSize: "20px" }}>⚠️</span>
          <div>
            <div
              style={{
                fontWeight: 600,
                color: "var(--text-secondary)",
                marginBottom: "2px",
              }}
            >
              Couldn't load content
            </div>
            <div style={{ fontSize: "13px" }}>
              Check your connection or{" "}
              <button
                onClick={() => window.location.reload()}
                style={{
                  color: "var(--cyan)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: 600,
                }}
              >
                refresh the page
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Featured hero ─────────────────────────────────── */}
      {featured && !fetchError && (
        <FeaturedHero
          fallbackTrack={featured}
          trackList={trending.length ? trending : [featured]}
        />
      )}

      {/* ── Trending Now ──────────────────────────────────── */}
      {trending.length > 0 && (
        <Section
          title="Trending Now"
          onMore={() => navigate("/search")}
          delay={0.05}
        >
          <div
            style={{
              background: "var(--bg-surface)",
              borderRadius: "14px",
              border: "1px solid var(--border-faint)",
              overflow: "hidden",
            }}
          >
            <TrackListHeader showAlbum showArt />
            {trending.map((t, i) => (
              <TrackRow
                key={t._id}
                track={t}
                index={i}
                trackList={trending}
                showAlbum
                showArt
              />
            ))}
          </div>
        </Section>
      )}

      {/* ── New Releases ──────────────────────────────────── */}
      {newAlbums.length > 0 && (
        <Section
          title="New Releases"
          onMore={() => navigate("/library")}
          delay={0.1}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
              gap: "20px",
            }}
          >
            {newAlbums.map((album) => (
              <AlbumCard key={album._id} album={album} />
            ))}
          </div>
        </Section>
      )}

      {/* ── Featured Artists ──────────────────────────────── */}
      {artists.length > 0 && (
        <Section
          title="Featured Artists"
          onMore={() => navigate("/search")}
          delay={0.15}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
              gap: "20px",
            }}
          >
            {artists.map((artist) => (
              <ArtistCard key={artist._id} artist={artist} />
            ))}
          </div>
        </Section>
      )}

      {/* ── Spiritual & Devotional ────────────────────────────────────────────
          NEW: Only renders when naat/nasheed songs exist in the library.
          Completely hidden otherwise — zero impact on existing layout.
          Uses a warm gold accent (hsl(45)) to distinguish from cyan sections.
       ─────────────────────────────────────────────────────────────────────── */}
      {naatSongs.length > 0 && !fetchError && (
        <Section
          title="🕌 Spiritual & Devotional"
          delay={0.18}
          accent="hsl(45, 80%, 55%)"
        >
          <div
            style={{
              background: "var(--bg-surface)",
              borderRadius: "14px",
              border: "1px solid var(--border-faint)",
              overflow: "hidden",
            }}
          >
            <TrackListHeader showArt />
            {naatSongs.map((t, i) => (
              <TrackRow
                key={t._id}
                track={t}
                index={i}
                trackList={naatSongs}
                showArt
              />
            ))}
          </div>
        </Section>
      )}

      {/* ── Recently Added ────────────────────────────────── */}
      {recent.length > 0 && (
        <Section
          title="Recently Added"
          onMore={() => navigate("/search")}
          delay={0.2}
        >
          <div
            style={{
              background: "var(--bg-surface)",
              borderRadius: "14px",
              border: "1px solid var(--border-faint)",
              overflow: "hidden",
            }}
          >
            <TrackListHeader showArt />
            {recent.map((t, i) => (
              <TrackRow
                key={t._id}
                track={t}
                index={i}
                trackList={recent}
                showArt
              />
            ))}
          </div>
        </Section>
      )}

      {/* ── AI Mood Playlists ─────────────────────────────── */}
      {!fetchError && <AIMoodSection />}

      {/* ── Empty state ───────────────────────────────────── */}
      {isEmpty && !fetchError && (
        <div className="empty-state" style={{ marginTop: "60px" }}>
          <div
            style={{
              width: "80px",
              height: "80px",
              borderRadius: "50%",
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-faint)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-muted)",
              marginBottom: "4px",
              animation: "floatY 3s ease-in-out infinite",
            }}
          >
            <MusicIcon />
          </div>
          <h3>Nothing here yet</h3>
          <p>Once artists start uploading, tracks will appear here.</p>
          {user?.role === "artist" && (
            <button
              className="btn-primary"
              onClick={() => navigate("/upload")}
              style={{ marginTop: "12px" }}
            >
              Upload Your First Track
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ── FeaturedHero — completely unchanged ─────────────────────────────────── */
function FeaturedHero({ fallbackTrack, trackList }) {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { currentTrack, isPlaying, playSong, togglePlay } = usePlayer();

  const track = currentTrack ?? fallbackTrack;
  const isActive = !!currentTrack && currentTrack._id === track._id;

  useEffect(() => {
    setMounted(false);
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, [track._id]);

  const handlePlay = () => {
    if (isActive) {
      togglePlay();
      return;
    }
    playSong(track, trackList);
  };

  const artistId =
    track.artist?._id || track.artist?.id || track.artistId || null;
  const albumId = track.album?._id || track.album?.id || track.albumId || null;
  const artistName =
    track.artist?.username || track.artistName || "Unknown Artist";
  const albumTitle = track.album?.title || track.albumTitle || null;
  const hue =
    [...(track.title || "")].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  const hasCover = !!track.coverUrl;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: "20px",
        overflow: "hidden",
        marginBottom: "44px",
        position: "relative",
        minHeight: "210px",
        background: "var(--bg-surface)",
        border: `1px solid ${isActive ? "var(--cyan-border)" : "var(--border-faint)"}`,
        opacity: mounted ? 1 : 0,
        transition:
          "opacity 0.22s ease, border-color var(--t-smooth), box-shadow var(--t-smooth)",
        boxShadow: isActive
          ? "var(--glow-cyan)"
          : hovered
            ? "0 12px 48px rgba(0,0,0,0.25)"
            : "none",
      }}
    >
      {hasCover && (
        <>
          <img
            src={track.coverUrl}
            alt=""
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter:
                "blur(3px) brightness(var(--hero-cover-brightness, 0.32))",
              transform: hovered ? "scale(1.04)" : "scale(1)",
              transition: "transform 0.7s ease",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(to right, var(--hero-scrim-strong) 0%, var(--hero-scrim-mid) 55%, transparent 100%)",
            }}
          />
        </>
      )}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          padding: "32px 36px",
          display: "flex",
          alignItems: "center",
          gap: "28px",
        }}
      >
        <div
          style={{
            width: "130px",
            height: "130px",
            borderRadius: "14px",
            flexShrink: 0,
            overflow: "hidden",
            background: hasCover ? "transparent" : "var(--bg-elevated)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            transform: hovered ? "translateY(-4px) rotate(-1.5deg)" : "none",
            transition: "transform var(--t-smooth)",
            cursor: albumId ? "pointer" : "default",
          }}
          onClick={albumId ? () => navigate(`/album/${albumId}`) : undefined}
        >
          {hasCover ? (
            <img
              src={track.coverUrl}
              alt={track.title}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke={`hsl(${hue},60%,60%)`}
                strokeWidth="1.2"
                strokeLinecap="round"
              >
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
            </div>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "1.5px",
              textTransform: "uppercase",
              color: isActive ? "var(--cyan)" : "var(--text-secondary)",
              marginBottom: "10px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            {isActive && (
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: "var(--cyan)",
                  display: "inline-block",
                  animation: "pulseGlow 1.5s ease-in-out infinite",
                }}
              />
            )}
            {isActive ? "Now Playing" : "Featured Track"}
          </div>
          <h2
            className="truncate"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(22px,3vw,32px)",
              fontWeight: 800,
              letterSpacing: "-0.5px",
              lineHeight: 1.1,
              marginBottom: "8px",
              color: hasCover ? "#fff" : "var(--text-primary)",
              textShadow: hasCover ? "0 2px 8px rgba(0,0,0,0.6)" : "none",
            }}
          >
            {track.title}
          </h2>
          <p
            onClick={
              artistId ? () => navigate(`/artist/${artistId}`) : undefined
            }
            style={{
              fontSize: "15px",
              color: hasCover
                ? "rgba(255,255,255,0.75)"
                : "var(--text-secondary)",
              marginBottom: "4px",
              cursor: artistId ? "pointer" : "default",
              display: "inline-block",
              transition: "color var(--t-fast)",
            }}
            onMouseEnter={(e) => {
              if (artistId) e.currentTarget.style.color = "var(--cyan)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = hasCover
                ? "rgba(255,255,255,0.75)"
                : "var(--text-secondary)";
            }}
          >
            {artistName}
          </p>
          {albumId && albumTitle && (
            <p
              onClick={() => navigate(`/album/${albumId}`)}
              style={{
                fontSize: "13px",
                color: hasCover ? "rgba(255,255,255,0.5)" : "var(--text-muted)",
                cursor: "pointer",
                display: "block",
                marginBottom: "6px",
                transition: "color var(--t-fast)",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = hasCover
                  ? "rgba(255,255,255,0.75)"
                  : "var(--text-secondary)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = hasCover
                  ? "rgba(255,255,255,0.5)"
                  : "var(--text-muted)")
              }
            >
              From: {albumTitle}
            </p>
          )}
          {track.genre && (
            <span
              style={{
                display: "inline-block",
                padding: "3px 10px",
                background: "var(--bg-raised)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "999px",
                fontSize: "11px",
                fontWeight: 600,
                color: `hsl(${hue},60%,55%)`,
                marginTop: "6px",
                marginBottom: "16px",
              }}
            >
              {track.genre}
            </span>
          )}
          <div
            style={{
              display: "flex",
              gap: "10px",
              alignItems: "center",
              marginTop: track.genre ? "0" : "18px",
            }}
          >
            <button
              onClick={handlePlay}
              className="btn-primary"
              style={{ padding: "11px 26px", gap: "10px", fontSize: "14px" }}
            >
              {isActive && isPlaying ? (
                <>
                  <PauseIcon /> Pause
                </>
              ) : (
                <>
                  <PlayIcon /> Play
                </>
              )}
            </button>
            {albumId && (
              <button
                onClick={() => navigate(`/album/${albumId}`)}
                className="btn-ghost"
                style={{ padding: "10px 18px", fontSize: "13px" }}
              >
                View Album
              </button>
            )}
            {track.duration > 0 && (
              <span
                style={{
                  fontSize: "13px",
                  color: hasCover
                    ? "rgba(255,255,255,0.5)"
                    : "var(--text-muted)",
                }}
              >
                {Math.floor(track.duration / 60)}:
                {String(Math.floor(track.duration % 60)).padStart(2, "0")}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Section ─────────────────────────────────────────────────────────────── */
function Section({ title, onMore, children, delay = 0 }) {
  return (
    <div
      style={{
        marginBottom: "48px",
        animation: `fadeUp 0.4s ease ${delay}s both`,
      }}
    >
      <div className="section-header">
        <h2 className="section-title">{title}</h2>
        {onMore && (
          <button className="section-link" onClick={onMore}>
            See all →
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

/* ── Skeletons — unchanged ────────────────────────────────────────────────── */
function HomeSkeletons() {
  return (
    <div style={{ padding: "32px 32px 120px" }}>
      <div style={{ marginBottom: "36px" }}>
        <div
          className="skeleton"
          style={{
            height: "36px",
            width: "300px",
            marginBottom: "10px",
            borderRadius: "8px",
          }}
        />
        <div
          className="skeleton"
          style={{ height: "16px", width: "200px", borderRadius: "6px" }}
        />
      </div>
      <div
        className="skeleton"
        style={{ height: "210px", borderRadius: "20px", marginBottom: "48px" }}
      />
      <div style={{ marginBottom: "48px" }}>
        <div
          className="skeleton"
          style={{
            height: "22px",
            width: "160px",
            marginBottom: "18px",
            borderRadius: "6px",
          }}
        />
        <div
          style={{
            background: "var(--bg-surface)",
            borderRadius: "14px",
            border: "1px solid var(--border-faint)",
            overflow: "hidden",
          }}
        >
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "14px",
                padding: "12px 16px",
                borderBottom: i < 4 ? "1px solid var(--border-faint)" : "none",
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
                    width: "40%",
                    marginBottom: "6px",
                    borderRadius: "4px",
                  }}
                />
                <div
                  className="skeleton"
                  style={{ height: "12px", width: "24%", borderRadius: "4px" }}
                />
              </div>
              <div
                className="skeleton"
                style={{ height: "12px", width: "32px", borderRadius: "4px" }}
              />
            </div>
          ))}
        </div>
      </div>
      <div style={{ marginBottom: "48px" }}>
        <div
          className="skeleton"
          style={{
            height: "22px",
            width: "140px",
            marginBottom: "18px",
            borderRadius: "6px",
          }}
        />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(170px,1fr))",
            gap: "20px",
          }}
        >
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i}>
              <div
                className="skeleton"
                style={{
                  width: "100%",
                  paddingBottom: "100%",
                  borderRadius: "14px",
                  marginBottom: "10px",
                }}
              />
              <div
                className="skeleton"
                style={{
                  height: "14px",
                  width: "80%",
                  marginBottom: "6px",
                  borderRadius: "4px",
                }}
              />
              <div
                className="skeleton"
                style={{ height: "12px", width: "55%", borderRadius: "4px" }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Icons — unchanged ───────────────────────────────────────────────────── */
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
function MusicIcon() {
  return (
    <svg
      width="36"
      height="36"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
    >
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}
// src/pages/LibraryPage.jsx
// ─────────────────────────────────────────────────────────────────────────────
// PHASE 2 FIXES:
//   1. toast.error() → showToast(msg, "error") — matches ToastContext API
//      toast.error is undefined → was silently crashing on fetch failure
//   2. isArtist safety: falls back to user?.role === "artist" if the auth
//      context doesn't export isArtist directly
//   3. AlbumListRow already uses coverImage || coverUrl — kept correct
//   4. ArtistListRow followerCount already safe with || 0 — kept correct
//   5. Staggered item animations use capped delay (max 0.4s) so long lists
//      don't have items appearing after 2+ seconds
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import api from "../api";
import AlbumCard from "../components/AlbumCard";
import ArtistCard from "../components/ArtistCard";

const TABS = [
  { key: "albums", label: "Albums" },
  { key: "artists", label: "Artists" },
];

export default function LibraryPage() {
  const navigate = useNavigate();
  // ✅ FIX 1 & 2: destructure showToast; derive isArtist safely
  const { showToast } = useToast();
  const { user, isArtist: authIsArtist } = useAuth();
  const isArtist = authIsArtist ?? user?.role === "artist";

  const [activeTab, setActiveTab] = useState("albums");
  const [albums, setAlbums] = useState([]);
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("newest");
  const [viewMode, setViewMode] = useState("grid");

  /* ── Fetch ───────────────────────────────────────────────── */
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [albumsRes, artistsRes] = await Promise.all([
          api.get("/music/albums"),
          api.get("/auth/artists"),
        ]);
        setAlbums(albumsRes.data?.albums || []);
        setArtists(artistsRes.data?.artists || []);
      } catch {
        // ✅ FIX 1: correct ToastContext API
        showToast("Failed to load library.", "error");
      } finally {
        setLoading(false);
      }
    })();
  }, []); // eslint-disable-line

  /* ── Sort ────────────────────────────────────────────────── */
  const sortedAlbums = [...albums].sort((a, b) => {
    if (sortBy === "newest")
      return new Date(b.createdAt) - new Date(a.createdAt);
    if (sortBy === "oldest")
      return new Date(a.createdAt) - new Date(b.createdAt);
    if (sortBy === "title") return a.title.localeCompare(b.title);
    if (sortBy === "artist") {
      return (a.artist?.username || "").localeCompare(b.artist?.username || "");
    }
    return 0;
  });

  const sortedArtists = [...artists].sort((a, b) => {
    if (sortBy === "title") return a.username.localeCompare(b.username);
    if (sortBy === "newest")
      return (b.followerCount || 0) - (a.followerCount || 0);
    return 0;
  });

  const count =
    activeTab === "albums" ? sortedAlbums.length : sortedArtists.length;

  return (
    <div
      style={{ padding: "32px 32px 120px", animation: "fadeUp 0.4s ease both" }}
    >
      {/* ── Header ───────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: "28px",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "32px",
              fontWeight: 800,
              letterSpacing: "-0.5px",
              marginBottom: "6px",
            }}
          >
            Your Library
          </h1>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
            Browse all albums and artists on SOUNDWAVE
          </p>
        </div>
        {/* ✅ FIX 2: isArtist safely resolved above */}
        {isArtist && (
          <button
            onClick={() => navigate("/upload")}
            className="btn-primary"
            style={{
              padding: "10px 20px",
              fontSize: "13px",
              gap: "8px",
              flexShrink: 0,
            }}
          >
            <PlusIcon /> Upload Track
          </button>
        )}
      </div>

      {/* ── Tabs + controls ──────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "24px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        {/* Tabs */}
        <div
          style={{
            display: "flex",
            background: "var(--bg-surface)",
            border: "1px solid var(--border-faint)",
            borderRadius: "12px",
            padding: "4px",
            gap: "2px",
          }}
        >
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                setSortBy("newest");
              }}
              style={{
                padding: "8px 20px",
                borderRadius: "9px",
                fontFamily: "var(--font-display)",
                fontWeight: activeTab === tab.key ? 700 : 500,
                fontSize: "13px",
                color:
                  activeTab === tab.key
                    ? "var(--text-primary)"
                    : "var(--text-muted)",
                background:
                  activeTab === tab.key ? "var(--bg-elevated)" : "transparent",
                border:
                  activeTab === tab.key
                    ? "1px solid var(--border-subtle)"
                    : "1px solid transparent",
                boxShadow:
                  activeTab === tab.key ? "0 2px 8px rgba(0,0,0,0.3)" : "none",
                cursor: "pointer",
                transition: "all var(--t-smooth)",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Sort + view toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span
              style={{
                fontSize: "12px",
                color: "var(--text-muted)",
                flexShrink: 0,
              }}
            >
              Sort by
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                padding: "7px 12px",
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "8px",
                color: "var(--text-primary)",
                fontSize: "12.5px",
                outline: "none",
                cursor: "pointer",
                fontFamily: "var(--font-body)",
              }}
            >
              {activeTab === "albums" ? (
                <>
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="title">Title A–Z</option>
                  <option value="artist">Artist A–Z</option>
                </>
              ) : (
                <>
                  <option value="newest">Most Followed</option>
                  <option value="title">Name A–Z</option>
                </>
              )}
            </select>
          </div>

          {/* View mode */}
          <div
            style={{
              display: "flex",
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-faint)",
              borderRadius: "8px",
              overflow: "hidden",
            }}
          >
            {[
              { mode: "grid", icon: <GridIcon /> },
              { mode: "list", icon: <ListIcon /> },
            ].map(({ mode, icon }) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                style={{
                  width: "34px",
                  height: "34px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background:
                    viewMode === mode ? "var(--bg-raised)" : "transparent",
                  border: "none",
                  color:
                    viewMode === mode ? "var(--cyan)" : "var(--text-muted)",
                  cursor: "pointer",
                  transition: "all var(--t-fast)",
                }}
                onMouseEnter={(e) => {
                  if (viewMode !== mode)
                    e.currentTarget.style.color = "var(--text-primary)";
                }}
                onMouseLeave={(e) => {
                  if (viewMode !== mode)
                    e.currentTarget.style.color = "var(--text-muted)";
                }}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Count ────────────────────────────────────────── */}
      {!loading && (
        <p
          style={{
            fontSize: "12.5px",
            color: "var(--text-muted)",
            marginBottom: "16px",
          }}
        >
          {count} {activeTab === "albums" ? "album" : "artist"}
          {count !== 1 ? "s" : ""}
        </p>
      )}

      {/* ── Content ──────────────────────────────────────── */}
      {loading ? (
        <LibrarySkeletons viewMode={viewMode} />
      ) : activeTab === "albums" ? (
        sortedAlbums.length === 0 ? (
          <EmptyState
            icon={<AlbumIcon />}
            title="No albums yet"
            desc="Albums uploaded by artists will appear here."
            cta={isArtist ? "Create Album" : null}
            onCta={() => navigate("/create-album")}
          />
        ) : viewMode === "grid" ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
              gap: "24px",
            }}
          >
            {sortedAlbums.map((album, i) => (
              <div
                key={album._id}
                style={{
                  // ✅ FIX 5: cap delay so long lists don't stall
                  animation: `fadeUp 0.3s ease ${Math.min(i * 0.04, 0.4)}s both`,
                }}
              >
                <AlbumCard album={album} />
              </div>
            ))}
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
            {sortedAlbums.map((album, i) => (
              <AlbumListRow
                key={album._id}
                album={album}
                index={i}
                last={i === sortedAlbums.length - 1}
              />
            ))}
          </div>
        )
      ) : sortedArtists.length === 0 ? (
        <EmptyState
          icon={<ArtistIcon />}
          title="No artists yet"
          desc="Artists who upload music will appear here."
        />
      ) : viewMode === "grid" ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
            gap: "24px",
          }}
        >
          {sortedArtists.map((artist, i) => (
            <div
              key={artist._id}
              style={{
                animation: `fadeUp 0.3s ease ${Math.min(i * 0.04, 0.4)}s both`,
              }}
            >
              <ArtistCard artist={artist} />
            </div>
          ))}
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
          {sortedArtists.map((artist, i) => (
            <ArtistListRow
              key={artist._id}
              artist={artist}
              index={i}
              last={i === sortedArtists.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Album list row ───────────────────────────────────────────── */
function AlbumListRow({ album, index, last }) {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);
  const hue =
    [...(album.title || "")].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  const cover = album.coverImage || album.coverUrl || "";

  return (
    <div
      onClick={() => navigate(`/album/${album._id}`)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "14px",
        padding: "12px 16px",
        borderBottom: last ? "none" : "1px solid var(--border-faint)",
        background: hovered ? "var(--bg-hover)" : "transparent",
        cursor: "pointer",
        transition: "background var(--t-fast)",
      }}
    >
      <div
        style={{
          width: "48px",
          height: "48px",
          borderRadius: "10px",
          overflow: "hidden",
          flexShrink: 0,
          background: `linear-gradient(135deg,hsl(${hue},50%,20%),hsl(${(hue + 60) % 360},40%,13%))`,
          border: "1px solid var(--border-faint)",
        }}
      >
        {cover ? (
          <img
            src={cover}
            alt={album.title}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <PlaceholderArt hue={hue} />
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          className="truncate"
          style={{ fontSize: "14px", fontWeight: 600, marginBottom: "3px" }}
        >
          {album.title}
        </div>
        <div
          style={{
            fontSize: "12px",
            color: "var(--text-muted)",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <span>{album.artist?.username || "Unknown"}</span>
          {album.genre && (
            <span
              style={{
                padding: "1px 6px",
                borderRadius: "4px",
                fontSize: "10px",
                fontWeight: 600,
                background: "var(--violet-dim)",
                border: "1px solid var(--violet-border)",
                color: "var(--violet)",
              }}
            >
              {album.genre}
            </span>
          )}
        </div>
      </div>

      <div
        style={{ fontSize: "12px", color: "var(--text-muted)", flexShrink: 0 }}
      >
        {album.musics?.length || 0} tracks
      </div>

      <div
        style={{
          color: "var(--text-muted)",
          opacity: hovered ? 1 : 0,
          transition: "opacity var(--t-fast)",
          flexShrink: 0,
        }}
      >
        <ChevronRightIcon />
      </div>
    </div>
  );
}

/* ── Artist list row ──────────────────────────────────────────── */
function ArtistListRow({ artist, last }) {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);
  const hue =
    [...(artist.username || "A")].reduce((a, c) => a + c.charCodeAt(0), 0) %
    360;

  const followers = (() => {
    const n = artist.followerCount || 0;
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M followers`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K followers`;
    return `${n} followers`;
  })();

  return (
    <div
      onClick={() => navigate(`/artist/${artist._id}`)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "14px",
        padding: "12px 16px",
        borderBottom: last ? "none" : "1px solid var(--border-faint)",
        background: hovered ? "var(--bg-hover)" : "transparent",
        cursor: "pointer",
        transition: "background var(--t-fast)",
      }}
    >
      <div
        style={{
          width: "44px",
          height: "44px",
          borderRadius: "50%",
          flexShrink: 0,
          overflow: "hidden",
          border: "1px solid var(--border-faint)",
          background: `linear-gradient(135deg,hsl(${hue},55%,26%),hsl(${(hue + 80) % 360},45%,18%))`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: "16px",
          color: `hsl(${hue},70%,72%)`,
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

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          className="truncate"
          style={{
            fontSize: "14px",
            fontWeight: 600,
            marginBottom: "3px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          {artist.username}
          {artist.verified && <VerifiedBadge />}
        </div>
        <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
          {followers}
        </div>
      </div>

      {artist.genre && (
        <div
          style={{
            fontSize: "11px",
            color: "var(--text-muted)",
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-faint)",
            borderRadius: "6px",
            padding: "3px 9px",
            flexShrink: 0,
          }}
        >
          {artist.genre}
        </div>
      )}

      <div
        style={{
          color: "var(--text-muted)",
          opacity: hovered ? 1 : 0,
          transition: "opacity var(--t-fast)",
          flexShrink: 0,
        }}
      >
        <ChevronRightIcon />
      </div>
    </div>
  );
}

/* ── Sub-components ───────────────────────────────────────────── */
function VerifiedBadge() {
  return (
    <span
      style={{
        width: "14px",
        height: "14px",
        borderRadius: "50%",
        background: "var(--cyan)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <svg
        width="8"
        height="8"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#000"
        strokeWidth="3.5"
        strokeLinecap="round"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </span>
  );
}

function EmptyState({ icon, title, desc, cta, onCta }) {
  return (
    <div className="empty-state">
      {icon}
      <h3>{title}</h3>
      <p>{desc}</p>
      {cta && (
        <button
          className="btn-primary"
          onClick={onCta}
          style={{ marginTop: "8px", padding: "10px 22px", gap: "8px" }}
        >
          <PlusIcon /> {cta}
        </button>
      )}
    </div>
  );
}

function LibrarySkeletons({ viewMode }) {
  if (viewMode === "list") {
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
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "10px",
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1 }}>
              <div
                className="skeleton"
                style={{
                  height: "14px",
                  width: "40%",
                  marginBottom: "7px",
                  borderRadius: "4px",
                }}
              />
              <div
                className="skeleton"
                style={{ height: "12px", width: "25%", borderRadius: "4px" }}
              />
            </div>
            <div
              className="skeleton"
              style={{ height: "12px", width: "55px", borderRadius: "4px" }}
            />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill,minmax(170px,1fr))",
        gap: "24px",
      }}
    >
      {Array.from({ length: 10 }).map((_, i) => (
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
  );
}

function PlaceholderArt({ hue }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: `linear-gradient(135deg,hsl(${hue},50%,18%),hsl(${(hue + 60) % 360},40%,12%))`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke={`hsl(${hue},55%,55%)`}
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

/* ── Icons ────────────────────────────────────────────────────── */
function PlusIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
function GridIcon() {
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
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  );
}
function ListIcon() {
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
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}
function ChevronRightIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <polyline points="9 18 15 12 9 6" />
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
function ArtistIcon() {
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
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

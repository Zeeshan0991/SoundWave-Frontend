// src/pages/SearchPage.jsx
// ─────────────────────────────────────────────────────────────────────────────
// PHASE 13 ADDITION:
//   Added language browse section below the genre chips.
//   • LANGUAGES array defines the available filter chips — just add a new
//     entry here to add a new language; no backend change needed.
//   • Language browse hits the new GET /music/language/:language endpoint
//     and renders results in the same GenreBrowse component (reused as-is).
//   • Active filter state is mutually exclusive: clicking a language clears
//     any active genre and vice versa, keeping UX clean.
//   • browse mode header now shows whether you are browsing by genre or
//     language so the UI is unambiguous.
//
// PHASE 15 CHANGE:
//   Removed decorative flag emoji and symbol icons from language chips.
//   Language chips now match genre chip style — clean pill with no icon.
//   This is consistent, scalable, and avoids political/decorative symbols.
//   All other code is completely unchanged.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../api";
import TrackRow, { TrackListHeader } from "../components/TrackRow";
import AlbumCard from "../components/AlbumCard";
import ArtistCard from "../components/ArtistCard";

/* ── Genre list (unchanged) ───────────────────────────────────────── */
const GENRES = [
  { label: "Pop",        value: "pop",        icon: "✦", color: "#ff6b9d" },
  { label: "Hip-Hop",    value: "hiphop",     icon: "◉", color: "#ffd166" },
  { label: "Electronic", value: "electronic", icon: "⬡", color: "#00d4ff" },
  { label: "R&B",        value: "rnb",        icon: "♦", color: "#c77dff" },
  { label: "Rock",       value: "rock",       icon: "◆", color: "#ff6b6b" },
  { label: "Jazz",       value: "jazz",       icon: "◎", color: "#06d6a0" },
  { label: "Classical",  value: "classical",  icon: "♪", color: "#ffd166" },
  { label: "Lo-Fi",      value: "lofi",       icon: "▣", color: "#7b5ea7" },
  { label: "Indie",      value: "indie",      icon: "◇", color: "#ff9f1c" },
  { label: "Afrobeats",  value: "afrobeats",  icon: "◑", color: "#06d6a0" },
  { label: "Latin",      value: "latin",      icon: "◐", color: "#ff6b6b" },
  { label: "Soul",       value: "soul",       icon: "◈", color: "#e07050" },
];

/* ── PHASE 13: Language list
   PHASE 15: Removed decorative icons (flag emoji + symbols).
   Language chips are now clean pills matching genre chip style.
   Add new entries here to expose more languages — no backend change needed.
   `value` must match what artists select when uploading (case-insensitive
   regex on the backend, so "Urdu" matches "urdu", "URDU", etc.).
──────────────────────────────────────────────────────────────────── */
const LANGUAGES = [
  { label: "English", value: "English", color: "#00d4ff" },
  { label: "Hindi",   value: "Hindi",   color: "#ff9f1c" },
  { label: "Arabic",  value: "Arabic",  color: "#c77dff" },
  { label: "Spanish", value: "Spanish", color: "#ff6b9d" },
  { label: "Punjabi", value: "Punjabi", color: "#ffd166" },
];

/* ── Debounce hook (unchanged) ────────────────────────────────────── */
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/* ═══════════════════════════════════════════════════════════════
   SEARCH PAGE
═══════════════════════════════════════════════════════════════ */
export default function SearchPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [query,        setQuery]        = useState(searchParams.get("q") || "");
  const [activeGenre,  setActiveGenre]  = useState("");
  const [activeLang,   setActiveLang]   = useState("");
  const [activeTab,    setActiveTab]    = useState("tracks");
  const [results,      setResults]      = useState({ tracks: [], albums: [], artists: [] });
  const [loading,      setLoading]      = useState(false);
  const [searched,     setSearched]     = useState(false);
  const [browseData,   setBrowseData]   = useState({ tracks: [] });
  const [browseLoading,setBrowseLoading]= useState(false);
  const [inputFocused, setInputFocused] = useState(false);

  const inputRef  = useRef(null);
  const debouncedQ = useDebounce(query, 350);

  /* Auto-focus */
  useEffect(() => { inputRef.current?.focus(); }, []);

  /* Sync query → URL */
  useEffect(() => {
    if (debouncedQ.trim()) setSearchParams({ q: debouncedQ }, { replace: true });
    else                   setSearchParams({},                { replace: true });
  }, [debouncedQ]); // eslint-disable-line

  /* ── Live search (unchanged) ─────────────────────────────── */
  useEffect(() => {
    if (!debouncedQ.trim()) {
      setResults({ tracks: [], albums: [], artists: [] });
      setSearched(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setSearched(true);
      try {
        const { data } = await api.get(
          `/music/search?q=${encodeURIComponent(debouncedQ.trim())}`,
        );
        if (cancelled) return;
        setResults({
          tracks:  data.tracks  || [],
          albums:  data.albums  || [],
          artists: data.artists || [],
        });
        if      (data.tracks?.length)  setActiveTab("tracks");
        else if (data.albums?.length)  setActiveTab("albums");
        else if (data.artists?.length) setActiveTab("artists");
        else                           setActiveTab("tracks");
      } catch {
        if (!cancelled) setResults({ tracks: [], albums: [], artists: [] });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [debouncedQ]);

  /* ── Browse: genre OR language ──────────────────────────────
     When activeGenre is set  → fetch /music/genre/:genre
     When activeLang is set   → fetch /music/language/:language
     Only one can be active at a time (enforced by click handlers).
  ─────────────────────────────────────────────────────────── */
  useEffect(() => {
    const isGenreBrowse = !!activeGenre;
    const isLangBrowse  = !!activeLang;

    if (!isGenreBrowse && !isLangBrowse) {
      setBrowseData({ tracks: [] });
      return;
    }

    let cancelled = false;
    (async () => {
      setBrowseLoading(true);
      try {
        const endpoint = isGenreBrowse
          ? `/music/genre/${activeGenre}`
          : `/music/language/${activeLang}`;
        const { data } = await api.get(endpoint);
        if (!cancelled) setBrowseData({ tracks: data.tracks || [] });
      } catch {
        if (!cancelled) setBrowseData({ tracks: [] });
      } finally {
        if (!cancelled) setBrowseLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [activeGenre, activeLang]);

  /* ── Click handlers ─────────────────────────────────────── */
  const handleGenreClick = useCallback((genre) => {
    setActiveGenre(prev => (prev === genre.value ? "" : genre.value));
    setActiveLang("");
    setQuery("");
    setSearched(false);
  }, []);

  const handleLangClick = useCallback((lang) => {
    setActiveLang(prev => (prev === lang.value ? "" : lang.value));
    setActiveGenre("");
    setQuery("");
    setSearched(false);
  }, []);

  const clearAll = useCallback(() => {
    setQuery("");
    setActiveGenre("");
    setActiveLang("");
    setSearched(false);
    inputRef.current?.focus();
  }, []);

  const counts = {
    tracks:  results.tracks.length,
    albums:  results.albums.length,
    artists: results.artists.length,
  };
  const totalResults = counts.tracks + counts.albums + counts.artists;
  const isSearching  = !!debouncedQ.trim();
  const isBrowsing   = (!!activeGenre || !!activeLang) && !isSearching;

  const activeBrowseItem = activeGenre
    ? GENRES.find(g => g.value === activeGenre)
    : activeLang
      ? LANGUAGES.find(l => l.value === activeLang)
      : null;

  return (
    <div style={{ padding: "32px 32px 120px", animation: "fadeUp 0.4s ease both" }}>

      {/* ── Search bar (unchanged) ────────────────────────── */}
      <div style={{ marginBottom: "32px", maxWidth: "700px" }}>
        <div style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          background: "var(--bg-elevated)",
          border: `1px solid ${inputFocused || query ? "var(--cyan-border)" : "var(--border-subtle)"}`,
          borderRadius: "16px",
          transition: "border-color var(--t-fast), box-shadow var(--t-fast)",
          boxShadow: inputFocused || query ? "0 0 0 3px rgba(0,212,255,0.07)" : "none",
        }}>
          <div style={{
            position: "absolute", left: "18px",
            color: loading ? "var(--cyan)" : inputFocused ? "var(--cyan)" : "var(--text-muted)",
            transition: "color var(--t-fast)",
            pointerEvents: "none",
            display: "flex", alignItems: "center",
          }}>
            {loading ? <Spinner size={18} /> : <SearchIcon size={18} />}
          </div>

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setActiveGenre(""); setActiveLang(""); }}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            placeholder="Search tracks, artists, albums…"
            style={{
              flex: 1,
              padding: "16px 48px 16px 52px",
              background: "transparent",
              border: "none", outline: "none",
              color: "var(--text-primary)",
              fontSize: "15px",
              fontFamily: "var(--font-body)",
              minWidth: 0,
            }}
          />

          {(query || activeGenre || activeLang) && (
            <button
              onClick={clearAll}
              style={{
                marginRight: "12px",
                width: "26px", height: "26px",
                borderRadius: "50%",
                background: "var(--bg-raised)",
                border: "1px solid var(--border-faint)",
                color: "var(--text-muted)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer",
                fontSize: "15px", flexShrink: 0,
                transition: "all var(--t-fast)",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "var(--bg-hover)"; e.currentTarget.style.color = "var(--text-primary)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "var(--bg-raised)"; e.currentTarget.style.color = "var(--text-muted)"; }}
            >×</button>
          )}
        </div>

        {isSearching && !loading && searched && totalResults > 0 && (
          <p style={{ fontSize: "12.5px", color: "var(--text-muted)", marginTop: "10px", animation: "fadeIn 0.2s ease" }}>
            {totalResults} result{totalResults !== 1 ? "s" : ""} for{" "}
            <span style={{ color: "var(--text-secondary)", fontStyle: "italic" }}>"{debouncedQ}"</span>
          </p>
        )}
      </div>

      {/* ── Genre + Language chips ───────────────────────────
          Both hidden while a search query is active.
      ─────────────────────────────────────────────────────── */}
      {!isSearching && (
        <div style={{ marginBottom: "36px" }}>

          {/* Genre chips (unchanged) */}
          <p style={{
            fontSize: "11px", fontWeight: 700, letterSpacing: "1.5px",
            textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "14px",
          }}>Browse by Genre</p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "24px" }}>
            {GENRES.map(genre => {
              const active = activeGenre === genre.value;
              return (
                <button
                  key={genre.value}
                  onClick={() => handleGenreClick(genre)}
                  style={{
                    display: "flex", alignItems: "center", gap: "7px",
                    padding: "8px 16px", borderRadius: "999px",
                    border: `1px solid ${active ? genre.color + "60" : "var(--border-subtle)"}`,
                    background: active ? genre.color + "15" : "var(--bg-elevated)",
                    color: active ? genre.color : "var(--text-secondary)",
                    fontSize: "13px", fontWeight: active ? 700 : 500,
                    cursor: "pointer", transition: "all var(--t-fast)",
                    boxShadow: active ? `0 0 12px ${genre.color}20` : "none",
                  }}
                  onMouseEnter={e => {
                    if (!active) {
                      e.currentTarget.style.borderColor = genre.color + "44";
                      e.currentTarget.style.color = genre.color;
                      e.currentTarget.style.background = genre.color + "0d";
                    }
                  }}
                  onMouseLeave={e => {
                    if (!active) {
                      e.currentTarget.style.borderColor = "var(--border-subtle)";
                      e.currentTarget.style.color = "var(--text-secondary)";
                      e.currentTarget.style.background = "var(--bg-elevated)";
                    }
                  }}
                >
                  <span style={{ fontSize: "13px", fontFamily: "monospace" }}>{genre.icon}</span>
                  {genre.label}
                  {active && <span style={{ fontSize: "10px", opacity: 0.7, marginLeft: "2px" }}>✕</span>}
                </button>
              );
            })}
          </div>

          {/* PHASE 15: Language chips — no icons, clean pill style */}
          <p style={{
            fontSize: "11px", fontWeight: 700, letterSpacing: "1.5px",
            textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "14px",
          }}>Browse by Language</p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {LANGUAGES.map(lang => {
              const active = activeLang === lang.value;
              return (
                <button
                  key={lang.value}
                  onClick={() => handleLangClick(lang)}
                  style={{
                    display: "flex", alignItems: "center", gap: "6px",
                    padding: "8px 16px", borderRadius: "999px",
                    border: `1px solid ${active ? lang.color + "60" : "var(--border-subtle)"}`,
                    background: active ? lang.color + "15" : "var(--bg-elevated)",
                    color: active ? lang.color : "var(--text-secondary)",
                    fontSize: "13px", fontWeight: active ? 700 : 500,
                    cursor: "pointer", transition: "all var(--t-fast)",
                    boxShadow: active ? `0 0 12px ${lang.color}20` : "none",
                  }}
                  onMouseEnter={e => {
                    if (!active) {
                      e.currentTarget.style.borderColor = lang.color + "44";
                      e.currentTarget.style.color = lang.color;
                      e.currentTarget.style.background = lang.color + "0d";
                    }
                  }}
                  onMouseLeave={e => {
                    if (!active) {
                      e.currentTarget.style.borderColor = "var(--border-subtle)";
                      e.currentTarget.style.color = "var(--text-secondary)";
                      e.currentTarget.style.background = "var(--bg-elevated)";
                    }
                  }}
                >
                  {lang.label}
                  {active && <span style={{ fontSize: "10px", opacity: 0.7, marginLeft: "2px" }}>✕</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Browse results (genre OR language) ─────────────────
          GenreBrowse is reused for language results.
      ─────────────────────────────────────────────────────── */}
      {isBrowsing && (
        <GenreBrowse
          item={activeBrowseItem}
          browseType={activeGenre ? "genre" : "language"}
          data={browseData}
          loading={browseLoading}
        />
      )}

      {/* ── Search results (unchanged) ──────────────────────── */}
      {isSearching && searched && !loading && (
        totalResults === 0 ? (
          <EmptySearch query={debouncedQ} />
        ) : (
          <>
            <div style={{
              display: "flex", gap: "4px", marginBottom: "24px",
              borderBottom: "1px solid var(--border-faint)", paddingBottom: "0",
            }}>
              {["tracks", "albums", "artists"].map(tab =>
                counts[tab] > 0 && (
                  <ResultTab
                    key={tab}
                    label={tab[0].toUpperCase() + tab.slice(1)}
                    count={counts[tab]}
                    active={activeTab === tab}
                    onClick={() => setActiveTab(tab)}
                  />
                )
              )}
            </div>

            {activeTab === "tracks" && results.tracks.length > 0 && (
              <div style={{
                background: "var(--bg-surface)", borderRadius: "14px",
                border: "1px solid var(--border-faint)", overflow: "hidden",
                animation: "fadeUp 0.3s ease both",
              }}>
                <TrackListHeader showAlbum showArt />
                {results.tracks.map((t, i) => (
                  <TrackRow key={t._id} track={t} index={i} trackList={results.tracks} showAlbum showArt />
                ))}
              </div>
            )}

            {activeTab === "albums" && results.albums.length > 0 && (
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
                gap: "20px", animation: "fadeUp 0.3s ease both",
              }}>
                {results.albums.map(album => <AlbumCard key={album._id} album={album} />)}
              </div>
            )}

            {activeTab === "artists" && results.artists.length > 0 && (
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                gap: "20px", animation: "fadeUp 0.3s ease both",
              }}>
                {results.artists.map(artist => <ArtistCard key={artist._id} artist={artist} />)}
              </div>
            )}
          </>
        )
      )}

      {/* ── Loading search results ─────────────────────────── */}
      {isSearching && loading && <SearchSkeletons />}

      {/* ── Idle state ──────────────────────────────────────── */}
      {!isSearching && !isBrowsing && (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          gap: "16px", paddingTop: "60px",
          color: "var(--text-muted)", textAlign: "center",
          animation: "fadeUp 0.4s ease 0.1s both",
        }}>
          <div style={{
            width: "72px", height: "72px", borderRadius: "50%",
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-faint)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <SearchIcon size={28} />
          </div>
          <p style={{ fontSize: "14px", fontWeight: 500 }}>Search for tracks, artists, or albums</p>
          <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>Or pick a genre or language above to browse</p>
        </div>
      )}
    </div>
  );
}

/* ── Genre / Language Browse ──────────────────────────────────────
   PHASE 15: browseType header now shows clean label without icon
──────────────────────────────────────────────────────────────────── */
function GenreBrowse({ item, browseType, data, loading }) {
  if (!item) return null;

  const label = browseType === "language"
    ? `Language: ${item.label}`
    : item.label;

  return (
    <div style={{ animation: "fadeUp 0.3s ease both" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: "16px",
        marginBottom: "28px", padding: "22px 24px",
        background: item.color + "0d",
        border: `1px solid ${item.color}28`,
        borderRadius: "18px",
      }}>
        <div style={{
          width: "54px", height: "54px", borderRadius: "14px",
          background: item.color + "20",
          border: `1px solid ${item.color}35`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: browseType === "genre" ? "24px" : "18px",
          fontFamily: browseType === "genre" ? "monospace" : "var(--font-display)",
          fontWeight: 700,
          color: item.color, flexShrink: 0,
          boxShadow: `0 0 20px ${item.color}20`,
        }}>
          {browseType === "genre" ? item.icon : item.label.slice(0, 2)}
        </div>
        <div>
          <h2 style={{
            fontFamily: "var(--font-display)", fontSize: "24px",
            fontWeight: 800, letterSpacing: "-0.3px", marginBottom: "4px",
          }}>{label}</h2>
          <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
            {loading
              ? "Loading…"
              : `${data.tracks.length} track${data.tracks.length !== 1 ? "s" : ""} found`}
          </p>
        </div>
      </div>

      {loading ? (
        <SearchSkeletons />
      ) : data.tracks.length === 0 ? (
        <div className="empty-state">
          <EmptyIcon />
          <h3>No {item.label} tracks yet</h3>
          <p>
            {browseType === "language"
              ? `Be the first artist to upload a track in ${item.label}.`
              : `Be the first artist to upload in this genre.`}
          </p>
        </div>
      ) : (
        <div style={{
          background: "var(--bg-surface)", borderRadius: "14px",
          border: "1px solid var(--border-faint)", overflow: "hidden",
        }}>
          <TrackListHeader showAlbum showArt />
          {data.tracks.map((t, i) => (
            <TrackRow key={t._id} track={t} index={i} trackList={data.tracks} showAlbum showArt />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Result Tab (unchanged) ───────────────────────────────────── */
function ResultTab({ label, count, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: "6px",
        padding: "10px 18px",
        borderRadius: "8px 8px 0 0",
        fontFamily: "var(--font-display)",
        fontWeight: active ? 700 : 500,
        fontSize: "13.5px",
        color: active ? "var(--cyan)" : "var(--text-muted)",
        background: active ? "var(--bg-surface)" : "none",
        border: active ? "1px solid var(--border-faint)" : "1px solid transparent",
        borderBottom: active ? "1px solid var(--bg-deep)" : "1px solid transparent",
        marginBottom: "-1px",
        cursor: "pointer", transition: "all var(--t-fast)",
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.color = "var(--text-secondary)"; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.color = "var(--text-muted)"; }}
    >
      {label}
      <span style={{
        padding: "1px 7px", borderRadius: "999px",
        background: active ? "var(--cyan-dim)" : "var(--bg-elevated)",
        border: active ? "1px solid var(--cyan-border)" : "1px solid var(--border-faint)",
        fontSize: "11px", fontWeight: 700,
        color: active ? "var(--cyan)" : "var(--text-muted)",
      }}>{count}</span>
    </button>
  );
}

/* ── Empty Search (unchanged) ─────────────────────────────────── */
function EmptySearch({ query }) {
  return (
    <div className="empty-state" style={{ paddingTop: "60px", animation: "fadeUp 0.3s ease both" }}>
      <div style={{
        width: "72px", height: "72px", borderRadius: "50%",
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-faint)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "var(--text-muted)", marginBottom: "4px",
      }}>
        <SearchIcon size={28} />
      </div>
      <h3>No results for "{query}"</h3>
      <p>Try a different keyword, or check the spelling.</p>
    </div>
  );
}

/* ── Skeleton (unchanged) ─────────────────────────────────────── */
function SearchSkeletons() {
  return (
    <div style={{
      background: "var(--bg-surface)", borderRadius: "14px",
      border: "1px solid var(--border-faint)", overflow: "hidden",
    }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} style={{
          display: "flex", alignItems: "center", gap: "14px",
          padding: "12px 16px",
          borderBottom: i < 5 ? "1px solid var(--border-faint)" : "none",
        }}>
          <div className="skeleton" style={{ width: "20px",  height: "14px", borderRadius: "4px", flexShrink: 0 }} />
          <div className="skeleton" style={{ width: "40px",  height: "40px", borderRadius: "8px", flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="skeleton" style={{ height: "14px", width: "38%", marginBottom: "6px", borderRadius: "4px" }} />
            <div className="skeleton" style={{ height: "12px", width: "22%", borderRadius: "4px" }} />
          </div>
          <div className="skeleton" style={{ height: "12px", width: "32px", borderRadius: "4px" }} />
        </div>
      ))}
    </div>
  );
}

/* ── Icons (unchanged) ────────────────────────────────────────── */
function SearchIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}
function Spinner({ size = 16 }) {
  return (
    <div style={{
      width: `${size}px`, height: `${size}px`, borderRadius: "50%",
      border: "2px solid var(--bg-raised)",
      borderTop: "2px solid var(--cyan)",
      animation: "spinSlow 0.7s linear infinite", flexShrink: 0,
    }} />
  );
}
function EmptyIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}
// src/components/TopBar.jsx
import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useBreakpoint } from "../hooks/UseBreakpoint";
import ProfileDialog from "./ProfileDialog";
import { getDisplayName, getAvatarLetter } from "../api";

/* ── Page title map ──────────────────────────────────────────── */
const PAGE_TITLES = {
  "/home":          "Home",
  "/search":        "Search",
  "/library":       "Library",
  "/favorites":     "Favourites",
  "/my-music":      "My Music",
  "/upload":        "Upload Track",
  "/create-album":  "New Album",
};

export default function TopBar() {
  const navigate                      = useNavigate();
  const location                      = useLocation();
  const { user, logout }              = useAuth();
  const { isDark, toggleTheme }       = useTheme();
  const { isMobile }                  = useBreakpoint();
  const [menuOpen,    setMenuOpen]    = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const menuRef                       = useRef(null);

  /* Derive page title */
  const pageTitle = (() => {
    const exact = PAGE_TITLES[location.pathname];
    if (exact) return exact;
    if (location.pathname.startsWith("/album/"))  return "Album";
    if (location.pathname.startsWith("/artist/")) return "Artist";
    return "";
  })();

  /* Close menu on outside click */
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target))
        setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* Close menu on route change */
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  return (
    <>
      <div style={{
        position:             "sticky",
        top:                  0,
        zIndex:               100,
        height:               "var(--topbar-h)",
        background:           "var(--bg-overlay)",
        backdropFilter:       "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom:         "1px solid var(--border-faint)",
        display:              "flex",
        alignItems:           "center",
        justifyContent:       "space-between",
        // Tighter padding on mobile so nothing gets squished
        padding:              isMobile ? "0 14px" : "0 28px",
        gap:                  "12px",
        flexShrink:           0,
      }}>

        {/* ── Left: back/forward + page title ─────────────── */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
            <NavButton onClick={() => navigate(-1)} title="Go back">
              <ChevronLeftIcon />
            </NavButton>
            <NavButton onClick={() => navigate(1)} title="Go forward">
              <ChevronRightIcon />
            </NavButton>
          </div>

          {pageTitle && (
            <h1
              key={location.pathname}
              style={{
                fontFamily:    "var(--font-display)",
                fontSize:      isMobile ? "16px" : "18px",
                fontWeight:    700,
                letterSpacing: "-0.3px",
                color:         "var(--text-primary)",
                whiteSpace:    "nowrap",
                overflow:      "hidden",
                textOverflow:  "ellipsis",
                animation:     "slideLeft 0.2s ease both",
              }}
            >
              {pageTitle}
            </h1>
          )}
        </div>

        {/* ── Right: theme toggle + user menu ──────────────── */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            style={{
              width:          "34px",
              height:         "34px",
              borderRadius:   "10px",
              background:     "var(--bg-elevated)",
              border:         "1px solid var(--border-faint)",
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              cursor:         "pointer",
              transition:     "all var(--t-fast)",
              flexShrink:     0,
              overflow:       "hidden",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = "var(--cyan)";
              e.currentTarget.style.background  = "var(--cyan-dim)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = "var(--border-faint)";
              e.currentTarget.style.background  = "var(--bg-elevated)";
            }}
          >
            <span
              key={isDark ? "sun" : "moon"}
              style={{ animation: "themeIconPop 0.3s cubic-bezier(0.34,1.56,0.64,1) both" }}
            >
              {isDark ? <SunIcon /> : <MoonIcon />}
            </span>
          </button>

          {/* User menu */}
          <div ref={menuRef} style={{ position: "relative" }}>
            <button
              onClick={() => setMenuOpen(o => !o)}
              title={getDisplayName(user)}
              style={{
                display:      "flex",
                alignItems:   "center",
                gap:          "7px",
                // Mobile: avatar only (no username text) — saves space
                padding:      isMobile ? "5px" : "5px 10px 5px 5px",
                background:   menuOpen ? "var(--bg-elevated)" : "var(--bg-hover)",
                border:       `1px solid ${menuOpen ? "var(--border-subtle)" : "var(--border-faint)"}`,
                borderRadius: "999px",
                cursor:       "pointer",
                transition:   "all var(--t-fast)",
              }}
              onMouseEnter={e => {
                if (!menuOpen) {
                  e.currentTarget.style.background  = "var(--bg-elevated)";
                  e.currentTarget.style.borderColor = "var(--border-subtle)";
                }
              }}
              onMouseLeave={e => {
                if (!menuOpen) {
                  e.currentTarget.style.background  = "var(--bg-hover)";
                  e.currentTarget.style.borderColor = "var(--border-faint)";
                }
              }}
            >
              {/* Avatar */}
              <div style={{
                width:          "28px",
                height:         "28px",
                borderRadius:   "50%",
                background:     "linear-gradient(135deg, var(--cyan), var(--violet))",
                display:        "flex",
                alignItems:     "center",
                justifyContent: "center",
                fontFamily:     "var(--font-display)",
                fontWeight:     700,
                fontSize:       "12px",
                color:          "#fff",
                overflow:       "hidden",
                flexShrink:     0,
                border:         "1.5px solid var(--cyan-border)",
              }}>
                {user?.avatar
                  ? <img src={user.avatar} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : getAvatarLetter(user)
                }
              </div>

              {/* Username — hidden on mobile to save space */}
              {!isMobile && (
                <span style={{
                  fontSize:     "13px",
                  fontWeight:   600,
                  color:        "var(--text-primary)",
                  maxWidth:     "100px",
                  overflow:     "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace:   "nowrap",
                }}>
                  {getDisplayName(user)}
                </span>
              )}

              {/* Chevron — hidden on mobile */}
              {!isMobile && (
                <span style={{
                  color:      "var(--text-muted)",
                  display:    "flex",
                  transform:  menuOpen ? "rotate(180deg)" : "none",
                  transition: "transform var(--t-fast)",
                }}>
                  <ChevronDownIcon />
                </span>
              )}
            </button>

            {/* ── Dropdown menu ──────────────────────────────── */}
            {menuOpen && (
              <div style={{
                position:     "absolute",
                top:          "calc(100% + 8px)",
                right:        0,
                background:   "var(--bg-elevated)",
                border:       "1px solid var(--border-subtle)",
                borderRadius: "14px",
                padding:      "6px",
                minWidth:     "210px",
                boxShadow:    "0 16px 48px rgba(0,0,0,0.6)",
                animation:    "scaleIn 0.18s var(--ease-spring) both",
                zIndex:       200,
              }}>

                {/* User info header */}
                <div style={{
                  padding:      "10px 12px 12px",
                  borderBottom: "1px solid var(--border-faint)",
                  marginBottom: "6px",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{
                      width:          "36px",
                      height:         "36px",
                      borderRadius:   "50%",
                      background:     "linear-gradient(135deg, var(--cyan), var(--violet))",
                      display:        "flex",
                      alignItems:     "center",
                      justifyContent: "center",
                      fontFamily:     "var(--font-display)",
                      fontWeight:     700,
                      fontSize:       "14px",
                      color:          "#fff",
                      overflow:       "hidden",
                      flexShrink:     0,
                      border:         "1.5px solid var(--cyan-border)",
                    }}>
                      {user?.avatar
                        ? <img src={user.avatar} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : getAvatarLetter(user)
                      }
                    </div>
                    <div style={{ overflow: "hidden" }}>
                      <div style={{
                        fontSize: "14px", fontWeight: 600,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>{getDisplayName(user)}</div>
                      <div style={{
                        fontSize: "12px", color: "var(--text-muted)",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>{user?.email}</div>
                    </div>
                  </div>

                  {/* Role badge */}
                  <div style={{
                    display:       "inline-flex",
                    alignItems:    "center",
                    gap:           "5px",
                    marginTop:     "8px",
                    padding:       "3px 10px",
                    background:    user?.role === "artist" ? "var(--violet-dim)" : "var(--cyan-dim)",
                    border:        `1px solid ${user?.role === "artist" ? "var(--violet-border)" : "var(--cyan-border)"}`,
                    borderRadius:  "999px",
                    fontSize:      "11px",
                    fontWeight:    700,
                    color:         user?.role === "artist" ? "var(--violet)" : "var(--cyan)",
                    letterSpacing: "0.5px",
                    textTransform: "capitalize",
                  }}>
                    {user?.role === "artist" ? "🎤" : "🎧"} {user?.role || "listener"}
                  </div>
                </div>

                <DropdownItem
                  icon={<ProfileIcon />}
                  label="Edit Profile"
                  onClick={() => { setMenuOpen(false); setProfileOpen(true); }}
                />
                <div style={{ height: "1px", background: "var(--border-faint)", margin: "6px 0" }} />
                <DropdownItem
                  icon={<LogoutIcon />}
                  label="Sign Out"
                  onClick={handleLogout}
                  danger
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes themeIconPop {
          0%   { transform: scale(0.6) rotate(-20deg); opacity: 0; }
          60%  { transform: scale(1.15) rotate(5deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
      `}</style>

      {profileOpen && (
        <ProfileDialog onClose={() => setProfileOpen(false)} />
      )}
    </>
  );
}

/* ── Sub-components ───────────────────────────────────────────── */
function NavButton({ onClick, title, children }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width:          "30px",
        height:         "30px",
        borderRadius:   "50%",
        background:     "var(--bg-elevated)",
        border:         "1px solid var(--border-faint)",
        color:          "var(--text-secondary)",
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        cursor:         "pointer",
        transition:     "all var(--t-fast)",
        flexShrink:     0,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background  = "var(--bg-raised)";
        e.currentTarget.style.color       = "var(--text-primary)";
        e.currentTarget.style.borderColor = "var(--border-subtle)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background  = "var(--bg-elevated)";
        e.currentTarget.style.color       = "var(--text-secondary)";
        e.currentTarget.style.borderColor = "var(--border-faint)";
      }}
    >{children}</button>
  );
}

function DropdownItem({ icon, label, onClick, danger = false }) {
  return (
    <button
      onClick={onClick}
      style={{
        display:      "flex",
        alignItems:   "center",
        gap:          "10px",
        width:        "100%",
        padding:      "9px 12px",
        borderRadius: "9px",
        color:        danger ? "var(--coral)" : "var(--text-secondary)",
        fontSize:     "13.5px",
        fontWeight:   500,
        background:   "none",
        border:       "none",
        cursor:       "pointer",
        textAlign:    "left",
        transition:   "all var(--t-fast)",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = danger ? "rgba(255,107,107,0.08)" : "var(--bg-hover)";
        e.currentTarget.style.color      = danger ? "var(--coral)" : "var(--text-primary)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = "none";
        e.currentTarget.style.color      = danger ? "var(--coral)" : "var(--text-secondary)";
      }}
    >
      <span style={{ flexShrink: 0, opacity: 0.7 }}>{icon}</span>
      {label}
    </button>
  );
}

/* ── Icons ────────────────────────────────────────────────────── */
function ChevronLeftIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}
function ChevronRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}
function ChevronDownIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
function ProfileIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
function LogoutIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4"/>
      <line x1="12" y1="2"  x2="12" y2="4"/>
      <line x1="12" y1="20" x2="12" y2="22"/>
      <line x1="4.22"  y1="4.22"  x2="5.64"  y2="5.64"/>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="2"  y1="12" x2="4"  y2="12"/>
      <line x1="20" y1="12" x2="22" y2="12"/>
      <line x1="4.22"  y1="19.78" x2="5.64"  y2="18.36"/>
      <line x1="18.36" y1="5.64"  x2="19.78" y2="4.22"/>
    </svg>
  );
}
function MoonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="#8b9cf4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  );
}
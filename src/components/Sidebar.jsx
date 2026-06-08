// src/components/Sidebar.jsx
// ─────────────────────────────────────────────────────────────────────────────
// RESPONSIVE CHANGES:
//
//   NEW PROPS:
//     railMode      (bool) — tablet: collapses to 48px icon-only rail
//     overlayOpen   (bool) — tablet: whether full overlay is showing
//     onOverlayOpen  (fn)  — tablet: called when hamburger is tapped
//     onOverlayClose (fn)  — tablet: called when overlay should close
//
//   DESKTOP (props all false/undefined):
//     Renders exactly as before — zero visual changes.
//
//   TABLET rail mode (railMode=true, overlayOpen=false):
//     • Width: 48px
//     • Shows only icons (no labels, no logo text, no user strip text)
//     • Hamburger icon at top opens overlay
//     • Tooltip on hover for each nav item (native title attr)
//     • Now-playing mini card hidden (no room)
//     • User avatar visible as icon
//
//   TABLET overlay mode (railMode=true, overlayOpen=true):
//     • Full sidebar slides over content from the left
//     • Width: var(--sidebar-w) — same as desktop
//     • Close button (×) replaces hamburger
//     • All content visible as normal
//     • Backdrop rendered in AppLayout
//
//   All existing desktop logic completely unchanged.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { usePlayer } from "../context/PlayerContext";
import Equalizer from "./Equalizer";
import { getDisplayName, getAvatarLetter } from "../api";

const RAIL_W = 56;

/* ── Nav items ───────────────────────────────────────────────────────────── */
const MAIN_NAV = [
  {
    to: "/home", label: "Home",
    icon: (active) => (
      <svg width="18" height="18" viewBox="0 0 24 24"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    to: "/search", label: "Search",
    icon: () => (
      <svg width="18" height="18" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
  },
  {
    to: "/library", label: "Library",
    icon: (active) => (
      <svg width="18" height="18" viewBox="0 0 24 24"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
      </svg>
    ),
  },
  {
    to: "/favorites", label: "Favourites",
    icon: (active) => (
      <svg width="18" height="18" viewBox="0 0 24 24"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
      </svg>
    ),
  },
];

const ARTIST_NAV = [
  {
    to: "/my-music", label: "My Music",
    icon: (active) => (
      <svg width="18" height="18" viewBox="0 0 24 24"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
      </svg>
    ),
  },
  {
    to: "/upload", label: "Upload",
    icon: () => (
      <svg width="18" height="18" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
    ),
  },
  {
    to: "/create-album", label: "New Album",
    icon: () => (
      <svg width="18" height="18" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="16" />
        <line x1="8" y1="12" x2="16" y2="12" />
      </svg>
    ),
  },
];

/* ═══════════════════════════════════════════════════════════════
   SIDEBAR
═══════════════════════════════════════════════════════════════ */
export default function Sidebar({
  railMode     = false,
  overlayOpen  = false,
  onOverlayOpen  = () => {},
  onOverlayClose = () => {},
}) {
  const navigate                    = useNavigate();
  const { user, isArtist, logout }  = useAuth();
  const { currentTrack, isPlaying } = usePlayer();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // In rail mode, show labels only when overlay is open
  const showLabels = !railMode || overlayOpen;

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  // ── Width calculation ──────────────────────────────────────────────────
  // Desktop: var(--sidebar-w)
  // Tablet rail (collapsed): RAIL_W px
  // Tablet overlay (expanded): var(--sidebar-w), positioned fixed over content
  const sidebarWidth = railMode && !overlayOpen
    ? `${RAIL_W}px`
    : "var(--sidebar-w)";

  const isOverlay = railMode && overlayOpen;

  return (
    <aside
      style={{
        width:          sidebarWidth,
        height:         "100%",
        background:     "var(--bg-surface)",
        borderRight:    "1px solid var(--border-faint)",
        display:        "flex",
        flexDirection:  "column",
        overflow:       "hidden",
        flexShrink:     0,
        transition:     "width 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        // Overlay mode: fixed position slides over content
        ...(isOverlay && {
          position: "fixed",
          top:      0,
          left:     0,
          bottom:   0,
          width:    "var(--sidebar-w)",
          zIndex:   300,
          boxShadow:"8px 0 32px rgba(0,0,0,0.4)",
          animation:"slideInLeft 0.28s cubic-bezier(0.34,1.2,0.64,1) both",
        }),
      }}
    >
      {/* ── Logo / Hamburger row ─────────────────────────────────────── */}
      <div style={{
        padding:    railMode ? "20px 0 8px" : "24px 20px 8px",
        display:    "flex",
        alignItems: "center",
        justifyContent: railMode && !overlayOpen ? "center" : "space-between",
      }}>
        {/* Logo — hidden in collapsed rail, shown when overlay open or desktop */}
        {showLabels && (
          <button
            onClick={() => { navigate("/"); onOverlayClose(); }}
            title="Go to landing page"
            style={{
              display:    "flex",
              alignItems: "center",
              gap:        "10px",
              background: "none",
              border:     "none",
              cursor:     "pointer",
              padding:    "6px 8px",
              borderRadius:"10px",
              transition: "background var(--t-fast)",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"}
            onMouseLeave={e => e.currentTarget.style.background = "none"}
          >
            <LogoMark size={28} />
            <span style={{
              fontFamily:    "var(--font-display)",
              fontWeight:    800,
              fontSize:      "15px",
              letterSpacing: "2px",
              color:         "var(--text-primary)",
            }}>SOUNDWAVE</span>
          </button>
        )}

        {/* Hamburger (collapsed rail) / Logo only (expanded) / Close (overlay) */}
        {railMode && (
          <button
            onClick={overlayOpen ? onOverlayClose : onOverlayOpen}
            title={overlayOpen ? "Close menu" : "Expand menu"}
            style={{
              width:        "36px",
              height:       "36px",
              borderRadius: "10px",
              background:   "none",
              border:       "none",
              color:        "var(--text-muted)",
              display:      "flex",
              alignItems:   "center",
              justifyContent:"center",
              cursor:       "pointer",
              transition:   "all var(--t-fast)",
              flexShrink:   0,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = "var(--bg-hover)";
              e.currentTarget.style.color      = "var(--text-primary)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "none";
              e.currentTarget.style.color      = "var(--text-muted)";
            }}
          >
            {overlayOpen ? <CloseIcon /> : <HamburgerIcon />}
          </button>
        )}

        {/* Collapsed rail: show only logo mark, centered */}
        {railMode && !overlayOpen && (
          <button
            onClick={() => navigate("/")}
            title="SOUNDWAVE"
            style={{
              position:   "absolute",
              top:        "20px",
              left:       "50%",
              transform:  "translateX(-50%)",
              background: "none",
              border:     "none",
              cursor:     "pointer",
              padding:    "4px",
              borderRadius:"8px",
              display:    "flex",
            }}
          >
            <LogoMark size={26} />
          </button>
        )}
      </div>

      {/* ── Main nav ─────────────────────────────────────────────────── */}
      <nav style={{
        padding: railMode && !overlayOpen ? "16px 6px 0" : "12px 12px 0",
        flex:    0,
      }}>
        {showLabels && <NavLabel>Menu</NavLabel>}
        {MAIN_NAV.map((item) => (
          <SidebarLink
            key={item.to}
            item={item}
            compact={railMode && !overlayOpen}
            onNavigate={onOverlayClose}
          />
        ))}
      </nav>

      {/* ── Artist section ───────────────────────────────────────────── */}
      {isArtist && (
        <nav style={{
          padding: railMode && !overlayOpen ? "16px 6px 0" : "20px 12px 0",
        }}>
          {showLabels && <NavLabel>Artist</NavLabel>}
          {ARTIST_NAV.map((item) => (
            <SidebarLink
              key={item.to}
              item={item}
              compact={railMode && !overlayOpen}
              onNavigate={onOverlayClose}
            />
          ))}
        </nav>
      )}

      {/* ── Spacer ───────────────────────────────────────────────────── */}
      <div style={{ flex: 1 }} />

      {/* ── Now playing mini — hidden in collapsed rail ───────────────── */}
      {currentTrack && showLabels && (
        <div style={{
          margin:       "0 12px 12px",
          padding:      "12px",
          background:   "var(--bg-elevated)",
          border:       "1px solid var(--border-faint)",
          borderRadius: "12px",
        }}>
          <div style={{
            fontSize:      "10px",
            fontWeight:    700,
            letterSpacing: "1.2px",
            textTransform: "uppercase",
            color:         "var(--text-muted)",
            marginBottom:  "8px",
            display:       "flex",
            alignItems:    "center",
            gap:           "6px",
          }}>
            <Equalizer isPlaying={isPlaying} size="sm" barCount={3} />
            Now Playing
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
            <div style={{
              width:"36px", height:"36px", borderRadius:"8px",
              background:"var(--bg-raised)", flexShrink:0, overflow:"hidden",
            }}>
              {currentTrack.coverUrl
                ? <img src={currentTrack.coverUrl} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                : <PlaceholderArt />
              }
            </div>
            <div style={{ flex:1, overflow:"hidden" }}>
              <div className="truncate" style={{ fontSize:"13px", fontWeight:600, color:"var(--text-primary)" }}>
                {currentTrack.title}
              </div>
              <div className="truncate" style={{ fontSize:"11px", color:"var(--text-muted)", marginTop:"2px" }}>
                {currentTrack.artist?.username || currentTrack.artistName || "Unknown"}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Now playing mini in rail mode — just art thumbnail ─────────── */}
      {currentTrack && railMode && !overlayOpen && (
        <div style={{
          margin:       "0 6px 12px",
          display:      "flex",
          justifyContent:"center",
        }}>
          <div style={{
            width:"36px", height:"36px", borderRadius:"8px",
            background:"var(--bg-raised)", overflow:"hidden",
            border:"1px solid var(--cyan-border)",
            boxShadow:"0 0 8px var(--cyan-border)",
          }}>
            {currentTrack.coverUrl
              ? <img src={currentTrack.coverUrl} alt={currentTrack.title}
                  title={currentTrack.title}
                  style={{ width:"100%", height:"100%", objectFit:"cover" }} />
              : <PlaceholderArt />
            }
          </div>
        </div>
      )}

      {/* ── User profile strip ───────────────────────────────────────── */}
      <div style={{
        borderTop: "1px solid var(--border-faint)",
        padding:   railMode && !overlayOpen ? "12px 6px" : "12px",
      }}>
        {/* Collapsed rail: just the avatar */}
        {railMode && !overlayOpen ? (
          <div style={{ display:"flex", justifyContent:"center" }}>
            <div
              title={getDisplayName(user)}
              style={{
                width:"34px", height:"34px", borderRadius:"50%",
                background:"linear-gradient(135deg, var(--cyan), var(--violet))",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontFamily:"var(--font-display)", fontWeight:700,
                fontSize:"13px", color:"#fff", overflow:"hidden",
                border:"1.5px solid var(--cyan-border)", cursor:"default",
              }}>
              {user?.avatar
                ? <img src={user.avatar} alt="avatar" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                : getAvatarLetter(user)
              }
            </div>
          </div>
        ) : showLogoutConfirm ? (
          /* Inline logout confirm — unchanged */
          <div style={{
            padding:"12px", background:"var(--bg-elevated)",
            borderRadius:"10px", border:"1px solid rgba(255,107,107,0.2)",
          }}>
            <p style={{ fontSize:"12.5px", color:"var(--text-secondary)", marginBottom:"10px", lineHeight:1.5 }}>
              Sign out of SOUNDWAVE?
            </p>
            <div style={{ display:"flex", gap:"6px" }}>
              <button onClick={handleLogout} style={{
                flex:1, padding:"7px", borderRadius:"7px",
                background:"rgba(255,107,107,0.12)",
                border:"1px solid rgba(255,107,107,0.3)",
                color:"var(--coral)", fontSize:"12px", fontWeight:600, cursor:"pointer",
              }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,107,107,0.2)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(255,107,107,0.12)"}
              >Sign out</button>
              <button onClick={() => setShowLogoutConfirm(false)} style={{
                flex:1, padding:"7px", borderRadius:"7px",
                background:"var(--bg-hover)", border:"1px solid var(--border-faint)",
                color:"var(--text-secondary)", fontSize:"12px", fontWeight:600, cursor:"pointer",
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = "var(--border-medium)"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border-faint)"}
              >Cancel</button>
            </div>
          </div>
        ) : (
          /* Full user strip — unchanged */
          <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
            <div style={{
              width:"34px", height:"34px", borderRadius:"50%",
              background:"linear-gradient(135deg, var(--cyan), var(--violet))",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontFamily:"var(--font-display)", fontWeight:700,
              fontSize:"13px", color:"#fff", flexShrink:0,
              overflow:"hidden", border:"1.5px solid var(--cyan-border)",
            }}>
              {user?.avatar
                ? <img src={user.avatar} alt="avatar" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                : getAvatarLetter(user)
              }
            </div>
            <div style={{ flex:1, overflow:"hidden" }}>
              <div className="truncate" style={{ fontSize:"13px", fontWeight:600 }}>
                {getDisplayName(user)}
              </div>
              <div style={{ fontSize:"11px", color:"var(--text-muted)", textTransform:"capitalize", marginTop:"1px" }}>
                {user?.role || "listener"}
              </div>
            </div>
            <button
              onClick={() => setShowLogoutConfirm(true)}
              title="Sign out"
              style={{
                width:"30px", height:"30px", borderRadius:"8px",
                background:"none", border:"1px solid transparent",
                color:"var(--text-muted)", display:"flex",
                alignItems:"center", justifyContent:"center",
                cursor:"pointer", transition:"all var(--t-fast)", flexShrink:0,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background  = "rgba(255,107,107,0.08)";
                e.currentTarget.style.borderColor = "rgba(255,107,107,0.2)";
                e.currentTarget.style.color       = "var(--coral)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background  = "none";
                e.currentTarget.style.borderColor = "transparent";
                e.currentTarget.style.color       = "var(--text-muted)";
              }}
            >
              <LogoutIcon />
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideInLeft {
          from { transform: translateX(-100%); opacity: 0; }
          to   { transform: translateX(0);     opacity: 1; }
        }
      `}</style>
    </aside>
  );
}

/* ── Sub-components ───────────────────────────────────────────────────────── */

function NavLabel({ children }) {
  return (
    <div style={{
      fontSize:"10px", fontWeight:700, letterSpacing:"1.5px",
      textTransform:"uppercase", color:"var(--text-muted)",
      padding:"0 8px 6px", marginTop:"4px",
    }}>{children}</div>
  );
}

// compact = icon-only (rail mode)
function SidebarLink({ item, compact = false, onNavigate }) {
  return (
    <NavLink
      to={item.to}
      title={compact ? item.label : undefined}
      onClick={onNavigate}
      style={({ isActive }) => ({
        display:      "flex",
        alignItems:   "center",
        justifyContent: compact ? "center" : "flex-start",
        gap:          "12px",
        padding:      compact ? "11px 0" : "10px 12px",
        borderRadius: "10px",
        marginBottom: "2px",
        color:        isActive ? "var(--cyan)"      : "var(--text-secondary)",
        background:   isActive ? "var(--bg-active)" : "transparent",
        fontWeight:   isActive ? 600                : 400,
        fontSize:     "14px",
        transition:   "all var(--t-fast)",
        textDecoration:"none",
        position:     "relative",
      })}
      onMouseEnter={e => {
        if (!e.currentTarget.classList.contains("active")) {
          e.currentTarget.style.background = "var(--bg-hover)";
          e.currentTarget.style.color      = "var(--text-primary)";
        }
      }}
      onMouseLeave={e => {
        if (!e.currentTarget.classList.contains("active")) {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color      = "var(--text-secondary)";
        }
      }}
    >
      {({ isActive }) => (
        <>
          {isActive && !compact && (
            <div style={{
              position:"absolute", left:0, top:"20%", bottom:"20%",
              width:"3px", borderRadius:"0 3px 3px 0",
              background:"var(--cyan)", boxShadow:"0 0 8px var(--cyan)",
            }} />
          )}
          <span style={{ flexShrink:0 }}>{item.icon(isActive)}</span>
          {!compact && <span>{item.label}</span>}
        </>
      )}
    </NavLink>
  );
}

function PlaceholderArt() {
  return (
    <div style={{
      width:"100%", height:"100%",
      background:"linear-gradient(135deg, var(--bg-raised), var(--bg-elevated))",
      display:"flex", alignItems:"center", justifyContent:"center",
    }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round">
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
      </svg>
    </div>
  );
}

/* ── Icons ────────────────────────────────────────────────────────────────── */
function LogoMark({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="14.5" stroke="#00d4ff" strokeWidth="1.5" strokeOpacity="0.7" />
      <path d="M8 16 Q11 9, 16 16 Q21 23, 24 16" stroke="#00d4ff" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <circle cx="16" cy="16" r="3.5" fill="#00d4ff" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function HamburgerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="3" y1="6"  x2="21" y2="6"  />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6"  x2="6"  y2="18" />
      <line x1="6"  y1="6"  x2="18" y2="18" />
    </svg>
  );
}
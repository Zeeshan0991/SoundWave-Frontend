// src/components/BottomNav.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Mobile-only bottom navigation bar.
// Replaces the sidebar on screens < 640px.
//
// Shows 5 tabs: Home, Search, Library, Favourites, Profile
// Profile tab opens the same logout/user panel as sidebar's user strip.
// Artist tools (Upload, My Music, New Album) are accessible via the
// Profile tab which shows a small action sheet above the bar.
//
// Sits above the compact NowPlayingBar via z-index layering.
// AppLayout reserves space for both via CSS variable --bottom-nav-h (56px).
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getDisplayName, getAvatarLetter } from "../api";

const BOTTOM_NAV_H = 56;

// ── Nav tabs ──────────────────────────────────────────────────────────────────
const TABS = [
  {
    to:    "/home",
    label: "Home",
    icon:  (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    to:    "/search",
    label: "Search",
    icon:  () => (
      <svg width="22" height="22" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
  },
  {
    to:    "/library",
    label: "Library",
    icon:  (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
      </svg>
    ),
  },
  {
    to:    "/favorites",
    label: "Favourites",
    icon:  (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
      </svg>
    ),
  },
];

// ── BottomNav ─────────────────────────────────────────────────────────────────
export default function BottomNav({ onProfileOpen }) {
  const { user, isArtist } = useAuth();

  return (
    <div
      style={{
        position:       "fixed",
        bottom:         0,
        left:           0,
        right:          0,
        height:         `${BOTTOM_NAV_H}px`,
        background:     "var(--bg-surface)",
        borderTop:      "1px solid var(--border-faint)",
        display:        "flex",
        alignItems:     "stretch",
        zIndex:         300,
        // Safe area inset for iOS home indicator
        paddingBottom:  "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          style={({ isActive }) => ({
            flex:           1,
            display:        "flex",
            flexDirection:  "column",
            alignItems:     "center",
            justifyContent: "center",
            gap:            "3px",
            color:          isActive ? "var(--cyan)" : "var(--text-muted)",
            textDecoration: "none",
            fontSize:       "10px",
            fontWeight:     isActive ? 700 : 400,
            transition:     "color 0.15s ease",
            // 44px minimum touch target
            minHeight:      "44px",
            position:       "relative",
          })}
        >
          {({ isActive }) => (
            <>
              {/* Active indicator line at top */}
              {isActive && (
                <div style={{
                  position:   "absolute",
                  top:        0,
                  left:       "25%",
                  right:      "25%",
                  height:     "2px",
                  borderRadius:"0 0 2px 2px",
                  background: "var(--cyan)",
                  boxShadow:  "0 0 6px var(--cyan)",
                }} />
              )}
              {tab.icon(isActive)}
              <span>{tab.label}</span>
            </>
          )}
        </NavLink>
      ))}

      {/* Profile tab — not a NavLink, opens action sheet */}
      <button
        onClick={onProfileOpen}
        style={{
          flex:           1,
          display:        "flex",
          flexDirection:  "column",
          alignItems:     "center",
          justifyContent: "center",
          gap:            "3px",
          color:          "var(--text-muted)",
          background:     "none",
          border:         "none",
          fontSize:       "10px",
          fontWeight:     400,
          cursor:         "pointer",
          minHeight:      "44px",
          padding:        0,
        }}
      >
        {/* Avatar circle */}
        <div style={{
          width:          "22px",
          height:         "22px",
          borderRadius:   "50%",
          background:     "linear-gradient(135deg, var(--cyan), var(--violet))",
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          fontSize:       "9px",
          fontWeight:     700,
          color:          "#fff",
          overflow:       "hidden",
          border:         "1.5px solid var(--cyan-border)",
        }}>
          {user?.avatar
            ? <img src={user.avatar} alt="avatar" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
            : getAvatarLetter(user)
          }
        </div>
        <span>Profile</span>
      </button>
    </div>
  );
}

// ── ProfileSheet ──────────────────────────────────────────────────────────────
// Slides up from bottom when Profile tab is tapped.
// Shows user info, logout, and artist tools if applicable.
export function ProfileSheet({ onClose }) {
  const navigate                   = useNavigate();
  const { user, isArtist, logout } = useAuth();
  const [confirmLogout, setConfirmLogout] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  const goTo = (path) => {
    onClose();
    navigate(path);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position:   "fixed",
          inset:      0,
          background: "rgba(0,0,0,0.5)",
          zIndex:     400,
          animation:  "fadeIn 0.15s ease both",
        }}
      />

      {/* Sheet */}
      <div style={{
        position:      "fixed",
        bottom:        0,
        left:          0,
        right:         0,
        zIndex:        401,
        background:    "var(--bg-surface)",
        borderRadius:  "20px 20px 0 0",
        borderTop:     "1px solid var(--border-subtle)",
        padding:       "0 0 calc(env(safe-area-inset-bottom, 0px) + 16px)",
        animation:     "slideUpSheet 0.28s cubic-bezier(0.34,1.3,0.64,1) both",
        boxShadow:     "0 -8px 40px rgba(0,0,0,0.4)",
      }}>
        {/* Handle */}
        <div style={{
          width:        "36px",
          height:       "4px",
          borderRadius: "2px",
          background:   "var(--border-subtle)",
          margin:       "12px auto 8px",
        }} />

        {/* User info */}
        <div style={{
          display:    "flex",
          alignItems: "center",
          gap:        "12px",
          padding:    "12px 20px 16px",
          borderBottom:"1px solid var(--border-faint)",
        }}>
          <div style={{
            width:          "46px",
            height:         "46px",
            borderRadius:   "50%",
            background:     "linear-gradient(135deg, var(--cyan), var(--violet))",
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            fontSize:       "17px",
            fontWeight:     700,
            color:          "#fff",
            flexShrink:     0,
            overflow:       "hidden",
            border:         "2px solid var(--cyan-border)",
          }}>
            {user?.avatar
              ? <img src={user.avatar} alt="avatar" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
              : getAvatarLetter(user)
            }
          </div>
          <div>
            <div style={{ fontSize:"15px", fontWeight:700, color:"var(--text-primary)" }}>
              {getDisplayName(user)}
            </div>
            <div style={{ fontSize:"12px", color:"var(--text-muted)", textTransform:"capitalize", marginTop:"2px" }}>
              {user?.role || "listener"}
            </div>
          </div>
        </div>

        {/* Artist tools */}
        {isArtist && (
          <div style={{ padding:"12px 16px 8px" }}>
            <div style={{
              fontSize:"10px", fontWeight:700, letterSpacing:"1.2px",
              textTransform:"uppercase", color:"var(--text-muted)",
              padding:"0 4px 8px",
            }}>Artist Tools</div>
            {[
              { label:"My Music",  path:"/my-music",     emoji:"🎵" },
              { label:"Upload",    path:"/upload",        emoji:"⬆️" },
              { label:"New Album", path:"/create-album",  emoji:"💿" },
            ].map((item) => (
              <button
                key={item.path}
                onClick={() => goTo(item.path)}
                style={{
                  display:     "flex",
                  alignItems:  "center",
                  gap:         "12px",
                  width:       "100%",
                  padding:     "12px 12px",
                  borderRadius:"10px",
                  background:  "none",
                  border:      "none",
                  color:       "var(--text-secondary)",
                  fontSize:    "14px",
                  fontWeight:  500,
                  cursor:      "pointer",
                  textAlign:   "left",
                  transition:  "background 0.15s ease",
                  minHeight:   "44px",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"}
                onMouseLeave={e => e.currentTarget.style.background = "none"}
              >
                <span style={{ fontSize:"18px", width:"24px", textAlign:"center" }}>{item.emoji}</span>
                {item.label}
              </button>
            ))}
          </div>
        )}

        {/* Sign out */}
        <div style={{ padding: isArtist ? "0 16px 8px" : "12px 16px 8px", borderTop: isArtist ? "1px solid var(--border-faint)" : "none" }}>
          {confirmLogout ? (
            <div style={{
              padding:"14px", background:"var(--bg-elevated)",
              borderRadius:"12px", border:"1px solid rgba(255,107,107,0.2)",
              margin:"8px 0",
            }}>
              <p style={{ fontSize:"13px", color:"var(--text-secondary)", marginBottom:"12px", lineHeight:1.5 }}>
                Sign out of SOUNDWAVE?
              </p>
              <div style={{ display:"flex", gap:"8px" }}>
                <button onClick={handleLogout} style={{
                  flex:1, padding:"10px", borderRadius:"8px",
                  background:"rgba(255,107,107,0.12)",
                  border:"1px solid rgba(255,107,107,0.3)",
                  color:"var(--coral)", fontSize:"13px", fontWeight:600,
                  cursor:"pointer", minHeight:"44px",
                }}>Sign out</button>
                <button onClick={() => setConfirmLogout(false)} style={{
                  flex:1, padding:"10px", borderRadius:"8px",
                  background:"var(--bg-hover)", border:"1px solid var(--border-faint)",
                  color:"var(--text-secondary)", fontSize:"13px", fontWeight:600,
                  cursor:"pointer", minHeight:"44px",
                }}>Cancel</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmLogout(true)}
              style={{
                display:     "flex",
                alignItems:  "center",
                gap:         "12px",
                width:       "100%",
                padding:     "12px",
                marginTop:   "4px",
                borderRadius:"10px",
                background:  "none",
                border:      "none",
                color:       "var(--coral)",
                fontSize:    "14px",
                fontWeight:  500,
                cursor:      "pointer",
                textAlign:   "left",
                minHeight:   "44px",
                transition:  "background 0.15s ease",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,107,107,0.08)"}
              onMouseLeave={e => e.currentTarget.style.background = "none"}
            >
              <span style={{ fontSize:"18px", width:"24px", textAlign:"center" }}>🚪</span>
              Sign out
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideUpSheet {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </>
  );
}
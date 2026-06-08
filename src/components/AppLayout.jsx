// src/components/AppLayout.jsx
import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import NowPlayingBar from "./NowPlayingBar";
import BottomNav, { ProfileSheet } from "./BottomNav";
import { useBreakpoint } from "../hooks/UseBreakpoint";

export default function AppLayout() {
  const { isMobile, isTablet, isDesktop } = useBreakpoint();

  const [showProfile, setShowProfile]     = useState(false);
  const [sidebarOverlay, setSidebarOverlay] = useState(false);

  return (
    <div
      style={{
        display:    "flex",
        height:     "100vh",
        overflow:   "hidden",
        background: "var(--bg-void)",
      }}
    >
      {/* ── SIDEBAR ────────────────────────────────────────────────────────
          Desktop : always visible, full width
          Tablet  : icon-rail (48px), overlay on demand
          Mobile  : hidden — replaced by BottomNav
      ─────────────────────────────────────────────────────────────────── */}
      {!isMobile && (
        <Sidebar
          railMode={isTablet}
          overlayOpen={sidebarOverlay}
          onOverlayOpen={() => setSidebarOverlay(true)}
          onOverlayClose={() => setSidebarOverlay(false)}
        />
      )}

      {/* ── Tablet sidebar overlay backdrop ────────────────────────────── */}
      {isTablet && sidebarOverlay && (
        <div
          onClick={() => setSidebarOverlay(false)}
          style={{
            position:   "fixed",
            inset:      0,
            background: "rgba(0,0,0,0.5)",
            zIndex:     299,
            animation:  "fadeIn 0.15s ease both",
          }}
        />
      )}

      {/* ── MAIN CONTENT AREA ──────────────────────────────────────────── */}
      <div
        style={{
          flex:          1,
          display:       "flex",
          flexDirection: "column",
          overflow:      "hidden",
          background:    "var(--bg-deep)",
        }}
      >
        {/* ── TOP BAR — theme toggle + user avatar/menu ──────────────────
            Shown on ALL breakpoints (mobile, tablet, desktop).
            On mobile it sits above the scrollable content, below the
            status bar, giving the user access to dark/light toggle and
            their profile without opening the sidebar.
        ─────────────────────────────────────────────────────────────── */}
        <TopBar />

        {/* PAGE CONTENT */}
        <main
          style={{
            flex:          1,
            overflowY:     "auto",
            overflowX:     "hidden",
            padding:       0,
            position:      "relative",
            paddingBottom: isMobile
              ? "calc(var(--player-h, 72px) + 56px)"
              : 0,
          }}
        >
          <Outlet />
        </main>

        {/* NOW PLAYING BAR ──────────────────────────────────────────────
            Desktop/Tablet : bottom of flex column, standard bar
            Mobile         : fixed, floats above BottomNav (handled
                             inside NowPlayingBar itself)
        ─────────────────────────────────────────────────────────────── */}
        <NowPlayingBar isMobile={isMobile} />
      </div>

      {/* ── MOBILE BOTTOM NAV ──────────────────────────────────────────── */}
      {isMobile && (
        <BottomNav onProfileOpen={() => setShowProfile(true)} />
      )}

      {/* ── MOBILE PROFILE SHEET ───────────────────────────────────────── */}
      {isMobile && showProfile && (
        <ProfileSheet onClose={() => setShowProfile(false)} />
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
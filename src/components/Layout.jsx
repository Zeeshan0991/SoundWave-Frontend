// src/components/Layout.jsx
import { useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar       from "./Sidebar";
import TopBar        from "./TopBar";
import NowPlayingBar from "./NowPlayingBar";
import AIQueueContinuation from "./AIQueueContinuation";

export default function Layout() {
  const location  = useLocation();
  const scrollRef = useRef(null);

  /* Scroll to top on route change */
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [location.pathname]);

  return (
    <div style={{
      display:       "flex",
      flexDirection: "column",
      height:        "100vh",
      overflow:      "hidden",
      background:    "var(--bg-void)",
    }}>

      {/* ── Top section: sidebar + main ─────────────────── */}
      <div style={{
        display:   "flex",
        flex:      1,
        overflow:  "hidden",
        minHeight: 0,
      }}>

        {/* Sidebar */}
        <Sidebar />

        {/* Main content column */}
        <div style={{
          flex:          1,
          display:       "flex",
          flexDirection: "column",
          overflow:      "hidden",
          minWidth:      0,
          background:    "var(--bg-deep)",
          position:      "relative",
        }}>
          {/* TopBar — sticky inside this column */}
          <TopBar />

          {/* Scrollable page content */}
          <div
            ref={scrollRef}
            style={{
              flex:      1,
              overflowY: "auto",
              overflowX: "hidden",
            }}
          >
            {/* Subtle cyan glow behind content */}
            <div style={{
              position:      "absolute",
              top:           0,
              left:          0,
              right:         0,
              height:        "320px",
              background:    "radial-gradient(ellipse 80% 300px at 50% 0%, rgba(0,212,255,0.04) 0%, transparent 100%)",
              pointerEvents: "none",
              zIndex:        0,
            }} />

            <div style={{ position: "relative", zIndex: 1, minHeight: "100%" }}>
              <Outlet />
            </div>
          </div>
        </div>
      </div>

      {/* ── Player bar — always at bottom ───────────────── */}
      <AIQueueContinuation />
      <NowPlayingBar />
    </div>
  );
}
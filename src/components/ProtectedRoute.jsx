// src/components/ProtectedRoute.jsx
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ artistOnly = false, children }) {
  const { loading, isAuthenticated, isArtist } = useAuth();

  // PHASE 7: removed `useLocation` — we no longer pass `state.from` to /auth.
  // Previously: <Navigate to="/auth" state={{ from: location.pathname, redirected: true }} />
  // That let AuthPage restore the last route after login, sending users back to
  // Library / My Music instead of always landing on /home.
  // Fix: pass no state — AuthPage has nothing to restore, so it always redirects to /home.

  if (loading) return <AppLoader />;

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (artistOnly && !isArtist) {
    return <Navigate to="/home" replace />;
  }

  if (children) return children;
  return <Outlet />;
}

/* ─────────────────────────────────────────────────────────
   APP LOADER
   ✅ FIX — hardcoded fallback colors so loader renders
   even before CSS variables are defined
───────────────────────────────────────────────────────── */
function AppLoader() {
  return (
    <div style={{
      position:        "fixed",
      inset:           0,
      background:      "#020408",
      display:         "flex",
      flexDirection:   "column",
      alignItems:      "center",
      justifyContent:  "center",
      gap:             "24px",
      zIndex:          9999,
    }}>
      {/* Logo mark */}
      <div style={{ animation: "pulseGlow 2s ease-in-out infinite" }}>
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="22"
            stroke="#00d4ff" strokeWidth="1.5" strokeOpacity="0.4" />
          <path d="M12 24 Q18 12, 24 24 Q30 36, 36 24"
            stroke="#00d4ff" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <circle cx="24" cy="24" r="4" fill="#00d4ff" />
        </svg>
      </div>

      {/* Spinner */}
      <div style={{
        width:        "36px",
        height:       "36px",
        borderRadius: "50%",
        border:       "2px solid #131b2b",
        borderTop:    "2px solid #00d4ff",
        animation:    "spinSlow 0.8s linear infinite",
      }} />

      {/* App name */}
      <p style={{
        fontFamily:    "'Inter', system-ui, sans-serif",
        fontSize:      "12px",
        fontWeight:    "600",
        letterSpacing: "2.5px",
        textTransform: "uppercase",
        color:         "#4a5468",
      }}>
        SOUNDWAVE
      </p>
    </div>
  );
}
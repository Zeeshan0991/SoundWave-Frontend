// src/components/ThemeToggle.jsx
import { useTheme } from "../context/ThemeContext";

/**
 * ThemeToggle — elegant animated sun/moon button.
 * Pass size="sm" for topbar, size="md" (default) for landing/auth.
 */
export default function ThemeToggle({ size = "md", style = {} }) {
  const { isDark, toggleTheme } = useTheme();

  const dim = size === "sm" ? 30 : 36;

  return (
    <button
      onClick={toggleTheme}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      style={{
        width:          `${dim}px`,
        height:         `${dim}px`,
        borderRadius:   "50%",
        background:     "var(--bg-hover)",
        border:         "1px solid var(--border-subtle)",
        color:          "var(--theme-icon-color)",
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        cursor:         "pointer",
        flexShrink:     0,
        transition:     "background var(--t-fast), border-color var(--t-fast), color var(--t-fast), transform var(--t-fast)",
        ...style,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background   = "var(--bg-elevated)";
        e.currentTarget.style.borderColor  = "var(--border-medium)";
        e.currentTarget.style.color        = "var(--text-primary)";
        e.currentTarget.style.transform    = "scale(1.08)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background   = "var(--bg-hover)";
        e.currentTarget.style.borderColor  = "var(--border-subtle)";
        e.currentTarget.style.color        = "var(--theme-icon-color)";
        e.currentTarget.style.transform    = "scale(1)";
      }}
    >
      {isDark ? <SunIcon size={size === "sm" ? 14 : 16} /> : <MoonIcon size={size === "sm" ? 14 : 16} />}
    </button>
  );
}

/* ── Sun icon (shown in dark mode → click for light) ─── */
function SunIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1"  x2="12" y2="3"  />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22"  y1="4.22"  x2="5.64"  y2="5.64"  />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1"  y1="12" x2="3"  y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22"  y1="19.78" x2="5.64"  y2="18.36" />
      <line x1="18.36" y1="5.64"  x2="19.78" y2="4.22"  />
    </svg>
  );
}

/* ── Moon icon (shown in light mode → click for dark) ── */
function MoonIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z"/>
    </svg>
  );
}
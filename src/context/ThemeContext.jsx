// src/context/ThemeContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from "react";

const ThemeContext = createContext(null);

const STORAGE_KEY = "soundwave_theme";

/* ── Apply data-theme to <html> immediately (no flash) ──────────
   Called once during module evaluation — before any component
   renders — so the correct CSS variable set is active on the
   very first paint. The useEffect below keeps it in sync on
   subsequent toggles.
─────────────────────────────────────────────────────────────── */
function resolveInitialTheme() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {}
  return window.matchMedia?.("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

// Run synchronously at module load — before React renders anything.
const _initial = resolveInitialTheme();
document.documentElement.setAttribute("data-theme", _initial);

/* ════════════════════════════════════════════════════════════════
   PROVIDER
════════════════════════════════════════════════════════════════ */
export function ThemeProvider({ children }) {
  // useState initializer now simply reads the value we already
  // applied above — no re-computation, no second setAttribute needed
  // on the first render.
  const [theme, setThemeState] = useState(_initial);

  // Keep data-theme + localStorage in sync on every subsequent change.
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem(STORAGE_KEY, theme); } catch {}
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setThemeState(prev => (prev === "dark" ? "light" : "dark"));
  }, []);

  // Expose setTheme as a controlled setter so callers can't pass
  // arbitrary strings — only "light" or "dark" are accepted.
  const setTheme = useCallback((value) => {
    if (value === "light" || value === "dark") setThemeState(value);
  }, []);

  const isDark  = theme === "dark";
  const isLight = theme === "light";

  return (
    <ThemeContext.Provider value={{ theme, isDark, isLight, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
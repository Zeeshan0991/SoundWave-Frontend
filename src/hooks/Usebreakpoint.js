// src/hooks/UseBreakpoint.js
// ─────────────────────────────────────────────────────────────────────────────
// Single source of truth for responsive breakpoints across SOUNDWAVE.
//
// Breakpoints:
//   mobile  : < 640px   → bottom nav, compact player, full-screen modal
//   tablet  : 640–1023px → icon-only sidebar rail, standard player
//   desktop : ≥ 1024px  → current layout, no changes
//
// Usage:
//   const { isMobile, isTablet, isDesktop } = UseBreakpoint();
//        
// Uses ResizeObserver on window — fires synchronously on mount so there
// is no flash of wrong layout on first render.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";

const MOBILE_MAX  = 639;
const TABLET_MAX  = 1023;

function getBreakpoint(width) {
  if (width <= MOBILE_MAX)  return "mobile";
  if (width <= TABLET_MAX)  return "tablet";
  return "desktop";
}

export function useBreakpoint() {
  const [bp, setBp] = useState(() => getBreakpoint(window.innerWidth));

  useEffect(() => {
    let frame;
    const handler = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        setBp(getBreakpoint(window.innerWidth));
      });
    };
    window.addEventListener("resize", handler, { passive: true });
    // Fire once immediately in case width changed between useState init and mount
    handler();
    return () => {
      window.removeEventListener("resize", handler);
      cancelAnimationFrame(frame);
    };
  }, []);

  return {
    bp,
    isMobile:  bp === "mobile",
    isTablet:  bp === "tablet",
    isDesktop: bp === "desktop",
    // Convenience: "not desktop" = needs responsive treatment
    isNarrow:  bp === "mobile" || bp === "tablet",
  };
}

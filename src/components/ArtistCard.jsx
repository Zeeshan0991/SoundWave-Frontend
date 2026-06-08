// src/components/ArtistCard.jsx
// PHASE 2 FIX: Theme-aware avatar gradient — readable in both dark and light mode

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext"; // ✅ PHASE 2: added

export default function ArtistCard({ artist }) {
  const navigate          = useNavigate();
  const { isDark }        = useTheme(); // ✅ PHASE 2: added
  const [hovered, setHovered] = useState(false);

  const hue = [...(artist.username || "")]
    .reduce((a, c) => a + c.charCodeAt(0), 0) % 360;

  // ✅ PHASE 2: theme-aware avatar gradient lightness
  // Dark mode: dark rich tones (22%/14%) — same as before
  // Light mode: mid-bright tones (55%/45%) — visible on light backgrounds
  const gradLightnessA = isDark ? "22%" : "55%";
  const gradLightnessB = isDark ? "14%" : "45%";

  // ✅ PHASE 2: letter color — bright on dark bg, deep on light bg
  const letterColor = isDark
    ? `hsl(${hue},70%,70%)`
    : `hsl(${hue},60%,25%)`;

  return (
    <div
      onClick={() => navigate(`/artist/${artist._id}`)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        cursor:    "pointer",
        textAlign: "center",
        transform: hovered ? "translateY(-4px)" : "none",
        transition:"transform var(--t-smooth)",
      }}
    >
      {/* Avatar */}
      <div style={{
        width:         "100%",
        paddingBottom: "100%",
        borderRadius:  "50%",
        overflow:      "hidden",
        position:      "relative",
        // ✅ PHASE 2: theme-aware gradient
        background:    `linear-gradient(135deg,
          hsl(${hue},50%,${gradLightnessA}),
          hsl(${(hue + 80) % 360},42%,${gradLightnessB}))`,
        border:        `2px solid ${hovered ? "var(--cyan-border)" : "var(--border-faint)"}`,
        marginBottom:  "10px",
        boxShadow:     hovered ? `0 0 20px hsl(${hue},40%,30%)` : "none",
        transition:    "border-color var(--t-smooth), box-shadow var(--t-smooth)",
      }}>
        {artist.avatar
          ? (
            <img
              src={artist.avatar}
              alt={artist.username}
              style={{
                position:  "absolute",
                inset:     0,
                width:     "100%",
                height:    "100%",
                objectFit: "cover",
                transform: hovered ? "scale(1.06)" : "scale(1)",
                transition:"transform 0.4s ease",
              }}
            />
          ) : (
            <div style={{
              position:       "absolute",
              inset:          0,
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              fontFamily:     "var(--font-display)",
              fontWeight:     800,
              fontSize:       "clamp(20px, 4vw, 28px)",
              // ✅ PHASE 2: theme-aware letter color
              color:          letterColor,
            }}>
              {(artist.username?.[0] || "A").toUpperCase()}
            </div>
          )
        }
      </div>

      {/* Name */}
      <div className="truncate" style={{
        fontSize:   "13.5px",
        fontWeight: 600,
        color:      hovered ? "var(--cyan)" : "var(--text-primary)",
        transition: "color var(--t-fast)",
      }}>
        {artist.username}
      </div>
      <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
        Artist
      </div>
    </div>
  );
}
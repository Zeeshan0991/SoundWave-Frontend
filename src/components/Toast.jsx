// src/components/Toast.jsx
export { useToast } from "../context/ToastContext";

export function ToastMessage({ message, type = "info", onClose }) {
  const STYLES = {
    success: { color: "#06d6a0", bg: "rgba(6,214,160,0.10)",   border: "rgba(6,214,160,0.25)"  },
    error:   { color: "#ff6b6b", bg: "rgba(255,107,107,0.10)", border: "rgba(255,107,107,0.25)" },
    warning: { color: "#ffd166", bg: "rgba(255,209,102,0.10)", border: "rgba(255,209,102,0.25)" },
    info:    { color: "#00d4ff", bg: "rgba(0,212,255,0.08)",   border: "rgba(0,212,255,0.22)"   },
  };

  const ICONS = {
    success: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
    error: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    ),
    warning: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
    info: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    ),
  };

  const s = STYLES[type] || STYLES.info;

  return (
    <div
      onClick={onClose}
      style={{
        display:             "flex",
        alignItems:          "flex-start",
        gap:                 "10px",
        padding:             "13px 16px",
        borderRadius:        "12px",
        background:          s.bg,
        border:              `1px solid ${s.border}`,
        color:               s.color,
        fontSize:            "13.5px",
        fontWeight:          500,
        lineHeight:          1.45,
        maxWidth:            "360px",
        cursor:              onClose ? "pointer" : "default",
        backdropFilter:      "blur(20px)",
        WebkitBackdropFilter:"blur(20px)",
        boxShadow:           "0 8px 32px rgba(0,0,0,0.4)",
        userSelect:          "none",
        fontFamily:          "var(--font-body)",
      }}
    >
      <span style={{ flexShrink: 0, marginTop: "1px" }}>
        {ICONS[type]}
      </span>

      <span style={{ flex: 1, color: "var(--text-primary)" }}>
        {message}
      </span>

      {onClose && (
        <span
          style={{
            flexShrink: 0,
            opacity:    0.45,
            fontSize:   "17px",
            lineHeight: 1,
            marginTop:  "-1px",
            transition: "opacity 0.12s",
            color:      "var(--text-secondary)",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = 0.45)}
        >
          ×
        </span>
      )}
    </div>
  );
}
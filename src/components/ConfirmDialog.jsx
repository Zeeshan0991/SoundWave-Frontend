import { useEffect } from "react";

/**
 * ConfirmDialog
 *
 * A clean modal dialog — NO background blur, just a dark overlay.
 *
 * Props:
 *  title       {string}    — dialog heading
 *  message     {string}    — body text / description
 *  confirmText {string}    — confirm button label  (default "Delete")
 *  cancelText  {string}    — cancel button label   (default "Cancel")
 *  variant     {string}    — "danger" | "warning" | "info"  (default "danger")
 *  onConfirm   {function}  — called when user confirms
 *  onCancel    {function}  — called when user cancels / closes
 *  loading     {boolean}   — disables buttons and shows spinner on confirm
 */
export default function ConfirmDialog({
  title       = "Are you sure?",
  message     = "This action cannot be undone.",
  confirmText = "Delete",
  cancelText  = "Cancel",
  variant     = "danger",
  onConfirm,
  onCancel,
  loading     = false,
}) {
  /* Close on Escape key */
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onCancel?.(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onCancel]);

  /* Prevent body scroll while open */
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const VARIANT = {
    danger:  {
      icon:        <TrashIcon />,
      iconBg:      "rgba(255,107,107,0.12)",
      iconBorder:  "rgba(255,107,107,0.25)",
      iconColor:   "var(--coral)",
      btnBg:       "rgba(255,107,107,0.15)",
      btnBorder:   "rgba(255,107,107,0.35)",
      btnColor:    "var(--coral)",
      btnHoverBg:  "rgba(255,107,107,0.25)",
    },
    warning: {
      icon:        <WarnIcon />,
      iconBg:      "rgba(255,209,102,0.12)",
      iconBorder:  "rgba(255,209,102,0.25)",
      iconColor:   "var(--gold)",
      btnBg:       "rgba(255,209,102,0.12)",
      btnBorder:   "rgba(255,209,102,0.3)",
      btnColor:    "var(--gold)",
      btnHoverBg:  "rgba(255,209,102,0.22)",
    },
    info: {
      icon:        <InfoIcon />,
      iconBg:      "var(--cyan-dim)",
      iconBorder:  "var(--cyan-border)",
      iconColor:   "var(--cyan)",
      btnBg:       "var(--cyan-dim)",
      btnBorder:   "var(--cyan-border)",
      btnColor:    "var(--cyan)",
      btnHoverBg:  "rgba(0,212,255,0.18)",
    },
  }[variant] || {};

  return (
    /* ── Overlay — dark, no blur ──────────────────────────── */
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onCancel?.(); }}
      style={{
        position:       "fixed",
        inset:          0,
        background:     "rgba(2, 4, 8, 0.82)",
        zIndex:         1000,
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        padding:        "20px",
        animation:      "fadeIn 0.18s ease both",
      }}
    >
      {/* ── Dialog box ──────────────────────────────────── */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background:   "var(--bg-elevated)",
          border:       "1px solid var(--border-subtle)",
          borderRadius: "20px",
          padding:      "32px",
          width:        "100%",
          maxWidth:     "400px",
          boxShadow:    "0 24px 80px rgba(0,0,0,0.7)",
          animation:    "scaleIn 0.22s var(--ease-spring) both",
          position:     "relative",
        }}
      >
        {/* Close × button top-right */}
        <button
          onClick={onCancel}
          disabled={loading}
          style={{
            position:       "absolute",
            top:            "16px",
            right:          "16px",
            width:          "28px",
            height:         "28px",
            borderRadius:   "50%",
            background:     "none",
            border:         "1px solid var(--border-faint)",
            color:          "var(--text-muted)",
            fontSize:       "17px",
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            cursor:         loading ? "not-allowed" : "pointer",
            lineHeight:     1,
            transition:     "all var(--t-fast)",
            opacity:        loading ? 0.4 : 1,
          }}
          onMouseEnter={e => {
            if (!loading) {
              e.currentTarget.style.background   = "var(--bg-hover)";
              e.currentTarget.style.borderColor  = "var(--border-medium)";
              e.currentTarget.style.color        = "var(--text-primary)";
            }
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background  = "none";
            e.currentTarget.style.borderColor = "var(--border-faint)";
            e.currentTarget.style.color       = "var(--text-muted)";
          }}
        >
          ×
        </button>

        {/* Icon */}
        <div style={{
          width:          "52px",
          height:         "52px",
          borderRadius:   "14px",
          background:     VARIANT.iconBg,
          border:         `1px solid ${VARIANT.iconBorder}`,
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          color:          VARIANT.iconColor,
          marginBottom:   "20px",
        }}>
          {VARIANT.icon}
        </div>

        {/* Title */}
        <h2 style={{
          fontFamily:   "var(--font-display)",
          fontSize:     "19px",
          fontWeight:   700,
          color:        "var(--text-primary)",
          marginBottom: "10px",
          lineHeight:   1.2,
          paddingRight: "32px",
        }}>
          {title}
        </h2>

        {/* Message */}
        <p style={{
          fontSize:     "14px",
          color:        "var(--text-secondary)",
          lineHeight:   1.7,
          marginBottom: "28px",
          fontWeight:   300,
        }}>
          {message}
        </p>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: "10px" }}>

          {/* Cancel */}
          <button
            onClick={onCancel}
            disabled={loading}
            style={{
              flex:         1,
              padding:      "11px",
              borderRadius: "10px",
              background:   "var(--bg-hover)",
              border:       "1px solid var(--border-subtle)",
              color:        "var(--text-secondary)",
              fontSize:     "14px",
              fontWeight:   600,
              cursor:       loading ? "not-allowed" : "pointer",
              transition:   "all var(--t-fast)",
              opacity:      loading ? 0.5 : 1,
              fontFamily:   "var(--font-body)",
            }}
            onMouseEnter={e => {
              if (!loading) {
                e.currentTarget.style.background   = "var(--bg-raised)";
                e.currentTarget.style.borderColor  = "var(--border-medium)";
                e.currentTarget.style.color        = "var(--text-primary)";
              }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background  = "var(--bg-hover)";
              e.currentTarget.style.borderColor = "var(--border-subtle)";
              e.currentTarget.style.color       = "var(--text-secondary)";
            }}
          >
            {cancelText}
          </button>

          {/* Confirm */}
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              flex:         1,
              padding:      "11px",
              borderRadius: "10px",
              background:   VARIANT.btnBg,
              border:       `1px solid ${VARIANT.btnBorder}`,
              color:        VARIANT.btnColor,
              fontSize:     "14px",
              fontWeight:   700,
              cursor:       loading ? "not-allowed" : "pointer",
              transition:   "all var(--t-fast)",
              display:      "flex",
              alignItems:   "center",
              justifyContent: "center",
              gap:          "8px",
              fontFamily:   "var(--font-body)",
            }}
            onMouseEnter={e => {
              if (!loading) e.currentTarget.style.background = VARIANT.btnHoverBg;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = VARIANT.btnBg;
            }}
          >
            {loading ? (
              <>
                <span style={{
                  width:        "14px",
                  height:       "14px",
                  borderRadius: "50%",
                  border:       `2px solid ${VARIANT.btnColor}40`,
                  borderTop:    `2px solid ${VARIANT.btnColor}`,
                  animation:    "spinSlow 0.7s linear infinite",
                  display:      "inline-block",
                  flexShrink:   0,
                }} />
                Working…
              </>
            ) : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Icons ────────────────────────────────────────────────────── */
function TrashIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
    </svg>
  );
}

function WarnIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9"  x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8"  x2="12.01" y2="8" />
    </svg>
  );
}
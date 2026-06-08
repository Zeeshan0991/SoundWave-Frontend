// src/context/ToastContext.jsx
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
} from "react";

const ToastContext = createContext(null);

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
};

let _id = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)),
    );
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 300);
    clearTimeout(timers.current[id]);
    delete timers.current[id];
  }, []);

  const show = useCallback(
    (message, type = "info", duration = 3500) => {
      const id = ++_id;
      setToasts((prev) => [...prev, { id, message, type, leaving: false }]);
      timers.current[id] = setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss],
  );

  const success = useCallback((msg, dur) => show(msg, "success", dur), [show]);
  const error = useCallback((msg, dur) => show(msg, "error", dur), [show]);
  const info = useCallback((msg, dur) => show(msg, "info", dur), [show]);
  const warning = useCallback((msg, dur) => show(msg, "warning", dur), [show]);

  return (
    <ToastContext.Provider
      value={{ show, success, error, info, warning, dismiss }}
    >
      {children}
      <ToastRenderer toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  );
}

const ICONS = {
  success: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  error: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  warning: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  info: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
};

const STYLES = {
  success: {
    color: "#06d6a0",
    bg: "rgba(6,214,160,0.10)",
    border: "rgba(6,214,160,0.25)",
  },
  error: {
    color: "#ff6b6b",
    bg: "rgba(255,107,107,0.10)",
    border: "rgba(255,107,107,0.25)",
  },
  warning: {
    color: "#ffd166",
    bg: "rgba(255,209,102,0.10)",
    border: "rgba(255,209,102,0.25)",
  },
  info: {
    color: "#00d4ff",
    bg: "rgba(0,212,255,0.08)",
    border: "rgba(0,212,255,0.22)",
  },
};

function ToastRenderer({ toasts, dismiss }) {
  return (
    <div className="toast-container">
      {toasts.map((t) => {
        const s = STYLES[t.type] || STYLES.info;
        return (
          <div
            key={t.id}
            onClick={() => dismiss(t.id)}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
              padding: "13px 16px",
              borderRadius: "12px",
              background: s.bg,
              border: `1px solid ${s.border}`,
              color: s.color,
              fontSize: "13.5px",
              fontWeight: 500,
              lineHeight: 1.45,
              maxWidth: "360px",
              cursor: "pointer",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
              pointerEvents: "all",
              userSelect: "none",
              animation: t.leaving
                ? "toastOut 0.28s ease forwards"
                : "toastIn 0.28s ease both",
              willChange: "transform, opacity",
            }}
          >
            <span style={{ flexShrink: 0, marginTop: "1px" }}>
              {ICONS[t.type]}
            </span>
            <span style={{ flex: 1, color: "var(--text-primary)" }}>
              {t.message}
            </span>
            <span
              style={{
                flexShrink: 0,
                opacity: 0.5,
                fontSize: "16px",
                lineHeight: 1,
                marginTop: "-1px",
                transition: "opacity 0.12s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = 0.5)}
            >
              ×
            </span>
          </div>
        );
      })}
      <style>{`
        @keyframes toastIn  { from { opacity:0; transform:translateX(24px) scale(0.95); } to { opacity:1; transform:translateX(0) scale(1); } }
        @keyframes toastOut { from { opacity:1; transform:translateX(0) scale(1); } to { opacity:0; transform:translateX(24px) scale(0.95); } }
      `}</style>
    </div>
  );
}

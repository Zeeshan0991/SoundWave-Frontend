import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

/* ─────────────────────────────────────────────────────────────────────
   Framer Motion — imported with a silent fallback
───────────────────────────────────────────────────────────────────── */
let motion, AnimatePresence;
try {
  const fm = await import("framer-motion");
  motion = fm.motion;
  AnimatePresence = fm.AnimatePresence;
} catch {
  const makeMotion = (tag) => {
    const C = ({ children, style, className, onClick, onMouseEnter, onMouseLeave, ...rest }) => {
      const Tag = tag;
      const {
        initial, animate, exit, variants, transition,
        whileHover, whileTap, whileFocus, layout,
        layoutId, ...domRest
      } = rest;
      return (
        <Tag style={style} className={className} onClick={onClick}
          onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} {...domRest}>
          {children}
        </Tag>
      );
    };
    C.displayName = `motion.${tag}`;
    return C;
  };
  motion = new Proxy({}, { get: (_, tag) => makeMotion(tag) });
  AnimatePresence = ({ children }) => <>{children}</>;
}

/* ── Field-specific error messages ──────────────────────────────────── */
const ERROR_MESSAGES = {
  identifier: {
    not_found_username: "No account found with that username.",
    not_found_email: "No account found with that email address.",
    not_found: "No account found with that username or email.",
    required: "Please enter your username or email.",
  },
  password: {
    incorrect: "Incorrect password. Please try again.",
    too_short: "Password must be at least 6 characters.",
    required: "Please enter your password.",
  },
  username: {
    taken: "That username is already taken.",
    invalid: "Username can only contain letters, numbers, and underscores.",
    required: "Please choose a username.",
  },
  email: {
    taken: "An account with that email already exists.",
    invalid: "Please enter a valid email address.",
    required: "Please enter your email address.",
  },
  general: "Something went wrong. Please try again.",
};

/* ── Helpers ─────────────────────────────────────────────────────────── */
const isEmail = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
const API_BASE = () => import.meta.env.VITE_API_URL || "http://localhost:5000/api";

function validate(mode, fields) {
  const errors = {};
  if (mode === "login") {
    if (!fields.identifier.trim()) errors.identifier = ERROR_MESSAGES.identifier.required;
    if (!fields.password) errors.password = ERROR_MESSAGES.password.required;
  }
  if (mode === "signup") {
    if (!fields.username.trim())
      errors.username = ERROR_MESSAGES.username.required;
    else if (!/^[a-zA-Z0-9_]+$/.test(fields.username))
      errors.username = ERROR_MESSAGES.username.invalid;
    if (!fields.email.trim())
      errors.email = ERROR_MESSAGES.email.required;
    else if (!isEmail(fields.email))
      errors.email = ERROR_MESSAGES.email.invalid;
    if (!fields.password)
      errors.password = ERROR_MESSAGES.password.required;
    else if (fields.password.length < 6)
      errors.password = ERROR_MESSAGES.password.too_short;
  }
  return errors;
}

/* ══════════════════════════════════════════════════════════════════════
   AVAILABILITY BADGE  (unchanged)
══════════════════════════════════════════════════════════════════════ */
function AvailabilityBadge({ status }) {
  if (!status) return null;
  const config = {
    checking: { color: "var(--text-muted)", icon: null, text: "Checking…", spin: true },
    available: { color: "#06d6a0", icon: "✓", text: "Available", spin: false },
    taken: { color: "var(--coral)", icon: "✗", text: "Already taken", spin: false },
  }[status];
  if (!config) return null;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "5px",
      fontSize: "12px", fontWeight: 500, color: config.color,
      marginTop: "1px", animation: "fadeIn 0.15s ease both",
    }}>
      {config.spin ? (
        <span style={{
          width: "10px", height: "10px", borderRadius: "50%",
          border: "1.5px solid var(--border-subtle)",
          borderTop: "1.5px solid var(--text-muted)",
          display: "inline-block",
          animation: "spinSlow 0.7s linear infinite", flexShrink: 0,
        }} />
      ) : (
        <span style={{ fontSize: "11px", fontWeight: 700 }}>{config.icon}</span>
      )}
      {config.text}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   EMAIL OTP MODAL  (unchanged)
══════════════════════════════════════════════════════════════════════ */
function EmailOTPModal({ email, devOtp: initialDevOtp, onVerified, onClose }) {
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [resending, setResending] = useState(false);
  const [resendCool, setResendCool] = useState(30);
  const [devOtp, setDevOtp] = useState(initialDevOtp || "");
  const inputRefs = useRef([]);

  useEffect(() => {
    if (resendCool <= 0) return;
    const t = setInterval(() => {
      setResendCool(s => { if (s <= 1) { clearInterval(t); return 0; } return s - 1; });
    }, 1000);
    return () => clearInterval(t);
  }, [resendCool]);

  useEffect(() => { inputRefs.current[0]?.focus(); }, []);

  const handleDigitChange = (idx, val) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    setError("");
    const next = [...digits];
    next[idx] = digit;
    setDigits(next);
    if (digit && idx < 5) inputRefs.current[idx + 1]?.focus();
  };

  const handleDigitKeyDown = (idx, e) => {
    if (e.key === "Backspace") {
      if (digits[idx]) {
        const next = [...digits]; next[idx] = ""; setDigits(next);
      } else if (idx > 0) inputRefs.current[idx - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && idx > 0) inputRefs.current[idx - 1]?.focus();
    if (e.key === "ArrowRight" && idx < 5) inputRefs.current[idx + 1]?.focus();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const next = ["", "", "", "", "", ""];
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setDigits(next);
    setError("");
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const handleVerify = async () => {
    const code = digits.join("");
    if (code.length < 6) { setError("Please enter all 6 digits."); return; }
    setSubmitting(true); setError("");
    try {
      const res = await fetch(`${API_BASE()}/auth/verify-otp`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim().toLowerCase(), otp: code }),
      });
      const data = await res.json();
      if (res.ok && data.verified) {
        onVerified();
      } else if (data.field === "expired") {
        setError(data.message || "Code expired. Please request a new one.");
        setDigits(["", "", "", "", "", ""]); inputRefs.current[0]?.focus();
      } else {
        setError(data.message || "Incorrect code. Please try again.");
        setDigits(["", "", "", "", "", ""]); inputRefs.current[0]?.focus();
      }
    } catch { setError("Network error. Please try again."); }
    setSubmitting(false);
  };

  const handleResend = async () => {
    if (resendCool > 0 || resending) return;
    setResending(true); setError(""); setDigits(["", "", "", "", "", ""]);
    try {
      const res = await fetch(`${API_BASE()}/auth/send-otp`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (res.ok) {
        setDevOtp(data.devOtp || ""); setResendCool(30); inputRefs.current[0]?.focus();
      } else if (data.field === "email") {
        setError("This email was just registered by another account.");
      } else {
        setError(data.message || "Failed to resend code. Please try again.");
      }
    } catch { setError("Network error. Please try again."); }
    setResending(false);
  };

  const codeComplete = digits.every(d => d !== "");

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 10000,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "24px",
      background: "rgba(0,0,0,0.87)",
      backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
      animation: "fadeIn 0.2s ease both",
    }}>
      <div style={{
        width: "100%", maxWidth: "420px",
        background: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "20px", padding: "36px 32px 32px",
        boxShadow: "0 32px 80px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.03)",
        animation: "fadeUp 0.28s ease both", position: "relative",
      }}>
        <button onClick={onClose} style={{
          position: "absolute", top: "16px", right: "16px",
          width: "28px", height: "28px", borderRadius: "8px",
          background: "var(--bg-deep)", border: "1px solid var(--border-faint)",
          color: "var(--text-muted)", cursor: "pointer", fontSize: "14px",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all var(--t-fast)",
        }}
          onMouseEnter={e => { e.currentTarget.style.color = "var(--text-primary)"; e.currentTarget.style.borderColor = "var(--border-subtle)"; }}
          onMouseLeave={e => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.borderColor = "var(--border-faint)"; }}
        >✕</button>

        <div style={{
          width: "52px", height: "52px", borderRadius: "15px",
          background: "rgba(0,212,255,0.08)", border: "1px solid rgba(0,212,255,0.20)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "24px", marginBottom: "22px",
        }}>✉️</div>

        <h3 style={{
          fontFamily: "var(--font-display)", fontSize: "20px", fontWeight: 800,
          letterSpacing: "-0.5px", color: "var(--text-primary)", marginBottom: "8px",
        }}>Verify your email</h3>
        <p style={{ fontSize: "13.5px", color: "var(--text-secondary)", lineHeight: 1.65, marginBottom: "24px" }}>
          We sent a 6-digit verification code to{" "}
          <strong style={{ color: "var(--text-primary)" }}>{email}</strong>.
        </p>

        {devOtp && (
          <div style={{
            padding: "10px 14px", background: "rgba(255,209,102,0.07)",
            border: "1px solid rgba(255,209,102,0.25)",
            borderRadius: "10px", marginBottom: "20px",
            display: "flex", alignItems: "center", gap: "10px",
          }}>
            <span style={{ fontSize: "13px" }}>🛠</span>
            <div>
              <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase", color: "rgba(255,209,102,0.75)", marginBottom: "2px" }}>
                Dev mode — no email sent
              </div>
              <div style={{ fontSize: "14px", fontWeight: 700, letterSpacing: "6px", color: "rgba(255,209,102,0.95)", fontFamily: "monospace" }}>
                {devOtp}
              </div>
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginBottom: "20px" }}>
          {digits.map((d, i) => (
            <input key={i} ref={el => inputRefs.current[i] = el}
              type="text" inputMode="numeric" pattern="[0-9]*" maxLength={1}
              value={d}
              onChange={e => handleDigitChange(i, e.target.value)}
              onKeyDown={e => handleDigitKeyDown(i, e)}
              onPaste={i === 0 ? handlePaste : undefined}
              style={{
                width: "48px", height: "56px",
                textAlign: "center", fontSize: "22px", fontWeight: 700,
                fontFamily: "var(--font-display)",
                background: d ? "var(--bg-elevated)" : "var(--bg-surface)",
                border: `1.5px solid ${error ? "rgba(255,107,107,0.5)" : d ? "var(--cyan-border)" : "var(--border-subtle)"}`,
                borderRadius: "12px", color: "var(--text-primary)",
                outline: "none", transition: "all 0.15s ease", caretColor: "var(--cyan)",
              }}
              onFocus={e => {
                e.target.style.borderColor = error ? "rgba(255,107,107,0.6)" : "var(--cyan-border)";
                e.target.style.boxShadow = error ? "0 0 0 3px rgba(255,107,107,0.07)" : "0 0 0 3px rgba(0,212,255,0.08)";
                e.target.style.background = "var(--bg-elevated)";
              }}
              onBlur={e => {
                e.target.style.borderColor = error ? "rgba(255,107,107,0.4)" : d ? "var(--cyan-border)" : "var(--border-subtle)";
                e.target.style.boxShadow = "none";
                e.target.style.background = d ? "var(--bg-elevated)" : "var(--bg-surface)";
              }}
            />
          ))}
        </div>

        {error && (
          <div style={{
            padding: "10px 14px", background: "var(--coral-dim)",
            border: "1px solid rgba(255,107,107,0.3)", borderRadius: "10px",
            fontSize: "13px", color: "var(--coral)", marginBottom: "16px",
            display: "flex", alignItems: "center", gap: "7px",
            animation: "fadeIn 0.15s ease both",
          }}>
            <span>⚠</span> {error}
          </div>
        )}

        <button type="button" onClick={handleVerify} disabled={submitting || !codeComplete}
          className="btn-primary"
          style={{
            width: "100%", padding: "13px", fontSize: "14.5px", marginBottom: "16px",
            opacity: (submitting || !codeComplete) ? 0.6 : 1,
            cursor: (submitting || !codeComplete) ? "not-allowed" : "pointer",
          }}>
          {submitting ? (
            <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
              <span style={{
                width: "15px", height: "15px", borderRadius: "50%",
                border: "2px solid rgba(255,255,255,0.3)", borderTop: "2px solid #fff",
                animation: "spinSlow 0.7s linear infinite", display: "inline-block",
              }} />
              Verifying…
            </span>
          ) : "Verify & Create Account"}
        </button>

        <p style={{ textAlign: "center", fontSize: "13px", color: "var(--text-muted)" }}>
          Didn't get a code?{" "}
          {resendCool > 0 ? (
            <span style={{ color: "var(--text-muted)" }}>Resend in {resendCool}s</span>
          ) : (
            <button type="button" onClick={handleResend} disabled={resending} style={{
              color: resending ? "var(--text-muted)" : "var(--cyan)",
              fontWeight: 600, background: "none", border: "none",
              cursor: resending ? "not-allowed" : "pointer",
              transition: "color var(--t-fast)",
            }}>{resending ? "Sending…" : "Resend code"}</button>
          )}
        </p>
        <p style={{ textAlign: "center", fontSize: "12px", color: "var(--text-muted)", marginTop: "10px" }}>
          Wrong email?{" "}
          <button type="button" onClick={onClose} style={{
            color: "var(--cyan)", fontWeight: 600, background: "none", border: "none", cursor: "pointer",
          }}>Go back</button>
        </p>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   ROLE SELECTION MODAL  (unchanged)
══════════════════════════════════════════════════════════════════════ */
function RoleSelectionModal({ onConfirm }) {
  const [selectedRole, setSelectedRole] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleConfirm = async () => {
    if (!selectedRole) { setError("Please select how you'd like to use SOUNDWAVE."); return; }
    setSubmitting(true); setError("");
    const result = await onConfirm(selectedRole === "listener" ? "user" : "artist");
    if (!result.success) { setError(result.message || "Something went wrong."); setSubmitting(false); }
  };

  const roles = [
    {
      value: "listener", label: "Listener", icon: "🎧", heading: "I'm here to listen",
      desc: "Discover new music, build playlists, follow artists, and stream anything you love.",
      accent: "#00d4ff", dimBg: "rgba(0,212,255,0.06)", dimBorder: "rgba(0,212,255,0.22)"
    },
    {
      value: "artist", label: "Artist", icon: "🎤", heading: "I'm here to create",
      desc: "Upload your tracks, grow your fanbase, and share your sound with the world.",
      accent: "#7b5ea7", dimBg: "rgba(123,94,167,0.07)", dimBorder: "rgba(123,94,167,0.28)"
    },
  ];

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      display: "flex", alignItems: "center", justifyContent: "center", padding: "24px",
      background: "rgba(0,0,0,0.82)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
      animation: "fadeIn 0.25s ease both",
    }}>
      <div style={{
        width: "100%", maxWidth: "480px", background: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)", borderRadius: "20px", padding: "40px 36px 36px",
        boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
        animation: "fadeUp 0.3s ease both", position: "relative", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: "-60px", left: "50%", transform: "translateX(-50%)",
          width: "280px", height: "140px", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(0,212,255,0.10), transparent 70%)",
          filter: "blur(30px)", pointerEvents: "none",
        }} />
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px" }}>
          <LogoMark size={36} />
        </div>
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <h2 style={{
            fontFamily: "var(--font-display)", fontSize: "22px", fontWeight: 800,
            letterSpacing: "-0.6px", marginBottom: "8px", color: "var(--text-primary)",
          }}>One last step</h2>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.65 }}>
            How will you be using SOUNDWAVE?<br />You can always change this later.
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
          {roles.map((r) => {
            const active = selectedRole === r.value;
            return (
              <button key={r.value} type="button"
                onClick={() => { setSelectedRole(r.value); setError(""); }}
                style={{
                  padding: "20px 16px", borderRadius: "14px", position: "relative",
                  border: `1.5px solid ${active ? r.dimBorder : "var(--border-faint)"}`,
                  background: active ? r.dimBg : "var(--bg-deep)",
                  textAlign: "left", cursor: "pointer",
                  transition: "all 0.18s ease", outline: "none",
                  boxShadow: active ? `0 0 0 3px ${r.accent}18` : "none",
                  transform: active ? "translateY(-1px)" : "none",
                }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.borderColor = r.dimBorder; e.currentTarget.style.background = r.dimBg; } }}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.borderColor = "var(--border-faint)"; e.currentTarget.style.background = "var(--bg-deep)"; } }}
              >
                <div style={{ fontSize: "26px", marginBottom: "10px", lineHeight: 1 }}>{r.icon}</div>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "14px", color: active ? r.accent : "var(--text-primary)", marginBottom: "5px", transition: "color 0.18s ease" }}>{r.label}</div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", lineHeight: 1.55 }}>{r.desc}</div>
                {active && (
                  <div style={{
                    position: "absolute", top: "10px", right: "10px",
                    width: "18px", height: "18px", borderRadius: "50%",
                    background: r.accent, display: "flex", alignItems: "center",
                    justifyContent: "center", fontSize: "10px", color: "#000",
                    fontWeight: 800, animation: "fadeIn 0.15s ease",
                  }}>✓</div>
                )}
              </button>
            );
          })}
        </div>
        {error && (
          <div style={{
            padding: "10px 14px", background: "var(--coral-dim)",
            border: "1px solid rgba(255,107,107,0.3)", borderRadius: "10px",
            fontSize: "13px", color: "var(--coral)", marginBottom: "16px",
            display: "flex", alignItems: "center", gap: "7px",
          }}><span>⚠</span> {error}</div>
        )}
        <button type="button" onClick={handleConfirm} disabled={submitting}
          className="btn-primary"
          style={{ width: "100%", padding: "13px", fontSize: "14.5px", opacity: submitting ? 0.7 : 1, cursor: submitting ? "not-allowed" : "pointer" }}>
          {submitting ? (
            <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
              <span style={{ width: "15px", height: "15px", borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTop: "2px solid #fff", animation: "spinSlow 0.7s linear infinite", display: "inline-block" }} />
              Setting up your account…
            </span>
          ) : `Continue as ${selectedRole ? (selectedRole === "listener" ? "Listener" : "Artist") : "…"}`}
        </button>
        <p style={{ textAlign: "center", fontSize: "11.5px", color: "var(--text-muted)", marginTop: "14px", lineHeight: 1.6 }}>
          Your choice determines your dashboard experience.
        </p>
      </div>
      <style>{`
        @keyframes fadeIn  { from { opacity: 0 }              to { opacity: 1 } }
        @keyframes fadeUp  { from { opacity: 0; transform: translateY(16px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes spinSlow { to { transform: rotate(360deg) } }
      `}</style>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   CREATE PASSWORD MODAL  (unchanged)
══════════════════════════════════════════════════════════════════════ */
function CreatePasswordModal({ identifier, onConfirm, onClose }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!newPassword) { setError("Please enter a new password."); return; }
    if (newPassword.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (newPassword !== confirmPass) { setError("Passwords do not match."); return; }
    setSubmitting(true); setError("");
    const result = await onConfirm(newPassword);
    if (!result.success) { setError(result.message || "Something went wrong."); setSubmitting(false); }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 10000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: "24px",
      background: "rgba(0,0,0,0.85)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
      animation: "fadeIn 0.2s ease both",
    }}>
      <div style={{
        width: "100%", maxWidth: "420px", background: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)", borderRadius: "20px", padding: "36px 32px 32px",
        boxShadow: "0 32px 80px rgba(0,0,0,0.65)", animation: "fadeUp 0.28s ease both", position: "relative",
      }}>
        <button onClick={onClose} style={{
          position: "absolute", top: "16px", right: "16px", width: "28px", height: "28px",
          borderRadius: "8px", background: "var(--bg-deep)", border: "1px solid var(--border-faint)",
          color: "var(--text-muted)", cursor: "pointer", fontSize: "14px",
          display: "flex", alignItems: "center", justifyContent: "center", transition: "all var(--t-fast)",
        }}
          onMouseEnter={e => { e.currentTarget.style.color = "var(--text-primary)"; e.currentTarget.style.borderColor = "var(--border-subtle)"; }}
          onMouseLeave={e => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.borderColor = "var(--border-faint)"; }}
        >✕</button>
        <div style={{
          width: "48px", height: "48px", borderRadius: "14px",
          background: "rgba(0,212,255,0.08)", border: "1px solid rgba(0,212,255,0.18)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "22px", marginBottom: "20px",
        }}>🔑</div>
        <h3 style={{ fontFamily: "var(--font-display)", fontSize: "20px", fontWeight: 800, letterSpacing: "-0.5px", color: "var(--text-primary)", marginBottom: "8px" }}>Create a password</h3>
        <p style={{ fontSize: "13.5px", color: "var(--text-secondary)", lineHeight: 1.65, marginBottom: "24px" }}>
          Add a password to your account. You'll be able to sign in with either your password <em>or</em> Google.
        </p>
        <div style={{ padding: "10px 14px", background: "var(--bg-deep)", border: "1px solid var(--border-faint)", borderRadius: "10px", fontSize: "13px", color: "var(--text-secondary)", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>Account:</span>
          <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{identifier}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "16px" }}>
          <FormField label="New Password" type={showPass ? "text" : "password"} value={newPassword}
            onChange={e => { setNewPassword(e.target.value); setError(""); }}
            placeholder="At least 6 characters" autoFocus
            rightSlot={<EyeToggle show={showPass} onToggle={() => setShowPass(s => !s)} />}
          />
          {newPassword && <PasswordStrength password={newPassword} />}
          <FormField label="Confirm Password" type={showPass ? "text" : "password"} value={confirmPass}
            onChange={e => { setConfirmPass(e.target.value); setError(""); }}
            placeholder="Repeat your password"
          />
        </div>
        {error && (
          <div style={{ padding: "10px 14px", background: "var(--coral-dim)", border: "1px solid rgba(255,107,107,0.3)", borderRadius: "10px", fontSize: "13px", color: "var(--coral)", marginBottom: "16px", display: "flex", alignItems: "center", gap: "7px" }}>
            <span>⚠</span> {error}
          </div>
        )}
        <button type="button" onClick={handleSubmit} disabled={submitting} className="btn-primary"
          style={{ width: "100%", padding: "13px", fontSize: "14.5px", opacity: submitting ? 0.7 : 1, cursor: submitting ? "not-allowed" : "pointer" }}>
          {submitting ? (
            <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
              <span style={{ width: "15px", height: "15px", borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTop: "2px solid #fff", animation: "spinSlow 0.7s linear infinite", display: "inline-block" }} />
              Saving…
            </span>
          ) : "Create Password & Sign In"}
        </button>
        <p style={{ textAlign: "center", fontSize: "12px", color: "var(--text-muted)", marginTop: "14px", lineHeight: 1.6 }}>
          Your Google Sign-In will continue to work alongside your new password.
        </p>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   FORGOT PASSWORD MODAL  (unchanged)
══════════════════════════════════════════════════════════════════════ */
function ForgotPasswordModal({ onClose, forgotPassword }) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState("email");
  const [devToken, setDevToken] = useState("");
  const [resetUrl, setResetUrl] = useState("");

  const handleSubmit = async () => {
    setError("");
    if (!email.trim()) { setError("Please enter your email address."); return; }
    if (!isEmail(email.trim())) { setError("Please enter a valid email address."); return; }
    setSubmitting(true);
    const result = await forgotPassword(email.trim().toLowerCase());
    setSubmitting(false);
    if (!result.success && result.field !== "google_only") {
      setError(result.message || "Something went wrong."); return;
    }
    if (result.field === "google_only") { setStep("google"); return; }
    if (result.devToken) { setDevToken(result.devToken); setResetUrl(result.resetUrl || ""); }
    setStep("sent");
  };

  const handleGoogle = () => {
    const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
    window.location.href = `${apiBase}/auth/google`;
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 10000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: "24px",
      background: "rgba(0,0,0,0.85)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
      animation: "fadeIn 0.2s ease both",
    }}>
      <div style={{
        width: "100%", maxWidth: "420px", background: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)", borderRadius: "20px", padding: "36px 32px 32px",
        boxShadow: "0 32px 80px rgba(0,0,0,0.65)", animation: "fadeUp 0.28s ease both", position: "relative",
      }}>
        <button onClick={onClose} style={{
          position: "absolute", top: "16px", right: "16px", width: "28px", height: "28px",
          borderRadius: "8px", background: "var(--bg-deep)", border: "1px solid var(--border-faint)",
          color: "var(--text-muted)", cursor: "pointer", fontSize: "14px",
          display: "flex", alignItems: "center", justifyContent: "center", transition: "all var(--t-fast)",
        }}
          onMouseEnter={e => { e.currentTarget.style.color = "var(--text-primary)"; e.currentTarget.style.borderColor = "var(--border-subtle)"; }}
          onMouseLeave={e => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.borderColor = "var(--border-faint)"; }}
        >✕</button>

        {step === "email" && (
          <>
            <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: "rgba(0,212,255,0.08)", border: "1px solid rgba(0,212,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", marginBottom: "20px" }}>🔒</div>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: "20px", fontWeight: 800, letterSpacing: "-0.5px", color: "var(--text-primary)", marginBottom: "8px" }}>Forgot your password?</h3>
            <p style={{ fontSize: "13.5px", color: "var(--text-secondary)", lineHeight: 1.65, marginBottom: "24px" }}>
              Enter the email address linked to your account and we'll send you a reset link.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "16px" }}>
              <FormField label="Email Address" type="email" value={email}
                onChange={e => { setEmail(e.target.value); setError(""); }}
                placeholder="your@email.com" autoComplete="email" autoFocus
              />
            </div>
            {error && (
              <div style={{ padding: "10px 14px", background: "var(--coral-dim)", border: "1px solid rgba(255,107,107,0.3)", borderRadius: "10px", fontSize: "13px", color: "var(--coral)", marginBottom: "16px", display: "flex", alignItems: "center", gap: "7px" }}>
                <span>⚠</span> {error}
              </div>
            )}
            <button type="button" onClick={handleSubmit} disabled={submitting} className="btn-primary"
              style={{ width: "100%", padding: "13px", fontSize: "14.5px", opacity: submitting ? 0.7 : 1, cursor: submitting ? "not-allowed" : "pointer" }}>
              {submitting ? (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                  <span style={{ width: "15px", height: "15px", borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTop: "2px solid #fff", animation: "spinSlow 0.7s linear infinite", display: "inline-block" }} />
                  Sending…
                </span>
              ) : "Send Reset Link"}
            </button>
            <p style={{ textAlign: "center", fontSize: "13px", color: "var(--text-muted)", marginTop: "14px" }}>
              Remembered it?{" "}
              <button type="button" onClick={onClose} style={{ color: "var(--cyan)", fontWeight: 600, background: "none", border: "none", cursor: "pointer" }}>Back to sign in</button>
            </p>
          </>
        )}

        {step === "sent" && (
          <div style={{ textAlign: "center" }}>
            <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "rgba(6,214,160,0.10)", border: "1px solid rgba(6,214,160,0.28)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: "28px" }}>✓</div>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: "20px", fontWeight: 800, letterSpacing: "-0.5px", color: "var(--text-primary)", marginBottom: "8px" }}>Check your email</h3>
            <p style={{ fontSize: "13.5px", color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: "20px" }}>
              If <strong style={{ color: "var(--text-primary)" }}>{email}</strong> is linked to an account, you'll receive a reset link shortly.
            </p>
            {devToken && (
              <div style={{ padding: "14px 16px", background: "rgba(255,209,102,0.07)", border: "1px solid rgba(255,209,102,0.25)", borderRadius: "12px", marginBottom: "20px", textAlign: "left" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase", color: "rgba(255,209,102,0.8)", marginBottom: "8px" }}>Dev mode — reset link</div>
                <a href={resetUrl} style={{ fontSize: "12.5px", color: "var(--cyan)", wordBreak: "break-all", lineHeight: 1.6 }}>{resetUrl}</a>
              </div>
            )}
            <button type="button" onClick={onClose} className="btn-primary" style={{ width: "100%", padding: "12px", fontSize: "14px" }}>Back to Sign In</button>
          </div>
        )}

        {step === "google" && (
          <div style={{ textAlign: "center" }}>
            <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: "rgba(123,94,167,0.10)", border: "1px solid rgba(123,94,167,0.28)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: "22px" }}><GoogleIcon /></div>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: "20px", fontWeight: 800, letterSpacing: "-0.5px", color: "var(--text-primary)", marginBottom: "8px" }}>Google account detected</h3>
            <p style={{ fontSize: "13.5px", color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: "24px" }}>
              The account for <strong style={{ color: "var(--text-primary)" }}>{email}</strong> was created with Google Sign-In.
            </p>
            <button type="button" onClick={handleGoogle} className="btn-primary" style={{ width: "100%", padding: "12px", fontSize: "14px", marginBottom: "10px" }}>Continue with Google</button>
            <button type="button" onClick={onClose} style={{
              width: "100%", padding: "11px", fontSize: "13.5px", fontWeight: 600,
              background: "var(--bg-deep)", border: "1px solid var(--border-faint)",
              borderRadius: "10px", color: "var(--text-secondary)", cursor: "pointer", transition: "all var(--t-fast)",
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--border-subtle)"; e.currentTarget.style.color = "var(--text-primary)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-faint)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
            >Back to Sign In</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   3D TILT HOOK  (unchanged)
══════════════════════════════════════════════════════════════════════ */
function useTilt(strength = 6) {
  const ref = useRef(null);
  const frameId = useRef(null);

  const onMouseMove = useCallback((e) => {
    if (!ref.current) return;
    if (frameId.current) cancelAnimationFrame(frameId.current);
    frameId.current = requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / (rect.width / 2);
      const dy = (e.clientY - cy) / (rect.height / 2);
      el.style.transform = `perspective(900px) rotateY(${dx * strength}deg) rotateX(${-dy * strength * 0.6}deg) scale(1.008)`;
    });
  }, [strength]);

  const onMouseLeave = useCallback(() => {
    if (frameId.current) cancelAnimationFrame(frameId.current);
    if (ref.current) {
      ref.current.style.transition = "transform 0.55s cubic-bezier(0.23, 1, 0.32, 1)";
      ref.current.style.transform = "perspective(900px) rotateY(0deg) rotateX(0deg) scale(1)";
      setTimeout(() => {
        if (ref.current) ref.current.style.transition = "transform 0.08s ease-out";
      }, 550);
    }
  }, []);

  return { ref, onMouseMove, onMouseLeave };
}

/* ══════════════════════════════════════════════════════════════════════
   useLeftPanelParallax  (unchanged)
══════════════════════════════════════════════════════════════════════ */
function useLeftPanelParallax() {
  const panelRef = useRef(null);
  const frameRef = useRef(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const onMouseMove = useCallback((e) => {
    if (!panelRef.current) return;
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => {
      const rect = panelRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      setOffset({ x, y });
    });
  }, []);

  const onMouseLeave = useCallback(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    setOffset({ x: 0, y: 0 });
  }, []);

  return { panelRef, offset, onMouseMove, onMouseLeave };
}

/* ══════════════════════════════════════════════════════════════════════
   AUTH PAGE
══════════════════════════════════════════════════════════════════════ */
export default function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

   const {
    login, signup, isAuthenticated, pendingRoleSelect,
    confirmRole, forgotPassword, checkAvailability,
  } = useAuth();
  const toast = useToast();

  const initialMode = searchParams.get("mode") === "signup" ? "signup" : "login";
  const initialRole = searchParams.get("role") === "artist" ? "artist" : "listener";

  const [mode, setMode] = useState(initialMode);
  const [submitting, setSubmitting] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [errors, setErrors] = useState({});

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState(initialRole);
  const [signupPass, setSignupPass] = useState("");

  const [googleOnlyIdentifier, setGoogleOnlyIdentifier] = useState("");
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [usernameAvail, setUsernameAvail] = useState(null);
  const [emailAvail, setEmailAvail] = useState(null);
  const [otpStep, setOtpStep] = useState(null);
  const [otpDevCode, setOtpDevCode] = useState("");
  const [pendingSignup, setPendingSignup] = useState(null);

  const tilt = useTilt(5);
  const parallax = useLeftPanelParallax();

  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.redirected && location.state?.from
        ? location.state.from : "/home";
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location.state]);

  const switchMode = (m) => {
    setMode(m);
    setErrors({});
    setShowPass(false);
    setGoogleOnlyIdentifier("");
    setUsernameAvail(null);
    setEmailAvail(null);
    setOtpStep(null);
    setOtpDevCode("");
    setPendingSignup(null);
  };

  const handleUsernameChange = (e) => {
    const val = e.target.value;
    setUsername(val);
    setErrors(p => ({ ...p, username: "" }));
    if (!val.trim() || val.length < 2 || !/^[a-zA-Z0-9_]+$/.test(val)) {
      setUsernameAvail(null); return;
    }
    setUsernameAvail("checking");
    checkAvailability("username", val).then(({ available }) => {
      setUsername(current => {
        if (current === val) setUsernameAvail(available === true ? "available" : available === false ? "taken" : null);
        return current;
      });
    });
  };

  const handleEmailChange = (e) => {
    const val = e.target.value;
    setEmail(val);
    setErrors(p => ({ ...p, email: "" }));
    if (!val.trim() || !isEmail(val.trim())) { setEmailAvail(null); return; }
    setEmailAvail("checking");
    checkAvailability("email", val.trim().toLowerCase()).then(({ available }) => {
      setEmail(current => {
        if (current === val) setEmailAvail(available === true ? "available" : available === false ? "taken" : null);
        return current;
      });
    });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setGoogleOnlyIdentifier("");
    const fieldErrors = validate("login", { identifier, password });
    if (Object.keys(fieldErrors).length) { setErrors(fieldErrors); return; }
    setSubmitting(true); setErrors({});
    const result = await login({ identifier, password });
    if (result.success) {
      toast.success("Welcome back!");
    } else if (result.field === "google_only") {
      setGoogleOnlyIdentifier(identifier); setErrors({});
    } else {
      if (result.field === "identifier") {
        const key = identifier.includes("@") ? "not_found_email" : "not_found_username";
        setErrors({ identifier: ERROR_MESSAGES.identifier[key] });
      } else if (result.field === "password") {
        setErrors({ password: ERROR_MESSAGES.password.incorrect });
      } else {
        setErrors({ general: result.message || ERROR_MESSAGES.general });
      }
    }
    setSubmitting(false);
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    const fieldErrors = validate("signup", { username, email, password: signupPass });
    if (Object.keys(fieldErrors).length) { setErrors(fieldErrors); return; }
    if (usernameAvail === "taken") { setErrors(p => ({ ...p, username: ERROR_MESSAGES.username.taken })); return; }
    if (emailAvail === "taken") { setErrors(p => ({ ...p, email: ERROR_MESSAGES.email.taken })); return; }
    if (usernameAvail === "checking" || emailAvail === "checking") return;

    setSubmitting(true); setErrors({});
    try {
      const res = await fetch(`${API_BASE()}/auth/send-otp`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (res.status === 409) {
        setErrors({ email: ERROR_MESSAGES.email.taken }); setEmailAvail("taken"); setSubmitting(false); return;
      }
      if (!res.ok) {
        setErrors({ general: data.message || ERROR_MESSAGES.general }); setSubmitting(false); return;
      }
      setPendingSignup({ username, email: email.trim().toLowerCase(), password: signupPass, role });
      setOtpDevCode(data.devOtp || "");
      setOtpStep("pending");
    } catch {
      setErrors({ general: "Network error. Please try again." });
    }
    setSubmitting(false);
  };

  const handleOtpVerified = async () => {
    if (!pendingSignup) return;
    const result = await signup(pendingSignup);
    if (result.success) {
      setOtpStep(null);
      toast.success(`Welcome to SOUNDWAVE, ${pendingSignup.username}!`);
      navigate("/home", { replace: true });
    } else {
      setOtpStep(null); setPendingSignup(null);
      if (result.field === "username") { setErrors({ username: ERROR_MESSAGES.username.taken }); setUsernameAvail("taken"); }
      else if (result.field === "email") { setErrors({ email: ERROR_MESSAGES.email.taken }); setEmailAvail("taken"); }
      else { setErrors({ general: result.message || ERROR_MESSAGES.general }); }
    }
  };

  const handleOtpClose = () => { setOtpStep(null); setOtpDevCode(""); setPendingSignup(null); };
  const handleGoogle = () => { window.location.href = `${API_BASE()}/auth/google`; };

  const handleRoleConfirm = async (chosenRole) => {
    const result = await confirmRole(chosenRole);
    if (result.success) toast.success("Welcome to SOUNDWAVE! 🎵");
    return result;
  };


  const stagger = (i, base = 0.05) => ({ delay: base + i * 0.07 });

  /* ── Waveform bar color cycling: cyan → violet → coral ── */
  const waveBarColor = (i, total) => {
    // Each bar gets a position in [0, 1] across the visualizer width
    // Colors cycle smoothly: cyan(0) → violet(0.5) → coral(1) → cyan(2)
    // We use 3 color stops cycling with period = total/1.5 bars
    const t = (i / total) % 1;
    if (t < 0.34) {
      // cyan → violet
      const p = t / 0.34;
      return `rgba(${Math.round(0 + p * 123)}, ${Math.round(212 - p * 118)}, ${Math.round(255 - p * 88)}, 1)`;
    } else if (t < 0.67) {
      // violet → coral
      const p = (t - 0.34) / 0.33;
      return `rgba(${Math.round(123 + p * 132)}, ${Math.round(94 + p * 13)}, ${Math.round(167 - p * 96)}, 1)`;
    } else {
      // coral → cyan
      const p = (t - 0.67) / 0.33;
      return `rgba(${Math.round(255 - p * 255)}, ${Math.round(107 + p * 105)}, ${Math.round(71 + p * 184)}, 1)`;
    }
  };

  const waveBarGlow = (i, total) => {
    const t = (i / total) % 1;
    if (t < 0.34) return "rgba(0,212,255,0.55)";
    if (t < 0.67) return "rgba(123,94,167,0.55)";
    return "rgba(255,107,107,0.55)";
  };

  return (
    <div style={{
      height: "100vh",
      overflow: "hidden",
      background: "var(--bg-void)",
      display: "flex",
      position: "relative",
    }}>

      {/* ── Modals ───────────────────────────────────────────────────── */}
      {pendingRoleSelect && <RoleSelectionModal onConfirm={handleRoleConfirm} />}
      
      {showForgotModal && (
        <ForgotPasswordModal onClose={() => setShowForgotModal(false)} forgotPassword={forgotPassword} />
      )}
      {otpStep === "pending" && pendingSignup && (
        <EmailOTPModal email={pendingSignup.email} devOtp={otpDevCode} onVerified={handleOtpVerified} onClose={handleOtpClose} />
      )}

      {/* ── Background ambient layer ─────────────────────────────────── */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
        <div style={{
          position: "absolute", width: "650px", height: "650px", borderRadius: "50%",
          top: "-220px", left: "-220px",
          background: "radial-gradient(circle, rgba(0,212,255,0.09), transparent 70%)",
          filter: "blur(70px)", animation: "orbFloat 14s ease-in-out infinite",
        }} />
        <div style={{
          position: "absolute", width: "560px", height: "560px", borderRadius: "50%",
          bottom: "-170px", right: "-170px",
          background: "radial-gradient(circle, rgba(123,94,167,0.11), transparent 70%)",
          filter: "blur(70px)", animation: "orbFloat 10s ease-in-out infinite reverse",
        }} />
        <div style={{
          position: "absolute", width: "380px", height: "380px", borderRadius: "50%",
          top: "40%", right: "20%",
          background: "radial-gradient(circle, rgba(255,107,107,0.06), transparent 70%)",
          filter: "blur(80px)", animation: "orbFloat 18s ease-in-out infinite 4s",
        }} />
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "linear-gradient(rgba(0,212,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.025) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }} />
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse 100% 100% at 50% 50%, transparent 40%, rgba(0,0,0,0.4) 100%)",
        }} />
      </div>

      {/* ══════════════════════════════════════════════════════════════
          LEFT PANEL
      ══════════════════════════════════════════════════════════════ */}
      <motion.div
        ref={parallax.panelRef}
        onMouseMove={parallax.onMouseMove}
        onMouseLeave={parallax.onMouseLeave}
        initial={{ opacity: 0, x: -28 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        className="auth-left-panel"
        style={{
          flex: "0 0 480px",
          alignSelf: "stretch",
          background: "linear-gradient(162deg, var(--bg-surface) 0%, var(--bg-elevated) 50%, var(--bg-deep) 100%)",
          /* Remove the old faint borderRight — replaced by the dedicated divider below */
          borderRight: "none",
          display: "flex", flexDirection: "column", justifyContent: "space-between",
          padding: "48px",
          position: "relative",
          zIndex: 3,
          overflow: "visible",
          flexShrink: 0,
        }}
      >
        {/* ── Decorative background elements ── */}
        <div style={{
          position: "absolute", inset: 0,
          overflow: "hidden",
          pointerEvents: "none",
          zIndex: 0,
          borderRadius: 0,
        }}>
          <motion.div
            animate={{ scale: [1, 1.14, 0.94, 1], opacity: [0.45, 0.70, 0.50, 0.45] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            style={{
              position: "absolute", top: "-110px", left: "-70px",
              width: "360px", height: "360px", borderRadius: "50%",
              background: "radial-gradient(circle at 38% 38%, rgba(0,212,255,0.13), rgba(0,212,255,0.03) 55%, transparent 75%)",
              filter: "blur(55px)",
            }}
          />
          <motion.div
            animate={{ scale: [1, 0.91, 1.10, 1], opacity: [0.38, 0.60, 0.42, 0.38] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 3.5 }}
            style={{
              position: "absolute", bottom: "-90px", right: "-55px",
              width: "320px", height: "320px", borderRadius: "50%",
              background: "radial-gradient(circle at 62% 62%, rgba(123,94,167,0.14), rgba(123,94,167,0.03) 55%, transparent 75%)",
              filter: "blur(55px)",
            }}
          />
          <motion.div
            animate={{ opacity: [0.25, 0.45, 0.28, 0.25], x: [0, 14, -9, 0], y: [0, -12, 7, 0] }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            style={{
              position: "absolute", top: "32%", left: "18%",
              width: "280px", height: "240px", borderRadius: "50%",
              background: "radial-gradient(ellipse at center, rgba(0,190,255,0.07), transparent 70%)",
              filter: "blur(65px)",
            }}
          />

          {/* Top glass reflection strip */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: "1px",
            background: "linear-gradient(90deg, transparent 0%, var(--border-medium) 28%, var(--border-subtle) 50%, var(--border-medium) 72%, transparent 100%)",
          }} />

          {/* Bottom vignette */}
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0, height: "130px",
            background: "linear-gradient(to top, var(--bg-deep), transparent)",
            opacity: 0.6,
          }} />
        </div>

        {/* ══════════════════════════════════════════════════════════
            VERTICAL DIVIDER — dedicated element straddling the seam.
            Positioned absolutely on the right edge of the left panel,
            centred on the 480px boundary. Uses overflow:visible on
            the parent so it can bleed into the right panel space.
            Three-layer stack: soft glow bloom → sharp 1px line → glow.
        ══════════════════════════════════════════════════════════ */}
        <div
          className="auth-panel-divider"
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: "1px",
            height: "100%",
            pointerEvents: "none",
            zIndex: 10,
          }}
        >
          {/* Outer soft bloom — wide, very low opacity */}
          <div style={{
            position: "absolute",
            top: "8%",
            left: "50%",
            transform: "translateX(-50%)",
            width: "18px",
            height: "84%",
            background: "linear-gradient(to bottom, transparent 0%, rgba(0,212,255,0.06) 15%, rgba(0,212,255,0.10) 40%, rgba(123,94,167,0.10) 60%, rgba(0,212,255,0.07) 85%, transparent 100%)",
            filter: "blur(6px)",
            borderRadius: "9px",
          }} />
          {/* Core 1px line — the actual divider */}
          <div style={{
            position: "absolute",
            top: "4%",
            left: "50%",
            transform: "translateX(-50%)",
            width: "1px",
            height: "92%",
            background: "linear-gradient(to bottom, transparent 0%, rgba(0,212,255,0.20) 10%, rgba(0,212,255,0.45) 30%, rgba(123,94,167,0.50) 55%, rgba(0,212,255,0.38) 75%, rgba(0,212,255,0.15) 90%, transparent 100%)",
            borderRadius: "1px",
          }} />
          {/* Inner tight glow on the line itself */}
          <div style={{
            position: "absolute",
            top: "15%",
            left: "50%",
            transform: "translateX(-50%)",
            width: "3px",
            height: "70%",
            background: "linear-gradient(to bottom, transparent 0%, rgba(0,212,255,0.18) 20%, rgba(123,94,167,0.22) 50%, rgba(0,212,255,0.16) 80%, transparent 100%)",
            filter: "blur(2px)",
            borderRadius: "2px",
          }} />
        </div>

        {/* ── Logo ── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5, ease: "easeOut" }}
          style={{ display: "flex", alignItems: "center", gap: "10px", position: "relative", zIndex: 1 }}
        >
          <LogoMark size={30} />
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "16px", letterSpacing: "2.5px" }}>
            SOUNDWAVE
          </span>
        </motion.div>

        {/* ── Middle content ── */}
        <div style={{ position: "relative", zIndex: 1 }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.25, duration: 0.45, ease: "easeOut" }}
            style={{
              display: "inline-flex", alignItems: "center", gap: "8px",
              padding: "6px 14px", background: "rgba(0,212,255,0.07)",
              border: "1px solid rgba(0,212,255,0.18)", borderRadius: "999px",
              fontSize: "11.5px", color: "var(--cyan)", fontWeight: 600,
              letterSpacing: "0.3px", marginBottom: "24px",
            }}
          >
            <span style={{
              width: "5px", height: "5px", borderRadius: "50%",
              background: "var(--cyan)", display: "inline-block",
              animation: "pulseGlow 2s ease-in-out infinite",
            }} />
            {mode === "login" ? "Welcome back" : "Join the movement"}
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.32, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(32px, 3vw, 44px)", fontWeight: 800,
              letterSpacing: "-1.5px", lineHeight: 1.1, marginBottom: "16px",
            }}
          >
            {mode === "login"
              ? <>Your music<br />awaits.</>
              : <>Music that<br /><span className="gradient-text">moves you.</span></>
            }
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.40, duration: 0.55, ease: "easeOut" }}
            style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.75, fontWeight: 300 }}
          >
            {mode === "login"
              ? "Sign in to pick up where you left off. Your playlists, your favourites, your queue — all waiting."
              : "Create your free account and start listening in seconds. No credit card required."
            }
          </motion.p>

          {/* Feature list */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "28px" }}>
            {[
              { icon: "◈", text: "Lossless audio quality", color: "#00d4ff" },
              { icon: "⬡", text: "AI-powered discovery", color: "#7b5ea7" },
              { icon: "◉", text: "50M+ tracks from every genre", color: "#ff6b6b" },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.50 + i * 0.10, duration: 0.45, ease: "easeOut" }}
                whileHover={{ x: 5, transition: { duration: 0.18, ease: "easeOut" } }}
                style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "default" }}
              >
                <motion.div
                  whileHover={{
                    scale: 1.18, rotate: 8,
                    boxShadow: `0 0 20px ${item.color}45`,
                    transition: { duration: 0.2 },
                  }}
                  style={{
                    width: "32px", height: "32px", borderRadius: "9px",
                    background: item.color + "15", border: `1px solid ${item.color}25`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: item.color, fontSize: "15px", fontFamily: "monospace", flexShrink: 0,
                    boxShadow: `0 0 12px ${item.color}1a`,
                  }}
                >{item.icon}</motion.div>
                <span style={{ fontSize: "13.5px", color: "var(--text-secondary)" }}>{item.text}</span>
              </motion.div>
            ))}
          </div>

          {/* ══════════════════════════════════════════════════════════
              ANIMATED WAVEFORM VISUALIZER
              Changes vs original:
              1. Bar count raised 22 → 28 so bars extend further right
                 toward the divider, visually connecting to the seam.
              2. Color per bar cycles through cyan → violet → coral using
                 the waveBarColor() helper defined above the return.
              3. Base opacity raised — min opacity 0.45, peak 0.90 —
                 so bars are noticeably darker / more visible at rest.
              4. Box-shadow glow uses the matching accent color per bar.
              5. Width slightly narrowed (3px→2.5px) to fit more bars.
          ══════════════════════════════════════════════════════════ */}
          <div style={{ marginTop: "32px", position: "relative" }}>
            {/* Glow bloom beneath bars — uses multi-color gradient */}
            <div style={{
              position: "absolute",
              bottom: 0, left: "4%", right: "-8%", height: "60px",
              background: "radial-gradient(ellipse at 50% 100%, rgba(0,212,255,0.14) 0%, rgba(123,94,167,0.10) 50%, rgba(255,107,107,0.08) 100%)",
              filter: "blur(14px)",
              pointerEvents: "none",
            }} />
            <div style={{
              display: "flex",
              alignItems: "flex-end",
              gap: "3px",
              height: "40px",
              position: "relative",
              /* Extend slightly beyond panel padding toward the divider */
              marginRight: "-20px",
            }}>
              {Array.from({ length: 28 }).map((_, i) => {
                const barColor = waveBarColor(i, 28);
                const glowColor = waveBarGlow(i, 28);
                return (
                  <motion.div
                    key={i}
                    animate={{
                      scaleY: [0.30, 0.88 + (i % 5) * 0.08, 0.38, 0.72, 0.30],
                      opacity: [0.45, 0.90, 0.50, 0.78, 0.45],
                    }}
                    transition={{
                      duration: 0.82 + (i % 5) * 0.22,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: i * 0.055,
                    }}
                    style={{
                      width: "2.5px",
                      borderRadius: "2px",
                      background: `linear-gradient(to top, ${barColor}, rgba(255,255,255,0.25))`,
                      transformOrigin: "bottom",
                      height: "100%",
                      minHeight: "4px",
                      boxShadow: i % 2 === 0 ? `0 0 5px ${glowColor}` : "none",
                      flexShrink: 0,
                    }}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.85, duration: 0.5 }}
          style={{ fontSize: "12px", color: "var(--text-muted)", position: "relative", zIndex: 1 }}
        >
          © {new Date().getFullYear()} SOUNDWAVE Inc. · Privacy · Terms
        </motion.p>

      </motion.div>
      {/* ═══ END LEFT PANEL ═══ */}

      {/* ══════════════════════════════════════════════════════════════
          RIGHT PANEL  (unchanged)
      ══════════════════════════════════════════════════════════════ */}
      <div className="no-scrollbar" style={{
        flex: 1,
        overflowY: "auto",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
        position: "relative", zIndex: 1,
      }}>
        <div style={{ width: "100%", maxWidth: "420px" }}>

          <motion.button
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            onClick={() => navigate("/")}
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              color: "var(--text-muted)", fontSize: "13px", marginBottom: "20px",
              background: "none", border: "none", cursor: "pointer",
              transition: "color var(--t-fast)",
            }}
            onMouseEnter={e => e.currentTarget.style.color = "var(--text-primary)"}
            onMouseLeave={e => e.currentTarget.style.color = "var(--text-muted)"}
          >← Back to home</motion.button>

          <div
            ref={tilt.ref}
            onMouseMove={tilt.onMouseMove}
            onMouseLeave={tilt.onMouseLeave}
            style={{
              background: "rgba(255,255,255,0.028)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: "22px",
              padding: "28px",
              boxShadow: [
                "0 2px 4px rgba(0,0,0,0.12)",
                "0 8px 20px rgba(0,0,0,0.22)",
                "0 24px 60px rgba(0,0,0,0.35)",
                "0 0 0 1px rgba(255,255,255,0.04)",
                "inset 0 1px 0 rgba(255,255,255,0.06)",
              ].join(", "),
              transform: "perspective(900px) rotateY(0deg) rotateX(0deg) scale(1)",
              transition: "transform 0.08s ease-out",
              willChange: "transform",
              position: "relative",
              width: "100%",
              minHeight: "560px",
              maxHeight: "calc(100vh - 80px)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{
              position: "absolute", top: 0, left: "10%", right: "10%", height: "1px",
              background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.12) 50%, transparent)",
              borderRadius: "1px", pointerEvents: "none",
            }} />

            {/* Mode tabs */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.30, duration: 0.45 }}
              style={{
                display: "flex",
                background: "rgba(0,0,0,0.25)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: "12px",
                padding: "4px",
                marginBottom: "20px",
                position: "relative",
                flexShrink: 0,
              }}
            >
              <div style={{
                position: "absolute",
                top: "4px", bottom: "4px",
                left: mode === "login" ? "4px" : "calc(50% + 2px)",
                width: "calc(50% - 6px)",
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: "9px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.30)",
                transition: "left 0.30s cubic-bezier(0.34, 1.56, 0.64, 1)",
                pointerEvents: "none",
              }} />
              {["login", "signup"].map((m) => (
                <button key={m} onClick={() => switchMode(m)} style={{
                  flex: 1, padding: "10px", borderRadius: "9px",
                  fontFamily: "var(--font-display)", fontWeight: 700,
                  fontSize: "13.5px", letterSpacing: "0.3px",
                  transition: "color 0.2s ease",
                  background: "transparent",
                  color: mode === m ? "var(--text-primary)" : "var(--text-muted)",
                  border: "none", cursor: "pointer",
                  position: "relative", zIndex: 1,
                }}>
                  {m === "login" ? "Sign In" : "Create Account"}
                </button>
              ))}
            </motion.div>

            {/* Google OAuth button */}
            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.38, duration: 0.42 }}
              onClick={handleGoogle}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
                width: "100%", padding: "11px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.09)",
                borderRadius: "12px",
                color: "var(--text-primary)", fontSize: "14px", fontWeight: 600,
                marginBottom: "16px", cursor: "pointer",
                transition: "all 0.2s ease",
                flexShrink: 0,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)";
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.2)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <GoogleIcon />
              {mode === "login" ? "Continue with Google" : "Sign up with Google"}
            </motion.button>

            {/* Divider */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.44, duration: 0.4 }}
              style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px", flexShrink: 0 }}
            >
              <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.07)" }} />
              <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500 }}>or continue with email</span>
              <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.07)" }} />
            </motion.div>

            {/* General error */}
            {errors.general && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  padding: "11px 14px", background: "var(--coral-dim)",
                  border: "1px solid rgba(255,107,107,0.3)", borderRadius: "10px",
                  fontSize: "13px", color: "var(--coral)", marginBottom: "16px",
                  display: "flex", alignItems: "center", gap: "8px",
                  flexShrink: 0,
                }}
              >
                <span>⚠</span> {errors.general}
              </motion.div>
            )}

            {/* Google-only banner */}
            {googleOnlyIdentifier && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                style={{
                  padding: "16px",
                  background: "rgba(123,94,167,0.08)",
                  border: "1px solid rgba(123,94,167,0.28)",
                  borderRadius: "12px", marginBottom: "20px",
                  flexShrink: 0,
                }}
              >
                <div style={{ display: "flex", gap: "12px", alignItems: "flex-start", marginBottom: "14px" }}>
                  <div style={{
                    width: "36px", height: "36px", borderRadius: "10px",
                    background: "rgba(123,94,167,0.15)", border: "1px solid rgba(123,94,167,0.3)",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0,
                  }}><GoogleIcon /></div>
                  <div>
                    <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "13.5px", color: "var(--text-primary)", marginBottom: "4px" }}>Google account detected</div>
                    <div style={{ fontSize: "12.5px", color: "var(--text-secondary)", lineHeight: 1.6 }}>This account was created using Google Sign-In. Continue with Google, or create a password to enable email login.</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <button type="button" onClick={handleGoogle} className="btn-primary" style={{ padding: "10px", fontSize: "13px" }}>Continue with Google</button>
                  <p style={{ textAlign: "center", fontSize: "12px", color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>
                    To add a password to your account, sign in with Google first,
                    then go to <strong style={{ color: "var(--text-secondary)" }}>Edit Profile → Create Password</strong>.
                  </p>
                </div>
                </div>
              </motion.div>
            )}

            {/* ── FORMS ── */}
            <div
              className="no-scrollbar"
              style={{
                flex: 1,
                overflowY: "auto",
                overflowX: "hidden",
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-start",
                paddingRight: "4px",
                minHeight: "0",
                position: "relative",
              }}
            >
              <AnimatePresence mode="wait">
                {mode === "login" && (
                  <motion.form
                    key="login"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15, ease: "easeInOut" }}
                    onSubmit={handleLogin}
                    style={{ display: "flex", flexDirection: "column", gap: "16px", paddingTop: "8px" }}
                  >
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={stagger(0)}>
                      <FormField
                        label="Username or Email" type="text" value={identifier}
                        onChange={e => {
                          setIdentifier(e.target.value);
                          setErrors(p => ({ ...p, identifier: "" }));
                          if (googleOnlyIdentifier) setGoogleOnlyIdentifier("");
                        }}
                        placeholder="Enter username or email"
                        error={errors.identifier} autoComplete="username" autoFocus
                      />
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={stagger(1)}>
                      <FormField
                        label="Password" type={showPass ? "text" : "password"} value={password}
                        onChange={e => { setPassword(e.target.value); setErrors(p => ({ ...p, password: "" })); }}
                        placeholder="Enter your password"
                        error={errors.password} autoComplete="current-password"
                        rightSlot={<EyeToggle show={showPass} onToggle={() => setShowPass(s => !s)} />}
                      />
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={stagger(2)}
                      style={{ display: "flex", justifyContent: "flex-end" }}
                    >
                      <button type="button" onClick={() => setShowForgotModal(true)} style={{
                        fontSize: "12.5px", color: "var(--text-muted)",
                        background: "none", border: "none",
                        transition: "color var(--t-fast)", cursor: "pointer",
                      }}
                        onMouseEnter={e => e.currentTarget.style.color = "var(--cyan)"}
                        onMouseLeave={e => e.currentTarget.style.color = "var(--text-muted)"}
                      >Forgot password?</button>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={stagger(3)}>
                      <PremiumSubmitButton submitting={submitting} label="Sign In" />
                    </motion.div>

                    <motion.p
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={stagger(4)}
                      style={{ textAlign: "center", fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}
                    >
                      Don't have an account?{" "}
                      <button type="button" onClick={() => switchMode("signup")} style={{
                        color: "var(--cyan)", fontWeight: 600, background: "none", border: "none", cursor: "pointer",
                      }}>Create one free</button>
                    </motion.p>
                  </motion.form>
                )}

                {mode === "signup" && (
                  <motion.form
                    key="signup"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15, ease: "easeInOut" }}
                    onSubmit={handleSignup}
                    style={{ display: "flex", flexDirection: "column", gap: "14px" }}
                  >
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={stagger(0)}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <FormField
                          label="Username" type="text" value={username}
                          onChange={handleUsernameChange}
                          placeholder="Choose a username"
                          error={errors.username} autoComplete="username" autoFocus
                        />
                        {!errors.username && <AvailabilityBadge status={usernameAvail} />}
                      </div>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={stagger(1)}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <FormField
                          label="Email Address" type="email" value={email}
                          onChange={handleEmailChange}
                          placeholder="your@email.com"
                          error={errors.email} autoComplete="email"
                        />
                        {!errors.email && <AvailabilityBadge status={emailAvail} />}
                      </div>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={stagger(2)}>
                      <FormField
                        label="Password" type={showPass ? "text" : "password"} value={signupPass}
                        onChange={e => { setSignupPass(e.target.value); setErrors(p => ({ ...p, password: "" })); }}
                        placeholder="At least 6 characters"
                        error={errors.password} autoComplete="new-password"
                        rightSlot={<EyeToggle show={showPass} onToggle={() => setShowPass(s => !s)} />}
                      />
                      {signupPass && <PasswordStrength password={signupPass} />}
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={stagger(3)}>
                      <div>
                        <div style={{
                          fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)",
                          letterSpacing: "0.6px", textTransform: "uppercase", marginBottom: "8px",
                        }}>I am a</div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                          {[
                            { value: "listener", label: "Listener", icon: "🎧", desc: "Discover & enjoy" },
                            { value: "artist", label: "Artist", icon: "🎤", desc: "Upload & create" },
                          ].map((r) => (
                            <button key={r.value} type="button" onClick={() => setRole(r.value)} style={{
                              padding: "12px", borderRadius: "11px",
                              border: `1px solid ${role === r.value ? "var(--cyan-border)" : "rgba(255,255,255,0.07)"}`,
                              background: role === r.value ? "var(--cyan-dim)" : "rgba(255,255,255,0.03)",
                              textAlign: "left", cursor: "pointer", transition: "all var(--t-fast)",
                            }}>
                              <div style={{ fontSize: "18px", marginBottom: "4px" }}>{r.icon}</div>
                              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "13px", color: role === r.value ? "var(--cyan)" : "var(--text-primary)" }}>{r.label}</div>
                              <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>{r.desc}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={stagger(4)}>
                      <PremiumSubmitButton
                        submitting={submitting || usernameAvail === "checking" || emailAvail === "checking"}
                        label={
                          usernameAvail === "checking" || emailAvail === "checking"
                            ? "Checking…"
                            : "Create Account"
                        }
                      />
                    </motion.div>

                    <motion.p
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={stagger(5)}
                      style={{ textAlign: "center", fontSize: "12px", color: "var(--text-muted)", lineHeight: 1.6 }}
                    >
                      By creating an account you agree to our{" "}
                      <a href="#" style={{ color: "var(--cyan)" }}>Terms of Service</a>{" "}and{" "}
                      <a href="#" style={{ color: "var(--cyan)" }}>Privacy Policy</a>.
                    </motion.p>

                    <motion.p
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={stagger(6)}
                      style={{ textAlign: "center", fontSize: "13px", color: "var(--text-muted)" }}
                    >
                      Already have an account?{" "}
                      <button type="button" onClick={() => switchMode("login")} style={{
                        color: "var(--cyan)", fontWeight: 600, background: "none", border: "none", cursor: "pointer",
                      }}>Sign in</button>
                    </motion.p>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* ── CSS keyframes ── */}
      <style>{`
        @media (max-width: 860px) {
          .auth-left-panel { display: none !important; }
          .auth-panel-divider { display: none !important; }
        }
        .no-scrollbar::-webkit-scrollbar { display: none !important; }
        .no-scrollbar { -ms-overflow-style: none !important; scrollbar-width: none !important; }

        @keyframes fadeIn   { from { opacity: 0 }              to { opacity: 1 } }
        @keyframes fadeUp   { from { opacity: 0; transform: translateY(16px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes spinSlow { to { transform: rotate(360deg) } }

        @keyframes orbFloat {
          0%, 100% { transform: translateY(0px)   scale(1);    }
          33%      { transform: translateY(-28px)  scale(1.04); }
          66%      { transform: translateY(14px)   scale(0.97); }
        }
        @keyframes shimmerSweep {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        @keyframes btnGlowPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(0,212,255,0.0),  0 4px 18px rgba(0,0,0,0.3); }
          50%      { box-shadow: 0 0 0 6px rgba(0,212,255,0.08), 0 4px 24px rgba(0,0,0,0.4); }
        }
        @keyframes pulseGlow {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(0,212,255,0); }
          50%       { opacity: 0.7; box-shadow: 0 0 0 4px rgba(0,212,255,0.14); }
        }
        .btn-premium-shimmer {
          background-size: 200% auto !important;
          animation: shimmerSweep 2.4s linear infinite;
        }
        .btn-premium-shimmer:hover {
          animation: shimmerSweep 1.6s linear infinite, btnGlowPulse 1.8s ease-in-out infinite;
        }
        @keyframes fieldEnter {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0);   }
        }

        /* ── Waveform color-cycling keyframes ── */
        @keyframes waveColorCycle {
          0%   { filter: hue-rotate(0deg)   brightness(1.0); }
          33%  { filter: hue-rotate(200deg) brightness(0.9); }
          66%  { filter: hue-rotate(340deg) brightness(1.1); }
          100% { filter: hue-rotate(360deg) brightness(1.0); }
        }
      `}</style>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   PREMIUM SUBMIT BUTTON  (unchanged)
══════════════════════════════════════════════════════════════════════ */
function PremiumSubmitButton({ submitting, label }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="submit"
      disabled={submitting}
      className="btn-primary btn-premium-shimmer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: "100%", padding: "13px", fontSize: "14.5px",
        opacity: submitting ? 0.7 : 1,
        cursor: submitting ? "not-allowed" : "pointer",
        marginTop: "4px", position: "relative", overflow: "hidden",
        transform: hovered && !submitting ? "translateY(-1.5px) scale(1.012)" : "translateY(0) scale(1)",
        transition: "transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease, box-shadow 0.2s ease",
        boxShadow: hovered && !submitting
          ? "0 8px 24px rgba(0,212,255,0.18), 0 2px 8px rgba(0,0,0,0.3)"
          : "0 2px 8px rgba(0,0,0,0.2)",
      }}
    >
      {!submitting && (
        <span style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.12) 50%, transparent 70%)",
          backgroundSize: "200% auto",
          animation: "shimmerSweep 2.4s linear infinite",
          pointerEvents: "none", borderRadius: "inherit",
        }} />
      )}
      {submitting ? (
        <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", position: "relative", zIndex: 1 }}>
          <span style={{
            width: "15px", height: "15px", borderRadius: "50%",
            border: "2px solid rgba(255,255,255,0.3)", borderTop: "2px solid #fff",
            animation: "spinSlow 0.7s linear infinite", display: "inline-block",
          }} />
          {label}
        </span>
      ) : (
        <span style={{ position: "relative", zIndex: 1 }}>{label}</span>
      )}
    </button>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   SUB-COMPONENTS  (unchanged)
══════════════════════════════════════════════════════════════════════ */
function FormField({ label, type, value, onChange, placeholder, error, autoComplete, autoFocus, rightSlot }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <label style={{
        fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)",
        letterSpacing: "0.6px", textTransform: "uppercase",
      }}>{label}</label>
      <div style={{ position: "relative" }}>
        <input
          type={type} value={value} onChange={onChange} placeholder={placeholder}
          autoComplete={autoComplete} autoFocus={autoFocus}
          style={{
            width: "100%",
            padding: rightSlot ? "13px 44px 13px 16px" : "13px 16px",
            background: "rgba(255,255,255,0.05)",
            border: `1px solid ${error ? "rgba(255,107,107,0.5)" : "rgba(255,255,255,0.08)"}`,
            borderRadius: "11px", color: "var(--text-primary)", fontSize: "14.5px",
            outline: "none",
            transition: "border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease",
            fontFamily: "var(--font-body)",
          }}
          onFocus={e => {
            e.target.style.borderColor = error ? "rgba(255,107,107,0.6)" : "rgba(0,212,255,0.5)";
            e.target.style.boxShadow = error
              ? "0 0 0 3px rgba(255,107,107,0.07)"
              : "0 0 0 3px rgba(0,212,255,0.08), 0 0 12px rgba(0,212,255,0.06)";
            e.target.style.background = "rgba(255,255,255,0.08)";
          }}
          onBlur={e => {
            e.target.style.borderColor = error ? "rgba(255,107,107,0.5)" : "rgba(255,255,255,0.08)";
            e.target.style.boxShadow = "none";
            e.target.style.background = "rgba(255,255,255,0.05)";
          }}
        />
        {rightSlot && (
          <div style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)" }}>
            {rightSlot}
          </div>
        )}
      </div>
      {error && (
        <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", color: "var(--coral)" }}>
          <span>⚠</span> {error}
        </div>
      )}
    </div>
  );
}

function EyeToggle({ show, onToggle }) {
  return (
    <button type="button" onClick={onToggle} style={{
      color: "var(--text-muted)", background: "none", border: "none",
      cursor: "pointer", display: "flex", alignItems: "center",
      transition: "color var(--t-fast)", padding: "2px",
    }}
      onMouseEnter={e => e.currentTarget.style.color = "var(--text-primary)"}
      onMouseLeave={e => e.currentTarget.style.color = "var(--text-muted)"}
    >
      {show ? (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
      ) : (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      )}
    </button>
  );
}

function PasswordStrength({ password }) {
  const calc = (p) => {
    let s = 0;
    if (p.length >= 6) s++;
    if (p.length >= 10) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  };
  const strength = calc(password);
  const labels = ["", "Very weak", "Weak", "Fair", "Strong", "Very strong"];
  const colors = ["", "#ff6b6b", "#ff6b6b", "#ffd166", "#06d6a0", "#00d4ff"];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "5px", marginTop: "6px" }}>
      <div style={{ display: "flex", gap: "4px" }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} style={{
            flex: 1, height: "3px", borderRadius: "2px",
            background: i <= strength ? colors[strength] : "rgba(255,255,255,0.08)",
            transition: "background 0.3s ease",
            boxShadow: i <= strength ? `0 0 6px ${colors[strength]}55` : "none",
          }} />
        ))}
      </div>
      <span style={{ fontSize: "11px", color: colors[strength] || "var(--text-muted)", fontWeight: 500 }}>
        {labels[strength]}
      </span>
    </div>
  );
}

function LogoMark({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="14.5" stroke="#00d4ff" strokeWidth="1.5" strokeOpacity="0.7" />
      <path d="M8 16 Q11 9, 16 16 Q21 23, 24 16" stroke="#00d4ff" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <circle cx="16" cy="16" r="3.5" fill="#00d4ff" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}
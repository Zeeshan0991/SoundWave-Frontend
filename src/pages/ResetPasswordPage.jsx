// src/pages/ResetPasswordPage.jsx
// ─────────────────────────────────────────────────────────────────────────────
// PHASE 6 — Reset Password Page
//
// Handles the reset link that forgotPassword sends to the user's email:
//   /auth/reset?token=<rawToken>&email=<email>
//
// Flow:
//   1. Page mounts → reads token + email from URL query params
//   2. If token is missing → shows "invalid link" state
//   3. User enters new password + confirm
//   4. POST /auth/reset-password { token, newPassword }
//   5. On success → shows confirmation → redirects to /auth?mode=login
//   6. On failure (expired/invalid token) → shows error with link to try again
//
// Security notes:
//   • The raw token from the URL is sent to the backend which hashes it and
//     compares against the stored hash — the DB never holds the usable token.
//   • Token is single-use — backend clears it on successful reset.
//   • Token expires after 1 hour (set by forgotPassword controller).
//   • This page resets the SOUNDWAVE local password ONLY.
//     It has zero interaction with Google credentials.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export default function ResetPasswordPage() {
  const navigate      = useNavigate();
  const [searchParams] = useSearchParams();
  const { resetPassword } = useAuth();
  const toast = useToast();

  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";

  const [newPass,      setNewPass]      = useState("");
  const [confirmPass,  setConfirmPass]  = useState("");
  const [showPass,     setShowPass]     = useState(false);
  const [submitting,   setSubmitting]   = useState(false);
  const [errors,       setErrors]       = useState({});
  const [done,         setDone]         = useState(false);
  const [tokenInvalid, setTokenInvalid] = useState(!token);

  /* ── If no token in URL, mark invalid immediately ─────────── */
  useEffect(() => {
    if (!token) setTokenInvalid(true);
  }, [token]);

  /* ── Password strength ────────────────────────────────────── */
  const calcStrength = (p) => {
    let s = 0;
    if (p.length >= 6)          s++;
    if (p.length >= 10)         s++;
    if (/[A-Z]/.test(p))        s++;
    if (/[0-9]/.test(p))        s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  };
  const strengthLabels = ["", "Very weak", "Weak", "Fair", "Strong", "Very strong"];
  const strengthColors = ["", "#ff6b6b", "#ff6b6b", "#ffd166", "#06d6a0", "#00d4ff"];
  const strength = calcStrength(newPass);

  /* ── Submit ───────────────────────────────────────────────── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!newPass)              errs.newPass = "Please enter a new password.";
    else if (newPass.length < 6) errs.newPass = "Password must be at least 6 characters.";
    if (!confirmPass)            errs.confirmPass = "Please confirm your new password.";
    else if (newPass !== confirmPass) errs.confirmPass = "Passwords do not match.";

    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSubmitting(true);
    setErrors({});

    const result = await resetPassword({ token, newPassword: newPass });
    setSubmitting(false);

    if (result.success) {
      setDone(true);
    } else {
      // Token expired or already used
      if (
        result.message?.toLowerCase().includes("expired") ||
        result.message?.toLowerCase().includes("invalid")
      ) {
        setTokenInvalid(true);
      } else {
        setErrors({ general: result.message || "Reset failed. Please try again." });
      }
    }
  };

  /* ─────────────────────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────────────────────── */
  return (
    <div style={{
      minHeight:      "100vh",
      background:     "var(--bg-void)",
      display:        "flex",
      alignItems:     "center",
      justifyContent: "center",
      padding:        "24px",
      position:       "relative",
      overflow:       "hidden",
    }}>

      {/* Background ambient orbs */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
        <div style={{
          position: "absolute", width: "600px", height: "600px", borderRadius: "50%",
          top: "-200px", left: "-200px",
          background: "radial-gradient(circle, rgba(0,212,255,0.07), transparent 70%)",
          filter: "blur(70px)",
        }} />
        <div style={{
          position: "absolute", width: "500px", height: "500px", borderRadius: "50%",
          bottom: "-150px", right: "-150px",
          background: "radial-gradient(circle, rgba(123,94,167,0.09), transparent 70%)",
          filter: "blur(70px)",
        }} />
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "linear-gradient(rgba(0,212,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.02) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }} />
      </div>

      <div style={{ width: "100%", maxWidth: "420px", position: "relative", zIndex: 1 }}>

        {/* Back to home */}
        <button
          onClick={() => navigate("/")}
          style={{
            display:    "flex",
            alignItems: "center",
            gap:        "6px",
            color:      "var(--text-muted)",
            fontSize:   "13px",
            marginBottom: "20px",
            background: "none",
            border:     "none",
            cursor:     "pointer",
            transition: "color var(--t-fast)",
          }}
          onMouseEnter={e => e.currentTarget.style.color = "var(--text-primary)"}
          onMouseLeave={e => e.currentTarget.style.color = "var(--text-muted)"}
        >← Back to home</button>

        <div style={{
          background:     "var(--bg-elevated)",
          border:         "1px solid var(--border-subtle)",
          borderRadius:   "22px",
          padding:        "36px 32px 32px",
          boxShadow:      "0 24px 80px rgba(0,0,0,0.4)",
          animation:      "fadeUp 0.3s ease both",
        }}>

          {/* ── Top glow line ── */}
          <div style={{
            position: "absolute", top: 0, left: "10%", right: "10%", height: "1px",
            background: "linear-gradient(90deg, transparent, rgba(0,212,255,0.18) 50%, transparent)",
            borderRadius: "1px", pointerEvents: "none",
          }} />

          {/* ══ SUCCESS STATE ═══════════════════════════════════ */}
          {done && (
            <div style={{ textAlign: "center" }}>
              <div style={{
                width:          "64px",
                height:         "64px",
                borderRadius:   "50%",
                background:     "rgba(6,214,160,0.10)",
                border:         "1px solid rgba(6,214,160,0.28)",
                display:        "flex",
                alignItems:     "center",
                justifyContent: "center",
                margin:         "0 auto 20px",
                fontSize:       "28px",
              }}>✓</div>
              <h2 style={{
                fontFamily:    "var(--font-display)",
                fontSize:      "22px",
                fontWeight:    800,
                letterSpacing: "-0.5px",
                color:         "var(--text-primary)",
                marginBottom:  "10px",
              }}>Password reset!</h2>
              <p style={{
                fontSize:   "14px",
                color:      "var(--text-secondary)",
                lineHeight: 1.7,
                marginBottom: "28px",
              }}>
                Your SOUNDWAVE password has been updated successfully.
                {email && (
                  <> You can now sign in with <strong style={{ color: "var(--text-primary)" }}>{email}</strong>.</>
                )}
              </p>
              <button
                onClick={() => navigate("/auth?mode=login")}
                className="btn-primary"
                style={{ width: "100%", padding: "13px", fontSize: "14.5px" }}
              >
                Sign In
              </button>
            </div>
          )}

          {/* ══ INVALID / EXPIRED TOKEN STATE ═══════════════════ */}
          {!done && tokenInvalid && (
            <div style={{ textAlign: "center" }}>
              <div style={{
                width:          "56px",
                height:         "56px",
                borderRadius:   "16px",
                background:     "rgba(255,107,107,0.08)",
                border:         "1px solid rgba(255,107,107,0.25)",
                display:        "flex",
                alignItems:     "center",
                justifyContent: "center",
                margin:         "0 auto 20px",
                fontSize:       "24px",
              }}>🔗</div>
              <h2 style={{
                fontFamily:    "var(--font-display)",
                fontSize:      "20px",
                fontWeight:    800,
                letterSpacing: "-0.5px",
                color:         "var(--text-primary)",
                marginBottom:  "10px",
              }}>Link expired or invalid</h2>
              <p style={{
                fontSize:     "13.5px",
                color:        "var(--text-secondary)",
                lineHeight:   1.7,
                marginBottom: "24px",
              }}>
                This reset link has expired or has already been used.
                Reset links are valid for 1 hour and can only be used once.
              </p>
              <button
                onClick={() => navigate("/auth?mode=login")}
                className="btn-primary"
                style={{ width: "100%", padding: "13px", fontSize: "14.5px", marginBottom: "12px" }}
              >
                Request a New Link
              </button>
              <button
                onClick={() => navigate("/")}
                style={{
                  width:        "100%",
                  padding:      "11px",
                  fontSize:     "13.5px",
                  fontWeight:   600,
                  background:   "var(--bg-surface)",
                  border:       "1px solid var(--border-faint)",
                  borderRadius: "10px",
                  color:        "var(--text-secondary)",
                  cursor:       "pointer",
                  transition:   "all var(--t-fast)",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--border-subtle)"; e.currentTarget.style.color = "var(--text-primary)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-faint)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
              >Back to Home</button>
            </div>
          )}

          {/* ══ RESET FORM ══════════════════════════════════════ */}
          {!done && !tokenInvalid && (
            <>
              {/* Icon */}
              <div style={{
                width:          "52px",
                height:         "52px",
                borderRadius:   "15px",
                background:     "rgba(0,212,255,0.08)",
                border:         "1px solid rgba(0,212,255,0.18)",
                display:        "flex",
                alignItems:     "center",
                justifyContent: "center",
                fontSize:       "22px",
                marginBottom:   "20px",
              }}>🔒</div>

              <h2 style={{
                fontFamily:    "var(--font-display)",
                fontSize:      "22px",
                fontWeight:    800,
                letterSpacing: "-0.5px",
                color:         "var(--text-primary)",
                marginBottom:  "8px",
              }}>Set a new password</h2>

              <p style={{
                fontSize:     "13.5px",
                color:        "var(--text-secondary)",
                lineHeight:   1.65,
                marginBottom: "24px",
              }}>
                Choose a strong new password for your SOUNDWAVE account.
                {email && (
                  <> This will update the password for{" "}
                  <strong style={{ color: "var(--text-primary)" }}>{email}</strong>.</>
                )}
              </p>

              {/* Important note — SOUNDWAVE password only */}
              <div style={{
                padding:      "10px 14px",
                background:   "var(--cyan-dim)",
                border:       "1px solid var(--cyan-border)",
                borderRadius: "10px",
                fontSize:     "12.5px",
                color:        "var(--cyan)",
                marginBottom: "20px",
                display:      "flex",
                alignItems:   "center",
                gap:          "7px",
              }}>
                <span>ℹ</span>
                This resets your <strong>SOUNDWAVE password only</strong> — your Google account is not affected.
              </div>

              {/* General error */}
              {errors.general && (
                <div style={{
                  padding:      "10px 14px",
                  background:   "var(--coral-dim)",
                  border:       "1px solid rgba(255,107,107,0.3)",
                  borderRadius: "10px",
                  fontSize:     "13px",
                  color:        "var(--coral)",
                  marginBottom: "16px",
                  display:      "flex",
                  alignItems:   "center",
                  gap:          "7px",
                }}>
                  <span>⚠</span> {errors.general}
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

                {/* New password */}
                <div>
                  <label style={{
                    fontSize:      "12px",
                    fontWeight:    600,
                    color:         "var(--text-secondary)",
                    letterSpacing: "0.6px",
                    textTransform: "uppercase",
                    display:       "block",
                    marginBottom:  "6px",
                  }}>New Password</label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showPass ? "text" : "password"}
                      value={newPass}
                      onChange={e => { setNewPass(e.target.value); setErrors(p => ({ ...p, newPass: "" })); }}
                      placeholder="At least 6 characters"
                      autoComplete="new-password"
                      autoFocus
                      style={{
                        width:        "100%",
                        padding:      "13px 44px 13px 16px",
                        background:   "var(--bg-surface)",
                        border:       `1px solid ${errors.newPass ? "rgba(255,107,107,0.5)" : "var(--border-subtle)"}`,
                        borderRadius: "11px",
                        color:        "var(--text-primary)",
                        fontSize:     "14.5px",
                        outline:      "none",
                        transition:   "border-color 0.18s ease, box-shadow 0.18s ease",
                        fontFamily:   "var(--font-body)",
                      }}
                      onFocus={e => {
                        e.target.style.borderColor = errors.newPass ? "rgba(255,107,107,0.6)" : "rgba(0,212,255,0.5)";
                        e.target.style.boxShadow   = "0 0 0 3px rgba(0,212,255,0.08)";
                      }}
                      onBlur={e => {
                        e.target.style.borderColor = errors.newPass ? "rgba(255,107,107,0.5)" : "var(--border-subtle)";
                        e.target.style.boxShadow   = "none";
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(s => !s)}
                      style={{
                        position:   "absolute",
                        right:      "12px",
                        top:        "50%",
                        transform:  "translateY(-50%)",
                        color:      "var(--text-muted)",
                        background: "none",
                        border:     "none",
                        cursor:     "pointer",
                        display:    "flex",
                        alignItems: "center",
                        padding:    "2px",
                        transition: "color var(--t-fast)",
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = "var(--text-primary)"}
                      onMouseLeave={e => e.currentTarget.style.color = "var(--text-muted)"}
                    >
                      {showPass ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                  {errors.newPass && (
                    <div style={{ fontSize: "12px", color: "var(--coral)", marginTop: "5px", display: "flex", alignItems: "center", gap: "4px" }}>
                      <span>⚠</span> {errors.newPass}
                    </div>
                  )}
                </div>

                {/* Password strength meter */}
                {newPass && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "5px", marginTop: "-8px" }}>
                    <div style={{ display: "flex", gap: "4px" }}>
                      {[1,2,3,4,5].map(i => (
                        <div key={i} style={{
                          flex:        1,
                          height:      "3px",
                          borderRadius:"2px",
                          background:  i <= strength ? strengthColors[strength] : "var(--bg-raised)",
                          transition:  "background 0.3s ease",
                          boxShadow:   i <= strength ? `0 0 6px ${strengthColors[strength]}55` : "none",
                        }} />
                      ))}
                    </div>
                    <span style={{ fontSize: "11px", color: strengthColors[strength] || "var(--text-muted)", fontWeight: 500 }}>
                      {strengthLabels[strength]}
                    </span>
                  </div>
                )}

                {/* Confirm password */}
                <div>
                  <label style={{
                    fontSize:      "12px",
                    fontWeight:    600,
                    color:         "var(--text-secondary)",
                    letterSpacing: "0.6px",
                    textTransform: "uppercase",
                    display:       "block",
                    marginBottom:  "6px",
                  }}>Confirm Password</label>
                  <input
                    type={showPass ? "text" : "password"}
                    value={confirmPass}
                    onChange={e => { setConfirmPass(e.target.value); setErrors(p => ({ ...p, confirmPass: "" })); }}
                    placeholder="Repeat your new password"
                    autoComplete="new-password"
                    style={{
                      width:        "100%",
                      padding:      "13px 16px",
                      background:   "var(--bg-surface)",
                      border:       `1px solid ${errors.confirmPass ? "rgba(255,107,107,0.5)" : "var(--border-subtle)"}`,
                      borderRadius: "11px",
                      color:        "var(--text-primary)",
                      fontSize:     "14.5px",
                      outline:      "none",
                      transition:   "border-color 0.18s ease, box-shadow 0.18s ease",
                      fontFamily:   "var(--font-body)",
                    }}
                    onFocus={e => {
                      e.target.style.borderColor = errors.confirmPass ? "rgba(255,107,107,0.6)" : "rgba(0,212,255,0.5)";
                      e.target.style.boxShadow   = "0 0 0 3px rgba(0,212,255,0.08)";
                    }}
                    onBlur={e => {
                      e.target.style.borderColor = errors.confirmPass ? "rgba(255,107,107,0.5)" : "var(--border-subtle)";
                      e.target.style.boxShadow   = "none";
                    }}
                  />
                  {errors.confirmPass && (
                    <div style={{ fontSize: "12px", color: "var(--coral)", marginTop: "5px", display: "flex", alignItems: "center", gap: "4px" }}>
                      <span>⚠</span> {errors.confirmPass}
                    </div>
                  )}
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary"
                  style={{
                    width:     "100%",
                    padding:   "13px",
                    fontSize:  "14.5px",
                    opacity:   submitting ? 0.7 : 1,
                    cursor:    submitting ? "not-allowed" : "pointer",
                    marginTop: "4px",
                  }}
                >
                  {submitting ? (
                    <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                      <Spinner /> Resetting password…
                    </span>
                  ) : "Reset Password"}
                </button>

                <p style={{ textAlign: "center", fontSize: "13px", color: "var(--text-muted)" }}>
                  Remembered it?{" "}
                  <button
                    type="button"
                    onClick={() => navigate("/auth?mode=login")}
                    style={{ color: "var(--cyan)", fontWeight: 600, background: "none", border: "none", cursor: "pointer" }}
                  >Back to sign in</button>
                </p>
              </form>
            </>
          )}
        </div>
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spinSlow { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

/* ── Icons ────────────────────────────────────────────────────── */
function EyeIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}
function EyeOffIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}
function Spinner() {
  return (
    <span style={{
      width:        "15px",
      height:       "15px",
      borderRadius: "50%",
      border:       "2px solid rgba(255,255,255,0.3)",
      borderTop:    "2px solid #fff",
      animation:    "spinSlow 0.7s linear infinite",
      display:      "inline-block",
      flexShrink:   0,
    }}/>
  );
}
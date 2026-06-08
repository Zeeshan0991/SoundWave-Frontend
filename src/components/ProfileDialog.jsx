import { useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { getDisplayName, getAvatarLetter } from "../api";

/**
 * ProfileDialog
 *
 * Opens when user clicks avatar in TopBar.
 * Sections:
 *  1. Avatar upload (drag & drop or click)
 *  2. Username edit
 *  3. Email (read-only)
 *  4. Change password
 *
 * Props:
 *  onClose  {function}
 *
 * PHASE 3 FIX:
 *  After a successful avatar upload, `avatarPreview` is synced to the real
 *  CDN URL returned by the server (via `result.avatarUrl`), replacing the
 *  stale FileReader blob URL. This means:
 *   - The avatar inside the dialog updates instantly ✅
 *   - TopBar and Sidebar update instantly (they read from AuthContext) ✅
 *   - No page refresh required ✅
 */
export default function ProfileDialog({ onClose }) {
  // ✅ PHASE 5: added createPassword to destructure
  const { user, updateProfile, uploadAvatar, changePassword, createPassword } = useAuth();
  const toast = useToast();

  // Determine if this is a Google-only account (no local password yet)
  // Used to show the "Create Password" tab only when relevant
  const isGoogleOnly = !!(user?.googleId || user?.google_id) && !user?.hasPassword;

  /* ── Tabs ─────────────────────────────────────────────────── */
  // ✅ PHASE 5: tab can now be "profile" | "password" | "create-password"
  // "create-password" tab only shown for Google-only accounts
  const [tab, setTab] = useState("profile");

  /* ── Profile fields ───────────────────────────────────────── */
  const [username,    setUsername]    = useState(user?.username || "");
  const [savingProf,  setSavingProf]  = useState(false);
  const [profErrors,  setProfErrors]  = useState({});

  /* ── Avatar ───────────────────────────────────────────────── */
  const [avatarPreview,    setAvatarPreview]    = useState(user?.avatar || null);
  const [avatarFile,       setAvatarFile]       = useState(null);
  const [uploadingAvatar,  setUploadingAvatar]  = useState(false);
  const [dragOver,         setDragOver]         = useState(false);
  const fileInputRef = useRef(null);

  /* ── Password fields ──────────────────────────────────────── */
  const [currentPass,  setCurrentPass]  = useState("");
  const [newPass,      setNewPass]      = useState("");
  const [confirmPass,  setConfirmPass]  = useState("");
  const [showCurrent,  setShowCurrent]  = useState(false);
  const [showNew,      setShowNew]      = useState(false);
  const [savingPass,   setSavingPass]   = useState(false);
  const [passErrors,   setPassErrors]   = useState({});

  /* ── Create password fields (Google-only users) ───────────── */
  const [createPass,        setCreatePass]        = useState("");
  const [createPassConfirm, setCreatePassConfirm] = useState("");
  const [showCreatePass,    setShowCreatePass]     = useState(false);
  const [savingCreate,      setSavingCreate]       = useState(false);
  const [createErrors,      setCreateErrors]       = useState({});

  /* ── Avatar helpers ───────────────────────────────────────── */
  const handleFileSelect = (file) => {
    if (!file || !file.type.startsWith("image/")) {
      toast.error("Please select a valid image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB.");
      return;
    }
    setAvatarFile(file);
    // Show a local preview immediately while the upload is pending
    const reader = new FileReader();
    reader.onload = (e) => setAvatarPreview(e.target.result);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    handleFileSelect(file);
  };

  // ✅ PHASE 3 FIX: after upload, sync avatarPreview to the real CDN URL
  // returned by the server so the dialog shows the persisted image, not the
  // temporary FileReader blob. TopBar + Sidebar update via AuthContext.
  const handleAvatarUpload = async () => {
    if (!avatarFile) return;
    setUploadingAvatar(true);
    const result = await uploadAvatar(avatarFile);
    setUploadingAvatar(false);

    if (result.success) {
      toast.success("Profile photo updated!");
      setAvatarFile(null);
      // Sync preview to the real persisted URL (not the blob URL)
      if (result.avatarUrl) {
        setAvatarPreview(result.avatarUrl);
      }
    } else {
      toast.error(result.message || "Failed to upload photo.");
      // Revert preview to whatever was there before the failed upload
      setAvatarPreview(user?.avatar || null);
      setAvatarFile(null);
    }
  };

  /* ── Save profile ─────────────────────────────────────────── */
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!username.trim()) errs.username = "Username cannot be empty.";
    else if (!/^[a-zA-Z0-9_]+$/.test(username))
      errs.username = "Only letters, numbers, and underscores.";
    else if (username.length < 3)
      errs.username = "At least 3 characters required.";

    if (Object.keys(errs).length) {
      setProfErrors(errs);
      return;
    }

    setSavingProf(true);
    const result = await updateProfile({ username });
    setSavingProf(false);

    if (result.success) {
      toast.success("Profile updated!");
      setProfErrors({});
    } else {
      if (result.message?.toLowerCase().includes("username"))
        setProfErrors({ username: result.message });
      else toast.error(result.message || "Failed to update profile.");
    }
  };

  /* ── Change password ──────────────────────────────────────── */
  const handleChangePassword = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!currentPass) errs.currentPass = "Enter your current password.";
    if (!newPass) errs.newPass = "Enter a new password.";
    else if (newPass.length < 6) errs.newPass = "At least 6 characters.";
    if (!confirmPass) errs.confirmPass = "Confirm your new password.";
    else if (newPass !== confirmPass)
      errs.confirmPass = "Passwords do not match.";

    if (Object.keys(errs).length) {
      setPassErrors(errs);
      return;
    }

    setSavingPass(true);
    const result = await changePassword({
      currentPassword: currentPass,
      newPassword: newPass,
    });
    setSavingPass(false);

    if (result.success) {
      toast.success("Password changed successfully!");
      setCurrentPass("");
      setNewPass("");
      setConfirmPass("");
      setPassErrors({});
    } else {
      if (
        result.message?.toLowerCase().includes("current") ||
        result.message?.toLowerCase().includes("incorrect")
      )
        setPassErrors({ currentPass: "Current password is incorrect." });
      else toast.error(result.message || "Failed to change password.");
    }
  };

  /* ── Create password (Google-only users) ─────────────────────
   * PHASE 5: This is the correct, secure place for this feature.
   * The user is already authenticated (they opened ProfileDialog
   * from inside the app). The JWT proves account ownership.
   ────────────────────────────────────────────────────────────── */
  const handleCreatePassword = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!createPass) errs.createPass = "Enter a new password.";
    else if (createPass.length < 6) errs.createPass = "At least 6 characters.";
    if (!createPassConfirm) errs.createPassConfirm = "Confirm your password.";
    else if (createPass !== createPassConfirm)
      errs.createPassConfirm = "Passwords do not match.";

    if (Object.keys(errs).length) { setCreateErrors(errs); return; }

    setSavingCreate(true);
    const result = await createPassword({ newPassword: createPass });
    setSavingCreate(false);

    if (result.success) {
      toast.success("Password created! You can now sign in with email too.");
      setCreatePass("");
      setCreatePassConfirm("");
      setCreateErrors({});
      // Switch to profile tab — user is still logged in
      setTab("profile");
    } else {
      toast.error(result.message || "Failed to create password.");
    }
  };

  /* ── Close on overlay click ───────────────────────────────── */
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const hue =
    [...(user?.username || "U")].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;

  return (
    <div
      onClick={handleOverlayClick}
      style={{
        position:   "fixed",
        inset:      0,
        background: "rgba(2,4,8,0.82)",
        zIndex:     1000,
        display:    "flex",
        alignItems: "center",
        justifyContent: "center",
        padding:    "20px",
        animation:  "fadeIn 0.18s ease both",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background:   "var(--bg-elevated)",
          border:       "1px solid var(--border-subtle)",
          borderRadius: "22px",
          width:        "100%",
          maxWidth:     "480px",
          boxShadow:    "0 24px 80px rgba(0,0,0,0.7)",
          animation:    "scaleIn 0.22s var(--ease-spring) both",
          overflow:     "hidden",
        }}
      >
        {/* ── Header ──────────────────────────────────────── */}
        <div
          style={{
            display:        "flex",
            alignItems:     "center",
            justifyContent: "space-between",
            padding:        "22px 24px 18px",
            borderBottom:   "1px solid var(--border-faint)",
          }}
        >
          <div>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize:   "18px",
                fontWeight: 700,
              }}
            >
              Edit Profile
            </h2>
            <p
              style={{
                fontSize:  "12.5px",
                color:     "var(--text-muted)",
                marginTop: "3px",
              }}
            >
              Manage your account settings
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width:          "32px",
              height:         "32px",
              borderRadius:   "50%",
              background:     "none",
              border:         "1px solid var(--border-faint)",
              color:          "var(--text-muted)",
              fontSize:       "18px",
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              cursor:         "pointer",
              transition:     "all var(--t-fast)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--bg-hover)";
              e.currentTarget.style.color      = "var(--text-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "none";
              e.currentTarget.style.color      = "var(--text-muted)";
            }}
          >
            ×
          </button>
        </div>

        {/* ── Tabs ────────────────────────────────────────── */}
        <div
          style={{
            display:      "flex",
            padding:      "12px 24px 0",
            gap:          "4px",
            borderBottom: "1px solid var(--border-faint)",
          }}
        >
          {[
            ["profile",  "Profile"],
            ["password", "Password"],
            // ✅ PHASE 5: "Create Password" tab only shown for Google-only accounts
            ...(isGoogleOnly ? [["create-password", "Create Password"]] : []),
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                padding:      "8px 16px",
                borderRadius: "8px 8px 0 0",
                fontFamily:   "var(--font-display)",
                fontWeight:   tab === key ? 700 : 500,
                fontSize:     "13px",
                color:        tab === key ? "var(--cyan)" : "var(--text-muted)",
                background:   tab === key ? "var(--bg-surface)" : "none",
                border:       tab === key
                  ? "1px solid var(--border-faint)"
                  : "1px solid transparent",
                borderBottom: tab === key
                  ? "1px solid var(--bg-surface)"
                  : "1px solid transparent",
                marginBottom: "-1px",
                cursor:       "pointer",
                transition:   "all var(--t-fast)",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div style={{ padding: "24px", maxHeight: "70vh", overflowY: "auto" }}>

          {/* ══ PROFILE TAB ══════════════════════════════ */}
          {tab === "profile" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

              {/* Avatar upload */}
              <div>
                <div
                  style={{
                    fontSize:      "12px",
                    fontWeight:    600,
                    color:         "var(--text-secondary)",
                    letterSpacing: "0.6px",
                    textTransform: "uppercase",
                    marginBottom:  "12px",
                  }}
                >
                  Profile Photo
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>

                  {/* Current avatar preview */}
                  <div
                    style={{
                      width:          "72px",
                      height:         "72px",
                      borderRadius:   "50%",
                      overflow:       "hidden",
                      flexShrink:     0,
                      border:         "2px solid var(--cyan-border)",
                      background:     `linear-gradient(135deg, hsl(${hue},55%,28%), hsl(${(hue + 80) % 360},45%,20%))`,
                      display:        "flex",
                      alignItems:     "center",
                      justifyContent: "center",
                      fontFamily:     "var(--font-display)",
                      fontWeight:     800,
                      fontSize:       "24px",
                      color:          `hsl(${hue},70%,75%)`,
                    }}
                  >
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt="avatar"
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      getAvatarLetter(user)
                    )}
                  </div>

                  {/* Drop zone */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    style={{
                      flex:         1,
                      padding:      "16px",
                      borderRadius: "12px",
                      border:       `2px dashed ${dragOver ? "var(--cyan)" : "var(--border-subtle)"}`,
                      background:   dragOver ? "var(--cyan-dim)" : "var(--bg-surface)",
                      textAlign:    "center",
                      cursor:       "pointer",
                      transition:   "all var(--t-fast)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "var(--cyan-border)";
                      e.currentTarget.style.background  = "rgba(0,212,255,0.03)";
                    }}
                    onMouseLeave={(e) => {
                      if (!dragOver) {
                        e.currentTarget.style.borderColor = "var(--border-subtle)";
                        e.currentTarget.style.background  = "var(--bg-surface)";
                      }
                    }}
                  >
                    <div style={{ fontSize: "20px", marginBottom: "4px" }}>📷</div>
                    <div
                      style={{
                        fontSize:   "12.5px",
                        color:      "var(--text-secondary)",
                        fontWeight: 500,
                      }}
                    >
                      {avatarFile ? avatarFile.name : "Drop image or click to upload"}
                    </div>
                    <div
                      style={{
                        fontSize:  "11px",
                        color:     "var(--text-muted)",
                        marginTop: "3px",
                      }}
                    >
                      JPG, PNG, GIF · max 5MB
                    </div>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => handleFileSelect(e.target.files?.[0])}
                  />
                </div>

                {/* Upload button — only shown when a new file is selected */}
                {avatarFile && (
                  <button
                    onClick={handleAvatarUpload}
                    disabled={uploadingAvatar}
                    className="btn-primary"
                    style={{
                      marginTop: "12px",
                      padding:   "9px 20px",
                      fontSize:  "13px",
                      opacity:   uploadingAvatar ? 0.7 : 1,
                    }}
                  >
                    {uploadingAvatar ? (
                      <><Spinner /> Uploading…</>
                    ) : (
                      "Upload Photo"
                    )}
                  </button>
                )}
              </div>

              {/* Username + profile form */}
              <form
                onSubmit={handleSaveProfile}
                style={{ display: "flex", flexDirection: "column", gap: "16px" }}
              >
                {/* Display name info */}
                {user?.displayName && user.displayName !== user?.username && (
                  <div
                    style={{
                      padding:      "10px 14px",
                      background:   "var(--cyan-dim)",
                      border:       "1px solid var(--cyan-border)",
                      borderRadius: "10px",
                      fontSize:     "13px",
                      color:        "var(--cyan)",
                      display:      "flex",
                      alignItems:   "center",
                      gap:          "8px",
                    }}
                  >
                    <span>👤</span>
                    <span>
                      Displayed as <strong>{getDisplayName(user)}</strong>{" "}
                      across SOUNDWAVE
                    </span>
                  </div>
                )}

                <div>
                  <div
                    style={{
                      fontSize:      "12px",
                      fontWeight:    600,
                      color:         "var(--text-secondary)",
                      letterSpacing: "0.6px",
                      textTransform: "uppercase",
                      marginBottom:  "6px",
                    }}
                  >
                    Username
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      setProfErrors((p) => ({ ...p, username: "" }));
                    }}
                    style={{
                      width:        "100%",
                      padding:      "12px 14px",
                      background:   "var(--bg-surface)",
                      border:       `1px solid ${profErrors.username ? "rgba(255,107,107,0.5)" : "var(--border-subtle)"}`,
                      borderRadius: "10px",
                      color:        "var(--text-primary)",
                      fontSize:     "14.5px",
                      outline:      "none",
                      transition:   "border-color var(--t-fast)",
                      fontFamily:   "var(--font-body)",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "var(--cyan-border)";
                      e.target.style.boxShadow   = "0 0 0 3px rgba(0,212,255,0.07)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = profErrors.username
                        ? "rgba(255,107,107,0.5)"
                        : "var(--border-subtle)";
                      e.target.style.boxShadow = "none";
                    }}
                  />
                  {profErrors.username && (
                    <div
                      style={{
                        fontSize:   "12px",
                        color:      "var(--coral)",
                        marginTop:  "5px",
                        display:    "flex",
                        alignItems: "center",
                        gap:        "4px",
                      }}
                    >
                      <span>⚠</span> {profErrors.username}
                    </div>
                  )}
                </div>

                {/* Email (read-only) */}
                <div>
                  <div
                    style={{
                      fontSize:      "12px",
                      fontWeight:    600,
                      color:         "var(--text-secondary)",
                      letterSpacing: "0.6px",
                      textTransform: "uppercase",
                      marginBottom:  "6px",
                      display:       "flex",
                      alignItems:    "center",
                      gap:           "6px",
                    }}
                  >
                    Email
                    <span
                      style={{
                        fontSize:     "10px",
                        padding:      "1px 7px",
                        background:   "var(--bg-raised)",
                        border:       "1px solid var(--border-faint)",
                        borderRadius: "999px",
                        color:        "var(--text-muted)",
                        fontWeight:   500,
                      }}
                    >
                      Read-only
                    </span>
                  </div>
                  <input
                    type="email"
                    value={user?.email || ""}
                    readOnly
                    style={{
                      width:        "100%",
                      padding:      "12px 14px",
                      background:   "var(--bg-surface)",
                      border:       "1px solid var(--border-faint)",
                      borderRadius: "10px",
                      color:        "var(--text-muted)",
                      fontSize:     "14.5px",
                      outline:      "none",
                      fontFamily:   "var(--font-body)",
                      cursor:       "not-allowed",
                    }}
                  />
                </div>

                {/* Role badge */}
                <div>
                  <div
                    style={{
                      fontSize:      "12px",
                      fontWeight:    600,
                      color:         "var(--text-secondary)",
                      letterSpacing: "0.6px",
                      textTransform: "uppercase",
                      marginBottom:  "8px",
                    }}
                  >
                    Account Type
                  </div>
                  <div
                    style={{
                      display:      "inline-flex",
                      alignItems:   "center",
                      gap:          "6px",
                      padding:      "7px 14px",
                      background:   user?.role === "artist" ? "var(--violet-dim)" : "var(--cyan-dim)",
                      border:       `1px solid ${user?.role === "artist" ? "var(--violet-border)" : "var(--cyan-border)"}`,
                      borderRadius: "999px",
                      fontSize:     "13px",
                      fontWeight:   700,
                      color:        user?.role === "artist" ? "var(--violet)" : "var(--cyan)",
                      textTransform:"capitalize",
                    }}
                  >
                    {user?.role === "artist" ? "🎤" : "🎧"}{" "}
                    {user?.role || "listener"}
                  </div>
                </div>

                {/* Save button */}
                <button
                  type="submit"
                  disabled={savingProf || username === user?.username}
                  className="btn-primary"
                  style={{
                    padding:  "12px",
                    fontSize: "14px",
                    opacity:  savingProf || username === user?.username ? 0.55 : 1,
                    cursor:   savingProf || username === user?.username
                      ? "not-allowed"
                      : "pointer",
                  }}
                >
                  {savingProf ? (
                    <><Spinner /> Saving…</>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </form>
            </div>
          )}

          {/* ══ PASSWORD TAB ════════════════════════════ */}
          {tab === "password" && (
            <form
              onSubmit={handleChangePassword}
              style={{ display: "flex", flexDirection: "column", gap: "18px" }}
            >
              <div
                style={{
                  padding:      "12px 14px",
                  background:   "var(--cyan-dim)",
                  border:       "1px solid var(--cyan-border)",
                  borderRadius: "10px",
                  fontSize:     "13px",
                  color:        "var(--cyan)",
                  display:      "flex",
                  alignItems:   "center",
                  gap:          "8px",
                }}
              >
                <span>🔒</span>
                Choose a strong password at least 6 characters long.
              </div>

              <PassField
                label="Current Password"
                value={currentPass}
                onChange={(e) => {
                  setCurrentPass(e.target.value);
                  setPassErrors((p) => ({ ...p, currentPass: "" }));
                }}
                show={showCurrent}
                onToggle={() => setShowCurrent((s) => !s)}
                error={passErrors.currentPass}
                placeholder="Your current password"
                autoComplete="current-password"
              />

              <PassField
                label="New Password"
                value={newPass}
                onChange={(e) => {
                  setNewPass(e.target.value);
                  setPassErrors((p) => ({ ...p, newPass: "" }));
                }}
                show={showNew}
                onToggle={() => setShowNew((s) => !s)}
                error={passErrors.newPass}
                placeholder="At least 6 characters"
                autoComplete="new-password"
              />

              {newPass && <PasswordStrength password={newPass} />}

              <PassField
                label="Confirm New Password"
                value={confirmPass}
                onChange={(e) => {
                  setConfirmPass(e.target.value);
                  setPassErrors((p) => ({ ...p, confirmPass: "" }));
                }}
                show={showNew}
                onToggle={() => setShowNew((s) => !s)}
                error={passErrors.confirmPass}
                placeholder="Repeat new password"
                autoComplete="new-password"
              />

              <button
                type="submit"
                disabled={savingPass}
                className="btn-primary"
                style={{
                  padding:   "12px",
                  fontSize:  "14px",
                  opacity:   savingPass ? 0.7 : 1,
                  cursor:    savingPass ? "not-allowed" : "pointer",
                  marginTop: "4px",
                }}
              >
                {savingPass ? (
                  <><Spinner /> Updating…</>
                ) : (
                  "Update Password"
                )}
              </button>
            </form>
          )}
          {/* ══ CREATE PASSWORD TAB (Google-only users) ══════════
           * PHASE 5: This is the secure, authenticated way for a
           * Google user to add a local password to their account.
           * They are already signed in — no email proof needed.
           ════════════════════════════════════════════════════ */}
          {tab === "create-password" && isGoogleOnly && (
            <form
              onSubmit={handleCreatePassword}
              style={{ display: "flex", flexDirection: "column", gap: "18px" }}
            >
              {/* Explanation banner */}
              <div
                style={{
                  padding:      "12px 14px",
                  background:   "var(--violet-dim)",
                  border:       "1px solid var(--violet-border)",
                  borderRadius: "10px",
                  fontSize:     "13px",
                  color:        "var(--violet)",
                  display:      "flex",
                  alignItems:   "flex-start",
                  gap:          "8px",
                }}
              >
                <span style={{ fontSize: "16px", flexShrink: 0 }}>🔑</span>
                <span>
                  Add a password to your account so you can also sign in with
                  your email and password — in addition to Google Sign-In.
                  Your Google login will continue to work.
                </span>
              </div>

              {/* Account info */}
              <div
                style={{
                  padding:      "10px 14px",
                  background:   "var(--bg-surface)",
                  border:       "1px solid var(--border-faint)",
                  borderRadius: "10px",
                  fontSize:     "13px",
                  color:        "var(--text-secondary)",
                  display:      "flex",
                  alignItems:   "center",
                  gap:          "8px",
                }}
              >
                <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>
                  Account:
                </span>
                <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                  {user?.email}
                </span>
              </div>

              <PassField
                label="New Password"
                value={createPass}
                onChange={(e) => {
                  setCreatePass(e.target.value);
                  setCreateErrors((p) => ({ ...p, createPass: "" }));
                }}
                show={showCreatePass}
                onToggle={() => setShowCreatePass((s) => !s)}
                error={createErrors.createPass}
                placeholder="At least 6 characters"
                autoComplete="new-password"
              />

              {createPass && <PasswordStrength password={createPass} />}

              <PassField
                label="Confirm Password"
                value={createPassConfirm}
                onChange={(e) => {
                  setCreatePassConfirm(e.target.value);
                  setCreateErrors((p) => ({ ...p, createPassConfirm: "" }));
                }}
                show={showCreatePass}
                onToggle={() => setShowCreatePass((s) => !s)}
                error={createErrors.createPassConfirm}
                placeholder="Repeat your password"
                autoComplete="new-password"
              />

              <button
                type="submit"
                disabled={savingCreate}
                className="btn-primary"
                style={{
                  padding:   "12px",
                  fontSize:  "14px",
                  opacity:   savingCreate ? 0.7 : 1,
                  cursor:    savingCreate ? "not-allowed" : "pointer",
                  marginTop: "4px",
                }}
              >
                {savingCreate ? (
                  <><Spinner /> Creating Password…</>
                ) : (
                  "Create Password & Enable Email Login"
                )}
              </button>

              <p style={{ textAlign: "center", fontSize: "12px", color: "var(--text-muted)", lineHeight: 1.6 }}>
                Your Google Sign-In will continue to work alongside your new password.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ───────────────────────────────────────────── */
function PassField({ label, value, onChange, show, onToggle, error, placeholder, autoComplete }) {
  return (
    <div>
      <div
        style={{
          fontSize:      "12px",
          fontWeight:    600,
          color:         "var(--text-secondary)",
          letterSpacing: "0.6px",
          textTransform: "uppercase",
          marginBottom:  "6px",
        }}
      >
        {label}
      </div>
      <div style={{ position: "relative" }}>
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          style={{
            width:        "100%",
            padding:      "12px 44px 12px 14px",
            background:   "var(--bg-surface)",
            border:       `1px solid ${error ? "rgba(255,107,107,0.5)" : "var(--border-subtle)"}`,
            borderRadius: "10px",
            color:        "var(--text-primary)",
            fontSize:     "14.5px",
            outline:      "none",
            transition:   "border-color var(--t-fast), box-shadow var(--t-fast)",
            fontFamily:   "var(--font-body)",
          }}
          onFocus={(e) => {
            e.target.style.borderColor = "var(--cyan-border)";
            e.target.style.boxShadow   = "0 0 0 3px rgba(0,212,255,0.07)";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = error
              ? "rgba(255,107,107,0.5)"
              : "var(--border-subtle)";
            e.target.style.boxShadow = "none";
          }}
        />
        <button
          type="button"
          onClick={onToggle}
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
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
        >
          {show ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>
      {error && (
        <div
          style={{
            fontSize:   "12px",
            color:      "var(--coral)",
            marginTop:  "5px",
            display:    "flex",
            alignItems: "center",
            gap:        "4px",
          }}
        >
          <span>⚠</span> {error}
        </div>
      )}
    </div>
  );
}

function PasswordStrength({ password }) {
  let s = 0;
  if (password.length >= 6)          s++;
  if (password.length >= 10)         s++;
  if (/[A-Z]/.test(password))        s++;
  if (/[0-9]/.test(password))        s++;
  if (/[^A-Za-z0-9]/.test(password)) s++;
  const labels = ["", "Very weak", "Weak", "Fair", "Strong", "Very strong"];
  const colors = ["", "#ff6b6b", "#ff6b6b", "#ffd166", "#06d6a0", "#00d4ff"];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
      <div style={{ display: "flex", gap: "4px" }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            style={{
              flex:       1,
              height:     "3px",
              borderRadius:"2px",
              background: i <= s ? colors[s] : "var(--bg-raised)",
              transition: "background 0.3s ease",
            }}
          />
        ))}
      </div>
      <span style={{ fontSize: "11px", color: colors[s] || "var(--text-muted)", fontWeight: 500 }}>
        {labels[s]}
      </span>
    </div>
  );
}

function Spinner() {
  return (
    <span
      style={{
        width:        "13px",
        height:       "13px",
        borderRadius: "50%",
        border:       "2px solid rgba(255,255,255,0.25)",
        borderTop:    "2px solid #fff",
        animation:    "spinSlow 0.7s linear infinite",
        display:      "inline-block",
        flexShrink:   0,
      }}
    />
  );
}
// src/pages/UploadPage.jsx
import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import api from "../api";

const GENRES = [
  "Pop", "Hip-Hop", "Electronic", "R&B", "Rock", "Jazz", "Classical",
  "Lo-Fi", "Indie", "Afrobeats", "Latin", "Soul", "Metal", "Country",
  "Reggae", "Folk", "Blues", "Punk",
];

const MOODS = [
  "Energetic", "Chill", "Melancholic", "Happy", "Dark", "Romantic",
  "Aggressive", "Peaceful", "Nostalgic", "Uplifting",
];

// ✅ PHASE 3: Added "Urdu" — required for Naat mood accuracy
const LANGUAGES = [
  "English", "Hindi", "Urdu", "Arabic", "Punjabi", "Spanish",
];

// ✅ PHASE 3: Added "naat" and "nasheed" categories
const CATEGORIES = [
  { value: "music",   label: "Music"   },
  { value: "podcast", label: "Podcast" },
  { value: "audio",   label: "Audio"   },
  { value: "naat",    label: "Naat"    },
  { value: "nasheed", label: "Nasheed" },
];

// ✅ PHASE 3: Tags for AI mood matching — multi-select, any combination allowed
const TAGS = [
  "Chill", "Focus", "Coding", "Study", "Sleep", "Gym", "Workout",
  "Road Trip", "Rainy Day", "Late Night", "Party", "Sad", "Upbeat",
  "Devotional", "Meditation", "Acoustic", "Instrumental",
];

const ACCEPTED_AUDIO = [
  "audio/mpeg", "audio/mp3", "audio/wav", "audio/flac",
  "audio/aac", "audio/ogg", "audio/x-flac", "audio/x-wav",
];

const MAX_AUDIO_MB = 50;
const MAX_COVER_MB = 8;

/* ═══════════════════════════════════════════════════════════════
   UPLOAD PAGE
═══════════════════════════════════════════════════════════════ */
export default function UploadPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  /* ── Audio ───────────────────────────────────────────────── */
  const [audioFile, setAudioFile] = useState(null);
  const [audioDrag, setAudioDrag] = useState(false);
  const [audioPreview, setAudioPreview] = useState(null);
  const [audioDuration, setAudioDuration] = useState(null);

  /* ── Cover ───────────────────────────────────────────────── */
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [coverDrag, setCoverDrag] = useState(false);

  /* ── Metadata ────────────────────────────────────────────── */
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("");
  const [mood, setMood] = useState("");
  const [language, setLanguage] = useState("");
  const [category, setCategory] = useState("music");
  const [lyrics, setLyrics] = useState("");
  const [isExplicit, setIsExplicit] = useState(false);
  // ✅ PHASE 3: tags state — multi-select array
  const [tags, setTags] = useState([]);

  /* ── State ───────────────────────────────────────────────── */
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState({});

  const audioInputRef = useRef(null);
  const coverInputRef = useRef(null);
  const audioElRef = useRef(new Audio());

  useEffect(
    () => () => {
      if (audioPreview) URL.revokeObjectURL(audioPreview);
    },
    [audioPreview],
  );

  /* ── Handle audio file ───────────────────────────────────── */
  const handleAudioFile = useCallback(
    (file) => {
      if (!file) return;
      const validType =
        ACCEPTED_AUDIO.includes(file.type) ||
        /\.(mp3|wav|flac|aac|ogg)$/i.test(file.name);
      if (!validType) {
        toast.error("Unsupported format. Use MP3, WAV, FLAC, AAC or OGG.");
        return;
      }
      if (file.size > MAX_AUDIO_MB * 1024 * 1024) {
        toast.error(`Audio file must be under ${MAX_AUDIO_MB}MB.`);
        return;
      }
      setAudioFile(file);
      setErrors((p) => ({ ...p, audio: "" }));

      if (!title) {
        const name = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
        setTitle(name.charAt(0).toUpperCase() + name.slice(1));
      }

      const url = URL.createObjectURL(file);
      setAudioPreview(url);
      const el = audioElRef.current;
      el.src = url;
      el.onloadedmetadata = () => setAudioDuration(Math.floor(el.duration));
    },
    [title, toast],
  );

  /* ── Handle cover file ───────────────────────────────────── */
  const handleCoverFile = useCallback(
    (file) => {
      if (!file?.type.startsWith("image/")) {
        toast.error("Please select an image file.");
        return;
      }
      if (file.size > MAX_COVER_MB * 1024 * 1024) {
        toast.error(`Cover must be under ${MAX_COVER_MB}MB.`);
        return;
      }
      setCoverFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setCoverPreview(e.target.result);
      reader.readAsDataURL(file);
      setErrors((p) => ({ ...p, cover: "" }));
    },
    [toast],
  );

  /* ── Validate ────────────────────────────────────────────── */
  const validate = () => {
    const errs = {};
    if (!audioFile) errs.audio = "Please select an audio file.";
    if (!title.trim()) errs.title = "Track title is required.";
    if (!genre) errs.genre = "Please select a genre.";
    return errs;
  };

  /* ── Submit ──────────────────────────────────────────────── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    setUploading(true);
    setUploadPct(0);
    setDone(false);

    try {
      const form = new FormData();
      form.append("audio", audioFile);
      form.append("title", title.trim());
      form.append("genre", genre);
      if (mood) form.append("mood", mood);
      if (lyrics) form.append("lyrics", lyrics.trim());
      if (coverFile) form.append("cover", coverFile);
      if (audioDuration) form.append("duration", String(audioDuration));
      form.append("isExplicit", String(isExplicit));
      if (language) form.append("language", language);
      form.append("category", category);
      // ✅ PHASE 3: append tags as JSON string (controller parses it)
      if (tags.length > 0) form.append("tags", JSON.stringify(tags));

      await api.post("/music/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (evt) => {
          if (evt.total)
            setUploadPct(Math.round((evt.loaded / evt.total) * 100));
        },
      });

      setDone(true);
      setUploadPct(100);
      toast.success(`"${title}" uploaded successfully!`);
      setTimeout(() => navigate("/my-music"), 1200);
    } catch (err) {
      const msg =
        err.response?.data?.message || "Upload failed. Please try again.";
      toast.error(msg);
      setUploadPct(0);
    } finally {
      setUploading(false);
    }
  };

  const fmtDur = (s) =>
    s ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : null;
  const fmtSize = (b) =>
    b >= 1024 * 1024
      ? `${(b / (1024 * 1024)).toFixed(1)} MB`
      : `${(b / 1024).toFixed(0)} KB`;

  /* ── Progress % of form filled ───────────────────────────── */
  const completeness = [
    !!audioFile,
    !!title.trim(),
    !!genre,
    !!coverFile,
    !!mood,
    !!language,
  ].filter(Boolean).length;
  const completePct = Math.round((completeness / 6) * 100);

  return (
    <div
      style={{
        padding: "32px 32px 80px",
        maxWidth: "900px",
        animation: "fadeUp 0.4s ease both",
      }}
    >
      {/* ── Header ───────────────────────────────────────── */}
      <div style={{ marginBottom: "32px" }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            color: "var(--text-muted)",
            fontSize: "13px",
            background: "none",
            border: "none",
            cursor: "pointer",
            marginBottom: "16px",
            transition: "color var(--t-fast)",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.color = "var(--text-primary)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.color = "var(--text-muted)")
          }
        >
          ← Back
        </button>

        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "20px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "30px",
                fontWeight: 800,
                letterSpacing: "-0.5px",
                marginBottom: "6px",
              }}
            >
              Upload Track
            </h1>
            <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
              Share your music with the world · MP3, WAV, FLAC, AAC, OGG · max{" "}
              {MAX_AUDIO_MB}MB
            </p>
          </div>

          {/* Completeness indicator */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: "6px",
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              Form {completePct}% complete
            </span>
            <div
              style={{
                width: "120px",
                height: "4px",
                background: "var(--bg-raised)",
                borderRadius: "2px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${completePct}%`,
                  background:
                    completePct === 100
                      ? "var(--green)"
                      : "linear-gradient(90deg, var(--violet), var(--cyan))",
                  borderRadius: "2px",
                  transition: "width 0.4s ease",
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "28px",
            alignItems: "start",
          }}
        >
          {/* ══ LEFT ════════════════════════════════════════ */}
          <div
            style={{ display: "flex", flexDirection: "column", gap: "22px" }}
          >
            {/* Audio drop zone */}
            <div>
              <FieldLabel required>Audio File</FieldLabel>
              {!audioFile ? (
                <DropZone
                  dragging={audioDrag}
                  error={errors.audio}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setAudioDrag(true);
                  }}
                  onDragLeave={() => setAudioDrag(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setAudioDrag(false);
                    handleAudioFile(e.dataTransfer.files?.[0]);
                  }}
                  onClick={() => audioInputRef.current?.click()}
                >
                  <div style={{ fontSize: "36px", marginBottom: "10px" }}>
                    🎵
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "15px",
                      fontWeight: 700,
                      marginBottom: "5px",
                    }}
                  >
                    Drop your track here
                  </div>
                  <div
                    style={{
                      fontSize: "13px",
                      color: "var(--text-secondary)",
                      marginBottom: "4px",
                    }}
                  >
                    or click to browse
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                    MP3, WAV, FLAC, AAC, OGG · max {MAX_AUDIO_MB}MB
                  </div>
                </DropZone>
              ) : (
                <FileCard
                  icon={<AudioIcon />}
                  name={audioFile.name}
                  meta={[fmtSize(audioFile.size), fmtDur(audioDuration)]
                    .filter(Boolean)
                    .join(" · ")}
                  accent="var(--cyan)"
                  accentDim="var(--cyan-dim)"
                  accentBorder="var(--cyan-border)"
                  onRemove={() => {
                    setAudioFile(null);
                    setAudioPreview(null);
                    setAudioDuration(null);
                  }}
                />
              )}
              <input
                ref={audioInputRef}
                type="file"
                accept="audio/*"
                style={{ display: "none" }}
                onChange={(e) => handleAudioFile(e.target.files?.[0])}
              />
              {errors.audio && <ErrorMsg>{errors.audio}</ErrorMsg>}
            </div>

            {/* Cover art */}
            <div>
              <FieldLabel>
                Cover Art <OptLabel />
              </FieldLabel>
              <div
                style={{
                  display: "flex",
                  gap: "14px",
                  alignItems: "flex-start",
                }}
              >
                <div
                  onClick={() => coverInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setCoverDrag(true);
                  }}
                  onDragLeave={() => setCoverDrag(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setCoverDrag(false);
                    handleCoverFile(e.dataTransfer.files?.[0]);
                  }}
                  style={{
                    width: "100px",
                    height: "100px",
                    borderRadius: "12px",
                    flexShrink: 0,
                    border: `2px dashed ${coverDrag ? "var(--cyan)" : coverPreview ? "var(--border-subtle)" : "var(--border-faint)"}`,
                    background: coverPreview
                      ? "transparent"
                      : coverDrag
                        ? "var(--cyan-dim)"
                        : "var(--bg-surface)",
                    overflow: "hidden",
                    cursor: "pointer",
                    transition: "all var(--t-fast)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {coverPreview ? (
                    <img
                      src={coverPreview}
                      alt="cover"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <span style={{ fontSize: "28px" }}>🎨</span>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <p
                    style={{
                      fontSize: "13px",
                      color: "var(--text-secondary)",
                      lineHeight: 1.6,
                      marginBottom: "8px",
                    }}
                  >
                    Square image recommended.
                    <br />
                    JPG or PNG, max {MAX_COVER_MB}MB.
                  </p>
                  {coverPreview && (
                    <button
                      type="button"
                      onClick={() => {
                        setCoverFile(null);
                        setCoverPreview(null);
                      }}
                      style={{
                        padding: "5px 12px",
                        borderRadius: "7px",
                        background: "none",
                        border: "1px solid var(--border-faint)",
                        color: "var(--text-muted)",
                        fontSize: "12px",
                        cursor: "pointer",
                        transition: "all var(--t-fast)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor =
                          "rgba(255,107,107,0.3)";
                        e.currentTarget.style.color = "var(--coral)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor =
                          "var(--border-faint)";
                        e.currentTarget.style.color = "var(--text-muted)";
                      }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => handleCoverFile(e.target.files?.[0])}
              />
            </div>

            {/* Lyrics */}
            <div>
              <FieldLabel>
                Lyrics <OptLabel />
              </FieldLabel>
              <textarea
                value={lyrics}
                onChange={(e) => setLyrics(e.target.value)}
                placeholder="Paste your lyrics here…"
                rows={7}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "11px",
                  color: "var(--text-primary)",
                  fontSize: "13.5px",
                  outline: "none",
                  resize: "vertical",
                  transition: "all var(--t-fast)",
                  fontFamily: "var(--font-body)",
                  lineHeight: 1.7,
                  minHeight: "110px",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "var(--cyan-border)";
                  e.target.style.boxShadow = "0 0 0 3px rgba(0,212,255,0.07)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "var(--border-subtle)";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>
          </div>

          {/* ══ RIGHT ═══════════════════════════════════════ */}
          <div
            style={{ display: "flex", flexDirection: "column", gap: "22px" }}
          >
            {/* Title */}
            <div>
              <FieldLabel required>Track Title</FieldLabel>
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setErrors((p) => ({ ...p, title: "" }));
                }}
                placeholder="What's this track called?"
                maxLength={80}
                style={{
                  width: "100%",
                  padding: "13px 16px",
                  background: "var(--bg-surface)",
                  border: `1px solid ${errors.title ? "rgba(255,107,107,0.5)" : "var(--border-subtle)"}`,
                  borderRadius: "11px",
                  color: "var(--text-primary)",
                  fontSize: "15px",
                  outline: "none",
                  transition: "all var(--t-fast)",
                  fontFamily: "var(--font-body)",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "var(--cyan-border)";
                  e.target.style.boxShadow = "0 0 0 3px rgba(0,212,255,0.07)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = errors.title
                    ? "rgba(255,107,107,0.5)"
                    : "var(--border-subtle)";
                  e.target.style.boxShadow = "none";
                }}
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: "4px",
                }}
              >
                {errors.title ? <ErrorMsg>{errors.title}</ErrorMsg> : <span />}
                <span
                  style={{
                    fontSize: "11px",
                    color:
                      title.length > 70 ? "var(--coral)" : "var(--text-muted)",
                  }}
                >
                  {title.length}/80
                </span>
              </div>
            </div>

            {/* Genre */}
            <div>
              <FieldLabel required>Genre</FieldLabel>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "7px" }}>
                {GENRES.map((g) => (
                  <ChipBtn
                    key={g}
                    label={g}
                    active={genre === g}
                    activeColor="var(--cyan)"
                    activeBg="var(--cyan-dim)"
                    activeBorder="var(--cyan-border)"
                    onClick={() => {
                      setGenre(g);
                      setErrors((p) => ({ ...p, genre: "" }));
                    }}
                  />
                ))}
              </div>
              {errors.genre && (
                <ErrorMsg style={{ marginTop: "6px" }}>{errors.genre}</ErrorMsg>
              )}
            </div>

            {/* Mood */}
            <div>
              <FieldLabel>
                Mood <OptLabel />
              </FieldLabel>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "7px" }}>
                {MOODS.map((m) => (
                  <ChipBtn
                    key={m}
                    label={m}
                    active={mood === m}
                    activeColor="var(--violet)"
                    activeBg="var(--violet-dim)"
                    activeBorder="var(--violet-border)"
                    onClick={() => setMood((p) => (p === m ? "" : m))}
                  />
                ))}
              </div>
            </div>

            {/* Language */}
            <div>
              <FieldLabel>
                Language <OptLabel />
              </FieldLabel>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "7px" }}>
                {LANGUAGES.map((l) => (
                  <ChipBtn
                    key={l}
                    label={l}
                    active={language === l}
                    activeColor="var(--green)"
                    activeBg="var(--green-dim)"
                    activeBorder="var(--green-border)"
                    onClick={() => setLanguage((p) => (p === l ? "" : l))}
                  />
                ))}
              </div>
            </div>

            {/* Category */}
            <div>
              <FieldLabel>Category</FieldLabel>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {CATEGORIES.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setCategory(c.value)}
                    style={{
                      flex: "1 1 auto",
                      padding: "9px 6px",
                      borderRadius: "10px",
                      textAlign: "center",
                      border: `1px solid ${category === c.value ? "var(--violet-border)" : "var(--border-faint)"}`,
                      background:
                        category === c.value
                          ? "var(--violet-dim)"
                          : "var(--bg-surface)",
                      cursor: "pointer",
                      transition: "all var(--t-fast)",
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "var(--font-display)",
                        fontWeight: 700,
                        fontSize: "13px",
                        color:
                          category === c.value
                            ? "var(--violet)"
                            : "var(--text-primary)",
                      }}
                    >
                      {c.label}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* ✅ PHASE 3: Tags — multi-select vibe chips */}
            <div>
              <FieldLabel>
                Vibe Tags <OptLabel />
              </FieldLabel>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "8px", marginTop: "-4px" }}>
                Helps AI match this track to the right mood playlists
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "7px" }}>
                {TAGS.map((t) => (
                  <ChipBtn
                    key={t}
                    label={t}
                    active={tags.includes(t)}
                    activeColor="var(--amber, #f59e0b)"
                    activeBg="rgba(245,158,11,0.1)"
                    activeBorder="rgba(245,158,11,0.35)"
                    onClick={() =>
                      setTags((prev) =>
                        prev.includes(t)
                          ? prev.filter((x) => x !== t)
                          : [...prev, t]
                      )
                    }
                  />
                ))}
              </div>
              {tags.length > 0 && (
                <button
                  type="button"
                  onClick={() => setTags([])}
                  style={{
                    marginTop: "8px",
                    fontSize: "11px",
                    color: "var(--text-muted)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    transition: "color var(--t-fast)",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--coral)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                >
                  Clear tags
                </button>
              )}
            </div>

            {/* Explicit toggle */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 18px",
                background: "var(--bg-surface)",
                border: "1px solid var(--border-faint)",
                borderRadius: "12px",
              }}
            >
              <div>
                <div style={{ fontSize: "14px", fontWeight: 600 }}>
                  Explicit Content
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "var(--text-muted)",
                    marginTop: "2px",
                  }}
                >
                  Mark if this track contains explicit lyrics
                </div>
              </div>
              <Toggle
                on={isExplicit}
                onToggle={() => setIsExplicit((p) => !p)}
              />
            </div>

            {/* Upload progress */}
            {uploading && <UploadProgress pct={uploadPct} done={done} />}

            {/* Preview player */}
            {audioPreview && !uploading && (
              <div
                style={{
                  padding: "14px 16px",
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-faint)",
                  borderRadius: "12px",
                }}
              >
                <p
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    letterSpacing: "1px",
                    textTransform: "uppercase",
                    color: "var(--text-muted)",
                    marginBottom: "8px",
                  }}
                >
                  Preview
                </p>
                <audio
                  src={audioPreview}
                  controls
                  style={{ width: "100%", height: "32px", opacity: 0.85 }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Submit row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: "12px",
            marginTop: "32px",
            paddingTop: "24px",
            borderTop: "1px solid var(--border-faint)",
          }}
        >
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn-ghost"
            style={{ padding: "11px 24px" }}
            disabled={uploading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={uploading}
            className="btn-primary"
            style={{
              padding: "11px 28px",
              opacity: uploading ? 0.7 : 1,
              cursor: uploading ? "not-allowed" : "pointer",
              gap: "8px",
            }}
          >
            {uploading ? (
              <>
                <Spinner /> Uploading {uploadPct}%
              </>
            ) : (
              <>
                <UploadIcon /> Publish Track
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ── DropZone ─────────────────────────────────────────────────── */
function DropZone({ children, dragging, error, onClick, onDragOver, onDragLeave, onDrop }) {
  return (
    <div
      onClick={onClick}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      style={{
        padding: "40px 20px",
        borderRadius: "16px",
        textAlign: "center",
        cursor: "pointer",
        border: `2px dashed ${dragging ? "var(--cyan)" : error ? "rgba(255,107,107,0.5)" : "var(--border-subtle)"}`,
        background: dragging ? "var(--cyan-dim)" : "var(--bg-surface)",
        transition: "all var(--t-fast)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--cyan-border)";
        e.currentTarget.style.background = "rgba(0,212,255,0.02)";
      }}
      onMouseLeave={(e) => {
        if (!dragging) {
          e.currentTarget.style.borderColor = error
            ? "rgba(255,107,107,0.5)"
            : "var(--border-subtle)";
          e.currentTarget.style.background = "var(--bg-surface)";
        }
      }}
    >
      {children}
    </div>
  );
}

/* ── FileCard ─────────────────────────────────────────────────── */
function FileCard({ icon, name, meta, accent, accentDim, accentBorder, onRemove }) {
  return (
    <div
      style={{
        padding: "14px 16px",
        borderRadius: "14px",
        background: "var(--bg-surface)",
        border: `1px solid ${accentBorder}`,
        display: "flex",
        alignItems: "center",
        gap: "14px",
      }}
    >
      <div
        style={{
          width: "46px",
          height: "46px",
          borderRadius: "11px",
          background: accentDim,
          border: `1px solid ${accentBorder}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: accent,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="truncate" style={{ fontSize: "13.5px", fontWeight: 600 }}>
          {name}
        </div>
        <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "3px" }}>
          {meta}
        </div>
      </div>
      <button
        type="button"
        onClick={onRemove}
        style={{
          width: "26px",
          height: "26px",
          borderRadius: "50%",
          background: "none",
          border: "1px solid var(--border-faint)",
          color: "var(--text-muted)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "16px",
          transition: "all var(--t-fast)",
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--coral-dim)";
          e.currentTarget.style.color = "var(--coral)";
          e.currentTarget.style.borderColor = "rgba(255,107,107,0.3)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "none";
          e.currentTarget.style.color = "var(--text-muted)";
          e.currentTarget.style.borderColor = "var(--border-faint)";
        }}
      >
        ×
      </button>
    </div>
  );
}

/* ── ChipBtn ──────────────────────────────────────────────────── */
function ChipBtn({ label, active, activeColor, activeBg, activeBorder, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "6px 13px",
        borderRadius: "999px",
        fontSize: "12.5px",
        border: `1px solid ${active ? activeBorder : "var(--border-faint)"}`,
        background: active ? activeBg : "var(--bg-surface)",
        color: active ? activeColor : "var(--text-secondary)",
        fontWeight: active ? 700 : 400,
        cursor: "pointer",
        transition: "all var(--t-fast)",
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.borderColor = "var(--border-subtle)";
          e.currentTarget.style.color = "var(--text-primary)";
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.borderColor = "var(--border-faint)";
          e.currentTarget.style.color = "var(--text-secondary)";
        }
      }}
    >
      {label}
    </button>
  );
}

/* ── Toggle ───────────────────────────────────────────────────── */
function Toggle({ on, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      style={{
        width: "44px",
        height: "24px",
        borderRadius: "12px",
        background: on
          ? "linear-gradient(135deg, var(--cyan), var(--violet))"
          : "var(--bg-raised)",
        border: `1px solid ${on ? "transparent" : "var(--border-subtle)"}`,
        cursor: "pointer",
        position: "relative",
        transition: "all var(--t-smooth)",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "2px",
          left: on ? "22px" : "2px",
          width: "18px",
          height: "18px",
          borderRadius: "50%",
          background: "#fff",
          transition: "left var(--t-smooth)",
          boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
        }}
      />
    </button>
  );
}

/* ── Upload Progress ──────────────────────────────────────────── */
function UploadProgress({ pct, done }) {
  return (
    <div
      style={{
        padding: "18px",
        background: "var(--bg-surface)",
        border: `1px solid ${done ? "var(--green-dim)" : "var(--cyan-border)"}`,
        borderRadius: "14px",
        animation: "fadeUp 0.3s ease both",
        transition: "border-color 0.3s",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "10px",
        }}
      >
        <span
          style={{
            fontSize: "13.5px",
            fontWeight: 600,
            color: done ? "var(--green)" : "var(--cyan)",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          {done ? "✓ Upload complete!" : "Uploading…"}
        </span>
        <span
          style={{
            fontSize: "13px",
            color: "var(--text-muted)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {pct}%
        </span>
      </div>
      <div
        style={{
          height: "6px",
          background: "var(--bg-raised)",
          borderRadius: "3px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: done
              ? "var(--green)"
              : "linear-gradient(90deg, var(--violet), var(--cyan))",
            borderRadius: "3px",
            transition: "width 0.2s linear, background 0.4s ease",
            boxShadow: done ? "0 0 8px var(--green)" : "0 0 8px var(--cyan)",
          }}
        />
      </div>
      {!done && (
        <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "8px" }}>
          Please don't close this tab while uploading.
        </p>
      )}
    </div>
  );
}

/* ── Helpers ──────────────────────────────────────────────────── */
function FieldLabel({ children, required }) {
  return (
    <div
      style={{
        fontSize: "12px",
        fontWeight: 600,
        color: "var(--text-secondary)",
        letterSpacing: "0.6px",
        textTransform: "uppercase",
        marginBottom: "8px",
        display: "flex",
        alignItems: "center",
        gap: "4px",
      }}
    >
      {children}
      {required && (
        <span style={{ color: "var(--coral)", fontSize: "14px" }}>*</span>
      )}
    </div>
  );
}
function OptLabel() {
  return (
    <span
      style={{
        fontSize: "10px",
        color: "var(--text-muted)",
        fontWeight: 400,
        letterSpacing: 0,
        textTransform: "none",
      }}
    >
      (optional)
    </span>
  );
}
function ErrorMsg({ children, style }) {
  return (
    <div
      style={{
        fontSize: "12px",
        color: "var(--coral)",
        marginTop: "5px",
        display: "flex",
        alignItems: "center",
        gap: "4px",
        ...style,
      }}
    >
      <span>⚠</span> {children}
    </div>
  );
}
function Spinner() {
  return (
    <span
      style={{
        width: "13px",
        height: "13px",
        borderRadius: "50%",
        border: "2px solid rgba(255,255,255,0.25)",
        borderTop: "2px solid #fff",
        animation: "spinSlow 0.7s linear infinite",
        display: "inline-block",
        flexShrink: 0,
      }}
    />
  );
}
function AudioIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}
function UploadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}
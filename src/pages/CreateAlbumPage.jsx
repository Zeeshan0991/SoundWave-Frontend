// src/pages/CreateAlbumPage.jsx
import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "../context/ToastContext";
import api from "../api";

const GENRES = [
  "Pop", "Hip-Hop", "Electronic", "R&B", "Rock", "Jazz", "Classical",
  "Lo-Fi", "Indie", "Afrobeats", "Latin", "Soul", "Metal", "Country",
  "Reggae", "Folk", "Blues", "Punk",
];

// ✅ PHASE 3: Added "Urdu"
const LANGUAGES = [
  "English", "Hindi", "Urdu", "Arabic", "Punjabi", "Spanish",
];

// ✅ PHASE 3: Tags for AI mood matching — multi-select, any combination allowed
const TAGS = [
  "Chill", "Focus", "Coding", "Study", "Sleep", "Gym", "Workout",
  "Road Trip", "Rainy Day", "Late Night", "Party", "Sad", "Upbeat",
  "Devotional", "Meditation", "Acoustic", "Instrumental",
];

const ALBUM_TYPES = [
  { value: "album", label: "Album", desc: "4+ tracks" },
  { value: "ep",    label: "EP",    desc: "2–6 tracks" },
  { value: "single",label: "Single",desc: "1–3 tracks" },
];

export default function CreateAlbumPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toast = useToast();
  const editId = searchParams.get("edit");
  const isEdit = !!editId;

  /* ── Form state ──────────────────────────────────────────── */
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("");
  const [language, setLanguage] = useState("");
  const [type, setType] = useState("album");
  const [description, setDescription] = useState("");
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [selectedTracks, setSelectedTracks] = useState([]);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  // ✅ PHASE 3: tags state — multi-select array
  const [tags, setTags] = useState([]);

  /* ── My tracks ───────────────────────────────────────────── */
  const [myTracks, setMyTracks] = useState([]);
  const [loadingTracks, setLoadingTracks] = useState(true);

  const coverInputRef = useRef(null);

  /* ── Init ────────────────────────────────────────────────── */
  useEffect(() => {
    (async () => {
      setLoadingTracks(true);
      try {
        const tracksRes = await api.get("/music/my-songs");
        setMyTracks(tracksRes.data?.songs || []);

        if (isEdit) {
          const { data } = await api.get(`/music/albums/${editId}`);
          const album = data?.album || data;
          setTitle(album.title || "");
          setGenre(album.genre || "");
          setLanguage(album.language || "");
          setType(album.type || "album");
          setDescription(album.description || "");
          setCoverPreview(album.coverImage || album.coverUrl || null);
          setSelectedTracks((album.musics || []).map((t) => t._id || t));
          // ✅ PHASE 3: restore tags on edit
          setTags(Array.isArray(album.tags) ? album.tags : []);
        }
      } catch {
        toast.error("Failed to load data.");
      } finally {
        setLoadingTracks(false);
      }
    })();
  }, [editId]); // eslint-disable-line

  /* ── Cover ───────────────────────────────────────────────── */
  const handleCoverFile = (file) => {
    if (!file?.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Cover must be under 8MB.");
      return;
    }
    setCoverFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setCoverPreview(e.target.result);
    reader.readAsDataURL(file);
    setErrors((p) => ({ ...p, cover: "" }));
  };

  /* ── Track selection ─────────────────────────────────────── */
  const toggleTrack = (trackId) => {
    setSelectedTracks((prev) =>
      prev.includes(trackId)
        ? prev.filter((id) => id !== trackId)
        : [...prev, trackId],
    );
    setErrors((p) => ({ ...p, tracks: "" }));
  };

  const moveTrack = (index, dir) => {
    setSelectedTracks((prev) => {
      const arr = [...prev];
      const swap = index + dir;
      if (swap < 0 || swap >= arr.length) return arr;
      [arr[index], arr[swap]] = [arr[swap], arr[index]];
      return arr;
    });
  };

  /* ── Validate ────────────────────────────────────────────── */
  const validate = () => {
    const errs = {};
    if (!title.trim()) errs.title = "Album title is required.";
    if (!genre) errs.genre = "Please select a genre.";
    if (!isEdit && !coverFile) errs.cover = "Cover art is required.";
    if (selectedTracks.length === 0)
      errs.tracks = "Add at least one track to the album.";
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

    setSubmitting(true);
    try {
      const form = new FormData();
      form.append("title", title.trim());
      form.append("genre", genre);
      form.append("type", type);
      if (language) form.append("language", language);
      if (description) form.append("description", description.trim());
      form.append("musics", JSON.stringify(selectedTracks));
      if (coverFile) form.append("cover", coverFile);
      // ✅ PHASE 3: append tags as JSON string (controller parses it)
      if (tags.length > 0) form.append("tags", JSON.stringify(tags));

      if (isEdit) {
        await api.put(`/music/albums/${editId}`, form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success("Album updated!");
        navigate(`/album/${editId}`);
      } else {
        const res = await api.post("/music/albums", form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        const newId = res.data?.album?._id || res.data?._id;
        toast.success("Album created!");
        navigate(newId ? `/album/${newId}` : "/my-music");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save album.");
    } finally {
      setSubmitting(false);
    }
  };

  const orderedSelected = selectedTracks
    .map((id) => myTracks.find((t) => t._id === id))
    .filter(Boolean);
  const unselectedTracks = myTracks.filter(
    (t) => !selectedTracks.includes(t._id),
  );

  return (
    <div
      style={{
        padding: "32px 32px 80px",
        maxWidth: "960px",
        animation: "fadeUp 0.4s ease both",
      }}
    >
      {/* Header */}
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
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
        >
          ← Back
        </button>

        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "30px",
            fontWeight: 800,
            letterSpacing: "-0.5px",
            marginBottom: "6px",
          }}
        >
          {isEdit ? "Edit Album" : "Create New Album"}
        </h1>
        <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
          {isEdit
            ? "Update your album details and tracklist."
            : "Group your tracks into an album, EP or single."}
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1.4fr",
            gap: "28px",
            alignItems: "start",
          }}
        >
          {/* ── LEFT ─────────────────────────────────────── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Cover art */}
            <FormSection title="Cover Art" error={errors.cover} required={!isEdit}>
              <div
                onClick={() => coverInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); handleCoverFile(e.dataTransfer.files?.[0]); }}
                style={{
                  width: "100%",
                  paddingBottom: "100%",
                  position: "relative",
                  borderRadius: "16px",
                  overflow: "hidden",
                  border: `2px dashed ${dragOver ? "var(--cyan)" : errors.cover ? "rgba(255,107,107,0.5)" : "var(--border-subtle)"}`,
                  background: coverPreview ? "transparent" : dragOver ? "var(--cyan-dim)" : "var(--bg-surface)",
                  cursor: "pointer",
                  transition: "all var(--t-fast)",
                }}
                onMouseEnter={(e) => { if (!coverPreview) e.currentTarget.style.borderColor = "var(--cyan-border)"; }}
                onMouseLeave={(e) => {
                  if (!coverPreview && !dragOver)
                    e.currentTarget.style.borderColor = errors.cover ? "rgba(255,107,107,0.5)" : "var(--border-subtle)";
                }}
              >
                {coverPreview ? (
                  <img src={coverPreview} alt="cover" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "10px" }}>
                    <div style={{ fontSize: "32px" }}>🎨</div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)" }}>Drop image or click</div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>JPG, PNG · max 8MB</div>
                  </div>
                )}
              </div>
              <input ref={coverInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => handleCoverFile(e.target.files?.[0])} />
              {coverPreview && (
                <button
                  type="button"
                  onClick={() => { setCoverFile(null); setCoverPreview(null); }}
                  style={{ marginTop: "8px", width: "100%", padding: "7px", background: "none", border: "1px solid var(--border-faint)", borderRadius: "8px", color: "var(--text-muted)", fontSize: "12px", cursor: "pointer", transition: "all var(--t-fast)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(255,107,107,0.3)"; e.currentTarget.style.color = "var(--coral)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-faint)"; e.currentTarget.style.color = "var(--text-muted)"; }}
                >
                  Remove Cover
                </button>
              )}
            </FormSection>

            {/* Release type */}
            <FormSection title="Release Type">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "8px" }}>
                {ALBUM_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setType(t.value)}
                    style={{
                      padding: "10px 6px",
                      borderRadius: "10px",
                      textAlign: "center",
                      border: `1px solid ${type === t.value ? "var(--cyan-border)" : "var(--border-faint)"}`,
                      background: type === t.value ? "var(--cyan-dim)" : "var(--bg-surface)",
                      cursor: "pointer",
                      transition: "all var(--t-fast)",
                    }}
                  >
                    <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "13px", color: type === t.value ? "var(--cyan)" : "var(--text-primary)" }}>{t.label}</div>
                    <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px" }}>{t.desc}</div>
                  </button>
                ))}
              </div>
            </FormSection>

            {/* ✅ PHASE 3: Tags — multi-select vibe chips (left column on album page) */}
            <FormSection title="Vibe Tags">
              <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "8px", marginTop: "-6px" }}>
                Helps AI match this album to mood playlists
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "7px" }}>
                {TAGS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() =>
                      setTags((prev) =>
                        prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
                      )
                    }
                    style={{
                      padding: "6px 13px",
                      borderRadius: "999px",
                      fontSize: "12.5px",
                      border: `1px solid ${tags.includes(t) ? "rgba(245,158,11,0.35)" : "var(--border-faint)"}`,
                      background: tags.includes(t) ? "rgba(245,158,11,0.1)" : "var(--bg-surface)",
                      color: tags.includes(t) ? "#f59e0b" : "var(--text-secondary)",
                      fontWeight: tags.includes(t) ? 700 : 400,
                      cursor: "pointer",
                      transition: "all var(--t-fast)",
                    }}
                    onMouseEnter={(e) => {
                      if (!tags.includes(t)) {
                        e.currentTarget.style.borderColor = "var(--border-subtle)";
                        e.currentTarget.style.color = "var(--text-primary)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!tags.includes(t)) {
                        e.currentTarget.style.borderColor = "var(--border-faint)";
                        e.currentTarget.style.color = "var(--text-secondary)";
                      }
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
              {tags.length > 0 && (
                <button
                  type="button"
                  onClick={() => setTags([])}
                  style={{ marginTop: "8px", fontSize: "11px", color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", padding: 0, transition: "color var(--t-fast)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--coral)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                >
                  Clear tags
                </button>
              )}
            </FormSection>
          </div>

          {/* ── RIGHT ────────────────────────────────────── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Title */}
            <FormSection title="Album Title" error={errors.title} required>
              <input
                type="text"
                value={title}
                maxLength={80}
                onChange={(e) => { setTitle(e.target.value); setErrors((p) => ({ ...p, title: "" })); }}
                placeholder="Give your album a name"
                style={{ width: "100%", padding: "13px 16px", background: "var(--bg-surface)", border: `1px solid ${errors.title ? "rgba(255,107,107,0.5)" : "var(--border-subtle)"}`, borderRadius: "11px", color: "var(--text-primary)", fontSize: "15px", outline: "none", transition: "all var(--t-fast)", fontFamily: "var(--font-body)" }}
                onFocus={(e) => { e.target.style.borderColor = "var(--cyan-border)"; e.target.style.boxShadow = "0 0 0 3px rgba(0,212,255,0.07)"; }}
                onBlur={(e) => { e.target.style.borderColor = errors.title ? "rgba(255,107,107,0.5)" : "var(--border-subtle)"; e.target.style.boxShadow = "none"; }}
              />
              <div style={{ textAlign: "right", fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>{title.length}/80</div>
            </FormSection>

            {/* Genre */}
            <FormSection title="Genre" error={errors.genre} required>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "7px" }}>
                {GENRES.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => { setGenre(g); setErrors((p) => ({ ...p, genre: "" })); }}
                    style={{ padding: "6px 14px", borderRadius: "999px", border: `1px solid ${genre === g ? "var(--cyan-border)" : "var(--border-faint)"}`, background: genre === g ? "var(--cyan-dim)" : "var(--bg-surface)", color: genre === g ? "var(--cyan)" : "var(--text-secondary)", fontSize: "12.5px", fontWeight: genre === g ? 700 : 400, cursor: "pointer", transition: "all var(--t-fast)" }}
                    onMouseEnter={(e) => { if (genre !== g) { e.currentTarget.style.borderColor = "var(--border-subtle)"; e.currentTarget.style.color = "var(--text-primary)"; } }}
                    onMouseLeave={(e) => { if (genre !== g) { e.currentTarget.style.borderColor = "var(--border-faint)"; e.currentTarget.style.color = "var(--text-secondary)"; } }}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </FormSection>

            {/* Language */}
            <FormSection title="Language">
              <div style={{ display: "flex", flexWrap: "wrap", gap: "7px" }}>
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setLanguage((prev) => (prev === lang ? "" : lang))}
                    style={{ padding: "6px 14px", borderRadius: "999px", border: `1px solid ${language === lang ? "var(--cyan-border)" : "var(--border-faint)"}`, background: language === lang ? "var(--cyan-dim)" : "var(--bg-surface)", color: language === lang ? "var(--cyan)" : "var(--text-secondary)", fontSize: "12.5px", fontWeight: language === lang ? 700 : 400, cursor: "pointer", transition: "all var(--t-fast)" }}
                    onMouseEnter={(e) => { if (language !== lang) { e.currentTarget.style.borderColor = "var(--border-subtle)"; e.currentTarget.style.color = "var(--text-primary)"; } }}
                    onMouseLeave={(e) => { if (language !== lang) { e.currentTarget.style.borderColor = "var(--border-faint)"; e.currentTarget.style.color = "var(--text-secondary)"; } }}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </FormSection>

            {/* Description */}
            <FormSection title="Description">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell listeners about this release (optional)"
                rows={3}
                maxLength={500}
                style={{ width: "100%", padding: "12px 16px", background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "11px", color: "var(--text-primary)", fontSize: "14px", outline: "none", resize: "vertical", transition: "all var(--t-fast)", fontFamily: "var(--font-body)", lineHeight: 1.6, minHeight: "80px" }}
                onFocus={(e) => { e.target.style.borderColor = "var(--cyan-border)"; e.target.style.boxShadow = "0 0 0 3px rgba(0,212,255,0.07)"; }}
                onBlur={(e) => { e.target.style.borderColor = "var(--border-subtle)"; e.target.style.boxShadow = "none"; }}
              />
              <div style={{ textAlign: "right", fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>{description.length}/500</div>
            </FormSection>

            {/* Tracklist */}
            <FormSection title={`Tracklist (${selectedTracks.length} selected)`} error={errors.tracks}>
              {loadingTracks ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="skeleton" style={{ height: "48px", borderRadius: "9px" }} />
                  ))}
                </div>
              ) : myTracks.length === 0 ? (
                <div style={{ padding: "20px", textAlign: "center", background: "var(--bg-surface)", borderRadius: "11px", border: "1px solid var(--border-faint)" }}>
                  <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                    No tracks yet.{" "}
                    <button type="button" onClick={() => navigate("/upload")} style={{ color: "var(--cyan)", background: "none", border: "none", cursor: "pointer", fontSize: "13px" }}>
                      Upload tracks first →
                    </button>
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {orderedSelected.length > 0 && (
                    <div>
                      <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: "var(--cyan)", marginBottom: "8px" }}>In this album</p>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        {orderedSelected.map((track, i) => (
                          <SelectedTrackRow key={track._id} track={track} index={i} total={orderedSelected.length} onRemove={() => toggleTrack(track._id)} onMoveUp={() => moveTrack(i, -1)} onMoveDown={() => moveTrack(i, 1)} />
                        ))}
                      </div>
                    </div>
                  )}
                  {unselectedTracks.length > 0 && (
                    <div>
                      <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "8px" }}>Available tracks</p>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        {unselectedTracks.map((track) => (
                          <AvailableTrackRow key={track._id} track={track} onAdd={() => toggleTrack(track._id)} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </FormSection>
          </div>
        </div>

        {/* Submit */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "12px", marginTop: "32px", paddingTop: "24px", borderTop: "1px solid var(--border-faint)" }}>
          <button type="button" onClick={() => navigate(-1)} className="btn-ghost" style={{ padding: "11px 24px" }}>Cancel</button>
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary"
            style={{ padding: "11px 28px", opacity: submitting ? 0.7 : 1, cursor: submitting ? "not-allowed" : "pointer", gap: "8px" }}
          >
            {submitting ? (<><Spinner /> {isEdit ? "Saving…" : "Creating…"}</>) : isEdit ? "Save Changes" : "Create Album"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ── Selected track row ───────────────────────────────────────── */
function SelectedTrackRow({ track, index, total, onRemove, onMoveUp, onMoveDown }) {
  const [hovered, setHovered] = useState(false);
  const fmt = (s) => s ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}` : "--:--";
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 10px", borderRadius: "9px", background: hovered ? "var(--bg-hover)" : "var(--bg-surface)", border: "1px solid var(--cyan-border)", transition: "background var(--t-fast)" }}
    >
      <span style={{ fontSize: "12px", color: "var(--cyan)", fontWeight: 700, width: "18px", textAlign: "center", flexShrink: 0 }}>{index + 1}</span>
      <div style={{ width: "32px", height: "32px", borderRadius: "6px", background: "var(--bg-elevated)", overflow: "hidden", flexShrink: 0 }}>
        {track.coverUrl ? <img src={track.coverUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <PlaceholderArt />}
      </div>
      <span className="truncate" style={{ flex: 1, fontSize: "13px", fontWeight: 500 }}>{track.title}</span>
      <span style={{ fontSize: "11.5px", color: "var(--text-muted)", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>{fmt(track.duration)}</span>
      <div style={{ display: "flex", flexDirection: "column", gap: "1px", flexShrink: 0 }}>
        <button type="button" onClick={onMoveUp} disabled={index === 0} style={{ width: "18px", height: "14px", background: "none", border: "none", color: "var(--text-secondary)", cursor: index === 0 ? "not-allowed" : "pointer", padding: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity: index === 0 ? 0.3 : 1, fontSize: "10px" }}>▲</button>
        <button type="button" onClick={onMoveDown} disabled={index === total - 1} style={{ width: "18px", height: "14px", background: "none", border: "none", color: "var(--text-secondary)", cursor: index === total - 1 ? "not-allowed" : "pointer", padding: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity: index === total - 1 ? 0.3 : 1, fontSize: "10px" }}>▼</button>
      </div>
      <button type="button" onClick={onRemove} style={{ width: "22px", height: "22px", borderRadius: "50%", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", justifyContent: "center", transition: "all var(--t-fast)", flexShrink: 0, fontSize: "16px" }} onMouseEnter={(e) => { e.currentTarget.style.background = "var(--coral-dim)"; e.currentTarget.style.color = "var(--coral)"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "var(--text-muted)"; }}>×</button>
    </div>
  );
}

/* ── Available track row ──────────────────────────────────────── */
function AvailableTrackRow({ track, onAdd }) {
  const [hovered, setHovered] = useState(false);
  const fmt = (s) => s ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}` : "--:--";
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 10px", borderRadius: "9px", background: hovered ? "var(--bg-hover)" : "transparent", border: "1px solid var(--border-faint)", transition: "all var(--t-fast)" }}
    >
      <div style={{ width: "32px", height: "32px", borderRadius: "6px", background: "var(--bg-elevated)", overflow: "hidden", flexShrink: 0 }}>
        {track.coverUrl ? <img src={track.coverUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <PlaceholderArt />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="truncate" style={{ fontSize: "13px", fontWeight: 500 }}>{track.title}</div>
        {track.genre && <div style={{ fontSize: "10.5px", color: "var(--text-muted)", marginTop: "2px" }}>{track.genre}</div>}
      </div>
      <span style={{ fontSize: "11.5px", color: "var(--text-muted)", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>{fmt(track.duration)}</span>
      <button type="button" onClick={onAdd} style={{ width: "26px", height: "26px", borderRadius: "50%", background: hovered ? "var(--cyan-dim)" : "var(--bg-elevated)", border: `1px solid ${hovered ? "var(--cyan-border)" : "var(--border-faint)"}`, color: hovered ? "var(--cyan)" : "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all var(--t-fast)", flexShrink: 0, fontSize: "16px" }}>+</button>
    </div>
  );
}

/* ── Helpers ──────────────────────────────────────────────────── */
function FormSection({ title, error, required, children }) {
  return (
    <div>
      <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", letterSpacing: "0.6px", textTransform: "uppercase", marginBottom: "10px", display: "flex", alignItems: "center", gap: "5px" }}>
        {title}
        {required && <span style={{ color: "var(--coral)", fontSize: "14px", lineHeight: 1 }}>*</span>}
      </div>
      {children}
      {error && <div style={{ fontSize: "12px", color: "var(--coral)", marginTop: "6px", display: "flex", alignItems: "center", gap: "4px" }}><span>⚠</span> {error}</div>}
    </div>
  );
}

function PlaceholderArt() {
  return (
    <div style={{ width: "100%", height: "100%", background: "var(--bg-raised)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round">
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
      </svg>
    </div>
  );
}

function Spinner() {
  return (
    <span style={{ width: "13px", height: "13px", borderRadius: "50%", border: "2px solid rgba(255,255,255,0.25)", borderTop: "2px solid #fff", animation: "spinSlow 0.7s linear infinite", display: "inline-block", flexShrink: 0 }} />
  );
}
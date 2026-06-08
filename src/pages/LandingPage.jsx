import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext"; // ✅ ADDED

/* ── Static data ─────────────────────────────────────────────── */
const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "Artists",  href: "#artists"  },
  { label: "Pricing",  href: "#pricing"  },
  { label: "About",    href: "#about"    },
];

const FEATURES = [
  { icon: "◈", title: "Lossless Audio",   color: "#00d4ff", desc: "Every stream delivered at full fidelity — up to 24-bit/192kHz. Hear details most platforms compress away." },
  { icon: "⬡", title: "Artist First",     color: "#7b5ea7", desc: "Upload any format. Keep 90% of revenue. Full control over your catalogue, pricing, and release schedule." },
  { icon: "◎", title: "Neural Discovery", color: "#ff6b6b", desc: "Our model learns your taste at a granular level — not genre tags, but actual sonic patterns and listening behaviour." },
  { icon: "◉", title: "Live Sessions",    color: "#ffd166", desc: "Host intimate listening rooms with real-time chat. Drop surprise releases directly to your fanbase." },
  { icon: "▣", title: "Deep Analytics",   color: "#06d6a0", desc: "Per-second engagement data: where listeners skip, replay, save. Know exactly which 8 bars make your track click." },
  { icon: "◈", title: "Global Network",   color: "#00d4ff", desc: "Reach listeners across 180+ countries. Automatic localisation, currency conversion, and regional trending charts." },
];

const STATS = [
  { value: "10M+",  label: "Active Listeners" },
  { value: "500K+", label: "Artists"          },
  { value: "50M+",  label: "Tracks"           },
  { value: "180+",  label: "Countries"        },
];

const PLANS = [
  { name: "Free",       price: "$0",  period: "forever", accent: "#445577", popular: false,
    features: ["10 hrs/month streaming","Standard quality (320kbps)","Discover feed","3 playlists"], cta: "Get Started" },
  { name: "Pulse",      price: "$9",  period: "/ month", accent: "#00d4ff", popular: true,
    features: ["Unlimited streaming","Lossless quality","Offline downloads","AI recommendations","Unlimited playlists","Priority support"], cta: "Start Free Trial" },
  { name: "Artist Pro", price: "$19", period: "/ month", accent: "#7b5ea7", popular: false,
    features: ["Everything in Pulse","Unlimited uploads","Per-second analytics","Fan messaging","90/10 revenue split","Live sessions","Verified badge"], cta: "Go Pro" },
];

const TESTIMONIALS = [
  { name: "Aria Chen",     role: "Electronic Producer", initials: "AC", color: "#00d4ff", text: "SOUNDWAVE completely changed how I release music. The per-second analytics showed me exactly which drop hooks people — I rebuilt my whole arrangement around it." },
  { name: "Marcus Reeves", role: "Jazz Composer",       initials: "MR", color: "#7b5ea7", text: "Finally a platform that respects audio quality. My orchestral pieces sound the way I mixed them — every room, every breath, every detail preserved." },
  { name: "Yuki Tanaka",   role: "Hip-hop Artist",      initials: "YT", color: "#ff6b6b", text: "The discovery algorithm is genuinely scary good. It found listeners for my niche sound I never thought existed outside my city. First month: 40K new plays." },
];

const TEAM = [
  { name: "Maya Osei",      role: "CEO & Co-founder",        initials: "MO", color: "#00d4ff" },
  { name: "James Nakamura", role: "CTO & Co-founder",        initials: "JN", color: "#7b5ea7" },
  { name: "Sofia Reyes",    role: "Head of Artist Relations", initials: "SR", color: "#ff6b6b" },
  { name: "Eli Schwartz",   role: "Lead Audio Engineer",      initials: "ES", color: "#06d6a0" },
];

/* ── Real audio sources (royalty-free, reliable URLs) ─────── */
const HERO_TRACKS = [
  {
    title: "Midnight Drive", artist: "Aria Chen", dur: "3:47", color: "#00d4ff",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
  },
  {
    title: "Solar Winds", artist: "Marcus Reeves", dur: "5:12", color: "#7b5ea7",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
  },
  {
    title: "Deep Blue", artist: "Yuki Tanaka", dur: "4:03", color: "#ff6b6b",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
  },
];

/* ═══════════════════════════════════════════════════════════════
   LANDING PAGE
═══════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const navigate                            = useNavigate();
  const { user, isAuthenticated }           = useAuth();
  // ✅ CHANGED: theme now owned by ThemeContext — no local useState or useEffect
  const { isDark: darkMode, toggleTheme }   = useTheme();

  const [scrollY,       setScrollY]         = useState(0);
  const [mobileOpen,    setMobileOpen]      = useState(false);
  const [visibleSecs,   setVisibleSecs]     = useState(new Set());
  const [testimonialIdx,setTestimonialIdx]  = useState(0);
  const [barHeights,    setBarHeights]      = useState(Array.from({length:12}, () => 30 + Math.random()*70));
  const [mouse,         setMouse]           = useState({ x: 0.5, y: 0.5 });
  const [heroLoaded,    setHeroLoaded]      = useState(false);
  const [activeTrack,   setActiveTrack]     = useState(0);
  const [isPlaying,     setIsPlaying]       = useState(false);
  const [trackProgress, setTrackProgress]   = useState(0);
  const [eqBars,        setEqBars]          = useState(Array.from({length:32}, () => 15 + Math.random()*85));
  const [audioLoading,  setAudioLoading]    = useState(false);
  const [currentTime,   setCurrentTime]     = useState(0);
  const [duration,      setDuration]        = useState(0);
  const [volume,        setVolume]          = useState(0.8);

  const sectionRefs   = useRef({});
  const heroRef       = useRef(null);
  const particlesRef  = useRef([]);
  const audioRef      = useRef(null);
  const playingRef    = useRef(false);
  const trackIdxRef   = useRef(0);

  /* ── Generate particles once ──────────────────────────────── */
  if (particlesRef.current.length === 0) {
    particlesRef.current = Array.from({length: 70}, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 1 + Math.random() * 2.5,
      opacity: 0.08 + Math.random() * 0.35,
      speed: 0.008 + Math.random() * 0.02,
      drift: (Math.random() - 0.5) * 0.015,
      phase: Math.random() * Math.PI * 2,
    }));
  }

  /* ── Scroll listener ──────────────────────────────────────── */
  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* ── Mouse tracker ─────────────────────────────────────────── */
  useEffect(() => {
    const onMove = (e) => setMouse({ x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight });
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  /* ── Hero entrance ────────────────────────────────────────── */
  useEffect(() => {
    const t = setTimeout(() => setHeroLoaded(true), 80);
    return () => clearTimeout(t);
  }, []);

  /* ── Section observer ─────────────────────────────────────── */
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(e => {
        if (e.isIntersecting) setVisibleSecs(prev => new Set([...prev, e.target.dataset.sec]));
      }),
      { threshold: 0.1 }
    );
    Object.values(sectionRefs.current).forEach(el => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const secRef = (key) => (el) => {
    sectionRefs.current[key] = el;
    if (el) el.dataset.sec = key;
  };

  /* ── Testimonial rotation ─────────────────────────────────── */
  useEffect(() => {
    const t = setInterval(() => setTestimonialIdx(i => (i + 1) % TESTIMONIALS.length), 5000);
    return () => clearInterval(t);
  }, []);

  /* ── Dashboard bars ───────────────────────────────────────── */
  useEffect(() => {
    const t = setInterval(() => setBarHeights(Array.from({length:12}, () => 20 + Math.random()*80)), 1100);
    return () => clearInterval(t);
  }, []);

  /* ── EQ bars animation ────────────────────────────────────── */
  useEffect(() => {
    const t = setInterval(() => {
      if (isPlaying) setEqBars(Array.from({length:32}, () => 10 + Math.random()*90));
    }, 75);
    return () => clearInterval(t);
  }, [isPlaying]);

  /* ══════════════════════════════════════════════════════════
     AUDIO ENGINE
  ══════════════════════════════════════════════════════════ */
  useEffect(() => {
    const audio = new Audio();
    audio.volume = 0.8;
    audio.preload = "none";
    audioRef.current = audio;

    const onTimeUpdate = () => {
      const d = audio.duration;
      setCurrentTime(audio.currentTime);
      if (d && isFinite(d) && d > 0) {
        setTrackProgress((audio.currentTime / d) * 100);
      }
    };
    const onLoadedMeta = () => { setDuration(audio.duration || 0); setAudioLoading(false); };
    const onCanPlay    = () => setAudioLoading(false);
    const onWaiting    = () => setAudioLoading(true);
    const onPlaying    = () => { setAudioLoading(false); setIsPlaying(true); playingRef.current = true; };
    const onPause      = () => {};
    const onError      = () => { setAudioLoading(false); setIsPlaying(false); playingRef.current = false; };
    const onEnded      = () => {
      const next = (trackIdxRef.current + 1) % HERO_TRACKS.length;
      trackIdxRef.current = next;
      setActiveTrack(next);
    };

    audio.addEventListener("timeupdate",     onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMeta);
    audio.addEventListener("canplay",        onCanPlay);
    audio.addEventListener("waiting",        onWaiting);
    audio.addEventListener("playing",        onPlaying);
    audio.addEventListener("pause",          onPause);
    audio.addEventListener("error",          onError);
    audio.addEventListener("ended",          onEnded);

    return () => {
      audio.pause();
      audio.src = "";
      audio.removeEventListener("timeupdate",     onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMeta);
      audio.removeEventListener("canplay",        onCanPlay);
      audio.removeEventListener("waiting",        onWaiting);
      audio.removeEventListener("playing",        onPlaying);
      audio.removeEventListener("pause",          onPause);
      audio.removeEventListener("error",          onError);
      audio.removeEventListener("ended",          onEnded);
      audioRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadTrack = useCallback((idx, shouldPlay) => {
    const audio = audioRef.current;
    if (!audio) return;
    const src = HERO_TRACKS[idx].src;
    audio.pause();
    setCurrentTime(0);
    setTrackProgress(0);
    setDuration(0);
    audio.src = src;
    audio.load();
    if (shouldPlay) {
      setAudioLoading(true);
      const tryPlay = () => {
        audio.play().catch(() => {
          setIsPlaying(false);
          playingRef.current = false;
          setAudioLoading(false);
        });
      };
      audio.addEventListener("canplaythrough", tryPlay, { once: true });
      const fallback = setTimeout(() => {
        if (audio.paused && shouldPlay) {
          audio.play().catch(() => { setIsPlaying(false); playingRef.current = false; });
        }
      }, 1500);
      audio.addEventListener("canplaythrough", () => clearTimeout(fallback), { once: true });
    }
  }, []);

  useEffect(() => {
    trackIdxRef.current = activeTrack;
    loadTrack(activeTrack, playingRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTrack]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    playingRef.current = isPlaying;
    if (isPlaying) {
      if (!audio.src || audio.src === window.location.href) {
        loadTrack(activeTrack, true);
        return;
      }
      setAudioLoading(true);
      audio.play().catch(() => {
        setIsPlaying(false);
        playingRef.current = false;
        setAudioLoading(false);
      });
    } else {
      audio.pause();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  const handleSeek = useCallback((e) => {
    const audio = audioRef.current;
    if (!audio) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    if (audio.duration && isFinite(audio.duration)) {
      audio.currentTime = ratio * audio.duration;
    }
    setTrackProgress(ratio * 100);
  }, []);

  /* ── Format time ──────────────────────────────────────────── */
  const fmtTime = (s) => {
    if (!s || isNaN(s)) return "0:00";
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  };

  /* ── ✅ REMOVED: darkMode useEffect that set --lp-* CSS vars.
     ThemeContext now writes data-theme on <html>; index.css defines
     all vars per [data-theme]. No manual setProperty needed. ── */

  const scrollTo = (href) => {
    setMobileOpen(false);
    if (href === "#top") { window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
  };

  const navSolid  = scrollY > 50;
  const isVisible = (key) => visibleSecs.has(key);

  /* ── Spotlight gradient ───────────────────────────────────── */
  const spotlightStyle = darkMode ? {
    background: `radial-gradient(ellipse 700px 600px at ${mouse.x*100}% ${mouse.y*100}%,
      rgba(0,212,255,0.07) 0%, rgba(123,94,167,0.04) 40%, transparent 70%)`,
  } : {
    background: `radial-gradient(ellipse 700px 600px at ${mouse.x*100}% ${mouse.y*100}%,
      rgba(0,120,255,0.06) 0%, rgba(100,60,200,0.03) 40%, transparent 70%)`,
  };

  /* ──────────────────────────────────────────────────────────────
     RENDER
  ────────────────────────────────────────────────────────────── */
  return (
    // ✅ CHANGED: --bg-void instead of --lp-bg-void (ThemeContext sets data-theme, so global vars are always correct)
    <div style={{ background:"var(--bg-void)", overflowX:"hidden", transition:"background 0.5s ease" }}>

      {/* ══ KEYFRAMES ══════════════════════════════════════════ */}
      <style>{`
        @keyframes lpBlobA { 0%{transform:translate(0,0) scale(1)} 33%{transform:translate(60px,-50px) scale(1.08)} 66%{transform:translate(-30px,40px) scale(0.93)} 100%{transform:translate(0,0) scale(1)} }
        @keyframes lpBlobB { 0%{transform:translate(0,0) scale(1)} 33%{transform:translate(-50px,60px) scale(1.05)} 66%{transform:translate(40px,-30px) scale(0.95)} 100%{transform:translate(0,0) scale(1)} }
        @keyframes lpBlobC { 0%{transform:translate(0,0) scale(1)} 50%{transform:translate(30px,-40px) scale(1.06)} 100%{transform:translate(0,0) scale(1)} }

        @keyframes lpVinylSpin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes lpOrbPulse  { 0%,100%{opacity:.18;transform:scale(1)} 50%{opacity:.3;transform:scale(1.14)} }
        @keyframes lpFloat     { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-18px)} }
        @keyframes lpFloat2    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        @keyframes lpFloat3    { 0%,100%{transform:translateY(-6px)} 50%{transform:translateY(6px)} }
        @keyframes lpParticle  { 0%{transform:translateY(0) translateX(0);opacity:var(--op,.2)} 100%{transform:translateY(-130px) translateX(var(--dx,20px));opacity:0} }

        @keyframes lpGrain { 0%,100%{transform:translate(0,0)} 10%{transform:translate(-2%,-3%)} 20%{transform:translate(3%,2%)} 30%{transform:translate(-1%,4%)} 40%{transform:translate(4%,-1%)} 50%{transform:translate(-3%,1%)} 60%{transform:translate(1%,-4%)} 70%{transform:translate(-4%,3%)} 80%{transform:translate(2%,-2%)} 90%{transform:translate(-1%,3%)} }
        @keyframes lpScrollDot { 0%{transform:translateY(0);opacity:1} 80%{transform:translateY(10px);opacity:0} 100%{transform:translateY(0);opacity:0} }
        @keyframes lpGlowPulse { 0%,100%{opacity:1} 50%{opacity:.5} }
        @keyframes lpPanelIn   { from{opacity:0;transform:translateY(30px) scale(0.97)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes lpSlideLeft { from{opacity:0;transform:translateX(-28px)} to{opacity:1;transform:translateX(0)} }
        @keyframes lpSlideRight{ from{opacity:0;transform:translateX(28px)} to{opacity:1;transform:translateX(0)} }
        @keyframes lpFadeUp    { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:translateY(0)} }
        @keyframes lpSweep     { 0%{left:-80%} 100%{left:130%} }
        @keyframes lpEq        { 0%{transform:scaleY(.08)} 100%{transform:scaleY(1)} }
        @keyframes lpShimmer   { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes lpSpin      { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes lpPulseRing { 0%{transform:scale(0.95);box-shadow:0 0 0 0 rgba(0,212,255,0.5)} 70%{transform:scale(1);box-shadow:0 0 0 10px rgba(0,212,255,0)} 100%{transform:scale(0.95);box-shadow:0 0 0 0 rgba(0,212,255,0)} }

        @keyframes lpTogglePop { 0%{transform:scale(0.7) rotate(-30deg);opacity:0} 60%{transform:scale(1.15) rotate(5deg)} 100%{transform:scale(1) rotate(0deg);opacity:1} }
        .lp-theme-icon { animation: lpTogglePop 0.35s cubic-bezier(0.34,1.56,0.64,1) both; }

        @keyframes lpSectionReveal { from{opacity:0;transform:translateY(40px)} to{opacity:1;transform:translateY(0)} }

        .lp-grain::after {
          content:"";
          position:fixed; inset:0;
          pointer-events:none; z-index:9999;
          opacity:.022;
          background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          background-size:180px 180px;
          animation:lpGrain .4s steps(1) infinite;
        }
        .lp-grain-light::after { opacity:.015; }

        .lp-mag { transition:transform 0.25s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.25s ease !important; }
        .lp-mag:hover { transform:translateY(-3px) scale(1.03) !important; }
        .lp-mag:active { transform:scale(0.97) !important; }

        .lp-card-3d { transform-style:preserve-3d; will-change:transform; }

        .lp-grid-bg {
          background-image:
            linear-gradient(rgba(0,212,255,0.022) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,212,255,0.022) 1px, transparent 1px);
          background-size:72px 72px;
        }
        .lp-grid-bg-light {
          background-image:
            linear-gradient(rgba(0,100,200,0.045) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,100,200,0.045) 1px, transparent 1px);
          background-size:72px 72px;
        }

        .lp-signin-btn {
          padding: 8px 18px;
          font-size: 13px;
          font-weight: 600;
          border-radius: 10px;
          border: 1.5px solid var(--border-subtle);
          background: transparent;
          color: var(--text-primary) !important;
          cursor: pointer;
          transition: all 0.2s ease;
          letter-spacing: 0.2px;
        }
        .lp-signin-btn:hover {
          background: var(--bg-hover) !important;
          border-color: var(--cyan) !important;
          color: var(--cyan) !important;
        }

        .lp-ghost-btn {
          padding: 15px 34px;
          font-size: 15px;
          font-weight: 600;
          border-radius: 12px;
          border: 1.5px solid var(--border-subtle);
          background: transparent;
          color: var(--text-primary) !important;
          cursor: pointer;
          transition: all 0.22s ease;
        }
        .lp-ghost-btn:hover {
          background: var(--bg-hover) !important;
          border-color: var(--cyan) !important;
          color: var(--cyan) !important;
        }
        .lp-ghost-btn:active { transform: scale(0.98); }

        .lp-progress-track { cursor: pointer; transition: height 0.2s ease; }
        .lp-progress-track:hover { height: 5px !important; }

        .lp-vol-slider {
          -webkit-appearance: none;
          appearance: none;
          width: 70px; height: 3px;
          border-radius: 2px;
          background: rgba(255,255,255,0.12);
          outline: none; cursor: pointer;
        }
        .lp-vol-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 11px; height: 11px;
          border-radius: 50%;
          background: var(--cyan);
          cursor: pointer;
        }

        .lp-spinner {
          width: 20px; height: 20px;
          border: 2px solid rgba(255,255,255,0.15);
          border-top-color: var(--cyan);
          border-radius: 50%;
          animation: lpSpin 0.7s linear infinite;
        }

        .lp-section-blend-down {
          position: absolute; bottom: -1px; left: 0; right: 0;
          height: 120px; pointer-events: none; z-index: 2;
        }
        .lp-section-blend-up {
          position: absolute; top: -1px; left: 0; right: 0;
          height: 120px; pointer-events: none; z-index: 2;
        }

        .lp-light-aurora {
          position: absolute; inset: 0; pointer-events: none;
          background:
            radial-gradient(ellipse 900px 600px at 20% 30%, rgba(0,140,255,0.055) 0%, transparent 65%),
            radial-gradient(ellipse 700px 500px at 80% 20%, rgba(130,80,200,0.04) 0%, transparent 65%),
            radial-gradient(ellipse 600px 400px at 60% 80%, rgba(0,200,150,0.03) 0%, transparent 65%),
            radial-gradient(ellipse 500px 400px at 10% 75%, rgba(255,120,80,0.025) 0%, transparent 65%);
        }
        .lp-light-caustic {
          position: absolute; inset: 0; pointer-events: none;
          background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cdefs%3E%3CradialGradient id='g' cx='50%25' cy='50%25' r='50%25'%3E%3Cstop offset='0%25' stop-color='%230064ff' stop-opacity='0.015'/%3E%3Cstop offset='100%25' stop-color='transparent'/%3E%3C/radialGradient%3E%3C/defs%3E%3Cellipse cx='200' cy='200' rx='200' ry='200' fill='url(%23g)'/%3E%3C/svg%3E") center/60% no-repeat;
          opacity: 0.6;
        }

        @media (max-width:768px){
          #lp-mob-btn { display:flex !important; }
          #lp-desktop-nav { display:none !important; }
          .lp-hero-panels { display:none !important; }
          .lp-feature-grid { grid-template-columns:1fr !important; }
          .lp-showcase-grid { grid-template-columns:1fr !important; gap:40px !important; }
          .lp-pricing-grid { grid-template-columns:1fr !important; max-width:400px; margin:0 auto; }
          .lp-about-grid { grid-template-columns:1fr !important; }
          .lp-team-grid { grid-template-columns:repeat(2,1fr) !important; }
          .lp-stats-grid { grid-template-columns:repeat(2,1fr) !important; }
          .lp-footer-grid { grid-template-columns:1fr !important; gap:40px !important; }
          .lp-footer-links { grid-template-columns:repeat(2,1fr) !important; }
          .lp-cta-btns { flex-direction:column !important; align-items:stretch !important; }
          .lp-cta-btns > * { width:100% !important; justify-content:center !important; }
        }
        @media (max-width:900px){
          .lp-showcase-grid { grid-template-columns:1fr !important; gap:40px !important; }
        }
        @media (max-width:1024px){
          .lp-feature-grid { grid-template-columns:repeat(2,1fr) !important; }
          .lp-about-grid { grid-template-columns:1fr !important; gap:40px !important; }
          .lp-team-grid { grid-template-columns:repeat(2,1fr) !important; }
        }
      `}</style>

      {/* ── Grain overlay ──────────────────────────────────── */}
      <div className={`lp-grain${darkMode ? "" : " lp-grain-light"}`} />

      {/* ══ FIXED BACKGROUND SYSTEM ═══════════════════════════ */}
      <div style={{ position:"fixed", inset:0, zIndex:0, pointerEvents:"none", overflow:"hidden" }}>

        <div style={{ position:"absolute", inset:0, transition:"background 0.12s ease", ...spotlightStyle }} />

        {!darkMode && <div className="lp-light-aurora" />}
        {!darkMode && <div className="lp-light-caustic" />}

        <div style={{ position:"absolute", width:"900px", height:"900px", borderRadius:"50%",
          background: darkMode
            ? "radial-gradient(circle, rgba(0,212,255,0.07) 0%, transparent 65%)"
            : "radial-gradient(circle, rgba(0,140,255,0.09) 0%, transparent 65%)",
          left:"5%", top:"2%", filter:"blur(90px)",
          animation:"lpBlobA 24s ease-in-out infinite" }} />
        <div style={{ position:"absolute", width:"700px", height:"700px", borderRadius:"50%",
          background: darkMode
            ? "radial-gradient(circle, rgba(123,94,167,0.08) 0%, transparent 65%)"
            : "radial-gradient(circle, rgba(100,60,190,0.07) 0%, transparent 65%)",
          left:"60%", top:"15%", filter:"blur(80px)",
          animation:"lpBlobB 30s ease-in-out infinite" }} />
        <div style={{ position:"absolute", width:"600px", height:"600px", borderRadius:"50%",
          background: darkMode
            ? "radial-gradient(circle, rgba(255,107,107,0.04) 0%, transparent 65%)"
            : "radial-gradient(circle, rgba(255,80,80,0.04) 0%, transparent 65%)",
          left:"30%", top:"55%", filter:"blur(90px)",
          animation:"lpBlobC 20s ease-in-out infinite" }} />
        <div style={{ position:"absolute", width:"500px", height:"500px", borderRadius:"50%",
          background: darkMode
            ? "radial-gradient(circle, rgba(6,214,160,0.04) 0%, transparent 65%)"
            : "radial-gradient(circle, rgba(0,180,130,0.05) 0%, transparent 65%)",
          left:"80%", top:"70%", filter:"blur(80px)",
          animation:"lpBlobA 28s ease-in-out 4s infinite" }} />

        <div className={darkMode ? "lp-grid-bg" : "lp-grid-bg-light"} style={{ position:"absolute", inset:0 }} />

        {particlesRef.current.slice(0, 50).map(p => (
          <div key={p.id} style={{
            position:"absolute",
            left:`${p.x}%`,
            top:`${p.y + (scrollY * p.speed * 0.1)}%`,
            width:`${p.size}px`, height:`${p.size}px`,
            borderRadius:"50%",
            background: darkMode
              ? (p.id % 3 === 0 ? "#00d4ff" : p.id % 3 === 1 ? "#7b5ea7" : "#ffffff")
              : (p.id % 3 === 0 ? "#0064cc" : p.id % 3 === 1 ? "#6040b0" : "#8090cc"),
            opacity: darkMode ? p.opacity : p.opacity * 0.7,
            animation:`lpParticle ${8 + p.id % 12}s linear ${p.id * 0.3}s infinite`,
            "--dx": `${p.drift * 1000}px`,
            "--op": darkMode ? p.opacity : p.opacity * 0.7,
            pointerEvents:"none",
          }} />
        ))}

        {!darkMode && (
          <div style={{
            position:"absolute", inset:0,
            background:"radial-gradient(ellipse 100% 60% at 50% 0%, rgba(255,255,255,0.5) 0%, transparent 70%)",
            pointerEvents:"none",
          }} />
        )}
      </div>

      {/* everything above bg */}
      <div style={{ position:"relative", zIndex:1 }}>

        {/* ══ TOPBAR ═══════════════════════════════════════════ */}
        <header style={{
          position:"fixed", top:0, left:0, right:0, zIndex:900,
          padding:"0 40px",
          // ✅ CHANGED: --bg-void / --border-faint instead of --lp-* vars
          background: navSolid
            ? darkMode ? "rgba(2,4,8,0.90)" : "rgba(240,244,255,0.94)"
            : "transparent",
          backdropFilter: navSolid ? "blur(28px) saturate(200%)" : "none",
          WebkitBackdropFilter: navSolid ? "blur(28px) saturate(200%)" : "none",
          borderBottom: navSolid
            ? `1px solid var(--border-faint)`
            : "1px solid transparent",
          transition:"background 0.4s ease, border-color 0.4s ease",
        }}>
          <div style={{ maxWidth:"1240px", margin:"0 auto", height:"72px",
            display:"flex", alignItems:"center", justifyContent:"space-between", gap:"24px" }}>

            {/* Logo */}
            <button onClick={() => scrollTo("#top")} className="lp-mag" style={{
              display:"flex", alignItems:"center", gap:"10px",
              background:"none", border:"none", cursor:"pointer", flexShrink:0,
            }}>
              <LogoMark size={30} />
              {/* ✅ CHANGED: --text-primary */}
              <span style={{ fontFamily:"var(--font-display)", fontWeight:800, fontSize:"17px",
                letterSpacing:"2.5px", color:"var(--text-primary)" }}>SOUNDWAVE</span>
            </button>

            {/* Desktop nav */}
            <nav id="lp-desktop-nav" style={{ display:"flex", alignItems:"center", gap:"2px", flex:1, justifyContent:"center" }}>
              {NAV_LINKS.map(l => <NavBtn key={l.label} onClick={() => scrollTo(l.href)}>{l.label}</NavBtn>)}
            </nav>

            {/* Right cluster */}
            <div style={{ display:"flex", alignItems:"center", gap:"10px", flexShrink:0 }}>

              {/* ✅ CHANGED: toggleTheme instead of setDarkMode(d => !d) */}
              <button
                onClick={toggleTheme}
                title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                style={{
                  width:"38px", height:"38px", borderRadius:"10px",
                  background:"var(--bg-hover)",
                  border:"1px solid var(--border-subtle)",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  cursor:"pointer",
                  transition:"all 0.2s ease", overflow:"hidden",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor="var(--cyan)"; e.currentTarget.style.background="var(--cyan-dim)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor="var(--border-subtle)"; e.currentTarget.style.background="var(--bg-hover)"; }}
              >
                <span className="lp-theme-icon" key={darkMode ? "sun" : "moon"}>
                  {darkMode ? <SunIcon /> : <MoonIcon />}
                </span>
              </button>

              {isAuthenticated ? (
                <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
                  <button className="lp-signin-btn lp-mag" onClick={() => navigate("/home")}>Open App</button>
                  <button onClick={() => navigate("/home")} title={user?.username} style={{
                    width:"36px", height:"36px", borderRadius:"50%",
                    border:"2px solid var(--cyan)", overflow:"hidden", flexShrink:0,
                    background:"linear-gradient(135deg,var(--cyan),var(--violet))",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontFamily:"var(--font-display)", fontWeight:700, fontSize:"13px", color:"#fff", cursor:"pointer",
                  }}>
                    {user?.avatar
                      ? <img src={user.avatar} alt="avatar" style={{ width:"100%",height:"100%",objectFit:"cover" }} />
                      : (user?.username?.[0]||"U").toUpperCase()}
                  </button>
                </div>
              ) : (
                <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                  <button className="lp-signin-btn lp-mag" onClick={() => navigate("/auth?mode=login")}>Sign In</button>
                  <MagneticButton onClick={() => navigate("/auth?mode=signup")} style={{ padding:"9px 20px", fontSize:"13px" }}>
                    Get Started
                  </MagneticButton>
                </div>
              )}

              {/* Mobile burger */}
              <button id="lp-mob-btn" onClick={() => setMobileOpen(o=>!o)} style={{
                display:"none", width:"36px", height:"36px", alignItems:"center",
                justifyContent:"center", borderRadius:"8px",
                background:"var(--bg-hover)",
                border:"1px solid var(--border-subtle)",
                color:"var(--text-primary)", fontSize:"18px", cursor:"pointer",
              }}>{mobileOpen ? "✕" : "☰"}</button>
            </div>
          </div>

          {/* Mobile menu */}
          {mobileOpen && (
            <div style={{ borderTop:"1px solid var(--border-faint)",
              padding:"16px 24px 20px",
              background: darkMode ? "rgba(2,4,8,0.97)" : "rgba(240,244,255,0.97)",
              backdropFilter:"blur(20px)" }}>
              {NAV_LINKS.map(l => (
                <button key={l.label} onClick={() => scrollTo(l.href)} style={{
                  display:"block", width:"100%", padding:"12px 8px",
                  color:"var(--text-secondary)", fontSize:"15px", fontWeight:500,
                  textAlign:"left", background:"none", border:"none",
                  borderBottom:"1px solid var(--border-faint)", cursor:"pointer",
                }}>{l.label}</button>
              ))}
              <div style={{ display:"flex", gap:"10px", marginTop:"16px" }}>
                <button className="lp-signin-btn" onClick={() => navigate("/auth?mode=login")} style={{ flex:1 }}>Sign In</button>
                <MagneticButton onClick={() => navigate("/auth?mode=signup")} style={{ flex:1, justifyContent:"center", padding:"10px" }}>Get Started</MagneticButton>
              </div>
            </div>
          )}
        </header>

        {/* ══ HERO ═════════════════════════════════════════════ */}
        <section ref={heroRef} style={{
          minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center",
          position:"relative", overflow:"hidden", padding:"120px 40px 100px",
        }}>

          <div style={{ position:"absolute", width:"1000px", height:"1000px", borderRadius:"50%",
            background: darkMode
              ? "radial-gradient(circle, rgba(0,212,255,0.07) 0%, transparent 60%)"
              : "radial-gradient(circle, rgba(0,120,255,0.05) 0%, transparent 60%)",
            left:"50%", top:"50%", transform:"translate(-50%,-50%)",
            filter:"blur(60px)", animation:"lpOrbPulse 8s ease-in-out infinite", pointerEvents:"none" }} />

          <div style={{
            position:"absolute", right:"-3%", top:"50%",
            transform:`translateY(calc(-50% + ${scrollY*0.06}px)) rotate(${scrollY*0.04}deg)`,
            opacity: darkMode ? 0.07 : 0.05, pointerEvents:"none",
          }}>
            <VinylDisc size={560} />
          </div>

          {/* Floating panels — left */}
          <div className="lp-hero-panels" style={{
            position:"absolute", left:"4%", top:"50%",
            transform:`translateY(calc(-50% + ${(mouse.y - 0.5) * -20}px))`,
            transition:"transform 0.4s ease", pointerEvents:"none",
            animation: heroLoaded ? "lpSlideLeft 0.9s cubic-bezier(0.34,1.56,0.64,1) 0.3s both" : "none",
          }}>
            <div style={{
              background: darkMode ? "rgba(15,20,32,0.82)" : "rgba(255,255,255,0.88)",
              backdropFilter:"blur(24px)",
              border:"1px solid rgba(0,212,255,0.22)",
              borderRadius:"16px", padding:"12px 16px",
              display:"flex", alignItems:"center", gap:"12px",
              boxShadow: darkMode ? "0 20px 60px rgba(0,0,0,0.4),0 0 0 1px rgba(0,212,255,0.1)" : "0 20px 60px rgba(0,100,200,0.12),0 0 0 1px rgba(0,100,200,0.08)",
              animation:"lpFloat 6s ease-in-out infinite",
              marginBottom:"16px", minWidth:"220px",
            }}>
              <div style={{ width:"36px", height:"36px", borderRadius:"10px",
                background:"linear-gradient(135deg,#00d4ff,#7b5ea7)",
                display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <span style={{ fontSize:"14px" }}>♪</span>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:"11px", fontWeight:700, color:"var(--cyan)", letterSpacing:"0.5px" }}>NOW PLAYING</div>
                <div style={{ fontSize:"13px", fontWeight:600, color:"var(--text-primary)", marginTop:"1px" }}>Midnight Drive</div>
              </div>
              <div style={{ fontSize:"16px", color:"var(--cyan)" }}>▶</div>
            </div>

            <div style={{
              background: darkMode ? "rgba(15,20,32,0.72)" : "rgba(255,255,255,0.82)",
              backdropFilter:"blur(20px)",
              border:"1px solid rgba(123,94,167,0.22)",
              borderRadius:"14px", padding:"14px 18px",
              boxShadow: darkMode ? "0 16px 48px rgba(0,0,0,0.35)" : "0 16px 48px rgba(100,60,180,0.1)",
              animation:"lpFloat2 7s ease-in-out 1s infinite",
              marginLeft:"20px",
            }}>
              <div style={{ fontSize:"22px", fontWeight:800, color:"#7b5ea7", fontFamily:"var(--font-display)" }}>+23%</div>
              <div style={{ fontSize:"11px", color:"var(--text-muted)", marginTop:"2px" }}>Monthly growth</div>
            </div>
          </div>

          {/* Floating panels — right */}
          <div className="lp-hero-panels" style={{
            position:"absolute", right:"4%", top:"50%",
            transform:`translateY(calc(-50% + ${(mouse.y - 0.5) * -15}px))`,
            transition:"transform 0.4s ease", pointerEvents:"none",
            animation: heroLoaded ? "lpSlideRight 0.9s cubic-bezier(0.34,1.56,0.64,1) 0.4s both" : "none",
          }}>
            <div style={{
              background: darkMode ? "rgba(15,20,32,0.77)" : "rgba(255,255,255,0.88)",
              backdropFilter:"blur(20px)",
              border:"1px solid rgba(6,214,160,0.25)",
              borderRadius:"14px", padding:"14px 18px",
              boxShadow: darkMode ? "0 16px 48px rgba(0,0,0,0.35)" : "0 16px 48px rgba(0,180,120,0.1)",
              animation:"lpFloat3 5s ease-in-out infinite",
              marginBottom:"16px",
            }}>
              <div style={{ display:"flex", alignItems:"center", gap:"6px", marginBottom:"4px" }}>
                <div style={{ width:"7px", height:"7px", borderRadius:"50%", background:"#06d6a0",
                  animation:"lpGlowPulse 1.8s ease-in-out infinite" }} />
                <span style={{ fontSize:"11px", fontWeight:600, color:"#06d6a0" }}>LIVE LISTENERS</span>
              </div>
              <div style={{ fontSize:"22px", fontWeight:800, color:"var(--text-primary)", fontFamily:"var(--font-display)" }}>142,884</div>
            </div>

            <div style={{
              background: darkMode ? "rgba(15,20,32,0.72)" : "rgba(255,255,255,0.82)",
              backdropFilter:"blur(20px)",
              border:"1px solid rgba(255,107,107,0.22)",
              borderRadius:"14px", padding:"14px 18px",
              boxShadow: darkMode ? "0 16px 48px rgba(0,0,0,0.3)" : "0 16px 48px rgba(255,100,80,0.08)",
              animation:"lpFloat 9s ease-in-out 2s infinite",
              marginRight:"20px",
            }}>
              <div style={{ fontSize:"11px", fontWeight:600, color:"#ff6b6b", marginBottom:"8px", letterSpacing:"0.5px" }}>AUDIO QUALITY</div>
              <div style={{ display:"flex", alignItems:"center", gap:"2px", height:"28px" }}>
                {Array.from({length:20}).map((_,i) => (
                  <div key={i} style={{
                    width:"3px",
                    height:`${25 + Math.sin(i * 0.8) * 50}%`,
                    background:"linear-gradient(to top, #ff6b6b, #ffd166)",
                    borderRadius:"2px", opacity:0.85,
                  }} />
                ))}
              </div>
              <div style={{ fontSize:"12px", fontWeight:700, color:"var(--text-primary)", marginTop:"8px" }}>24-bit / 192kHz</div>
            </div>
          </div>

          {/* ── Hero centre ─────────────────────────────────── */}
          <div style={{
            textAlign:"center", position:"relative", zIndex:2,
            maxWidth:"800px",
            opacity: heroLoaded ? 1 : 0,
            transform: heroLoaded ? "translateY(0)" : "translateY(30px)",
            transition:"opacity 0.9s ease, transform 0.9s cubic-bezier(0.34,1.56,0.64,1)",
          }}>

            {/* Badge */}
            <div style={{
              display:"inline-flex", alignItems:"center", gap:"8px",
              padding:"7px 18px",
              background: darkMode ? "rgba(0,212,255,0.07)" : "rgba(0,100,200,0.07)",
              border:"1px solid rgba(0,212,255,0.28)",
              borderRadius:"999px", fontSize:"12.5px",
              color:"var(--cyan)", fontWeight:600,
              letterSpacing:"0.3px", marginBottom:"36px",
            }}>
              <span style={{ width:"6px", height:"6px", borderRadius:"50%",
                background:"var(--cyan)", display:"inline-block",
                animation:"lpGlowPulse 2s ease-in-out infinite" }} />
              Live Sessions now available — try it free
            </div>

            {/* Headline */}
            <h1 style={{
              fontFamily:"var(--font-display)",
              fontSize:"clamp(52px,9vw,108px)", fontWeight:800,
              lineHeight:0.95, letterSpacing:"-3px",
              color:"var(--text-primary)",
              marginBottom:"28px",
              transform:`translateY(${(mouse.y - 0.5) * -8}px)`,
              transition:"transform 0.3s ease",
            }}>
              Music That<br />
              <span className="gradient-text" style={{ letterSpacing:"-3px" }}>Moves You.</span>
            </h1>

            {/* Subtitle */}
            <p style={{
              fontSize:"19px", color:"var(--text-secondary)", lineHeight:1.75,
              fontWeight:300, maxWidth:"580px", margin:"0 auto 48px",
              transform:`translateY(${(mouse.y - 0.5) * -4}px)`,
              transition:"transform 0.3s ease",
            }}>
              The platform where listeners discover and artists thrive.<br />
              Lossless audio. Neural discovery. Real community.
            </p>

            {/* CTA Buttons */}
            <div className="lp-cta-btns" style={{ display:"flex", gap:"14px", justifyContent:"center", flexWrap:"wrap", marginBottom:"56px" }}>
              <MagneticButton onClick={() => navigate("/auth?mode=signup")} style={{ padding:"15px 38px", fontSize:"15px", gap:"10px" }}>
                <PlayIconSVG /> Start Listening Free
              </MagneticButton>
              <button className="lp-ghost-btn lp-mag" onClick={() => navigate("/auth?mode=signup&role=artist")}>
                I'm an Artist →
              </button>
            </div>

            {/* ── Real Audio Player ─────────────────────────── */}
            <HeroPlayer
              tracks={HERO_TRACKS}
              activeTrack={activeTrack}
              setActiveTrack={setActiveTrack}
              isPlaying={isPlaying}
              setIsPlaying={setIsPlaying}
              trackProgress={trackProgress}
              currentTime={currentTime}
              duration={duration}
              eqBars={eqBars}
              darkMode={darkMode}
              audioLoading={audioLoading}
              onSeek={handleSeek}
              volume={volume}
              setVolume={setVolume}
              fmtTime={fmtTime}
            />

            <p style={{ fontSize:"12.5px", color:"var(--text-muted)", marginTop:"20px" }}>
              No credit card required · Free plan available forever
            </p>
          </div>

          {/* Scroll indicator */}
          <button onClick={() => scrollTo("#stats")} style={{
            position:"absolute", bottom:"36px", left:"50%", transform:"translateX(-50%)",
            display:"flex", flexDirection:"column", alignItems:"center", gap:"8px",
            color:"var(--text-muted)", fontSize:"10px", letterSpacing:"1.5px",
            textTransform:"uppercase", background:"none", border:"none", cursor:"pointer",
            transition:"color 0.15s ease",
          }}
          onMouseEnter={e => e.currentTarget.style.color="var(--cyan)"}
          onMouseLeave={e => e.currentTarget.style.color="var(--text-muted)"}
          >
            <div style={{ width:"20px", height:"34px", border:"1.5px solid currentColor",
              borderRadius:"10px", display:"flex", justifyContent:"center", paddingTop:"5px" }}>
              <div style={{ width:"3px", height:"7px", background:"currentColor",
                borderRadius:"2px", animation:"lpScrollDot 1.4s ease infinite" }} />
            </div>
            Scroll
          </button>

          {/* Section blend-down */}
          <div className="lp-section-blend-down" style={{
            background: darkMode
              ? "linear-gradient(to bottom, transparent, var(--bg-deep))"
              : "linear-gradient(to bottom, transparent, var(--bg-deep))",
          }} />
        </section>

        {/* ══ STATS ════════════════════════════════════════════ */}
        <section id="stats" ref={secRef("stats")} style={{
          borderTop:"1px solid var(--border-faint)",
          borderBottom:"1px solid var(--border-faint)",
          background:"var(--bg-deep)", padding:"64px 40px",
          position:"relative",
        }}>
          <div style={{ maxWidth:"960px", margin:"0 auto" }}>
            <div className="lp-stats-grid" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"24px", textAlign:"center" }}>
              {STATS.map((s,i) => (
                <div key={i} style={{
                  opacity: isVisible("stats") ? 1 : 0,
                  transform: isVisible("stats") ? "translateY(0)" : "translateY(28px)",
                  transition:`opacity 0.6s ease ${i*0.1}s, transform 0.6s cubic-bezier(0.34,1.56,0.64,1) ${i*0.1}s`,
                }}>
                  <div className="gradient-text" style={{ fontFamily:"var(--font-display)",
                    fontSize:"clamp(38px,5vw,56px)", fontWeight:800, letterSpacing:"-1.5px", lineHeight:1 }}>
                    {s.value}
                  </div>
                  <div style={{ fontSize:"13px", color:"var(--text-secondary)", marginTop:"10px" }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══ FEATURES ═════════════════════════════════════════ */}
        <section id="features" ref={secRef("features")} style={{ padding:"130px 40px", textAlign:"center", position:"relative" }}>
          <div className="lp-section-blend-up" style={{
            background: darkMode
              ? "linear-gradient(to bottom, var(--bg-deep), transparent)"
              : "linear-gradient(to bottom, var(--bg-deep), transparent)",
          }} />
          <div style={{ maxWidth:"1200px", margin:"0 auto", position:"relative", zIndex:1 }}>
            <SectionBadge>What makes us different</SectionBadge>
            <h2 style={{ fontFamily:"var(--font-display)", fontSize:"clamp(36px,5vw,56px)",
              fontWeight:800, letterSpacing:"-1.5px", lineHeight:1.1, marginBottom:"16px",
              color:"var(--text-primary)" }}>
              Built for the love<br />of <span className="gradient-text">music.</span>
            </h2>
            <p style={{ fontSize:"16px", color:"var(--text-secondary)", maxWidth:"520px",
              margin:"0 auto 72px", lineHeight:1.75, fontWeight:300 }}>
              Every feature designed to enhance your experience —<br />whether you're a listener, a creator, or both.
            </p>
            <div className="lp-feature-grid" style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"20px", textAlign:"left" }}>
              {FEATURES.map((f,i) => (
                <FeatureCard key={i} feature={f} index={i} visible={isVisible("features")} />
              ))}
            </div>
          </div>
        </section>

        {/* ══ ARTIST SHOWCASE ══════════════════════════════════ */}
        <section id="artists" ref={secRef("artists")} style={{
          padding:"130px 40px", background:"var(--bg-deep)", position:"relative",
          overflow:"visible",
        }}>
          <div style={{ maxWidth:"1200px", margin:"0 auto", position:"relative", zIndex:1 }}>
            <div className="lp-showcase-grid" style={{
              display:"grid", gridTemplateColumns:"1fr 1fr",
              gap:"clamp(32px, 5vw, 72px)",
              alignItems:"center",
            }}>

              {/* Text */}
              <div style={{
                minWidth: 0,
                opacity: isVisible("artists") ? 1 : 0,
                transform: isVisible("artists") ? "translateX(0)" : "translateX(-36px)",
                transition:"opacity 0.7s ease, transform 0.7s cubic-bezier(0.34,1.56,0.64,1)",
              }}>
                <SectionBadge>For Artists</SectionBadge>
                <h2 style={{ fontFamily:"var(--font-display)", fontSize:"clamp(32px,4vw,52px)",
                  fontWeight:800, letterSpacing:"-1px", lineHeight:1.1, marginBottom:"16px",
                  color:"var(--text-primary)" }}>
                  Your music.<br />Your <span className="gradient-text">rules.</span>
                </h2>
                <p style={{ fontSize:"15px", color:"var(--text-secondary)", lineHeight:1.85,
                  marginBottom:"28px", fontWeight:300 }}>
                  Upload any format. Set your price. Keep 90% of revenue. Get real-time analytics on every stream, save, and share.
                </p>
                <ul style={{ listStyle:"none", display:"flex", flexDirection:"column", gap:"12px", marginBottom:"40px" }}>
                  {["Drag & drop — any format accepted","Custom genre + mood tagging",
                    "Per-second listener engagement data","Direct fan messaging",
                    "90 / 10 revenue split (industry-leading)"].map((item,i) => (
                    <li key={i} style={{
                      display:"flex", alignItems:"center", gap:"12px",
                      fontSize:"14px", color:"var(--text-secondary)",
                      opacity: isVisible("artists") ? 1 : 0,
                      transform: isVisible("artists") ? "translateX(0)" : "translateX(-16px)",
                      transition:`opacity 0.5s ease ${0.2+i*0.08}s, transform 0.5s ease ${0.2+i*0.08}s`,
                    }}>
                      <span style={{ width:"22px", height:"22px", borderRadius:"6px",
                        background:"rgba(6,214,160,0.15)", border:"1px solid rgba(6,214,160,0.3)",
                        display:"flex", alignItems:"center", justifyContent:"center",
                        color:"#06d6a0", fontWeight:700, fontSize:"11px", flexShrink:0 }}>✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
                <MagneticButton onClick={() => navigate("/auth?mode=signup&role=artist")} style={{ padding:"13px 32px", fontSize:"14px" }}>
                  Join as Artist →
                </MagneticButton>
              </div>

              {/* Mock dashboard */}
              <div style={{
                minWidth: 0,
                overflow: "visible",
                opacity: isVisible("artists") ? 1 : 0,
                transform: isVisible("artists") ? "translateX(0)" : "translateX(36px)",
                transition:"opacity 0.7s ease 0.15s, transform 0.7s cubic-bezier(0.34,1.56,0.64,1) 0.15s",
              }}>
                <MockDashboard barHeights={barHeights} darkMode={darkMode} />
              </div>
            </div>
          </div>
        </section>

        {/* ══ TESTIMONIALS ═════════════════════════════════════ */}
        <section ref={secRef("testimonials")} style={{ padding:"130px 40px", textAlign:"center", position:"relative" }}>
          <div style={{ maxWidth:"1200px", margin:"0 auto" }}>
            <SectionBadge>Loved by creators</SectionBadge>
            <h2 style={{ fontFamily:"var(--font-display)", fontSize:"clamp(32px,4vw,50px)",
              fontWeight:800, letterSpacing:"-1px", marginBottom:"56px",
              color:"var(--text-primary)" }}>
              What artists are <span className="gradient-text">saying.</span>
            </h2>
            <div style={{ position:"relative", overflow:"hidden", maxWidth:"740px", margin:"0 auto" }}>
              <div style={{ display:"flex", transform:`translateX(-${testimonialIdx*100}%)`, transition:"transform 0.7s cubic-bezier(0.4,0,0.2,1)" }}>
                {TESTIMONIALS.map((t,i) => (
                  <div key={i} style={{ minWidth:"100%", padding:"0 4px" }}>
                    <TestimonialCard t={t} darkMode={darkMode} />
                  </div>
                ))}
              </div>
              <div style={{ display:"flex", justifyContent:"center", gap:"8px", marginTop:"28px" }}>
                {TESTIMONIALS.map((_,i) => (
                  <button key={i} onClick={() => setTestimonialIdx(i)} style={{
                    width: testimonialIdx===i ? "28px" : "8px", height:"8px", borderRadius:"4px",
                    background: testimonialIdx===i ? "var(--cyan)" : "var(--bg-elevated)",
                    border:"none", cursor:"pointer", transition:"all 0.35s cubic-bezier(0.34,1.56,0.64,1)",
                  }} />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ══ PRICING ══════════════════════════════════════════ */}
        <section id="pricing" ref={secRef("pricing")} style={{
          padding:"130px 40px", background:"var(--bg-deep)", textAlign:"center", position:"relative" }}>
          <div style={{ maxWidth:"1100px", margin:"0 auto" }}>
            <SectionBadge>Pricing</SectionBadge>
            <h2 style={{ fontFamily:"var(--font-display)", fontSize:"clamp(32px,4vw,52px)",
              fontWeight:800, letterSpacing:"-1px", marginBottom:"14px",
              color:"var(--text-primary)" }}>
              Simple, transparent <span className="gradient-text">pricing.</span>
            </h2>
            <p style={{ fontSize:"15px", color:"var(--text-secondary)", marginBottom:"60px", fontWeight:300 }}>
              Start free. Upgrade when you're ready. Cancel anytime.
            </p>
            <div className="lp-pricing-grid" style={{
              display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"24px",
              alignItems:"stretch",
            }}>
              {PLANS.map((plan,i) => (
                <div key={i} style={{
                  display:"flex", flexDirection:"column",
                  opacity: isVisible("pricing") ? 1 : 0,
                  transform: isVisible("pricing") ? "translateY(0)" : "translateY(32px)",
                  transition:`opacity 0.6s ease ${i*0.12}s, transform 0.6s cubic-bezier(0.34,1.56,0.64,1) ${i*0.12}s`,
                }}>
                  <PricingCard plan={plan} onCta={() => navigate("/auth?mode=signup")} darkMode={darkMode} />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══ ABOUT ════════════════════════════════════════════ */}
        <section id="about" ref={secRef("about")} style={{ padding:"130px 40px" }}>
          <div style={{ maxWidth:"1100px", margin:"0 auto" }}>
            <SectionBadge>About SOUNDWAVE</SectionBadge>
            <div className="lp-about-grid" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"90px", alignItems:"center", marginBottom:"90px" }}>

              <div style={{
                opacity: isVisible("about") ? 1 : 0,
                transform: isVisible("about") ? "translateX(0)" : "translateX(-36px)",
                transition:"opacity 0.7s ease, transform 0.7s cubic-bezier(0.34,1.56,0.64,1)",
              }}>
                <h2 style={{ fontFamily:"var(--font-display)", fontSize:"clamp(32px,4vw,50px)",
                  fontWeight:800, letterSpacing:"-1px", lineHeight:1.1, marginBottom:"22px",
                  color:"var(--text-primary)" }}>
                  We built what we<br />wished <span className="gradient-text">existed.</span>
                </h2>
                <p style={{ fontSize:"15px", color:"var(--text-secondary)", lineHeight:1.9, marginBottom:"18px", fontWeight:300 }}>
                  SOUNDWAVE started in 2022 when a group of musicians and engineers got tired of
                  platforms that treated artists as an afterthought. We built the streaming service
                  we always wanted — one that takes audio quality seriously, pays artists fairly,
                  and uses technology to surface great music rather than just popular music.
                </p>
                <p style={{ fontSize:"15px", color:"var(--text-secondary)", lineHeight:1.9, fontWeight:300 }}>
                  Today we serve listeners across 180+ countries and give independent artists
                  the tools they need to build real careers — without giving up control of their art.
                </p>
              </div>

              <div style={{
                display:"grid", gridTemplateColumns:"1fr 1fr", gap:"14px",
                opacity: isVisible("about") ? 1 : 0,
                transform: isVisible("about") ? "translateX(0)" : "translateX(36px)",
                transition:"opacity 0.7s ease 0.15s, transform 0.7s cubic-bezier(0.34,1.56,0.64,1) 0.15s",
              }}>
                {[
                  { icon:"🎵", title:"Audio First",  desc:"Lossless quality as the baseline, not a premium feature.", color:"#00d4ff" },
                  { icon:"💰", title:"Fair Pay",      desc:"90% of revenue goes directly to the artists who create.", color:"#06d6a0" },
                  { icon:"🔬", title:"Real Tech",     desc:"Neural discovery that actually understands sound, not just metadata.", color:"#7b5ea7" },
                  { icon:"🌍", title:"No Borders",    desc:"Your music reaches listeners everywhere, not just major markets.", color:"#ffd166" },
                ].map((card,i) => (
                  <MissionCard key={i} card={card} index={i} visible={isVisible("about")} darkMode={darkMode} />
                ))}
              </div>
            </div>

            <div>
              <h3 style={{ fontFamily:"var(--font-display)", fontSize:"22px", fontWeight:700,
                textAlign:"center", marginBottom:"40px", color:"var(--text-primary)" }}>
                The team behind the sound
              </h3>
              <div className="lp-team-grid" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"20px" }}>
                {TEAM.map((member,i) => (
                  <TeamMember key={i} member={member} index={i} visible={isVisible("about")} />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ══ CTA ══════════════════════════════════════════════ */}
        <section style={{ padding:"140px 40px", textAlign:"center", position:"relative", overflow:"hidden",
          background:"var(--bg-deep)" }}>
          <div style={{ position:"absolute", width:"600px", height:"600px", borderRadius:"50%",
            background: darkMode ? "radial-gradient(circle, rgba(0,212,255,0.1) 0%, transparent 65%)" : "radial-gradient(circle, rgba(0,100,255,0.07) 0%, transparent 65%)",
            left:"-100px", top:"-100px", filter:"blur(70px)", pointerEvents:"none",
            animation:"lpOrbPulse 10s ease-in-out infinite" }} />
          <div style={{ position:"absolute", width:"500px", height:"500px", borderRadius:"50%",
            background: darkMode ? "radial-gradient(circle, rgba(123,94,167,0.1) 0%, transparent 65%)" : "radial-gradient(circle, rgba(100,60,180,0.07) 0%, transparent 65%)",
            right:"-80px", bottom:"-80px", filter:"blur(70px)", pointerEvents:"none",
            animation:"lpOrbPulse 14s ease-in-out 3s infinite" }} />

          <div style={{ position:"relative", zIndex:1,
            opacity: isVisible("cta") ? 1 : 0,
            transform: isVisible("cta") ? "translateY(0)" : "translateY(24px)",
            transition:"opacity 0.7s ease, transform 0.7s ease",
          }} ref={secRef("cta")}>
            <h2 style={{ fontFamily:"var(--font-display)", fontSize:"clamp(34px,5.5vw,68px)",
              fontWeight:800, letterSpacing:"-2px", lineHeight:1.05, marginBottom:"18px",
              color:"var(--text-primary)" }}>
              Ready to experience<br />music differently?
            </h2>
            <p style={{ fontSize:"17px", color:"var(--text-secondary)", marginBottom:"44px", fontWeight:300 }}>
              Join millions of listeners and thousands of artists on SOUNDWAVE.
            </p>
            <div className="lp-cta-btns" style={{ display:"flex", gap:"14px", justifyContent:"center", flexWrap:"wrap" }}>
              <MagneticButton onClick={() => navigate("/auth?mode=signup")} style={{ padding:"15px 40px", fontSize:"15px" }}>
                Create Free Account
              </MagneticButton>
              <button className="lp-ghost-btn lp-mag" onClick={() => navigate("/auth?mode=login")}>
                Sign In
              </button>
            </div>
          </div>
        </section>

        {/* ══ FOOTER ═══════════════════════════════════════════ */}
        <footer style={{
          background:"var(--bg-deep)",
          borderTop:"1px solid var(--border-faint)",
          padding:"72px 40px 0",
        }}>
          <div style={{ maxWidth:"1200px", margin:"0 auto" }}>
            <div className="lp-footer-grid" style={{
              display:"grid", gridTemplateColumns:"260px 1fr", gap:"80px",
              paddingBottom:"60px",
              borderBottom:"1px solid var(--border-faint)",
            }}>
              <div>
                <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"14px" }}>
                  <LogoMark size={26} />
                  <span style={{ fontFamily:"var(--font-display)", fontWeight:800, fontSize:"15px",
                    letterSpacing:"2px", color:"var(--text-primary)" }}>SOUNDWAVE</span>
                </div>
                <p style={{ fontSize:"13.5px", color:"var(--text-secondary)", lineHeight:1.75, marginBottom:"24px" }}>
                  Music that moves you.<br />Always free to start.
                </p>
                <div style={{ display:"flex", gap:"8px" }}>
                  {["𝕏","in","▶","◎"].map((icon,i) => (
                    <button key={i} style={{
                      width:"34px", height:"34px", borderRadius:"8px",
                      background:"var(--bg-hover)",
                      border:"1px solid var(--border-subtle)",
                      color:"var(--text-muted)", fontSize:"13px",
                      display:"flex", alignItems:"center", justifyContent:"center",
                      cursor:"pointer", transition:"all 0.15s ease",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor="var(--cyan)"; e.currentTarget.style.color="var(--cyan)"; e.currentTarget.style.transform="translateY(-2px)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor="var(--border-subtle)"; e.currentTarget.style.color="var(--text-muted)"; e.currentTarget.style.transform="none"; }}
                    >{icon}</button>
                  ))}
                </div>
              </div>

              <div className="lp-footer-links" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"32px" }}>
                {[
                  { heading:"Product", links:["Features","Pricing","Download App","API Docs"] },
                  { heading:"Artists", links:["Upload Music","Analytics","Artist Support","Community"] },
                  { heading:"Company", links:["About Us","Blog","Careers","Press Kit"] },
                  { heading:"Legal",   links:["Privacy Policy","Terms of Service","Cookie Policy","DMCA"] },
                ].map(col => (
                  <div key={col.heading} style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
                    <h4 style={{ fontFamily:"var(--font-display)", fontSize:"11px", fontWeight:700,
                      letterSpacing:"1.5px", textTransform:"uppercase",
                      color:"var(--text-primary)", marginBottom:"4px" }}>{col.heading}</h4>
                    {col.links.map(link => (
                      <a key={link} href="#" style={{ fontSize:"13.5px", color:"var(--text-muted)", transition:"color 0.15s ease" }}
                        onMouseEnter={e => e.currentTarget.style.color="var(--text-primary)"}
                        onMouseLeave={e => e.currentTarget.style.color="var(--text-muted)"}
                      >{link}</a>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <div style={{
              display:"flex", alignItems:"center", justifyContent:"space-between",
              padding:"22px 0 28px", fontSize:"12.5px",
              color:"var(--text-muted)",
              flexWrap:"wrap", gap:"12px",
            }}>
              <span style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                © 2026 SOUNDWAVE Inc.
                <span style={{ display:"inline-flex", alignItems:"center", gap:"4px" }}>
                  Made with
                  <span style={{ color:"#ff6b6b", animation:"lpGlowPulse 2s ease-in-out infinite", display:"inline-block" }}>♥</span>
                  for music lovers
                </span>
              </span>
              <div style={{ display:"flex", alignItems:"center", gap:"20px" }}>
                {["Privacy","Terms","Cookies"].map(l => (
                  <a key={l} href="#" style={{ color:"var(--text-muted)", transition:"color 0.15s ease" }}
                    onMouseEnter={e => e.currentTarget.style.color="var(--text-primary)"}
                    onMouseLeave={e => e.currentTarget.style.color="var(--text-muted)"}
                  >{l}</a>
                ))}
                {/* ✅ CHANGED: toggleTheme instead of setDarkMode(d=>!d) */}
                <button onClick={toggleTheme} style={{
                  display:"flex", alignItems:"center", gap:"6px", padding:"6px 12px",
                  borderRadius:"8px", background:"var(--bg-hover)",
                  border:"1px solid var(--border-faint)",
                  color:"var(--text-muted)", fontSize:"12px", cursor:"pointer",
                  transition:"all 0.2s ease",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor="var(--cyan)"; e.currentTarget.style.color="var(--cyan)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor="var(--border-faint)"; e.currentTarget.style.color="var(--text-muted)"; }}
                >
                  {darkMode ? <><SunIcon /> Light</> : <><MoonIcon /> Dark</>}
                </button>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   HERO PLAYER
═══════════════════════════════════════════════════════════════ */
function HeroPlayer({ tracks, activeTrack, setActiveTrack, isPlaying, setIsPlaying,
  trackProgress, currentTime, duration, eqBars, darkMode, audioLoading, onSeek, volume, setVolume, fmtTime }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position:"relative", maxWidth:"580px", margin:"0 auto",
        background: darkMode ? "rgba(8,13,28,0.85)" : "rgba(255,255,255,0.88)",
        backdropFilter:"blur(36px) saturate(200%)",
        WebkitBackdropFilter:"blur(36px) saturate(200%)",
        border:`1px solid ${hovered ? "rgba(0,212,255,0.45)" : "rgba(0,212,255,0.2)"}`,
        borderRadius:"26px", overflow:"hidden",
        boxShadow: hovered
          ? `0 48px 130px rgba(0,0,0,0.55), 0 0 0 1px rgba(0,212,255,0.18), inset 0 1px 0 rgba(255,255,255,0.08)`
          : `0 28px 90px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05)`,
        transition:"border-color 0.3s ease, box-shadow 0.3s ease",
        animation:"lpPanelIn 1s cubic-bezier(0.34,1.56,0.64,1) 0.5s both",
      }}
    >
      {/* Top glow line */}
      <div style={{
        position:"absolute", top:0, left:"8%", right:"8%", height:"1px",
        background:`linear-gradient(90deg, transparent, ${tracks[activeTrack].color}99, transparent)`,
        pointerEvents:"none", transition:"background 0.4s ease",
      }} />

      {/* Light sweep on hover */}
      {hovered && (
        <div style={{ position:"absolute", inset:0, pointerEvents:"none", overflow:"hidden", borderRadius:"26px" }}>
          <div style={{
            position:"absolute", top:0, bottom:0, width:"100px",
            background:"linear-gradient(90deg, transparent, rgba(255,255,255,0.035), transparent)",
            animation:"lpSweep 1.6s ease-in-out",
          }} />
        </div>
      )}

      {/* Track list */}
      <div style={{ padding:"20px 22px 0" }}>
        {tracks.map((track, i) => (
          <button key={i} onClick={() => { setActiveTrack(i); setIsPlaying(true); }} style={{
            display:"flex", alignItems:"center", gap:"14px", width:"100%",
            padding:"10px 12px", borderRadius:"14px", marginBottom:"4px",
            background: activeTrack === i
              ? (darkMode ? `rgba(0,212,255,0.09)` : `rgba(0,100,200,0.07)`)
              : "transparent",
            border:`1px solid ${activeTrack === i ? `${track.color}33` : "transparent"}`,
            cursor:"pointer", transition:"all 0.22s ease", textAlign:"left",
          }}
          onMouseEnter={e => { if(activeTrack!==i) e.currentTarget.style.background = darkMode ? "rgba(255,255,255,0.035)" : "rgba(0,0,0,0.04)"; }}
          onMouseLeave={e => { if(activeTrack!==i) e.currentTarget.style.background = "transparent"; }}
          >
            <div style={{
              width:"42px", height:"42px", borderRadius:"11px", flexShrink:0,
              background:`linear-gradient(135deg, ${track.color}50, ${track.color}18)`,
              border:`1px solid ${track.color}38`,
              display:"flex", alignItems:"center", justifyContent:"center",
              position:"relative", overflow:"hidden",
            }}>
              {activeTrack===i && isPlaying ? (
                <div style={{ display:"flex", alignItems:"flex-end", gap:"2px", height:"18px", padding:"0 4px" }}>
                  {[0,1,2,3].map(j => (
                    <div key={j} style={{
                      width:"3px", background:track.color, borderRadius:"1px",
                      transformOrigin:"bottom",
                      animation:`lpEq ${0.35+j*0.12}s ease-in-out ${j*0.08}s infinite alternate`,
                    }} />
                  ))}
                </div>
              ) : activeTrack===i && audioLoading ? (
                <div className="lp-spinner" style={{ width:"16px", height:"16px", borderTopColor:track.color }} />
              ) : (
                <span style={{ fontSize:"16px", opacity:0.7 }}>♪</span>
              )}
            </div>

            <div style={{ flex:1, minWidth:0 }}>
              <div style={{
                fontSize:"14px", fontWeight:600,
                color: activeTrack===i ? track.color : "var(--text-primary)",
                overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
                transition:"color 0.2s ease",
              }}>{track.title}</div>
              <div style={{ fontSize:"12px", color:"var(--text-muted)", marginTop:"1px" }}>{track.artist}</div>
            </div>

            <span style={{ fontSize:"12px", color:"var(--text-muted)", flexShrink:0 }}>{track.dur}</span>
          </button>
        ))}
      </div>

      {/* EQ Visualizer bar */}
      <div style={{ padding:"14px 22px 0", overflow:"hidden", height:"52px" }}>
        <div style={{ display:"flex", alignItems:"flex-end", gap:"2px", height:"100%" }}>
          {eqBars.map((h,i) => (
            <div key={i} style={{
              flex:1, height:`${isPlaying ? h : 12}%`,
              background:`linear-gradient(to top, ${tracks[activeTrack].color}dd, ${tracks[activeTrack].color}33)`,
              borderRadius:"2px 2px 0 0",
              transition: isPlaying ? `height 0.07s ease` : "height 0.5s ease",
              opacity: isPlaying ? 0.75 : 0.3,
            }} />
          ))}
        </div>
      </div>

      {/* Progress bar + time */}
      <div style={{ padding:"14px 22px 0" }}>
        <div
          className="lp-progress-track"
          onClick={onSeek}
          style={{ position:"relative", height:"3px", background: darkMode ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.09)", borderRadius:"3px" }}
        >
          <div style={{
            position:"absolute", left:0, top:0, bottom:0,
            width:`${trackProgress}%`,
            background:`linear-gradient(90deg, ${tracks[activeTrack].color}, ${tracks[activeTrack].color}88)`,
            borderRadius:"3px", transition:"width 0.1s linear",
          }} />
          <div style={{
            position:"absolute", top:"50%", transform:"translate(-50%,-50%)",
            left:`${trackProgress}%`,
            width:"13px", height:"13px", borderRadius:"50%",
            background:tracks[activeTrack].color,
            boxShadow:`0 0 12px ${tracks[activeTrack].color}99`,
            transition:"left 0.1s linear",
            pointerEvents:"none",
          }} />
          {isPlaying && (
            <div style={{
              position:"absolute", left:0, top:0, bottom:0,
              width:`${trackProgress}%`,
              background:"linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)",
              backgroundSize:"200% 100%",
              animation:"lpShimmer 2.5s ease infinite",
              borderRadius:"3px",
            }} />
          )}
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", marginTop:"7px",
          fontSize:"11px", color:"var(--text-muted)" }}>
          <span>{fmtTime(currentTime)}</span>
          <span>{fmtTime(duration) !== "0:00" ? fmtTime(duration) : tracks[activeTrack].dur}</span>
        </div>
      </div>

      {/* Controls + volume */}
      <div style={{ padding:"14px 22px 22px" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:"14px", marginBottom:"14px" }}>
          <ControlBtn onClick={() => setActiveTrack(t => (t-1+tracks.length)%tracks.length)}>⏮</ControlBtn>

          <button onClick={() => setIsPlaying(p => !p)} style={{
            width:"52px", height:"52px", borderRadius:"50%",
            background:`linear-gradient(135deg, ${tracks[activeTrack].color}, ${tracks[activeTrack].color}77)`,
            border:"none", cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:"18px", color:"#fff",
            boxShadow:`0 8px 28px ${tracks[activeTrack].color}55`,
            transition:"all 0.22s cubic-bezier(0.34,1.56,0.64,1)",
            animation: isPlaying ? "lpPulseRing 2s ease-in-out infinite" : "none",
            position:"relative",
          }}
          onMouseEnter={e => { e.currentTarget.style.transform="scale(1.12)"; e.currentTarget.style.boxShadow=`0 12px 36px ${tracks[activeTrack].color}77`; }}
          onMouseLeave={e => { e.currentTarget.style.transform="scale(1)"; e.currentTarget.style.boxShadow=`0 8px 28px ${tracks[activeTrack].color}55`; }}
          >
            {audioLoading && activeTrack !== null ? (
              <div className="lp-spinner" style={{ borderTopColor:"#fff" }} />
            ) : isPlaying ? (
              <PauseIcon />
            ) : (
              <PlayIconFilled />
            )}
          </button>

          <ControlBtn onClick={() => setActiveTrack(t => (t+1)%tracks.length)}>⏭</ControlBtn>
        </div>

        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:"8px" }}>
          <VolumeIcon muted={volume === 0} color="var(--text-muted)" />
          <input
            type="range" min="0" max="1" step="0.01"
            value={volume}
            onChange={e => setVolume(parseFloat(e.target.value))}
            className="lp-vol-slider"
          />
        </div>
      </div>
    </div>
  );
}

function ControlBtn({ onClick, children }) {
  return (
    <button onClick={onClick} style={{
      width:"38px", height:"38px", borderRadius:"50%",
      background:"transparent", border:"1px solid var(--border-subtle)",
      display:"flex", alignItems:"center", justifyContent:"center",
      fontSize:"14px", color:"var(--text-secondary)",
      cursor:"pointer", transition:"all 0.15s ease",
    }}
    onMouseEnter={e => { e.currentTarget.style.borderColor="var(--cyan)"; e.currentTarget.style.color="var(--cyan)"; e.currentTarget.style.background="var(--cyan-dim)"; }}
    onMouseLeave={e => { e.currentTarget.style.borderColor="var(--border-subtle)"; e.currentTarget.style.color="var(--text-secondary)"; e.currentTarget.style.background="transparent"; }}
    >{children}</button>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAGNETIC BUTTON
═══════════════════════════════════════════════════════════════ */
function MagneticButton({ children, onClick, style = {} }) {
  const ref = useRef(null);

  const handleMove = useCallback((e) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const dx = (e.clientX - (rect.left + rect.width/2)) * 0.28;
    const dy = (e.clientY - (rect.top + rect.height/2)) * 0.28;
    el.style.transform = `translate(${dx}px, ${dy}px) scale(1.04)`;
  }, []);

  const handleLeave = useCallback(() => {
    if (ref.current) ref.current.style.transform = "translate(0,0) scale(1)";
  }, []);

  return (
    <button
      ref={ref} className="btn-primary"
      onClick={onClick} onMouseMove={handleMove} onMouseLeave={handleLeave}
      style={{
        display:"inline-flex", alignItems:"center", justifyContent:"center",
        transition:"transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s ease",
        boxShadow:"0 8px 32px rgba(0,212,255,0.25)",
        ...style,
      }}
      onMouseEnter={e => e.currentTarget.style.boxShadow="0 14px 44px rgba(0,212,255,0.45)"}
    >
      {children}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════
   FEATURE CARD
═══════════════════════════════════════════════════════════════ */
function FeatureCard({ feature: f, index, visible }) {
  const [hovered, setHovered] = useState(false);
  const ref = useRef(null);

  const handleMove = useCallback((e) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    el.style.transform = `perspective(900px) rotateX(${(y-0.5)*-12}deg) rotateY(${(x-0.5)*12}deg) translateY(-8px) scale(1.02)`;
    const glow = el.querySelector(".lp-fc-glow");
    if (glow) { glow.style.left=`${x*100}%`; glow.style.top=`${y*100}%`; }
  }, []);

  const handleLeave = useCallback(() => {
    if (ref.current) ref.current.style.transform = "perspective(900px) rotateX(0) rotateY(0) translateY(0) scale(1)";
  }, []);

  return (
    <div
      ref={ref}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); handleLeave(); }}
      onMouseMove={handleMove}
      className="lp-card-3d"
      style={{
        padding:"32px", borderRadius:"22px", position:"relative", overflow:"hidden",
        background:"var(--bg-elevated)",
        border:`1px solid ${hovered ? f.color+"44" : "var(--border-faint)"}`,
        transition:"border-color 0.25s ease, box-shadow 0.25s ease, transform 0.18s ease",
        boxShadow: hovered ? `0 28px 72px rgba(0,0,0,0.35), 0 0 0 1px ${f.color}22` : "none",
        opacity: visible ? 1 : 0,
        animation: visible ? `lpFadeUp 0.6s ease ${index*0.1}s both` : "none",
        cursor:"default",
      }}
    >
      <div className="lp-fc-glow" style={{
        position:"absolute", width:"220px", height:"220px", borderRadius:"50%",
        background:f.color, filter:"blur(65px)",
        opacity: hovered ? 0.11 : 0, transition:"opacity 0.3s ease",
        transform:"translate(-50%,-50%)",
        left:"50%", top:"50%", pointerEvents:"none",
      }} />
      {hovered && (
        <div style={{
          position:"absolute", inset:0, borderRadius:"22px",
          background:`linear-gradient(135deg, ${f.color}07, transparent 55%)`,
          pointerEvents:"none",
        }} />
      )}
      <div style={{
        position:"absolute", top:0, left:"20%", right:"20%", height:"1px",
        background:`linear-gradient(90deg, transparent, ${f.color}${hovered?"88":"44"}, transparent)`,
        pointerEvents:"none",
      }} />
      <div style={{
        width:"52px", height:"52px", borderRadius:"15px",
        background:`${f.color}1a`, border:`1px solid ${f.color}30`,
        display:"flex", alignItems:"center", justifyContent:"center",
        fontSize:"22px", color:f.color, marginBottom:"20px", fontFamily:"monospace",
        transition:"transform 0.35s cubic-bezier(0.34,1.56,0.64,1)",
        transform: hovered ? "rotate(10deg) scale(1.16)" : "none",
      }}>{f.icon}</div>
      <h3 style={{ fontFamily:"var(--font-display)", fontSize:"17px", fontWeight:700, marginBottom:"12px",
        color:"var(--text-primary)" }}>{f.title}</h3>
      <p style={{ fontSize:"13.5px", color:"var(--text-secondary)", lineHeight:1.75 }}>{f.desc}</p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TESTIMONIAL CARD
═══════════════════════════════════════════════════════════════ */
function TestimonialCard({ t, darkMode }) {
  return (
    <div style={{
      padding:"36px 40px",
      background: darkMode ? "rgba(15,20,32,0.78)" : "rgba(255,255,255,0.88)",
      backdropFilter:"blur(24px)",
      border:"1px solid var(--border-faint)",
      borderRadius:"24px", textAlign:"left",
      boxShadow: darkMode ? "0 20px 60px rgba(0,0,0,0.22)" : "0 20px 60px rgba(0,80,200,0.07)",
    }}>
      <div style={{ width:"40px", height:"3px", borderRadius:"2px",
        background:`linear-gradient(90deg, ${t.color}, transparent)`, marginBottom:"20px" }} />
      <p style={{ fontSize:"16px", color:"var(--text-secondary)", lineHeight:1.85,
        fontStyle:"italic", fontWeight:300, marginBottom:"28px" }}>"{t.text}"</p>
      <div style={{ display:"flex", alignItems:"center", gap:"14px" }}>
        <div style={{
          width:"46px", height:"46px", borderRadius:"50%", flexShrink:0,
          background:`${t.color}18`, border:`1.5px solid ${t.color}40`,
          display:"flex", alignItems:"center", justifyContent:"center",
          fontFamily:"var(--font-display)", fontWeight:700, fontSize:"13px", color:t.color,
        }}>{t.initials}</div>
        <div>
          <div style={{ fontSize:"14px", fontWeight:600, color:"var(--text-primary)" }}>{t.name}</div>
          <div style={{ fontSize:"12px", color:`${t.color}cc`, marginTop:"2px" }}>{t.role}</div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PRICING CARD
═══════════════════════════════════════════════════════════════ */
function PricingCard({ plan, onCta, darkMode }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding:"38px 30px 32px",
        height:"100%",
        boxSizing:"border-box",
        position:"relative",
        background: plan.popular
          ? (darkMode ? `linear-gradient(160deg,${plan.accent}0e,var(--bg-elevated))` : `linear-gradient(160deg,${plan.accent}09,rgba(255,255,255,0.97))`)
          : "var(--bg-elevated)",
        border:`1px solid ${plan.popular ? plan.accent+"55" : hovered ? plan.accent+"44" : "var(--border-faint)"}`,
        borderRadius:"24px",
        transition:"border-color 0.25s ease, transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s ease",
        transform: hovered ? "translateY(-8px) scale(1.01)" : "none",
        boxShadow: plan.popular
          ? `0 0 60px ${plan.accent}22, 0 28px 80px rgba(0,0,0,0.28)`
          : hovered ? `0 24px 64px rgba(0,0,0,0.28)` : "none",
        display:"flex", flexDirection:"column",
        overflow:"visible",
      }}
    >
      {plan.popular && (
        <div style={{
          position:"absolute", top:0, left:0, right:0, height:"2px", borderRadius:"24px 24px 0 0",
          background:`linear-gradient(90deg, transparent, ${plan.accent}, transparent)`,
          pointerEvents:"none",
        }} />
      )}

      {hovered && (
        <div style={{ position:"absolute", inset:0, borderRadius:"24px", overflow:"hidden", pointerEvents:"none" }}>
          <div style={{
            position:"absolute", top:0, bottom:0, width:"70px",
            background:"linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent)",
            animation:"lpSweep 0.9s ease-in-out",
          }} />
        </div>
      )}

      {plan.popular && (
        <div style={{
          position:"absolute", top:"-14px", left:"50%", transform:"translateX(-50%)",
          background:"linear-gradient(135deg,var(--cyan),var(--violet))", color:"#fff",
          fontSize:"11px", fontWeight:700, padding:"5px 22px", borderRadius:"999px",
          letterSpacing:"0.5px", whiteSpace:"nowrap", fontFamily:"var(--font-display)",
          boxShadow:"0 4px 18px rgba(0,212,255,0.35)",
          zIndex:2,
        }}>Most Popular</div>
      )}

      <div style={{ fontFamily:"var(--font-display)", fontSize:"11px", fontWeight:700,
        letterSpacing:"1.5px", textTransform:"uppercase", color:plan.accent, marginBottom:"18px" }}>
        {plan.name}
      </div>

      <div style={{ display:"flex", alignItems:"baseline", gap:"6px", marginBottom:"30px" }}>
        <span style={{ fontFamily:"var(--font-display)", fontSize:"52px", fontWeight:800,
          letterSpacing:"-2px", color:"var(--text-primary)", lineHeight:1 }}>{plan.price}</span>
        <span style={{ fontSize:"13px", color:"var(--text-muted)" }}>{plan.period}</span>
      </div>

      <ul style={{ listStyle:"none", display:"flex", flexDirection:"column", gap:"12px", marginBottom:"32px", flex:1 }}>
        {plan.features.map((f,i) => (
          <li key={i} style={{ display:"flex", alignItems:"flex-start", gap:"10px",
            fontSize:"13.5px", color:"var(--text-secondary)" }}>
            <span style={{
              width:"20px", height:"20px", borderRadius:"6px", flexShrink:0, marginTop:"1px",
              background:`${plan.accent}1a`, border:`1px solid ${plan.accent}30`,
              display:"flex", alignItems:"center", justifyContent:"center",
              color:plan.accent, fontWeight:700, fontSize:"10px",
            }}>✓</span>
            {f}
          </li>
        ))}
      </ul>

      <button
        className={plan.popular ? "btn-primary lp-mag" : "lp-ghost-btn lp-mag"}
        onClick={onCta}
        style={{
          width:"100%", justifyContent:"center", padding:"13px 16px",
          boxShadow: plan.popular ? `0 8px 26px ${plan.accent}33` : "none",
          flexShrink:0,
        }}
      >
        {plan.cta}
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MOCK DASHBOARD
═══════════════════════════════════════════════════════════════ */
function MockDashboard({ barHeights, darkMode }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div style={{ padding:"8px", margin:"-8px", overflow:"visible" }}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width:"100%",
          boxSizing:"border-box",
          background: darkMode ? "rgba(10,15,28,0.88)" : "rgba(255,255,255,0.92)",
          backdropFilter:"blur(28px)",
          border:`1px solid ${hovered ? "rgba(0,212,255,0.3)" : darkMode ? "rgba(255,255,255,0.07)" : "rgba(0,100,200,0.1)"}`,
          borderRadius:"22px",
          overflow:"hidden",
          boxShadow: hovered
            ? darkMode ? "0 36px 80px rgba(0,0,0,0.5),0 0 0 1px rgba(0,212,255,0.1)" : "0 36px 80px rgba(0,100,200,0.15)"
            : darkMode ? "0 20px 50px rgba(0,0,0,0.4)" : "0 20px 50px rgba(0,80,200,0.1)",
          transition:"border-color 0.3s ease, box-shadow 0.3s ease, transform 0.3s cubic-bezier(0.34,1.56,0.64,1)",
          transform: hovered ? "translateY(-6px) scale(1.008)" : "none",
        }}
      >
        {/* Title bar */}
        <div style={{ display:"flex", alignItems:"center", gap:"8px", padding:"14px 18px",
          borderBottom:`1px solid ${darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)"}`,
          fontSize:"12px", color:"var(--text-muted)" }}>
          {[["#ff5f57"],["#ffbd2e"],["#28ca41"]].map(([c],i) => (
            <div key={i} style={{ width:"10px", height:"10px", borderRadius:"50%", background:c }} />
          ))}
          <span style={{ marginLeft:"6px", fontWeight:500, color:"var(--text-secondary)" }}>Artist Dashboard</span>
          <div style={{ marginLeft:"auto", display:"flex", gap:"6px" }}>
            {["7d","30d","90d"].map((p,i) => (
              <span key={i} style={{ fontSize:"10px", padding:"2px 8px", borderRadius:"4px",
                background: i===1 ? "var(--cyan-dim)" : "transparent",
                color: i===1 ? "var(--cyan)" : "var(--text-muted)",
                cursor:"pointer" }}>{p}</span>
            ))}
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"1px",
          background: darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.06)", margin:"16px" }}>
          {[["124.5K","Total Plays","#00d4ff"],["+23%","This Month","#06d6a0"],["$840","Earnings","#ffd166"]]
            .map(([val,lbl,color],i) => (
            <div key={i} style={{ background:"var(--bg-surface)", padding:"14px 10px", textAlign:"center" }}>
              <div style={{ fontFamily:"var(--font-display)", fontSize:"20px", fontWeight:700, color }}>{val}</div>
              <div style={{ fontSize:"11px", color:"var(--text-muted)", marginTop:"3px" }}>{lbl}</div>
            </div>
          ))}
        </div>

        {/* Bar chart */}
        <div style={{ display:"flex", alignItems:"flex-end", gap:"4px", height:"72px",
          margin:"0 16px 14px", padding:"8px 10px",
          background:"var(--bg-surface)", borderRadius:"10px" }}>
          {barHeights.map((h,i) => (
            <div key={i} style={{
              flex:1, height:`${h}%`,
              background:`linear-gradient(to top, var(--violet), var(--cyan))`,
              borderRadius:"3px 3px 0 0", opacity:0.85,
              transition:`height 0.9s cubic-bezier(0.4,0,0.2,1) ${i*0.04}s`,
            }} />
          ))}
        </div>

        {/* Track list */}
        <div style={{ display:"flex", flexDirection:"column", gap:"6px", margin:"0 16px 16px" }}>
          {[["Midnight Drive","32K plays","#7b5ea7"],["Solar Winds","21K plays","#00d4ff"],["Deep Blue","14K plays","#ff6b6b"]]
            .map(([title,plays,color],i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:"10px",
              padding:"9px 12px", background:"var(--bg-surface)", borderRadius:"9px",
              transition:"background 0.15s ease", cursor:"pointer" }}
            onMouseEnter={e => e.currentTarget.style.background = darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"}
            onMouseLeave={e => e.currentTarget.style.background = "var(--bg-surface)"}
            >
              <div style={{ width:"30px", height:"30px", borderRadius:"7px",
                background:`${color}30`, border:`1px solid ${color}40`, flexShrink:0 }} />
              <span style={{ flex:1, fontSize:"13px", fontWeight:500, color:"var(--text-primary)" }}>{title}</span>
              <span style={{ fontSize:"11px", color:"var(--text-muted)" }}>{plays}</span>
              <span style={{ fontSize:"10px", color, fontWeight:600 }}>▶</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MISSION CARD
═══════════════════════════════════════════════════════════════ */
function MissionCard({ card, index, visible, darkMode }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding:"22px", background:"var(--bg-elevated)",
        border:`1px solid ${hovered ? card.color+"44" : "var(--border-faint)"}`,
        borderRadius:"18px",
        transition:"all 0.3s cubic-bezier(0.34,1.56,0.64,1)",
        transform: hovered ? "translateY(-5px) scale(1.02)" : "none",
        boxShadow: hovered ? `0 16px 48px rgba(0,0,0,0.28), 0 0 0 1px ${card.color}22` : "none",
        opacity: visible ? 1 : 0,
        animation: visible ? `lpFadeUp 0.5s ease ${0.2+index*0.08}s both` : "none",
        cursor:"default", position:"relative", overflow:"hidden",
      }}
    >
      {hovered && <div style={{
        position:"absolute", inset:0, borderRadius:"18px",
        background:`linear-gradient(135deg, ${card.color}07, transparent)`,
        pointerEvents:"none",
      }} />}
      <div style={{ fontSize:"26px", marginBottom:"12px" }}>{card.icon}</div>
      <div style={{ fontFamily:"var(--font-display)", fontSize:"14px", fontWeight:700,
        color:card.color, marginBottom:"7px" }}>{card.title}</div>
      <div style={{ fontSize:"12.5px", color:"var(--text-muted)", lineHeight:1.65 }}>{card.desc}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TEAM MEMBER
═══════════════════════════════════════════════════════════════ */
function TeamMember({ member, index, visible }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div style={{
      textAlign:"center",
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(24px)",
      transition:`opacity 0.6s ease ${0.3+index*0.1}s, transform 0.6s cubic-bezier(0.34,1.56,0.64,1) ${0.3+index*0.1}s`,
    }}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width:"76px", height:"76px", borderRadius:"50%", margin:"0 auto 14px",
          background:`linear-gradient(135deg, ${member.color}30, ${member.color}10)`,
          border:`2px solid ${hovered ? member.color+"88" : member.color+"35"}`,
          display:"flex", alignItems:"center", justifyContent:"center",
          fontFamily:"var(--font-display)", fontWeight:800, fontSize:"22px", color:member.color,
          transition:"all 0.35s cubic-bezier(0.34,1.56,0.64,1)",
          transform: hovered ? "scale(1.12)" : "none",
          boxShadow: hovered ? `0 0 28px ${member.color}30, 0 8px 24px rgba(0,0,0,0.3)` : "none",
          cursor:"default",
        }}
      >{member.initials}</div>
      <div style={{ fontSize:"14px", fontWeight:600, color:"var(--text-primary)" }}>{member.name}</div>
      <div style={{ fontSize:"12px", color:"var(--text-muted)", marginTop:"3px" }}>{member.role}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SECTION BADGE
═══════════════════════════════════════════════════════════════ */
function SectionBadge({ children }) {
  return (
    <div style={{
      display:"inline-block", padding:"5px 18px",
      background:"var(--violet-dim)",
      border:"1px solid var(--violet-border)",
      borderRadius:"999px", fontSize:"11px",
      color:"var(--violet)", fontWeight:700,
      letterSpacing:"1.2px", textTransform:"uppercase", marginBottom:"20px",
    }}>
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   NAV BUTTON
═══════════════════════════════════════════════════════════════ */
function NavBtn({ onClick, children }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} style={{
      padding:"8px 16px", borderRadius:"8px",
      color: hov ? "var(--text-primary)" : "var(--text-secondary)",
      background: hov ? "var(--bg-hover)" : "none",
      fontSize:"14px", fontWeight:500, border:"none", cursor:"pointer",
      transition:"all 0.15s ease",
    }}>{children}</button>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SVG ICONS
═══════════════════════════════════════════════════════════════ */
function LogoMark({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="14.5" stroke="#00d4ff" strokeWidth="1.5" strokeOpacity="0.7"/>
      <path d="M8 16 Q11 9, 16 16 Q21 23, 24 16" stroke="#00d4ff" strokeWidth="2.2" fill="none" strokeLinecap="round"/>
      <circle cx="16" cy="16" r="3.5" fill="#00d4ff"/>
    </svg>
  );
}

function VinylDisc({ size = 420 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 420 420" fill="none">
      <circle cx="210" cy="210" r="208" fill="#0a0a1a" stroke="#00d4ff" strokeWidth="1" strokeOpacity="0.25"/>
      {[185,158,131,104,77,50].map((r,i) => (
        <circle key={i} cx="210" cy="210" r={r} fill="none" stroke="#ffffff" strokeWidth="0.5" strokeOpacity="0.04"/>
      ))}
      <circle cx="210" cy="210" r="62" fill="#0f1f3a" stroke="#00d4ff" strokeWidth="1.5" strokeOpacity="0.35"/>
      <circle cx="210" cy="210" r="10" fill="#00d4ff" fillOpacity="0.5"/>
    </svg>
  );
}

function PlayIconSVG() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>;
}

function PlayIconFilled() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5 3 19 12 5 21 5 3"/>
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="4" width="4" height="16" rx="1"/>
      <rect x="14" y="4" width="4" height="16" rx="1"/>
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4"/>
      <line x1="12" y1="2"  x2="12" y2="4"/>
      <line x1="12" y1="20" x2="12" y2="22"/>
      <line x1="4.22" y1="4.22"  x2="5.64" y2="5.64"/>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="2"  y1="12" x2="4"  y2="12"/>
      <line x1="20" y1="12" x2="22" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
      <line x1="18.36" y1="5.64"  x2="19.78" y2="4.22"/>
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8b9cf4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  );
}

function VolumeIcon({ muted, color }) {
  return muted ? (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
      <line x1="23" y1="9" x2="17" y2="15"/>
      <line x1="17" y1="9" x2="23" y2="15"/>
    </svg>
  ) : (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
    </svg>
  );
}
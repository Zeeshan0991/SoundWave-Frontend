// src/components/NowPlayingBar.jsx
// ─────────────────────────────────────────────────────────────────────────────
// RESPONSIVE CHANGES:
//
//   NEW PROP: isMobile (bool) — passed from AppLayout
//
//   MOBILE layout (isMobile=true):
//     • Bar is fixed at bottom, just above BottomNav (bottom: 56px)
//     • Single-row compact bar: art + title/artist + play/pause + queue icon
//     • Tap anywhere on bar (except controls) → opens full-screen player modal
//     • Progress bar shown as thin line at top of compact bar
//     • EmptyBar also fixed/positioned correctly on mobile
//
//   FULL-SCREEN PLAYER MODAL (mobile only):
//     • Slides up from bottom, covers full screen
//     • Large album art
//     • Track title + artist (full, not truncated)
//     • All controls: shuffle, prev, play/pause, next, repeat
//     • Full-width progress bar with timestamps
//     • Volume slider
//     • Like button, Queue button
//     • Swipe-down handle to close (also × button)
//
//   DESKTOP/TABLET (isMobile=false):
//     • Renders exactly as before — zero changes
// ─────────────────────────────────────────────────────────────────────────────

import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { usePlayer } from "../context/PlayerContext";
import Equalizer from "./Equalizer";
import QueueDrawer from "./QueueDrawer";

export default function NowPlayingBar({ isMobile = false }) {
  const navigate = useNavigate();
  const {
    currentTrack, isPlaying, isLoading, progress, duration,
    volume, isMuted, isShuffled, repeatMode,
    togglePlay, playNext, playPrev, seek, changeVolume,
    toggleMute, toggleShuffle, toggleRepeat, toggleLike, isLiked,
    formatTime, queue, currentIndex,
  } = usePlayer();

  const progressRef  = useRef(null);
  const [hoverVol,      setHoverVol]      = useState(false);
  const [hoverProgress, setHoverProgress] = useState(false);
  const [hoverTime,     setHoverTime]     = useState(null);
  const [showQueue,     setShowQueue]     = useState(false);
  // Mobile: full-screen player modal
  const [showModal,     setShowModal]     = useState(false);

  const progressPct = duration > 0 ? (progress / duration) * 100 : 0;
  const liked       = currentTrack ? isLiked(currentTrack._id) : false;
  const repeatActive = repeatMode !== "none";
  const upNextCount  = Math.max(0, queue.length - currentIndex - 1);

  const handleProgressClick = (e) => {
    if (!duration || !progressRef.current) return;
    const rect  = progressRef.current.getBoundingClientRect();
    const ratio = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
    seek(ratio * duration);
  };

  const handleProgressHover = (e) => {
    if (!duration || !progressRef.current) return;
    const rect  = progressRef.current.getBoundingClientRect();
    const ratio = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
    setHoverTime(formatTime(ratio * duration));
  };

  // ── MOBILE: compact bar ──────────────────────────────────────────────────
  if (isMobile) {
    if (!currentTrack) return <MobileEmptyBar />;

    return (
      <>
        {/* Full-screen modal */}
        {showModal && (
          <MobilePlayerModal
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            isLoading={isLoading}
            progress={progress}
            duration={duration}
            progressPct={progressPct}
            volume={volume}
            isMuted={isMuted}
            isShuffled={isShuffled}
            repeatMode={repeatMode}
            repeatActive={repeatActive}
            liked={liked}
            upNextCount={upNextCount}
            formatTime={formatTime}
            togglePlay={togglePlay}
            playNext={playNext}
            playPrev={playPrev}
            seek={seek}
            changeVolume={changeVolume}
            toggleMute={toggleMute}
            toggleShuffle={toggleShuffle}
            toggleRepeat={toggleRepeat}
            toggleLike={toggleLike}
            onClose={() => setShowModal(false)}
            onQueueOpen={() => { setShowModal(false); setShowQueue(true); }}
            navigate={navigate}
          />
        )}

        {/* Queue drawer */}
        {showQueue && (
          <QueueDrawer onClose={() => setShowQueue(false)} />
        )}

        {/* Compact bar */}
        <div
          style={{
            position:   "fixed",
            bottom:     "56px",              // above BottomNav
            left:       0,
            right:      0,
            height:     "64px",
            background: "var(--bg-surface)",
            borderTop:  "1px solid var(--border-faint)",
            zIndex:     250,
            display:    "flex",
            alignItems: "center",
            padding:    "0 12px",
            gap:        "10px",
            cursor:     "pointer",
          }}
          onClick={() => setShowModal(true)}
        >
          {/* Thin progress line at very top */}
          <div style={{
            position:   "absolute",
            top:        0,
            left:       0,
            right:      0,
            height:     "2px",
            background: "var(--bg-raised)",
          }}>
            <div style={{
              height:     "100%",
              width:      `${progressPct}%`,
              background: "linear-gradient(90deg, var(--violet), var(--cyan))",
              transition: "width 0.1s linear",
            }} />
          </div>

          {/* Album art */}
          <div style={{
            width:"44px", height:"44px", borderRadius:"8px",
            background:"var(--bg-raised)", flexShrink:0, overflow:"hidden",
            border:"1px solid var(--border-faint)",
          }}>
            {currentTrack.coverUrl
              ? <img src={currentTrack.coverUrl} alt="cover"
                  style={{ width:"100%", height:"100%", objectFit:"cover" }} />
              : <PlaceholderArt />
            }
          </div>

          {/* Title + artist */}
          <div style={{ flex:1, minWidth:0 }}>
            <div className="truncate" style={{
              fontSize:"14px", fontWeight:600, color:"var(--text-primary)", lineHeight:1.3,
            }}>
              {currentTrack.title}
            </div>
            <div className="truncate" style={{ fontSize:"12px", color:"var(--text-muted)", marginTop:"2px" }}>
              {currentTrack.artist?.username || currentTrack.artistName || "Unknown Artist"}
            </div>
          </div>

          {/* Like */}
          <button
            onClick={e => { e.stopPropagation(); toggleLike(currentTrack._id); }}
            style={{
              width:"40px", height:"40px", borderRadius:"50%",
              background:"none", border:"none",
              color: liked ? "var(--coral)" : "var(--text-muted)",
              display:"flex", alignItems:"center", justifyContent:"center",
              cursor:"pointer", flexShrink:0,
            }}
          >
            <HeartIcon filled={liked} />
          </button>

          {/* Play/Pause */}
          <button
            onClick={e => { e.stopPropagation(); togglePlay(); }}
            style={{
              width:"40px", height:"40px", borderRadius:"50%",
              background:"linear-gradient(135deg, var(--cyan), var(--violet))",
              border:"none", color:"#fff",
              display:"flex", alignItems:"center", justifyContent:"center",
              cursor:"pointer", flexShrink:0,
              boxShadow: isPlaying ? "var(--glow-cyan)" : "none",
            }}
          >
            {isLoading ? <LoadingSpinner /> : isPlaying ? <PauseIcon /> : <PlayIcon />}
          </button>
        </div>
      </>
    );
  }

  // ── DESKTOP/TABLET: original layout — unchanged ───────────────────────────
  if (!currentTrack) return <EmptyBar />;

  return (
    <>
      {showQueue && <QueueDrawer onClose={() => setShowQueue(false)} />}

      <div style={{
        height:     "var(--player-h)",
        background: "linear-gradient(180deg, var(--bg-surface) 0%, var(--bg-deep) 100%)",
        borderTop:  "1px solid var(--border-faint)",
        display:    "grid",
        gridTemplateColumns:"1fr auto 1fr",
        alignItems: "center",
        padding:    "0 20px",
        gap:        "16px",
        flexShrink: 0,
        position:   "relative",
        zIndex:     200,
      }}>

        {/* ── LEFT: Track info ── */}
        <div style={{ display:"flex", alignItems:"center", gap:"12px", minWidth:0 }}>
          <div
            onClick={() => currentTrack.albumId && navigate(`/album/${currentTrack.albumId}`)}
            style={{
              width:"52px", height:"52px", borderRadius:"10px",
              background:"var(--bg-raised)", flexShrink:0, overflow:"hidden",
              cursor: currentTrack.albumId ? "pointer" : "default",
              border:"1px solid var(--border-faint)", position:"relative",
              transition:"all var(--t-fast)",
            }}
            onMouseEnter={e => { if (currentTrack.albumId) e.currentTarget.style.borderColor = "var(--cyan-border)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-faint)"; }}
          >
            {currentTrack.coverUrl
              ? <img src={currentTrack.coverUrl} alt="cover" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
              : <PlaceholderArt />
            }
            {isLoading && (
              <div style={{
                position:"absolute", inset:0, background:"rgba(0,0,0,0.6)",
                display:"flex", alignItems:"center", justifyContent:"center",
              }}>
                <div style={{
                  width:"18px", height:"18px", borderRadius:"50%",
                  border:"2px solid rgba(255,255,255,0.2)",
                  borderTop:"2px solid var(--cyan)",
                  animation:"spinSlow 0.7s linear infinite",
                }} />
              </div>
            )}
          </div>

          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"3px" }}>
              {isPlaying && !isLoading && <Equalizer isPlaying={isPlaying} size="sm" barCount={3} />}
              <span className="truncate" style={{
                fontSize:"14px", fontWeight:600, color:"var(--text-primary)",
                cursor: currentTrack.albumId ? "pointer" : "default",
                transition:"color var(--t-fast)",
              }}
                onClick={() => currentTrack.albumId && navigate(`/album/${currentTrack.albumId}`)}
                onMouseEnter={e => { if (currentTrack.albumId) e.currentTarget.style.color = "var(--cyan)"; }}
                onMouseLeave={e => { e.currentTarget.style.color = "var(--text-primary)"; }}
              >
                {currentTrack.title}
              </span>
            </div>
            <div className="truncate" style={{
              fontSize:"12px", color:"var(--text-muted)",
              cursor: currentTrack.artistId ? "pointer" : "default",
              transition:"color var(--t-fast)",
            }}
              onClick={() => currentTrack.artistId && navigate(`/artist/${currentTrack.artistId}`)}
              onMouseEnter={e => { if (currentTrack.artistId) e.currentTarget.style.color = "var(--text-secondary)"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "var(--text-muted)"; }}
            >
              {currentTrack.artist?.username || currentTrack.artistName || "Unknown Artist"}
            </div>
          </div>

          <button onClick={() => toggleLike(currentTrack._id)}
            title={liked ? "Remove from favourites" : "Add to favourites"}
            style={{
              flexShrink:0, color: liked ? "var(--coral)" : "var(--text-muted)",
              background:"none", border:"none", cursor:"pointer",
              padding:"6px", borderRadius:"50%", display:"flex", alignItems:"center",
              transition:"all var(--t-fast)",
              transform: liked ? "scale(1.1)" : "scale(1)",
            }}
            onMouseEnter={e => { e.currentTarget.style.color = "var(--coral)"; e.currentTarget.style.transform = "scale(1.15)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = liked ? "var(--coral)" : "var(--text-muted)"; e.currentTarget.style.transform = liked ? "scale(1.1)" : "scale(1)"; }}
          >
            <HeartIcon filled={liked} />
          </button>
        </div>

        {/* ── CENTER: Controls + progress ── */}
        <div style={{
          display:"flex", flexDirection:"column", alignItems:"center",
          gap:"8px", minWidth:"320px", maxWidth:"480px", width:"100%",
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
            <ControlBtn onClick={toggleShuffle} active={isShuffled} title={isShuffled ? "Shuffle on" : "Shuffle off"}>
              <ShuffleIcon />
            </ControlBtn>
            <ControlBtn onClick={playPrev} title="Previous"><SkipBackIcon /></ControlBtn>
            <button onClick={togglePlay} style={{
              width:"44px", height:"44px", borderRadius:"50%",
              background:"linear-gradient(135deg, var(--cyan), var(--violet))",
              border:"none", color:"#fff", display:"flex", alignItems:"center",
              justifyContent:"center", cursor:"pointer", flexShrink:0,
              transition:"transform var(--t-fast), box-shadow var(--t-fast)",
              boxShadow: isPlaying ? "var(--glow-cyan)" : "none",
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.08)"; e.currentTarget.style.boxShadow = "var(--glow-cyan)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = isPlaying ? "var(--glow-cyan)" : "none"; }}
            >
              {isLoading ? <LoadingSpinner /> : isPlaying ? <PauseIcon /> : <PlayIcon />}
            </button>
            <ControlBtn onClick={playNext} title="Next"><SkipForwardIcon /></ControlBtn>
            <ControlBtn onClick={toggleRepeat} active={repeatActive}
              title={repeatMode === "none" ? "Repeat off" : repeatMode === "all" ? "Repeat all" : "Repeat one"}>
              {repeatMode === "one" ? <RepeatOneIcon /> : <RepeatIcon />}
            </ControlBtn>
          </div>

          {/* Progress bar */}
          <div style={{ display:"flex", alignItems:"center", gap:"10px", width:"100%" }}>
            <span style={{
              fontSize:"11px", color:"var(--text-muted)",
              fontVariantNumeric:"tabular-nums", width:"32px",
              textAlign:"right", flexShrink:0,
            }}>{formatTime(progress)}</span>

            <div ref={progressRef}
              onClick={handleProgressClick}
              onMouseMove={handleProgressHover}
              onMouseEnter={() => setHoverProgress(true)}
              onMouseLeave={() => { setHoverProgress(false); setHoverTime(null); }}
              style={{
                flex:1, height: hoverProgress ? "5px" : "4px",
                borderRadius:"3px", background:"var(--bg-raised)",
                cursor:"pointer", position:"relative",
                transition:"height 0.15s ease",
              }}
            >
              <div style={{
                position:"absolute", left:0, top:0, height:"100%",
                width:`${progressPct}%`,
                background:"linear-gradient(90deg, var(--violet), var(--cyan))",
                borderRadius:"3px", pointerEvents:"none", transition:"width 0.1s linear",
              }} />
              <div style={{
                position:"absolute", top:"50%", left:`${progressPct}%`,
                transform:"translate(-50%,-50%)",
                width:"13px", height:"13px", borderRadius:"50%",
                background:"var(--cyan)", boxShadow:"0 0 8px rgba(0,212,255,0.6)",
                pointerEvents:"none",
                opacity: hoverProgress ? 1 : 0,
                transition:"opacity 0.15s, left 0.1s linear",
              }} />
              {hoverTime && (
                <div style={{
                  position:"absolute", bottom:"12px", left:`${progressPct}%`,
                  transform:"translateX(-50%)",
                  background:"var(--bg-elevated)", border:"1px solid var(--border-subtle)",
                  borderRadius:"6px", padding:"3px 7px", fontSize:"11px",
                  color:"var(--text-primary)", fontVariantNumeric:"tabular-nums",
                  pointerEvents:"none", whiteSpace:"nowrap",
                  boxShadow:"0 4px 12px rgba(0,0,0,0.4)",
                }}>{hoverTime}</div>
              )}
            </div>

            <span style={{
              fontSize:"11px", color:"var(--text-muted)",
              fontVariantNumeric:"tabular-nums", width:"32px", flexShrink:0,
            }}>{formatTime(duration)}</span>
          </div>
        </div>

        {/* ── RIGHT: Volume + Queue ── */}
        <div style={{
          display:"flex", alignItems:"center", justifyContent:"flex-end",
          gap:"4px", paddingRight:"8px",
        }}>
          <div style={{ position:"relative" }}>
            <ControlBtn
              title={showQueue ? "Hide queue" : "Show queue"}
              active={showQueue}
              onClick={() => setShowQueue(s => !s)}
            >
              <QueueIcon />
            </ControlBtn>
            {upNextCount > 0 && (
              <span style={{
                position:"absolute", top:"1px", right:"1px",
                minWidth:"14px", height:"14px", borderRadius:"999px",
                background:"var(--cyan)", color:"var(--bg-deep)",
                fontSize:"9px", fontWeight:700,
                display:"flex", alignItems:"center", justifyContent:"center",
                padding:"0 3px", pointerEvents:"none", lineHeight:1,
              }}>
                {upNextCount > 99 ? "99+" : upNextCount}
              </span>
            )}
          </div>

          <div className="vol-wrap"
            style={{ display:"flex", alignItems:"center", gap:"4px" }}
            onMouseEnter={() => setHoverVol(true)}
            onMouseLeave={() => setHoverVol(false)}
          >
            <button onClick={toggleMute} title={isMuted ? "Unmute" : "Mute"}
              style={{
                color: isMuted || volume === 0 ? "var(--text-muted)" : "var(--text-secondary)",
                background:"none", border:"none", cursor:"pointer",
                display:"flex", alignItems:"center", padding:"6px", borderRadius:"6px",
                transition:"color var(--t-fast), background var(--t-fast)", flexShrink:0,
              }}
              onMouseEnter={e => { e.currentTarget.style.color = "var(--text-primary)"; e.currentTarget.style.background = "var(--bg-hover)"; }}
              onMouseLeave={e => { e.currentTarget.style.color = isMuted || volume === 0 ? "var(--text-muted)" : "var(--text-secondary)"; e.currentTarget.style.background = "none"; }}
            >
              {isMuted || volume === 0 ? <VolumeOffIcon /> : volume < 0.5 ? <VolumeLowIcon /> : <VolumeHighIcon />}
            </button>
            <VolumeSlider volume={volume} isMuted={isMuted} hoverVol={hoverVol} onChange={changeVolume} />
          </div>
        </div>
      </div>
    </>
  );
}

// ── MobileEmptyBar ─────────────────────────────────────────────────────────────
function MobileEmptyBar() {
  return (
    <div style={{
      position:"fixed", bottom:"56px", left:0, right:0,
      height:"64px", background:"var(--bg-surface)",
      borderTop:"1px solid var(--border-faint)",
      display:"flex", alignItems:"center", justifyContent:"center",
      zIndex:250,
    }}>
      <span style={{ fontSize:"13px", color:"var(--text-muted)", fontStyle:"italic", display:"flex", alignItems:"center", gap:"8px" }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
        </svg>
        Select a track to start
      </span>
    </div>
  );
}

// ── MobilePlayerModal ─────────────────────────────────────────────────────────
function MobilePlayerModal({
  currentTrack, isPlaying, isLoading, progress, duration,
  progressPct, volume, isMuted, isShuffled, repeatMode, repeatActive,
  liked, upNextCount, formatTime,
  togglePlay, playNext, playPrev, seek, changeVolume,
  toggleMute, toggleShuffle, toggleRepeat, toggleLike,
  onClose, onQueueOpen, navigate,
}) {
  const progressRef = useRef(null);

  const handleProgressClick = (e) => {
    if (!duration || !progressRef.current) return;
    const rect  = progressRef.current.getBoundingClientRect();
    const ratio = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
    seek(ratio * duration);
  };

  // Touch-based progress scrubbing
  const handleProgressTouch = (e) => {
    if (!duration || !progressRef.current) return;
    const touch = e.touches[0];
    const rect  = progressRef.current.getBoundingClientRect();
    const ratio = Math.min(Math.max((touch.clientX - rect.left) / rect.width, 0), 1);
    seek(ratio * duration);
  };

  return (
    <div style={{
      position:      "fixed",
      inset:         0,
      zIndex:        600,
      background:    "var(--bg-void)",
      display:       "flex",
      flexDirection: "column",
      animation:     "slideUpModal 0.32s cubic-bezier(0.34,1.1,0.64,1) both",
      // Subtle gradient background matching the mood
      backgroundImage:"linear-gradient(180deg, var(--bg-deep) 0%, var(--bg-void) 60%)",
    }}>
      {/* ── Header row ── */}
      <div style={{
        display:        "flex",
        alignItems:     "center",
        justifyContent: "space-between",
        padding:        "52px 24px 8px",
      }}>
        {/* Swipe-down indicator + close */}
        <button onClick={onClose} style={{
          background:"none", border:"none", cursor:"pointer",
          color:"var(--text-muted)", padding:"8px",
          display:"flex", flexDirection:"column", alignItems:"center", gap:"6px",
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </button>

        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:"11px", fontWeight:700, letterSpacing:"1.5px", textTransform:"uppercase", color:"var(--text-muted)" }}>
            Now Playing
          </div>
        </div>

        {/* Queue button */}
        <div style={{ position:"relative" }}>
          <button onClick={onQueueOpen} style={{
            background:"none", border:"none", cursor:"pointer",
            color:"var(--text-muted)", padding:"8px",
            display:"flex", alignItems:"center",
          }}>
            <QueueIcon />
          </button>
          {upNextCount > 0 && (
            <span style={{
              position:"absolute", top:"4px", right:"4px",
              minWidth:"14px", height:"14px", borderRadius:"999px",
              background:"var(--cyan)", color:"var(--bg-deep)",
              fontSize:"9px", fontWeight:700,
              display:"flex", alignItems:"center", justifyContent:"center",
              padding:"0 3px", lineHeight:1, pointerEvents:"none",
            }}>
              {upNextCount > 99 ? "99+" : upNextCount}
            </span>
          )}
        </div>
      </div>

      {/* ── Album art ── */}
      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:"16px 40px" }}>
        <div style={{
          width:"min(72vw, 320px)", height:"min(72vw, 320px)",
          borderRadius:"20px", overflow:"hidden",
          background:"var(--bg-raised)",
          border:"1px solid var(--border-subtle)",
          boxShadow: isPlaying
            ? "0 24px 80px rgba(0,212,255,0.25), 0 8px 32px rgba(0,0,0,0.6)"
            : "0 8px 32px rgba(0,0,0,0.5)",
          transition:"box-shadow 0.4s ease",
          transform: isPlaying ? "scale(1.03)" : "scale(1)",
          transformOrigin:"center",
          // Small pulse animation when playing
          animation: isPlaying ? "albumPulse 3s ease-in-out infinite" : "none",
        }}>
          {currentTrack.coverUrl
            ? <img src={currentTrack.coverUrl} alt="cover" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
            : <PlaceholderArt large />
          }
        </div>
      </div>

      {/* ── Track info + like ── */}
      <div style={{
        padding:"0 32px 20px",
        display:"flex", alignItems:"center", justifyContent:"space-between",
        gap:"16px",
      }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div className="truncate" style={{
            fontSize:"22px", fontWeight:800, color:"var(--text-primary)",
            lineHeight:1.2, letterSpacing:"-0.3px",
            fontFamily:"var(--font-display)",
          }}>
            {currentTrack.title}
          </div>
          <div
            className="truncate"
            style={{
              fontSize:"15px", color:"var(--text-muted)", marginTop:"6px",
              cursor: currentTrack.artistId ? "pointer" : "default",
            }}
            onClick={() => currentTrack.artistId && navigate(`/artist/${currentTrack.artistId}`)}
          >
            {currentTrack.artist?.username || currentTrack.artistName || "Unknown Artist"}
          </div>
        </div>
        <button onClick={() => toggleLike(currentTrack._id)} style={{
          width:"48px", height:"48px", borderRadius:"50%",
          background: liked ? "rgba(255,107,107,0.12)" : "var(--bg-elevated)",
          border: liked ? "1px solid rgba(255,107,107,0.3)" : "1px solid var(--border-faint)",
          color: liked ? "var(--coral)" : "var(--text-muted)",
          display:"flex", alignItems:"center", justifyContent:"center",
          cursor:"pointer", flexShrink:0,
          transition:"all 0.2s ease",
        }}>
          <HeartIcon filled={liked} size={22} />
        </button>
      </div>

      {/* ── Progress bar ── */}
      <div style={{ padding:"0 32px 8px" }}>
        <div ref={progressRef}
          onClick={handleProgressClick}
          onTouchMove={handleProgressTouch}
          style={{
            height:"4px", borderRadius:"3px",
            background:"var(--bg-raised)", cursor:"pointer", position:"relative",
            marginBottom:"8px",
          }}
        >
          <div style={{
            position:"absolute", left:0, top:0, height:"100%",
            width:`${progressPct}%`,
            background:"linear-gradient(90deg, var(--violet), var(--cyan))",
            borderRadius:"3px", transition:"width 0.1s linear",
          }} />
          {/* Larger touch thumb */}
          <div style={{
            position:"absolute", top:"50%", left:`${progressPct}%`,
            transform:"translate(-50%,-50%)",
            width:"16px", height:"16px", borderRadius:"50%",
            background:"var(--cyan)", boxShadow:"0 0 10px rgba(0,212,255,0.7)",
            transition:"left 0.1s linear",
          }} />
        </div>
        <div style={{ display:"flex", justifyContent:"space-between" }}>
          <span style={{ fontSize:"12px", color:"var(--text-muted)", fontVariantNumeric:"tabular-nums" }}>
            {formatTime(progress)}
          </span>
          <span style={{ fontSize:"12px", color:"var(--text-muted)", fontVariantNumeric:"tabular-nums" }}>
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* ── Main controls ── */}
      <div style={{
        display:"flex", alignItems:"center", justifyContent:"center",
        gap:"8px", padding:"12px 32px",
      }}>
        <ControlBtn onClick={toggleShuffle} active={isShuffled} title="Shuffle" large>
          <ShuffleIcon size={20} />
        </ControlBtn>
        <ControlBtn onClick={playPrev} title="Previous" large>
          <SkipBackIcon size={22} />
        </ControlBtn>

        {/* Main play/pause — larger on mobile */}
        <button onClick={togglePlay} style={{
          width:"68px", height:"68px", borderRadius:"50%",
          background:"linear-gradient(135deg, var(--cyan), var(--violet))",
          border:"none", color:"#fff",
          display:"flex", alignItems:"center", justifyContent:"center",
          cursor:"pointer", flexShrink:0,
          boxShadow: isPlaying ? "var(--glow-cyan), 0 8px 24px rgba(0,212,255,0.3)" : "0 4px 16px rgba(0,0,0,0.4)",
          transition:"all 0.2s ease",
        }}>
          {isLoading ? <LoadingSpinner size={24} /> : isPlaying ? <PauseIcon size={24} /> : <PlayIcon size={24} />}
        </button>

        <ControlBtn onClick={playNext} title="Next" large>
          <SkipForwardIcon size={22} />
        </ControlBtn>
        <ControlBtn onClick={toggleRepeat} active={repeatMode !== "none"} title="Repeat" large>
          {repeatMode === "one" ? <RepeatOneIcon size={20} /> : <RepeatIcon size={20} />}
        </ControlBtn>
      </div>

      {/* ── Volume ── */}
      <div style={{
        display:"flex", alignItems:"center", gap:"12px",
        padding:"8px 32px 40px",
      }}>
        <button onClick={toggleMute} style={{
          background:"none", border:"none", cursor:"pointer",
          color: isMuted || volume === 0 ? "var(--text-muted)" : "var(--text-secondary)",
          display:"flex", alignItems:"center", padding:"4px",
        }}>
          {isMuted || volume === 0 ? <VolumeOffIcon /> : volume < 0.5 ? <VolumeLowIcon /> : <VolumeHighIcon />}
        </button>
        <VolumeSlider volume={volume} isMuted={isMuted} hoverVol onChange={changeVolume} flex />
      </div>

      <style>{`
        @keyframes slideUpModal {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        @keyframes albumPulse {
          0%, 100% { transform: scale(1.03); }
          50%      { transform: scale(1.05); }
        }
        @keyframes spinSlow {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// ── Desktop EmptyBar — unchanged ──────────────────────────────────────────────
function EmptyBar() {
  return (
    <div style={{
      height:"var(--player-h)", background:"var(--bg-surface)",
      borderTop:"1px solid var(--border-faint)",
      display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
    }}>
      <span style={{
        fontSize:"13px", color:"var(--text-muted)", fontStyle:"italic",
        display:"flex", alignItems:"center", gap:"10px",
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
        </svg>
        Select a track to start listening
      </span>
    </div>
  );
}

/* ── ControlBtn — size prop added for mobile modal ── */
function ControlBtn({ onClick, title, active = false, large = false, children }) {
  const size = large ? 48 : 32;
  return (
    <button onClick={onClick} title={title} style={{
      width:`${size}px`, height:`${size}px`, borderRadius:"50%",
      background:"none", border:"none",
      color: active ? "var(--cyan)" : "var(--text-muted)",
      display:"flex", alignItems:"center", justifyContent:"center",
      cursor:"pointer", transition:"all var(--t-fast)", flexShrink:0, position:"relative",
    }}
      onMouseEnter={e => {
        e.currentTarget.style.color      = active ? "var(--cyan)" : "var(--text-primary)";
        e.currentTarget.style.background = "var(--bg-hover)";
        e.currentTarget.style.transform  = "scale(1.1)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.color      = active ? "var(--cyan)" : "var(--text-muted)";
        e.currentTarget.style.background = "none";
        e.currentTarget.style.transform  = "scale(1)";
      }}
    >
      {children}
      {active && (
        <span style={{
          position:"absolute", bottom:"4px", left:"50%",
          transform:"translateX(-50%)",
          width:"3px", height:"3px", borderRadius:"50%",
          background:"var(--cyan)",
        }} />
      )}
    </button>
  );
}

function PlaceholderArt({ large = false }) {
  return (
    <div style={{
      width:"100%", height:"100%",
      background:"linear-gradient(135deg, var(--bg-raised), var(--violet-dim))",
      display:"flex", alignItems:"center", justifyContent:"center",
    }}>
      <svg width={large ? 48 : 20} height={large ? 48 : 20} viewBox="0 0 24 24"
        fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round">
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
      </svg>
    </div>
  );
}

/* ── VolumeSlider — flex prop for modal full-width mode ── */
function VolumeSlider({ volume, isMuted, hoverVol, onChange, flex = false }) {
  const inputRef = useRef(null);
  useEffect(() => {
    if (inputRef.current && Math.abs(parseFloat(inputRef.current.value) - volume) > 0.001) {
      inputRef.current.value = String(volume);
    }
  }, [volume]);

  return (
    <div style={{
      width: flex ? "100%" : "88px",
      position:"relative", flexShrink:0,
      display:"flex", alignItems:"center",
    }}>
      <div style={{
        position:"absolute", left:0, top:"50%", transform:"translateY(-50%)",
        height:"2px",
        width: isMuted ? "0%" : `${Math.round(volume * 100)}%`,
        background:"var(--cyan)", borderRadius:"999px",
        pointerEvents:"none", transition:"width 0.08s linear", zIndex:1,
      }} />
      <input className="vol-slider" ref={inputRef}
        type="range" min={0} max={1} step={0.01}
        defaultValue={volume}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width:"100%", position:"relative", zIndex:2 }}
      />
    </div>
  );
}

/* ── Icons — size prop added where used in modal ── */
function PlayIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3" /></svg>;
}
function PauseIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" />
  </svg>;
}
function SkipBackIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <polygon points="19 20 9 12 19 4 19 20" />
    <line x1="5" y1="19" x2="5" y2="5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
  </svg>;
}
function SkipForwardIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <polygon points="5 4 15 12 5 20 5 4" />
    <line x1="19" y1="5" x2="19" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
  </svg>;
}
function ShuffleIcon({ size = 15 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 3 21 3 21 8" /><line x1="4" y1="20" x2="21" y2="3" />
    <polyline points="21 16 21 21 16 21" /><line x1="15" y1="15" x2="21" y2="21" />
    <line x1="4" y1="4" x2="9" y2="9" />
  </svg>;
}
function RepeatIcon({ size = 15 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 014-4h14" />
    <polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 01-4 4H3" />
  </svg>;
}
function RepeatOneIcon({ size = 15 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 014-4h14" />
    <polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 01-4 4H3" />
    <line x1="12" y1="8" x2="12" y2="16" strokeWidth="2.5" />
  </svg>;
}
function HeartIcon({ filled, size = 17 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24"
    fill={filled ? "currentColor" : "none"} stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
  </svg>;
}
function VolumeHighIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <path d="M19.07 4.93a10 10 0 010 14.14" /><path d="M15.54 8.46a5 5 0 010 7.07" />
  </svg>;
}
function VolumeLowIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <path d="M15.54 8.46a5 5 0 010 7.07" />
  </svg>;
}
function VolumeOffIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" />
  </svg>;
}
function QueueIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6"  x2="21" y2="6"  /><line x1="8"  y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" /><line x1="3"  y1="6"  x2="3.01" y2="6"  />
    <line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3"  y1="18" x2="3.01" y2="18" />
  </svg>;
}
function LoadingSpinner({ size = 16 }) {
  return <div style={{
    width:`${size}px`, height:`${size}px`, borderRadius:"50%",
    border:"2px solid rgba(255,255,255,0.25)", borderTop:"2px solid #fff",
    animation:"spinSlow 0.7s linear infinite",
  }} />;
}
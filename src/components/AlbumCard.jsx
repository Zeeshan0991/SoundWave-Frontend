import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePlayer } from "../context/PlayerContext";

export default function AlbumCard({
  album,
  showArtist = true,
}) {

  const navigate = useNavigate();

  const { playSong } = usePlayer();

  const [hovered, setHovered] =
    useState(false);

  // SUPPORT BOTH songs AND musics
  const tracks =
    album.songs || album.musics || [];

  // SUPPORT BOTH coverUrl AND coverImage
  const cover =
    album.coverUrl || album.coverImage;

  const hue = [...(album.title || "Album")]
    .reduce(
      (a, c) => a + c.charCodeAt(0),
      0
    ) % 360;

  const handlePlay = (e) => {

    e.stopPropagation();

    if (!tracks.length) return;

    playSong(tracks[0], tracks);

  };

  return (

    <div
      onClick={() =>
        navigate(`/album/${album._id}`)
      }

      onMouseEnter={() =>
        setHovered(true)
      }

      onMouseLeave={() =>
        setHovered(false)
      }

      style={{
        cursor: "pointer",

        transition:
          "transform var(--t-smooth)",

        transform: hovered
          ? "translateY(-4px)"
          : "none",
      }}
    >

      {/* COVER */}

      <div
        style={{
          width: "100%",

          paddingBottom: "100%",

          borderRadius: "14px",

          overflow: "hidden",

          position: "relative",

          background: `linear-gradient(
            135deg,
            hsl(${hue},45%,18%),
            hsl(${(hue + 60) % 360},38%,12%)
          )`,

          border:
            "1px solid var(--border-faint)",

          marginBottom: "10px",

          boxShadow: hovered
            ? "0 12px 36px rgba(0,0,0,0.5)"
            : "none",

          transition:
            "box-shadow var(--t-smooth)",
        }}
      >

        {cover ? (

          <img
            src={cover}
            alt={album.title}

            style={{
              position: "absolute",

              inset: 0,

              width: "100%",

              height: "100%",

              objectFit: "cover",

              transition:
                "transform 0.5s ease",

              transform: hovered
                ? "scale(1.05)"
                : "scale(1)",
            }}
          />

        ) : (

          <div
            style={{
              position: "absolute",

              inset: 0,

              display: "flex",

              alignItems: "center",

              justifyContent: "center",
            }}
          >

            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"

              stroke={`hsl(${hue},55%,50%)`}
              strokeWidth="1.2"
              strokeLinecap="round"
            >

              <path d="M9 18V5l12-2v13" />

              <circle
                cx="6"
                cy="18"
                r="3"
              />

              <circle
                cx="18"
                cy="16"
                r="3"
              />

            </svg>

          </div>

        )}

        {/* PLAY BUTTON */}

        {hovered && tracks.length > 0 && (

          <button
            onClick={handlePlay}

            style={{
              position: "absolute",

              bottom: "10px",

              right: "10px",

              width: "40px",

              height: "40px",

              borderRadius: "50%",

              background:
                "linear-gradient(135deg, var(--cyan), var(--violet))",

              border: "none",

              color: "#fff",

              display: "flex",

              alignItems: "center",

              justifyContent: "center",

              cursor: "pointer",

              boxShadow:
                "var(--glow-cyan)",

              animation:
                "fadeIn 0.15s ease both",
            }}
          >

            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="currentColor"
            >

              <polygon points="6 3 20 12 6 21 6 3" />

            </svg>

          </button>

        )}

      </div>

      {/* INFO */}

      <div
        className="truncate"

        style={{
          fontSize: "13.5px",
          fontWeight: 600,
        }}
      >

        {album.title}

      </div>

      {showArtist && (

        <div
          className="truncate"

          style={{
            fontSize: "12px",

            color: "var(--text-muted)",

            marginTop: "3px",
          }}
        >

          {album.artist?.username ||
            album.artistName ||
            "Unknown Artist"}

          {tracks.length
            ? ` · ${tracks.length} tracks`
            : ""}

        </div>

      )}

    </div>
  );
}
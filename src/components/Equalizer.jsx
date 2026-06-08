// src/components/Equalizer.jsx
const SIZE_MAP = {
  sm: { barW: 2, height: 12, gap: 1.5 },
  md: { barW: 3, height: 18, gap: 2 },
  lg: { barW: 4, height: 26, gap: 2.5 },
};

const BAR_ANIMATIONS = ["eq1", "eq2", "eq3", "eq4", "eq5"];
const BAR_DURATIONS = [0.72, 0.88, 0.64, 0.8, 0.76];

export default function Equalizer({
  isPlaying = false,
  size = "md",
  color = "var(--cyan)",
  barCount = 4,
}) {
  const { barW, height, gap } = SIZE_MAP[size] || SIZE_MAP.md;
  const count = Math.min(Math.max(barCount, 2), 5);

  return (
    <div
      aria-label={isPlaying ? "Now playing" : "Paused"}
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: `${gap}px`,
        height: `${height}px`,
        flexShrink: 0,
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            width: `${barW}px`,
            height: `${height}px`,
            background: color,
            borderRadius: `${barW}px`,
            transformOrigin: "bottom",
            transform: isPlaying ? undefined : "scaleY(0.25)",
            animation: isPlaying
              ? `${BAR_ANIMATIONS[i % BAR_ANIMATIONS.length]} ${BAR_DURATIONS[i % BAR_DURATIONS.length]}s ease-in-out infinite alternate`
              : "none",
            opacity: isPlaying ? 1 : 0.35,
            transition: "opacity 0.3s ease, transform 0.3s ease",
            willChange: "transform",
          }}
        />
      ))}
    </div>
  );
}

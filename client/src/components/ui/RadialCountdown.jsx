import { motion } from "framer-motion";
import { useMemo } from "react";
import "./RadialCountdown.css";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function formatSeconds(seconds) {
  if (seconds == null || Number.isNaN(seconds)) return "--";
  return String(Math.max(0, Math.ceil(seconds)));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function mixColor(from, to, t) {
  const tt = clamp(t, 0, 1);
  const r = Math.round(lerp(from[0], to[0], tt));
  const g = Math.round(lerp(from[1], to[1], tt));
  const b = Math.round(lerp(from[2], to[2], tt));
  return `rgb(${r}, ${g}, ${b})`;
}

export default function RadialCountdown({
  secondsLeft,
  totalSeconds = 30,
  size = 168,
  strokeWidth = 10,
  className = "",
  variant = "full", // "full" | "semi"
  showLabel = true,
  pauseSymbol = null, // Символ для отображения вместо цифр при паузе
}) {
  // remaining: 1 -> 0
  const remaining = useMemo(() => {
    if (typeof secondsLeft !== "number" || typeof totalSeconds !== "number" || totalSeconds <= 0) {
      return 1;
    }
    return clamp(secondsLeft / totalSeconds, 0, 1);
  }, [secondsLeft, totalSeconds]);

  // elapsed: 0 -> 1 (идём к полному кругу)
  const elapsed = 1 - remaining;

  const dangerT = elapsed;

  const accent = useMemo(() => {
    // cyan -> orange -> red
    const cyan = [46, 230, 255];
    const orange = [255, 170, 51];
    const red = [255, 88, 88];
    if (dangerT < 0.65) {
      return mixColor(cyan, orange, dangerT / 0.65);
    }
    return mixColor(orange, red, (dangerT - 0.65) / 0.35);
  }, [dangerT]);

  const isCritical = typeof secondsLeft === "number" && secondsLeft <= Math.max(3, Math.ceil(totalSeconds * 0.15));

  // Full circle geometry
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const dashOffsetFull = circumference * (1 - elapsed);

  const isSemi = variant === "semi";

  return (
    <div
      className={`radial-countdown ${isSemi ? "radial-countdown--semi" : ""} ${className}`}
      style={{ "--rc-accent": accent, "--rc-size": `${size}px` }}
    >
      <div className="radial-countdown__rings" aria-hidden="true">
        <div className="radial-countdown__ring radial-countdown__ring--1" />
        <div className="radial-countdown__ring radial-countdown__ring--2" />
        <div className="radial-countdown__ring radial-countdown__ring--3" />
      </div>

      {!isSemi ? (
        <motion.svg
          className="radial-countdown__svg"
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ rotate: -90, transformOrigin: "50% 50%" }}
          animate={isCritical ? { scale: [1, 1.03, 1] } : { scale: 1 }}
          transition={isCritical ? { repeat: Infinity, duration: 0.55 } : { duration: 0.2 }}
        >
          <defs>
            <filter id="rcGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <circle
            className="radial-countdown__track"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
          />

          <circle
            className="radial-countdown__progress"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={dashOffsetFull}
            filter="url(#rcGlow)"
          />
        </motion.svg>
      ) : (
        <div className="radial-countdown__semi-wrap">
          <div className="radial-countdown__semi-rings" aria-hidden="true">
            {[1, 2, 3].map((i) => (
              <svg
                key={i}
                className={`radial-countdown__semi-ring radial-countdown__semi-ring--${i}`}
                viewBox="0 0 100 50"
                preserveAspectRatio="none"
              >
                <path d="M 0 50 A 50 50 0 0 1 100 50" pathLength="1" />
              </svg>
            ))}
          </div>

          <motion.svg
            className="radial-countdown__svg radial-countdown__svg--semi"
            viewBox="0 0 100 50"
            preserveAspectRatio="none"
            animate={isCritical ? { scale: [1, 1.03, 1] } : { scale: 1 }}
            transition={isCritical ? { repeat: Infinity, duration: 0.55 } : { duration: 0.2 }}
          >
            <defs>
              <filter id="rcGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <path
              className="radial-countdown__track radial-countdown__track--edge"
              d="M 0 50 A 50 50 0 0 1 100 50"
              strokeWidth={strokeWidth}
              pathLength="1"
            />

            <motion.path
              className="radial-countdown__progress radial-countdown__progress--edge"
              d="M 0 50 A 50 50 0 0 1 100 50"
              strokeWidth={strokeWidth}
              pathLength="1"
              strokeDasharray="1"
              animate={{ strokeDashoffset: 1 - elapsed }}
              transition={{ duration: 0.25, ease: "linear" }}
              filter="url(#rcGlow)"
            />
          </motion.svg>
        </div>
      )}

      <div className="radial-countdown__center" role="timer" aria-live="polite">
        {pauseSymbol ? (
          <div className="radial-countdown__pause-icon">
            <span className="radial-countdown__pause-bar" />
            <span className="radial-countdown__pause-bar" />
          </div>
        ) : (
          <>
            <div className="radial-countdown__value">{formatSeconds(secondsLeft)}</div>
            {showLabel ? <div className="radial-countdown__label">сек.</div> : null}
          </>
        )}
      </div>
    </div>
  );
}

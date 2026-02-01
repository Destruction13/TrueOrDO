import { motion } from "framer-motion";
import "./TimerBadge.css";

function formatTimer(seconds) {
  if (seconds == null || Number.isNaN(seconds)) {
    return "--:--";
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.max(seconds % 60, 0);
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export default function TimerBadge({ seconds, warningAt = 10, criticalAt = 5, className = "" }) {
  const isTimeLow = seconds != null && seconds <= warningAt;
  const isTimeCritical = seconds != null && seconds <= criticalAt;

  return (
    <motion.div
      className={`timer-badge ${isTimeLow ? "timer-badge--warning" : ""} ${isTimeCritical ? "timer-badge--critical" : ""} ${className}`}
      animate={isTimeCritical ? { scale: [1, 1.07, 1] } : {}}
      transition={isTimeCritical ? { repeat: Infinity, duration: 0.55 } : {}}
    >
      <svg className="timer-badge__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12,6 12,12 16,14" />
      </svg>
      <span className="timer-badge__value">{formatTimer(seconds)}</span>
    </motion.div>
  );
}

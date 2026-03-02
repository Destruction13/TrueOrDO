import { motion } from "framer-motion";
import AvatarFrame from "./AvatarFrame";
import "./CurrentTurnBanner.css";

/**
 * CurrentTurnBanner — баннер показывающий чей сейчас ход
 * Отображается всем игрокам КРОМЕ того, кто ходит
 */
export default function CurrentTurnBanner({ player }) {
  if (!player) return null;

  const initial = player.name?.[0]?.toUpperCase() || "?";

  return (
    <motion.div 
      className="current-turn-banner"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
    >
      <div className="current-turn-banner__glow" />
      <div className="current-turn-banner__content">
        <div className="current-turn-banner__icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v6M12 17v6M4.22 4.22l4.24 4.24M15.54 15.54l4.24 4.24M1 12h6M17 12h6M4.22 19.78l4.24-4.24M15.54 8.46l4.24-4.24" />
          </svg>
        </div>
        <span className="current-turn-banner__label">Сейчас ходит</span>
        <div className="current-turn-banner__player">
          <AvatarFrame size="s" frameSlug={player.frameSlug}>
            {player.avatarUrl ? (
              <img 
                src={player.avatarUrl} 
                alt={player.name}
                className="current-turn-banner__avatar"
              />
            ) : (
              <div className="current-turn-banner__avatar-placeholder">
                {initial}
              </div>
            )}
          </AvatarFrame>
          <span className="current-turn-banner__name">{player.name}</span>
        </div>
      </div>
    </motion.div>
  );
}

import { motion } from "framer-motion";
import "./PlayerCard.css";

/**
 * PlayerCard — красивая карточка игрока в стиле 21st.dev
 * С аватаром, статусом и анимациями
 */
export default function PlayerCard({
  player,
  isHost,
  isMe,
  isCurrent,
  onKick,
  showKickButton = false
}) {
  const { name, status, strikes, avatarUrl } = player;
  
  const isDisqualified = status === "disqualified";
  const initial = name?.[0]?.toUpperCase() || "?";

  return (
    <motion.div
      className={`player-card-v2 ${isDisqualified ? "player-card-v2--dq" : ""} ${isCurrent ? "player-card-v2--current" : ""} ${isMe ? "player-card-v2--me" : ""}`}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      layout
    >
      {/* Glow effect для текущего игрока */}
      {isCurrent && (
        <div className="player-card-v2__glow" />
      )}

      {/* Аватар */}
      <div className="player-card-v2__avatar-wrapper">
        {avatarUrl ? (
          <img 
            src={avatarUrl} 
            alt={name} 
            className="player-card-v2__avatar"
          />
        ) : (
          <div className="player-card-v2__avatar-placeholder">
            {initial}
          </div>
        )}
        
        {/* Статус индикатор */}
        <div className={`player-card-v2__status-dot ${status}`} />
        
        {/* Корона для хоста */}
        {isHost && (
          <div className="player-card-v2__crown">👑</div>
        )}
      </div>

      {/* Информация */}
      <div className="player-card-v2__info">
        <div className="player-card-v2__name">
          {name}
          {isMe && <span className="player-card-v2__me-tag">Вы</span>}
        </div>
        
        <div className="player-card-v2__meta">
          {isDisqualified ? (
            <span className="player-card-v2__dq-label">Дисквалифицирован</span>
          ) : (
            <div className="player-card-v2__strikes">
              {[0, 1].map((i) => (
                <span
                  key={i}
                  className={`player-card-v2__strike ${i < strikes ? "active" : ""}`}
                >
                  ✕
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Кнопка удаления */}
      {showKickButton && (
        <motion.button
          className="player-card-v2__kick"
          onClick={() => onKick?.(player.id)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          title="Удалить игрока"
        >
          ✕
        </motion.button>
      )}

      {/* Текущий игрок индикатор */}
      {isCurrent && (
        <div className="player-card-v2__current-badge">
          <span>Ходит</span>
        </div>
      )}
    </motion.div>
  );
}

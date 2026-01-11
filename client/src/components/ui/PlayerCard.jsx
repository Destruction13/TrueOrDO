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
  const { name, status, strikes, avatarUrl, shameTitle, truthStreak = 0, dareStreak = 0, connectionStatus = "online" } = player;
  
  const isChaos = status === "chaos";
  const isShamed = status === "shamed";
  const isDisconnected = connectionStatus === "disconnected";
  const isLeft = connectionStatus === "left";
  const initial = name?.[0]?.toUpperCase() || "?";

  // Build class names
  const classNames = [
    "player-card-v2",
    isChaos && "player-card-v2--chaos",
    isShamed && "player-card-v2--shamed",
    isCurrent && "player-card-v2--current",
    isMe && "player-card-v2--me",
    isDisconnected && "player-card-v2--disconnected",
    isLeft && "player-card-v2--left"
  ].filter(Boolean).join(" ");

  return (
    <motion.div
      className={classNames}
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
          <span className="player-card-v2__name-text" title={name}>{name}</span>
          {isMe && <span className="player-card-v2__me-tag">Вы</span>}
          {isChaos && <span className="player-card-v2__chaos-tag">🔥 ХАОС</span>}
          {isShamed && <span className="player-card-v2__shamed-tag">⏱️ -25%</span>}
          {isDisconnected && <span className="player-card-v2__disconnected-tag">📡 Нет связи</span>}
          {isLeft && <span className="player-card-v2__left-tag">🚪 Покинул</span>}
        </div>
        
        <div className="player-card-v2__meta">
          {isChaos ? (
            <span className="player-card-v2__chaos-label">Хаос решает за тебя</span>
          ) : isShamed && shameTitle ? (
            <span className="player-card-v2__shame-title">{shameTitle}</span>
          ) : (
            <div className="player-card-v2__strikes">
              {[0, 1, 2].map((i) => (
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

      {/* Streak минибар под карточкой (не показывать для chaos) */}
      {!isChaos && (
        <div className="player-card-v2__streak-bar">
          <div className={`player-card-v2__streak-item player-card-v2__streak-item--truth${truthStreak >= 2 ? " blocked" : ""}`}>
            <span className="player-card-v2__streak-label">Правда</span>
            <div className="player-card-v2__streak-dots">
              {[0, 1].map((i) => (
                <span 
                  key={i} 
                  className={`player-card-v2__streak-dot${i < truthStreak ? " active" : ""}`}
                />
              ))}
            </div>
          </div>
          <div className={`player-card-v2__streak-item player-card-v2__streak-item--dare${dareStreak >= 2 ? " blocked" : ""}`}>
            <span className="player-card-v2__streak-label">Действие</span>
            <div className="player-card-v2__streak-dots">
              {[0, 1].map((i) => (
                <span 
                  key={i} 
                  className={`player-card-v2__streak-dot${i < dareStreak ? " active" : ""}`}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

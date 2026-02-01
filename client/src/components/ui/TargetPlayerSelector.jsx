import { motion } from "framer-motion";
import "./TargetPlayerSelector.css";

/**
 * TargetPlayerSelector — компонент выбора игрока для Правда или Действие
 * Отображает кнопки с аватарами и никами игроков
 */
export default function TargetPlayerSelector({
  players,
  currentTurnPlayerId,
  meId,
  disabled = false,
  onSelectPlayer,
  allowSelfSelect = true, // Для теста можно выбрать себя, потом отключить
  customEnabled = false,
  onToggleCustom,
  onChaosBlocked
}) {
  const handleSelect = (playerId, player) => {
    if (disabled) return;
    if (!allowSelfSelect && playerId === currentTurnPlayerId) return;

    // В режиме "задать свой вопрос/действие" нельзя выбрать ХАОС
    if (customEnabled && player?.status === "chaos") {
      onChaosBlocked?.(
        "Игрок в режиме ХАОС. Ты не можешь задать ему свой вопрос. Переключи режим на автоматический."
      );
      return;
    }

    onSelectPlayer?.(playerId);
  };

  return (
    <motion.div 
      className="target-player-selector"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      {/* Заголовок блока */}
      <div className="target-player-selector__header">
        <div className="target-player-selector__header-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <div className="target-player-selector__header-text">
          <span className="target-player-selector__title">Кто отвечает?</span>
          <span className="target-player-selector__subtitle">Выберите игрока для задания</span>
        </div>

        <div className="target-player-selector__custom">
          <button
            type="button"
            className={`target-player-selector__custom-toggle ${customEnabled ? "is-on" : ""}`}
            onClick={() => onToggleCustom?.(!customEnabled)}
            disabled={disabled}
          >
            <span className="target-player-selector__custom-label">Задать свой вопрос / действие</span>
            <span className="target-player-selector__custom-knob" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Список игроков */}
      <div className="target-player-selector__grid">
        {players
          .filter((player) => {
            // Исключаем игроков, которые покинули или отключились
            if (player.connectionStatus === "left" || player.connectionStatus === "disconnected") {
              return false;
            }
            // Исключаем себя если не разрешено
            if (!allowSelfSelect && player.id === currentTurnPlayerId) {
              return false;
            }
            return true;
          })
          .map((player, index) => {
          const isMe = player.id === meId;
          const isTurnPlayer = player.id === currentTurnPlayerId;
          const isChaos = player.status === "chaos";
          const isShamed = player.status === "shamed";
          const initial = player.name?.[0]?.toUpperCase() || "?";

          return (
            <motion.button
              key={player.id}
              className={[
                "target-player-btn",
                isMe && "target-player-btn--me",
                isTurnPlayer && "target-player-btn--turn",
                isChaos && "target-player-btn--chaos",
                isShamed && "target-player-btn--shamed",
                disabled && "target-player-btn--disabled",
                customEnabled && isChaos && "target-player-btn--chaos-blocked"
              ].filter(Boolean).join(" ")}
              disabled={disabled}
              aria-disabled={customEnabled && isChaos ? "true" : "false"}
              onClick={() => handleSelect(player.id, player)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={!disabled && !(customEnabled && isChaos) ? { scale: 1.02, y: -2 } : {}}
              whileTap={!disabled && !(customEnabled && isChaos) ? { scale: 0.98 } : {}}
            >
              <div className="target-player-btn__avatar-wrapper">
                {player.avatarUrl ? (
                  <img 
                    src={player.avatarUrl} 
                    alt={player.name}
                    className="target-player-btn__avatar"
                  />
                ) : (
                  <div className="target-player-btn__avatar-placeholder">
                    {initial}
                  </div>
                )}
                <div className={`target-player-btn__status-dot ${player.status}`} />
              </div>
              
              <div className="target-player-btn__info">
                <span className="target-player-btn__name" title={player.name}>
                  {player.name}
                </span>
                <div className="target-player-btn__tags">
                  {isMe && <span className="target-player-btn__tag target-player-btn__tag--me">Вы</span>}
                  {isChaos && (
                    <span className={`target-player-btn__tag target-player-btn__tag--chaos ${customEnabled ? "is-blocked" : ""}`}>
                      🔥 ХАОС{customEnabled ? " (нельзя)" : ""}
                    </span>
                  )}
                  {isShamed && <span className="target-player-btn__tag target-player-btn__tag--shamed">⏱️ -25%</span>}
                </div>
              </div>

              <div className="target-player-btn__arrow">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </div>
            </motion.button>
          );
        })}
      </div>

    </motion.div>
  );
}

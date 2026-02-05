import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "../ui/Button";
import "./EmotionalLeaderboardModal.css";

/**
 * EmotionalLeaderboardModal — модальное окно лидерборда при завершении игры
 * Показывает финальный рейтинг игроков с анимациями
 * 
 * @param {boolean} isOpen - открыто ли окно
 * @param {Array} players - массив игроков
 * @param {Object} scores - объект playerId -> score
 * @param {string} meId - id текущего игрока
 * @param {boolean} isHost - является ли текущий игрок хостом
 * @param {Function} onNewGame - callback для новой игры (только для хоста)
 * @param {Function} onClose - callback для закрытия модального окна
 * @param {number} targetScore - целевой счёт для победы
 */
export default function EmotionalLeaderboardModal({
  isOpen,
  players = [],
  scores = {},
  meId,
  isHost = false,
  onNewGame,
  onClose,
  targetScore = 15,
}) {
  // Сортируем игроков по очкам (убывание)
  const sortedPlayers = useMemo(() => {
    return [...players]
      .filter((p) => p.connectionStatus === "online" || scores[p.id] > 0)
      .sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0));
  }, [players, scores]);

  // Определяем победителей (может быть несколько при равенстве очков)
  const winners = useMemo(() => {
    if (sortedPlayers.length === 0) return [];
    const maxScore = scores[sortedPlayers[0]?.id] || 0;
    if (maxScore < targetScore) return [];
    return sortedPlayers.filter((p) => (scores[p.id] || 0) === maxScore);
  }, [sortedPlayers, scores, targetScore]);

  const getMedal = (index) => {
    switch (index) {
      case 0: return "🥇";
      case 1: return "🥈";
      case 2: return "🥉";
      default: return null;
    }
  };

  const getPlaceLabel = (index) => {
    return `${index + 1} место`;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="emotional-leaderboard-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="emotional-leaderboard-modal"
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            {/* Кнопка закрытия */}
            <button
              className="emotional-leaderboard-modal__close"
              onClick={onClose}
              aria-label="Закрыть"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            {/* Заголовок с иконкой */}
            <div className="emotional-leaderboard-modal__header">
              <motion.div
                className="emotional-leaderboard-modal__icon"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 400 }}
              >
                🏆
              </motion.div>
              <h2 className="emotional-leaderboard-modal__title">Игра завершена!</h2>
              {winners.length === 1 && (
                <p className="emotional-leaderboard-modal__winner-text">
                  Победитель: <strong>{winners[0].name}</strong>
                </p>
              )}
              {winners.length > 1 && (
                <p className="emotional-leaderboard-modal__winner-text">
                  Победители: <strong>{winners.map((w) => w.name).join(", ")}</strong>
                </p>
              )}
            </div>

            {/* Список игроков */}
            <div className="emotional-leaderboard-modal__list">
              <AnimatePresence mode="popLayout">
                {sortedPlayers.map((player, index) => {
                  const score = scores[player.id] || 0;
                  const isMe = player.id === meId;
                  const isWinner = winners.some((w) => w.id === player.id);
                  const medal = getMedal(index);

                  return (
                    <motion.div
                      key={player.id}
                      className={`emotional-leaderboard-modal__item ${isMe ? "emotional-leaderboard-modal__item--me" : ""} ${isWinner ? "emotional-leaderboard-modal__item--winner" : ""}`}
                      initial={{ opacity: 0, x: -30 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + index * 0.08 }}
                      layout
                    >
                      <div className="emotional-leaderboard-modal__rank">
                        {medal ? (
                          <span className="emotional-leaderboard-modal__medal">{medal}</span>
                        ) : (
                          <span className="emotional-leaderboard-modal__rank-number">{index + 1}</span>
                        )}
                      </div>

                      <div className="emotional-leaderboard-modal__player">
                        <span className="emotional-leaderboard-modal__player-name">
                          {player.name}
                          {isMe && <span className="emotional-leaderboard-modal__you-badge">вы</span>}
                        </span>
                        <span className="emotional-leaderboard-modal__place-label">
                          {getPlaceLabel(index)}
                        </span>
                      </div>

                      <div className="emotional-leaderboard-modal__score">
                        <span className="emotional-leaderboard-modal__score-value">{score}</span>
                        <span className="emotional-leaderboard-modal__score-label">очков</span>
                      </div>

                      {isWinner && (
                        <motion.div
                          className="emotional-leaderboard-modal__winner-glow"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.3 + index * 0.08 }}
                        />
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Кнопка новой игры (только для хоста) */}
            <div className="emotional-leaderboard-modal__footer">
              {isHost ? (
                <Button onClick={onNewGame} className="emotional-leaderboard-modal__button">
                  Новая игра
                </Button>
              ) : (
                <p className="emotional-leaderboard-modal__waiting">
                  Ожидание хоста...
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

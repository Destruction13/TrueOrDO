import { motion, AnimatePresence } from "framer-motion";
import "./CyberRunnerLeaderboard.css";

/**
 * CyberRunnerLeaderboard — таблица лидеров для мини-игры CyberRunner
 * Показывает лучшие результаты игроков в рамках текущей комнаты
 * 
 * @param {Array} leaderboard - массив {playerName, score, date}
 */
export default function CyberRunnerLeaderboard({ leaderboard = [] }) {
  // Сортируем по очкам (убывание) и берём топ-10
  const sortedLeaderboard = [...leaderboard]
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  // Медали для топ-3
  const getMedal = (index) => {
    switch (index) {
      case 0: return "🥇";
      case 1: return "🥈";
      case 2: return "🥉";
      default: return null;
    }
  };

  return (
    <div className="cyber-leaderboard">
      <div className="cyber-leaderboard__header">
        <span className="cyber-leaderboard__icon">🏆</span>
        <span className="cyber-leaderboard__title">Лидерборд</span>
      </div>

      <div className="cyber-leaderboard__list">
        {sortedLeaderboard.length === 0 ? (
          <div className="cyber-leaderboard__empty">
            <span className="cyber-leaderboard__empty-icon">🎮</span>
            <span className="cyber-leaderboard__empty-text">Пока нет результатов</span>
            <span className="cyber-leaderboard__empty-hint">Сыграйте первым!</span>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {sortedLeaderboard.map((entry, index) => (
              <motion.div
                key={`${entry.playerName}-${entry.score}-${index}`}
                className={`cyber-leaderboard__item ${index < 3 ? "cyber-leaderboard__item--top" : ""}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.05 }}
                layout
              >
                <div className="cyber-leaderboard__rank">
                  {getMedal(index) || (
                    <span className="cyber-leaderboard__rank-number">{index + 1}</span>
                  )}
                </div>
                <div className="cyber-leaderboard__player">
                  <span className="cyber-leaderboard__player-name">{entry.playerName}</span>
                </div>
                <div className="cyber-leaderboard__score">
                  {entry.score}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      <div className="cyber-leaderboard__footer">
        <span className="cyber-leaderboard__footer-text">Результаты этой комнаты</span>
      </div>
    </div>
  );
}

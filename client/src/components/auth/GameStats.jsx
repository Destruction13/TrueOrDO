import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlowingEffect } from "../ui/GlowingEffect";
import "./GameStats.css";

// Конфигурация игр
const GAME_CONFIG = {
  tod: { 
    name: "Truth or Dare", 
    icon: "🎭", 
    color: "#e74c3c",
    gradient: "linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)"
  },
  alias: { 
    name: "Alias", 
    icon: "📝", 
    color: "#3498db",
    gradient: "linear-gradient(135deg, #3498db 0%, #2980b9 100%)"
  },
  codenames: { 
    name: "Codenames", 
    icon: "🕵️", 
    color: "#2ecc71",
    gradient: "linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)"
  },
  emotional: { 
    name: "Emotional", 
    icon: "💭", 
    color: "#9b59b6",
    gradient: "linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)"
  },
};

/**
 * Форматирует время в читаемый формат
 */
function formatTime(seconds) {
  if (!seconds || seconds === 0) return "0 мин";
  if (seconds < 60) return `${seconds} сек`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} мин`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return mins > 0 ? `${hours} ч ${mins} мин` : `${hours} ч`;
}

// ТЕСТОВЫЙ РЕЖИМ: показываем минуты вместо часов для проверки
// TODO: убрать TEST_MODE = true после тестирования
const TEST_MODE = true;

/**
 * Форматирует время в часы (или минуты в тестовом режиме)
 */
function formatHours(seconds) {
  if (!seconds || seconds === 0) return "0";
  
  if (TEST_MODE) {
    // В тестовом режиме показываем минуты
    const mins = seconds / 60;
    if (mins < 1) return "<1";
    return Math.floor(mins).toString();
  }
  
  const hours = seconds / 3600;
  if (hours < 1) return "<1";
  return Math.floor(hours).toString();
}

/**
 * Форматирует дату "на сайте с..."
 */
function formatMemberSince(dateString) {
  if (!dateString) return "—";
  const date = new Date(dateString);
  const options = { day: "numeric", month: "short", year: "numeric" };
  return date.toLocaleDateString("ru-RU", options);
}

/**
 * Компонент уровня (улучшенный)
 */
function LevelBadge({ level, xp }) {
  const xpInLevel = xp % 100;
  const xpToNext = 100 - xpInLevel;
  
  return (
    <div className="game-stats__level-badge">
      <div className="game-stats__level-circle">
        <svg viewBox="0 0 100 100" className="game-stats__level-ring">
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="rgba(46, 230, 255, 0.1)"
            strokeWidth="6"
          />
          <motion.circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="url(#levelGradientNew)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${xpInLevel * 2.83} 283`}
            transform="rotate(-90 50 50)"
            initial={{ strokeDasharray: "0 283" }}
            animate={{ strokeDasharray: `${xpInLevel * 2.83} 283` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
          <defs>
            <linearGradient id="levelGradientNew" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f1c40f" />
              <stop offset="50%" stopColor="#2ee6ff" />
              <stop offset="100%" stopColor="#9b59b6" />
            </linearGradient>
          </defs>
        </svg>
        <div className="game-stats__level-content">
          <span className="game-stats__level-number">{level}</span>
          <span className="game-stats__level-label">УР.</span>
        </div>
      </div>
      <div className="game-stats__level-xp">
        <span className="game-stats__level-xp-current">{xp} XP</span>
        <span className="game-stats__level-xp-next">{xpToNext} до след.</span>
      </div>
    </div>
  );
}

/**
 * Компонент мини-статистики (streak, member since, total hours)
 */
function QuickStat({ icon, value, label, accent = false }) {
  return (
    <div className={`game-stats__quick-stat ${accent ? "game-stats__quick-stat--accent" : ""}`}>
      <span className="game-stats__quick-stat-icon">{icon}</span>
      <div className="game-stats__quick-stat-content">
        <span className="game-stats__quick-stat-value">{value}</span>
        <span className="game-stats__quick-stat-label">{label}</span>
      </div>
    </div>
  );
}

/**
 * Карточка игры с детальной статистикой
 */
function GameCard({ game, achievementsData }) {
  const config = GAME_CONFIG[game.gameType] || {};
  const winRate = game.gamesPlayed > 0 
    ? Math.round((game.gamesWon / game.gamesPlayed) * 100) 
    : 0;
  const hours = formatHours(game.timePlayed || 0);
  
  // Подсчёт достижений для этой игры
  const gameAchievements = achievementsData?.[game.gameType] || { unlocked: 0, total: 0 };
  
  return (
    <motion.div 
      className="game-stats__game-card"
      style={{ "--game-color": config.color }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.15 }}
    >
      <div className="game-stats__game-card-header">
        <span className="game-stats__game-card-icon">{config.icon}</span>
        <span className="game-stats__game-card-name">{config.name}</span>
      </div>
      <div className="game-stats__game-card-stats">
        <div className="game-stats__game-card-stat">
          <span className="game-stats__game-card-stat-value">{game.gamesPlayed}</span>
          <span className="game-stats__game-card-stat-label">игр</span>
        </div>
        <div className="game-stats__game-card-stat">
          <span className="game-stats__game-card-stat-value">{winRate}%</span>
          <span className="game-stats__game-card-stat-label">побед</span>
        </div>
        <div className="game-stats__game-card-stat">
          <span className="game-stats__game-card-stat-value">{hours}</span>
          <span className="game-stats__game-card-stat-label">{TEST_MODE ? "минут" : "часов"}</span>
        </div>
        <div className="game-stats__game-card-stat">
          <span className="game-stats__game-card-stat-value">{gameAchievements.unlocked}/{gameAchievements.total}</span>
          <span className="game-stats__game-card-stat-label">достиж.</span>
        </div>
      </div>
      {/* Цветная полоса снизу */}
      <div className="game-stats__game-card-accent" style={{ background: config.gradient }} />
    </motion.div>
  );
}

/**
 * Главный компонент статистики
 */
export default function GameStats({ stats, loading, achievementsData }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Подсчёт достижений по играм
  const gameAchievementsCounts = useMemo(() => {
    // Маппинг категорий достижений на gameType
    const categoryToGameType = {
      game_tod: "tod",
      game_alias: "alias",
      game_emotional: "emotional",
      game_codenames: "codenames",
    };
    
    const counts = {
      tod: { unlocked: 0, total: 0 },
      alias: { unlocked: 0, total: 0 },
      emotional: { unlocked: 0, total: 0 },
      codenames: { unlocked: 0, total: 0 },
    };
    
    // Считаем из byCategory если есть
    if (achievementsData?.byCategory) {
      Object.entries(achievementsData.byCategory).forEach(([category, achievements]) => {
        const gameType = categoryToGameType[category];
        if (gameType && counts[gameType] && Array.isArray(achievements)) {
          counts[gameType].unlocked = achievements.length;
        }
      });
    }
    
    // Общее количество достижений по категориям (хардкод на основе ALL_ACHIEVEMENTS)
    // tod: 8, alias: 6, emotional: 3, codenames: 3
    counts.tod.total = 8;
    counts.alias.total = 6;
    counts.emotional.total = 3;
    counts.codenames.total = 3;
    
    return counts;
  }, [achievementsData]);
  
  if (loading) {
    return (
      <div className="game-stats game-stats--loading">
        <div className="game-stats__skeleton" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="game-stats game-stats--empty">
        <GlowingEffect 
          borderWidth={2}
          glowSize={180}
          proximity={80}
          glowColors={["#3498db", "#2ee6ff", "#9b59b6"]}
        />
        <div className="game-stats__header">
          <span className="game-stats__title">
            <span className="game-stats__title-icon">📊</span>
            <span className="game-stats__title-label">Статистика</span>
          </span>
        </div>
        <div className="game-stats__empty-message">
          Сыграйте первую игру, чтобы увидеть статистику
        </div>
      </div>
    );
  }

  const { user, totals, byGame } = stats;
  const totalHours = formatHours(totals?.timePlayed || 0);

  return (
    <div className="game-stats">
      {/* Эффект свечения по границе */}
      <GlowingEffect 
        borderWidth={2}
        glowSize={180}
        proximity={80}
        glowColors={["#3498db", "#2ee6ff", "#9b59b6"]}
      />
      
      {/* Заголовок */}
      <div className="game-stats__header">
        <div className="game-stats__title">
          <span className="game-stats__title-icon">📊</span>
          <span className="game-stats__title-label">Статистика</span>
        </div>
      </div>
      
      {/* Основной блок: Уровень + быстрая статистика */}
      <div className="game-stats__overview">
        <LevelBadge level={user?.level || 1} xp={user?.xp || 0} />
        
        <div className="game-stats__quick-stats">
          <QuickStat 
            icon="🔥" 
            value={user?.loginStreak || 0} 
            label="дней подряд"
            accent={user?.loginStreak > 0}
          />
          <QuickStat 
            icon="📅" 
            value={formatMemberSince(user?.memberSince || user?.createdAt)} 
            label="на сайте с"
          />
          <QuickStat 
            icon="⏱️" 
            value={TEST_MODE ? `${totalHours} мин` : `${totalHours} ч`} 
            label="во всех играх"
          />
        </div>
      </div>
      
      {/* Кнопка раскрытия */}
      {byGame && byGame.length > 0 && (
        <>
          <motion.button 
            className="game-stats__expand-btn"
            onClick={() => setIsExpanded(!isExpanded)}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <span className="game-stats__expand-btn-bg" />
            <span className="game-stats__expand-btn-shimmer" />
            <span className="game-stats__expand-btn-text">
              {isExpanded ? "Скрыть статистику по играм" : "Статистика по играм"}
            </span>
            <motion.span 
              className="game-stats__expand-btn-arrow"
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.3 }}
            >
              ▼
            </motion.span>
          </motion.button>
          
          {/* Статистика по играм */}
          <AnimatePresence initial={false}>
            {isExpanded && (
              <motion.div 
                className="game-stats__games-grid"
                initial={{ height: 0, opacity: 0 }}
                animate={{ 
                  height: "auto", 
                  opacity: 1,
                  transition: {
                    height: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
                    opacity: { duration: 0.3, delay: 0.1 }
                  }
                }}
                exit={{ 
                  height: 0, 
                  opacity: 0,
                  transition: {
                    height: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
                    opacity: { duration: 0.2 }
                  }
                }}
              >
                <div className="game-stats__games-grid-inner">
                  {byGame.map((game) => (
                    <GameCard 
                      key={game.gameType} 
                      game={game}
                      achievementsData={gameAchievementsCounts}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}

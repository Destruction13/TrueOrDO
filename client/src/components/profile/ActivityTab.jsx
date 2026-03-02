import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import "./ActivityTab.css";

/**
 * ActivityTab — вкладка "Активность" (Discord-стиль)
 * 
 * Содержит:
 * - Текущая активность (в какой игре находится пользователь)
 * - Статистика активности (стрики, время в играх)
 * - Недавняя активность (история игр за 30 дней)
 * - Возможность присоединиться к игре друга
 */

// ============================================
// Игры PartyChaos
// ============================================

const GAMES_MAP = {
  "tod": { 
    name: "Правда или действие", 
    icon: "🎯", 
    color: "#e74c3c", 
    path: "/truth-or-dare",
    cover: "/covers/TruthOrDare.jpg"
  },
  "alias": { 
    name: "Alias", 
    icon: "🎭", 
    color: "#9b59b6", 
    path: "/alias",
    cover: "/covers/Alias.jpg"
  },
  "codenames": { 
    name: "Codenames", 
    icon: "🕵️", 
    color: "#3498db", 
    path: "/codenames",
    cover: "/covers/Codenames.jpg"
  },
  "emotional": { 
    name: "Emotional", 
    icon: "🧠", 
    color: "#e91e63", 
    path: "/emotional",
    cover: "/covers/Emotional.jpg"
  },
};

// ============================================
// Хелперы форматирования
// ============================================

function formatActivityTime(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Только что";
  if (diffMins < 60) return `${diffMins} мин. назад`;
  if (diffHours < 24) return `${diffHours} ч. назад`;
  if (diffDays === 1) return "Вчера";
  if (diffDays < 7) return `${diffDays} д. назад`;
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

function formatDuration(minutes) {
  if (!minutes) return null;
  if (minutes < 60) return `${minutes} мин`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours} ч ${mins} мин` : `${hours} ч`;
}

function formatTotalTime(seconds) {
  if (!seconds) return "0 мин";
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return mins > 0 ? `${hours} ч ${mins} мин` : `${hours} ч`;
  }
  return `${mins} мин`;
}

function formatElapsedTime(startedAt) {
  if (!startedAt) return null;
  const start = new Date(startedAt);
  const now = new Date();
  const diffMs = now - start;
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return "меньше минуты";
  if (diffMins < 60) return `${diffMins} мин`;
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return mins > 0 ? `${hours} ч ${mins} мин` : `${hours} ч`;
}

// ============================================
// Компонент статистики стриков
// ============================================

function ActivityStatsCard({ stats }) {
  if (!stats) return null;

  return (
    <motion.div 
      className="activity-stats-card"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="activity-stats-grid">
        {/* Текущий стрик */}
        <div className="activity-stat-item">
          <div className="activity-stat-icon">🔥</div>
          <div className="activity-stat-info">
            <span className="activity-stat-value">{stats.currentStreak || 0}</span>
            <span className="activity-stat-label">
              {stats.currentStreak === 1 ? "день подряд" : 
               stats.currentStreak >= 2 && stats.currentStreak <= 4 ? "дня подряд" : "дней подряд"}
            </span>
          </div>
        </div>

        {/* Рекорд стрика */}
        {stats.maxStreak > 0 && (
          <div className="activity-stat-item">
            <div className="activity-stat-icon">🏆</div>
            <div className="activity-stat-info">
              <span className="activity-stat-value">{stats.maxStreak}</span>
              <span className="activity-stat-label">рекорд</span>
            </div>
          </div>
        )}

        {/* Общее время */}
        <div className="activity-stat-item">
          <div className="activity-stat-icon">⏱️</div>
          <div className="activity-stat-info">
            <span className="activity-stat-value">{formatTotalTime(stats.totalPlayTime)}</span>
            <span className="activity-stat-label">всего в играх</span>
          </div>
        </div>

        {/* Сессий за неделю */}
        {stats.sessionsThisWeek > 0 && (
          <div className="activity-stat-item">
            <div className="activity-stat-icon">📊</div>
            <div className="activity-stat-info">
              <span className="activity-stat-value">{stats.sessionsThisWeek}</span>
              <span className="activity-stat-label">
                {stats.sessionsThisWeek === 1 ? "игра за неделю" : "игр за неделю"}
              </span>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ============================================
// Компонент текущей активности
// ============================================

function CurrentActivityCard({ activity, onJoin }) {
  const navigate = useNavigate();
  const [elapsedTime, setElapsedTime] = useState(() => formatElapsedTime(activity?.startedAt));
  const [copied, setCopied] = useState(false);

  // Обновляем время каждую минуту
  useEffect(() => {
    if (!activity?.startedAt) return;
    
    const interval = setInterval(() => {
      setElapsedTime(formatElapsedTime(activity.startedAt));
    }, 60000);

    return () => clearInterval(interval);
  }, [activity?.startedAt]);

  if (!activity) return null;

  const { gameType, title, subtitle, icon, color, isLive, roomCode, players, canJoin, path } = activity;
  const gameInfo = GAMES_MAP[gameType] || {};
  const gameColor = color || gameInfo.color || "#7c3aed";
  const gameCover = gameInfo.cover || "/covers/TruthOrDare.jpg";

  const handleJoin = () => {
    if (canJoin && roomCode && path) {
      navigate(`${path}?code=${roomCode}`);
    }
  };

  const handleCopyRoomLink = async () => {
    if (!roomCode || !path) return;
    const link = `${window.location.origin}${path}/${roomCode}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <motion.div 
      className="activity-current-card"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ "--game-color": gameColor }}
    >
      <div className="activity-current-inner">
        {/* Заголовок с бейджами */}
        <div className="activity-current-header">
          <div className="activity-current-badges">
            <span className="activity-badge activity-badge--playing">
              <span className="activity-badge-dot" />
              Играет
            </span>
            {isLive && (
              <span className="activity-badge activity-badge--live">
                LIVE
              </span>
            )}
          </div>
          {elapsedTime && (
            <span className="activity-current-elapsed">
              {elapsedTime}
            </span>
          )}
        </div>
        
        {/* Основной контент */}
        <div className="activity-current-content">
          <div className="activity-current-cover">
            <img 
              src={gameCover} 
              alt={title || gameInfo.name}
              className="activity-current-cover-img"
            />
          </div>
          <div className="activity-current-info">
            <h4 className="activity-current-title">{title || gameInfo.name}</h4>
            {roomCode && (
              <div className="activity-room-info">
                <span className="activity-room-label">Находится в комнате:</span>
                <button 
                  className={`activity-room-code ${copied ? 'activity-room-code--copied' : ''}`}
                  onClick={handleCopyRoomLink}
                  title="Скопировать ссылку"
                >
                  <span className="activity-room-code-value">{roomCode}</span>
                  {copied && <span className="activity-room-code-copied-text">Скопировано!</span>}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Игроки */}
        {players && players.length > 0 && (
          <div className="activity-current-players">
            <div className="activity-players-avatars">
              {players.slice(0, 5).map((player, index) => (
                player.avatar ? (
                  <img 
                    key={player.id || player.visitorId || index}
                    src={player.avatar}
                    alt={player.nickname}
                    className="activity-player-avatar"
                    title={player.nickname}
                    style={{ zIndex: 5 - index }}
                  />
                ) : (
                  <div 
                    key={player.id || player.visitorId || index}
                    className="activity-player-avatar activity-player-avatar--placeholder"
                    title={player.nickname}
                    style={{ zIndex: 5 - index }}
                  >
                    {player.nickname?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                )
              ))}
              {players.length > 5 && (
                <span className="activity-players-more">+{players.length - 5}</span>
              )}
            </div>
            <span className="activity-players-count">
              {players.length} {players.length === 1 ? "игрок" : 
                players.length >= 2 && players.length <= 4 ? "игрока" : "игроков"}
            </span>
          </div>
        )}

        {/* Кнопка присоединения */}
        {canJoin && roomCode && (
          <button 
            className="activity-join-btn"
            onClick={handleJoin}
          >
            Присоединиться
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ============================================
// Компонент карточки недавней активности
// ============================================

function RecentActivityCard({ activity, index, isSelf, onHide }) {
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef(null);
  const buttonRef = useRef(null);
  const navigate = useNavigate();
  
  const { 
    id, gameType, name, icon, color, playedAt, 
    duration, durationFormatted, playersCount 
  } = activity;

  const gameInfo = GAMES_MAP[gameType] || {};
  const gameColor = color || gameInfo.color || "#7c3aed";

  const handlePlayAgain = () => {
    const path = gameInfo.path || "/games";
    navigate(path);
    setShowMenu(false);
  };

  const handleHide = () => {
    onHide?.(id);
    setShowMenu(false);
  };

  const handleMenuToggle = (e) => {
    e.stopPropagation();
    if (!showMenu && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      // Центрируем popup относительно кнопки (примерно 80px высота popup с 2 пунктами)
      const popupHeight = 76;
      setMenuPosition({
        top: rect.top + (rect.height / 2) - (popupHeight / 2),
        left: rect.right + 8
      });
    }
    setShowMenu(!showMenu);
  };

  // Закрытие меню при клике вне
  useEffect(() => {
    if (!showMenu) return;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target) &&
          buttonRef.current && !buttonRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenu]);

  const gameCover = gameInfo.cover || "/covers/TruthOrDare.jpg";

  return (
    <motion.div
      className="activity-recent-card"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2, delay: index * 0.03 }}
      style={{ "--game-color": gameColor }}
    >
      {/* Обложка игры */}
      <div className="activity-recent-cover">
        <img 
          src={gameCover} 
          alt={name || gameInfo.name}
          className="activity-recent-cover-img"
        />
      </div>
      
      {/* Информация */}
      <div className="activity-recent-info">
        <h4 className="activity-recent-name">{name || gameInfo.name}</h4>
        <span className="activity-recent-time">
          {formatActivityTime(playedAt)}
        </span>
        {(durationFormatted || duration) && (
          <span className="activity-recent-duration">
            {durationFormatted || formatDuration(duration)}
          </span>
        )}
      </div>

      {/* Меню (только для владельца) */}
      {isSelf && (
        <div className="activity-recent-menu-wrapper">
          <button 
            ref={buttonRef}
            className="activity-recent-menu-btn"
            onClick={handleMenuToggle}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <circle cx="3" cy="8" r="1.5"/>
              <circle cx="8" cy="8" r="1.5"/>
              <circle cx="13" cy="8" r="1.5"/>
            </svg>
          </button>
          
          {showMenu && (
            <div 
              ref={menuRef}
              className="activity-recent-dropdown"
              style={{ top: menuPosition.top, left: menuPosition.left }}
            >
              <button 
                className="activity-dropdown-item"
                onClick={handlePlayAgain}
              >
                Играть снова
              </button>
              <button 
                className="activity-dropdown-item activity-dropdown-item--danger"
                onClick={handleHide}
              >
                Скрыть
              </button>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

// ============================================
// Основной компонент ActivityTab
// ============================================

function ActivityTab({ profileData, isSelf, socket, userId }) {
  const [currentActivity, setCurrentActivity] = useState(null);
  const [recentActivities, setRecentActivities] = useState([]);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);

  // Загрузка данных активности
  useEffect(() => {
    if (!socket || !userId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // Запрашиваем полные данные активности
    socket.emit("profile:activity:get", { userId }, (response) => {
      setIsLoading(false);
      
      if (response?.success) {
        setCurrentActivity(response.currentActivity || null);
        setRecentActivities(response.recentActivities || []);
        setStats(response.stats || null);
        setHasMore(response.hasMoreActivities || false);
      }
    });

    // Подписка на обновления активности
    const handleActivityUpdate = (data) => {
      if (data.userId === userId) {
        if (data.currentActivity !== undefined) {
          setCurrentActivity(data.currentActivity);
        }
        if (data.recentActivities) {
          setRecentActivities(data.recentActivities);
        }
        if (data.stats) {
          setStats(data.stats);
        }
      }
    };

    socket.on("profile:activity:update", handleActivityUpdate);

    return () => {
      socket.off("profile:activity:update", handleActivityUpdate);
    };
  }, [socket, userId]);

  // Скрыть активность из истории
  const handleHideActivity = useCallback((activityId) => {
    if (!socket) return;
    
    socket.emit("profile:activity:hide", { activityId }, (response) => {
      if (response?.success) {
        setRecentActivities(prev => prev.filter(a => a.id !== activityId));
      }
    });
  }, [socket]);

  // Присоединиться к игре
  const handleJoinGame = useCallback((roomCode, gameType) => {
    const gameInfo = GAMES_MAP[gameType];
    if (gameInfo?.path && roomCode) {
      window.location.href = `${gameInfo.path}?code=${roomCode}`;
    }
  }, []);

  return (
    <div className="activity-tab">
      {/* Текущая активность */}
      <section className="activity-section">
        <div className="activity-section-header">
          <h3 className="activity-section-title">Текущая активность</h3>
        </div>
        
        {currentActivity ? (
          <CurrentActivityCard 
            activity={currentActivity} 
            onJoin={handleJoinGame}
          />
        ) : (
          <motion.div 
            className="activity-empty-state"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <span className="activity-empty-icon">😴</span>
            <span className="activity-empty-text">
              {isSelf ? "Вы сейчас не в игре" : "Сейчас не в игре"}
            </span>
          </motion.div>
        )}
      </section>

      {/* Недавняя активность */}
      <section className="activity-section">
        <div className="activity-section-header">
          <h3 className="activity-section-title">Недавняя активность</h3>
          <span className="activity-section-hint">
            за 30 дней
          </span>
        </div>

        {isLoading ? (
          <div className="activity-loading">
            <span className="activity-loading-spinner">⏳</span>
            <span>Загрузка...</span>
          </div>
        ) : recentActivities.length > 0 ? (
          <div className="activity-recent-list">
            <AnimatePresence mode="popLayout">
              {recentActivities.map((activity, index) => (
                <RecentActivityCard 
                  key={activity.id || index} 
                  activity={activity} 
                  index={index}
                  isSelf={isSelf}
                  onHide={handleHideActivity}
                />
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <motion.div 
            className="activity-empty-state"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <span className="activity-empty-icon">🎲</span>
            <span className="activity-empty-text">
              {isSelf 
                ? "Сыграйте в игру, чтобы она появилась здесь" 
                : "Нет недавней активности"}
            </span>
          </motion.div>
        )}
      </section>
    </div>
  );
}

export default ActivityTab;

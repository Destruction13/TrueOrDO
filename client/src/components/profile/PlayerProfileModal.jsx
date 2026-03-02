import { useState, useEffect, useLayoutEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import AvatarFrame from "../ui/AvatarFrame";
import StyledNickname from "../ui/StyledNickname";
import Button from "../ui/Button";
import { GlowingEffect } from "../ui/GlowingEffect";
import "./PlayerProfileModal.css";

// Конфигурация игр
const GAME_CONFIG = {
  tod: { name: "Truth or Dare", icon: "🎭", color: "#e74c3c" },
  alias: { name: "Alias", icon: "📝", color: "#3498db" },
  codenames: { name: "Codenames", icon: "🕵️", color: "#2ecc71" },
  emotional: { name: "Emotional", icon: "💭", color: "#9b59b6" },
};

// Конфигурация редкости достижений с градиентами
const RARITY_CONFIG = {
  common: { 
    label: "Обычное", 
    color: "#8b8b8b",
    gradient: "linear-gradient(135deg, #3a3a3a 0%, #2a2a2a 100%)",
    borderColor: "rgba(139, 139, 139, 0.3)",
    glow: "none",
  },
  rare: { 
    label: "Редкое", 
    color: "#4b9cd3",
    gradient: "linear-gradient(135deg, #1e3a5f 0%, #0d2840 100%)",
    borderColor: "rgba(75, 156, 211, 0.4)",
    glow: "0 0 15px rgba(75, 156, 211, 0.3)",
  },
  epic: { 
    label: "Эпическое", 
    color: "#9b59b6",
    gradient: "linear-gradient(135deg, #4a1a6b 0%, #2d1045 100%)",
    borderColor: "rgba(155, 89, 182, 0.5)",
    glow: "0 0 20px rgba(155, 89, 182, 0.4)",
  },
  heroic: { 
    label: "Героическое", 
    color: "#e74c3c",
    gradient: "linear-gradient(135deg, #6b1a1a 0%, #451010 100%)",
    borderColor: "rgba(231, 76, 60, 0.5)",
    glow: "0 0 25px rgba(231, 76, 60, 0.5)",
  },
  legendary: { 
    label: "Легендарное", 
    color: "#f1c40f",
    gradient: "linear-gradient(135deg, #5c4a00 0%, #3d3100 50%, #5c4a00 100%)",
    borderColor: "rgba(241, 196, 15, 0.6)",
    glow: "0 0 30px rgba(241, 196, 15, 0.5), 0 0 60px rgba(241, 196, 15, 0.2)",
  },
  secret: { 
    label: "Секретное", 
    color: "#e91e63",
    gradient: "linear-gradient(135deg, #5c0a2a 0%, #3d0620 100%)",
    borderColor: "rgba(233, 30, 99, 0.5)",
    glow: "0 0 20px rgba(233, 30, 99, 0.4)",
  },
};

// Статусы онлайн
const ONLINE_STATUS_CONFIG = {
  online: { label: "Онлайн", color: "#2ecc71", icon: "🟢" },
  idle: { label: "Отошёл", color: "#f1c40f", icon: "🟡" },
  in_game: { label: "В игре", color: "#9b59b6", icon: "🎮" },
  offline: { label: "Оффлайн", color: "#6b6b6b", icon: "⚫" },
};

/**
 * Форматирует дату "на платформе с..."
 */
function formatMemberSince(dateString) {
  if (!dateString) return "—";
  const date = new Date(dateString);
  const options = { month: "long", year: "numeric" };
  return date.toLocaleDateString("ru-RU", options);
}

/**
 * Форматирует время
 */
function formatLastSeen(dateString) {
  if (!dateString) return "Давно";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Только что";
  if (diffMins < 60) return `${diffMins} мин. назад`;
  if (diffHours < 24) return `${diffHours} ч. назад`;
  if (diffDays < 7) return `${diffDays} дн. назад`;
  return date.toLocaleDateString("ru-RU");
}

/**
 * Компонент статуса онлайн
 */
function OnlineStatus({ status, currentGameType, lastSeenAt }) {
  const config = ONLINE_STATUS_CONFIG[status] || ONLINE_STATUS_CONFIG.offline;
  const gameConfig = currentGameType ? GAME_CONFIG[currentGameType] : null;

  return (
    <div className="profile-modal__online-status" style={{ "--status-color": config.color }}>
      <span className="profile-modal__online-status-icon">{config.icon}</span>
      <span className="profile-modal__online-status-text">
        {status === "in_game" && gameConfig
          ? `Играет в ${gameConfig.name}`
          : status === "offline"
            ? `Был(а) ${formatLastSeen(lastSeenAt)}`
            : config.label}
      </span>
    </div>
  );
}

/**
 * Бейдж уровня рядом с никнеймом
 */
function LevelBadge({ level, xp }) {
  return (
    <div className="profile-modal__level-badge" title={`${xp || 0} XP`}>
      <span className="profile-modal__level-badge-icon">⭐</span>
      <span className="profile-modal__level-badge-value">{level || 1}</span>
    </div>
  );
}

/**
 * Форматирует минуты в часы
 */
function formatPlayTime(minutes) {
  if (!minutes || minutes < 1) return "< 1 мин";
  if (minutes < 60) return `${minutes} мин`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours} ч`;
  return `${hours} ч ${mins} мин`;
}

/**
 * Компонент любимых игр (показывает время в часах)
 */
function FavoriteGames({ byGame }) {
  if (!byGame || byGame.length === 0) return null;

  // Сортируем по времени игры
  const sorted = [...byGame].sort((a, b) => (b.playTimeMinutes || 0) - (a.playTimeMinutes || 0));
  const maxTime = sorted[0]?.playTimeMinutes || 1;

  return (
    <div className="profile-modal__section profile-modal__favorite-games">
      <h4 className="profile-modal__section-title">
        <span>🎮</span> Любимые игры
      </h4>
      <div className="profile-modal__games-list">
        {sorted.map((game) => {
          const config = GAME_CONFIG[game.gameType] || {};
          const timeValue = game.playTimeMinutes || 0;
          const percent = maxTime > 0 ? (timeValue / maxTime) * 100 : 0;

          return (
            <div key={game.gameType} className="profile-modal__game-item">
              <div className="profile-modal__game-header">
                <span className="profile-modal__game-icon">{config.icon}</span>
                <span className="profile-modal__game-name">{config.name}</span>
                <span className="profile-modal__game-count">
                  {formatPlayTime(timeValue)}
                </span>
              </div>
              <div className="profile-modal__game-bar">
                <motion.div
                  className="profile-modal__game-bar-fill"
                  style={{ backgroundColor: config.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${percent}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Компонент одного достижения с тултипом (использует portal для правильного позиционирования)
 */
function AchievementWithTooltip({ achievement, index, total }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const achievementRef = useRef(null);
  const tooltipRef = useRef(null);
  const [tooltipStyle, setTooltipStyle] = useState({});
  const rarityConfig = RARITY_CONFIG[achievement.rarity] || RARITY_CONFIG.common;

  // Пересчитываем позицию тултипа после его рендера (когда знаем реальную высоту)
  // useLayoutEffect чтобы измерить размеры до перерисовки браузера
  useLayoutEffect(() => {
    if (showTooltip && tooltipRef.current && achievementRef.current) {
      const rect = achievementRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const tooltipWidth = 240;
      const gap = 12; // Отступ между ячейкой и тултипом
      const padding = 12;
      
      // Находим границы модального окна
      const modal = achievementRef.current.closest('.profile-modal');
      const modalRect = modal ? modal.getBoundingClientRect() : null;
      
      // Позиция тултипа - над элементом (используем реальную высоту тултипа)
      let left = rect.left + rect.width / 2 - tooltipWidth / 2;
      let top = rect.top - tooltipRect.height - gap;
      
      // Ограничиваем в пределах модального окна (или экрана если модал не найден)
      const minLeft = modalRect ? modalRect.left + padding : padding;
      const maxRight = modalRect ? modalRect.right - padding : window.innerWidth - padding;
      
      // Корректируем если выходит за левую границу
      if (left < minLeft) {
        left = minLeft;
      }
      // Корректируем если выходит за правую границу
      if (left + tooltipWidth > maxRight) {
        left = maxRight - tooltipWidth;
      }
      
      setTooltipStyle({
        position: 'fixed',
        left: `${left}px`,
        top: `${top}px`,
        width: `${tooltipWidth}px`,
        visibility: 'visible',
      });
    }
  }, [showTooltip]);

  // Показываем тултип при наведении (изначально невидимый для измерения)
  const handleMouseEnter = useCallback(() => {
    setTooltipStyle({
      position: 'fixed',
      left: '-9999px',
      top: '-9999px',
      width: '240px',
      visibility: 'hidden',
    });
    setShowTooltip(true);
  }, []);

  // Клик для мобильных устройств - toggle тултипа
  const handleClick = useCallback((e) => {
    e.stopPropagation();
    if (showTooltip) {
      setShowTooltip(false);
    } else {
      setTooltipStyle({
        position: 'fixed',
        left: '-9999px',
        top: '-9999px',
        width: '240px',
        visibility: 'hidden',
      });
      setShowTooltip(true);
    }
  }, [showTooltip]);

  // Определяем игру для достижения
  const gameConfig = achievement.gameType ? GAME_CONFIG[achievement.gameType] : null;

  return (
    <motion.div
      ref={achievementRef}
      className={`profile-modal__achievement profile-modal__achievement--${achievement.rarity || 'common'}`}
      style={{ 
        "--rarity-color": rarityConfig.color,
        "--rarity-gradient": rarityConfig.gradient,
        "--rarity-border": rarityConfig.borderColor,
        "--rarity-glow": rarityConfig.glow,
      }}
      whileHover={{ scale: 1.1 }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setShowTooltip(false)}
      onClick={handleClick}
    >
      {/* Внутренний контейнер для shimmer эффекта с overflow: hidden */}
      <div className="profile-modal__achievement-shimmer" />
      <span className="profile-modal__achievement-icon">{achievement.icon}</span>
      {achievement.level > 1 && (
        <span className="profile-modal__achievement-level">{achievement.level}</span>
      )}
      
      {showTooltip && createPortal(
        <motion.div
          ref={tooltipRef}
          className={`profile-modal__achievement-tooltip profile-modal__achievement-tooltip--${achievement.rarity || 'common'}`}
          style={{
            ...tooltipStyle,
            "--rarity-color": rarityConfig.color,
            "--rarity-gradient": rarityConfig.gradient,
            "--rarity-border": rarityConfig.borderColor,
            "--rarity-glow": rarityConfig.glow,
          }}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 5 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          {/* Эффект свечения для редких+ */}
          {achievement.rarity !== 'common' && (
            <div className="profile-modal__achievement-tooltip-glow" />
          )}
          
          <div className="profile-modal__achievement-tooltip-header">
            <div className="profile-modal__achievement-tooltip-icon-wrapper">
              <span className="profile-modal__achievement-tooltip-icon">{achievement.icon}</span>
            </div>
            <div className="profile-modal__achievement-tooltip-info">
              <span className="profile-modal__achievement-tooltip-name">{achievement.name}</span>
              <span 
                className="profile-modal__achievement-tooltip-rarity"
                style={{ color: rarityConfig.color }}
              >
                {rarityConfig.label}
              </span>
            </div>
          </div>
          
          {gameConfig && (
            <div className="profile-modal__achievement-tooltip-game">
              <span>{gameConfig.icon}</span>
              <span>{gameConfig.name}</span>
            </div>
          )}
          
          <p className="profile-modal__achievement-tooltip-desc">{achievement.description}</p>
          
          {achievement.level > 1 && (
            <div className="profile-modal__achievement-tooltip-level">
              <span className="profile-modal__achievement-tooltip-level-star">★</span>
              Уровень {achievement.level}
            </div>
          )}
        </motion.div>,
        document.body
      )}
    </motion.div>
  );
}

/**
 * Компонент витрины достижений
 */
function FeaturedAchievements({ achievements }) {
  if (!achievements?.featured || achievements.featured.length === 0) {
    return (
      <div className="profile-modal__section profile-modal__achievements">
        <h4 className="profile-modal__section-title">
          <span>🏆</span> Витрина достижений
          <span className="profile-modal__achievements-count">0</span>
        </h4>
        <div className="profile-modal__achievements-empty">
          Пока нет достижений
        </div>
      </div>
    );
  }

  return (
    <div className="profile-modal__section profile-modal__achievements">
      <h4 className="profile-modal__section-title">
        <span>🏆</span> Витрина достижений
        <span className="profile-modal__achievements-count">{achievements.total}</span>
      </h4>
      <div className="profile-modal__achievements-grid">
        {achievements.featured.map((achievement, index) => (
          <AchievementWithTooltip 
            key={achievement.id} 
            achievement={achievement} 
            index={index}
            total={achievements.featured.length}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Компонент общих друзей
 */
function MutualFriends({ friends, onFriendClick }) {
  if (!friends || friends.length === 0) return null;

  return (
    <div className="profile-modal__mutual-friends">
      <h4 className="profile-modal__section-title">
        <span>👥</span> Общие друзья
        <span className="profile-modal__mutual-friends-count">{friends.length}</span>
      </h4>
      <div className="profile-modal__mutual-friends-list">
        {friends.map((friend) => {
          const statusConfig = ONLINE_STATUS_CONFIG[friend.onlineStatus] || ONLINE_STATUS_CONFIG.offline;
          return (
            <motion.div
              key={friend.id}
              className="profile-modal__mutual-friend"
              onClick={() => onFriendClick?.(friend.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <AvatarFrame size="xs" frameSlug={friend.frameSlug}>
                {friend.avatarUrl ? (
                  <img src={friend.avatarUrl} alt="" />
                ) : (
                  <span className="profile-modal__avatar-placeholder">
                    {friend.nickname?.[0]?.toUpperCase() || "?"}
                  </span>
                )}
              </AvatarFrame>
              <span className="profile-modal__mutual-friend-name">{friend.nickname}</span>
              <span
                className="profile-modal__mutual-friend-status"
                style={{ color: statusConfig.color }}
              >
                {statusConfig.icon}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Кнопки действий в профиле
 */
function ProfileActions({
  friendshipStatus,
  requestId,
  onAddFriend,
  onRemoveFriend,
  onAcceptRequest,
  onCancelRequest,
  onMessage,
  onBlock,
  onInviteToGame,
  loading,
}) {
  return (
    <div className="profile-modal__actions">
      {friendshipStatus === "none" && (
        <>
          <Button
            variant="primary"
            size="sm"
            onClick={onAddFriend}
            disabled={loading}
          >
            👤+ Добавить в друзья
          </Button>
          <button
            className="profile-modal__action-icon"
            onClick={onMessage}
            title="Написать сообщение"
          >
            💬
          </button>
        </>
      )}

      {friendshipStatus === "friends" && (
        <>
          <Button variant="primary" size="sm" onClick={onMessage}>
            💬 Написать
          </Button>
          <Button variant="ghost" size="sm" onClick={onInviteToGame}>
            🎮 Пригласить
          </Button>
          <button
            className="profile-modal__action-icon profile-modal__action-icon--danger"
            onClick={onRemoveFriend}
            title="Удалить из друзей"
          >
            👤−
          </button>
        </>
      )}

      {friendshipStatus === "pending_sent" && (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancelRequest}
            disabled={loading}
          >
            ✕ Отменить заявку
          </Button>
          <button
            className="profile-modal__action-icon"
            onClick={onMessage}
            title="Написать сообщение"
          >
            💬
          </button>
        </>
      )}

      {friendshipStatus === "pending_received" && (
        <>
          <Button
            variant="primary"
            size="sm"
            onClick={onAcceptRequest}
            disabled={loading}
          >
            ✓ Принять
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancelRequest}
            disabled={loading}
          >
            ✕ Отклонить
          </Button>
          <button
            className="profile-modal__action-icon"
            onClick={onMessage}
            title="Написать сообщение"
          >
            💬
          </button>
        </>
      )}

      {friendshipStatus === "blocked" && (
        <Button variant="ghost" size="sm" onClick={onBlock} disabled={loading}>
          Разблокировать
        </Button>
      )}
    </div>
  );
}

/**
 * Главный компонент модального окна профиля
 */
export default function PlayerProfileModal({
  isOpen,
  targetUserId,
  socket,
  onClose,
  onOpenChat,
  onInviteToGame,
}) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);

  // Загрузка профиля
  useEffect(() => {
    if (!isOpen || !targetUserId || !socket) {
      setProfile(null);
      setLoading(true);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    socket.emit("social:profile:get", { targetUserId }, (response) => {
      setLoading(false);
      if (response.success) {
        setProfile(response.profile);
      } else {
        setError(response.error || "Не удалось загрузить профиль");
      }
    });
  }, [isOpen, targetUserId, socket]);

  // Обработчики действий
  const handleAddFriend = useCallback(() => {
    if (!socket || !targetUserId) return;
    setActionLoading(true);
    socket.emit("friends:request:send", { targetUserId }, (response) => {
      setActionLoading(false);
      if (response.success) {
        setProfile((prev) => prev ? { ...prev, friendshipStatus: "pending_sent" } : prev);
      }
    });
  }, [socket, targetUserId]);

  const handleAcceptRequest = useCallback(() => {
    if (!socket || !profile?.friendshipRequestId) return;
    setActionLoading(true);
    socket.emit("friends:request:accept", { requestId: profile.friendshipRequestId }, (response) => {
      setActionLoading(false);
      if (response.success) {
        setProfile((prev) => prev ? { ...prev, friendshipStatus: "friends", friendshipRequestId: null } : prev);
      }
    });
  }, [socket, profile?.friendshipRequestId]);

  const handleCancelRequest = useCallback(() => {
    if (!socket || !profile?.friendshipRequestId) return;
    setActionLoading(true);
    const event = profile.friendshipStatus === "pending_sent" 
      ? "friends:request:cancel" 
      : "friends:request:reject";
    socket.emit(event, { requestId: profile.friendshipRequestId }, (response) => {
      setActionLoading(false);
      if (response.success) {
        setProfile((prev) => prev ? { ...prev, friendshipStatus: "none", friendshipRequestId: null } : prev);
      }
    });
  }, [socket, profile?.friendshipRequestId, profile?.friendshipStatus]);

  const handleRemoveFriend = useCallback(() => {
    if (!socket || !targetUserId) return;
    if (!confirm("Удалить из друзей?")) return;
    setActionLoading(true);
    socket.emit("friends:remove", { friendId: targetUserId }, (response) => {
      setActionLoading(false);
      if (response.success) {
        setProfile((prev) => prev ? { ...prev, friendshipStatus: "none" } : prev);
      }
    });
  }, [socket, targetUserId]);

  const handleBlock = useCallback(() => {
    if (!socket || !targetUserId) return;
    const isBlocked = profile?.friendshipStatus === "blocked";
    const event = isBlocked ? "friends:unblock" : "friends:block";
    
    if (!isBlocked && !confirm("Заблокировать пользователя?")) return;
    
    setActionLoading(true);
    socket.emit(event, { targetUserId }, (response) => {
      setActionLoading(false);
      if (response.success) {
        setProfile((prev) => prev ? { 
          ...prev, 
          friendshipStatus: isBlocked ? "none" : "blocked" 
        } : prev);
      }
    });
  }, [socket, targetUserId, profile?.friendshipStatus]);

  const handleMessage = useCallback(() => {
    onOpenChat?.(targetUserId);
    onClose?.();
  }, [onOpenChat, targetUserId, onClose]);

  const handleInvite = useCallback(() => {
    onInviteToGame?.(targetUserId);
  }, [onInviteToGame, targetUserId]);

  const handleFriendClick = useCallback((friendId) => {
    // Открыть профиль друга (рекурсивно)
    // Это можно реализовать через колбэк или стейт в родительском компоненте
  }, []);

  // Backdrop click handler
  const handleBackdropClick = useCallback((e) => {
    if (e.target === e.currentTarget) {
      onClose?.();
    }
  }, [onClose]);

  // ESC key handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="profile-modal__backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleBackdropClick}
        >
          <motion.div
            className="profile-modal"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            <GlowingEffect
              borderWidth={2}
              glowSize={150}
              proximity={100}
              glowColors={["#3498db", "#9b59b6", "#2ecc71"]}
            />

            {/* Close button */}
            <button className="profile-modal__close" onClick={onClose}>
              ✕
            </button>

            <div className="profile-modal__content">
              {loading ? (
                <div className="profile-modal__loading">
                  <div className="profile-modal__loading-spinner" />
                  <span>Загрузка профиля...</span>
                </div>
              ) : error ? (
                <div className="profile-modal__error">
                  <span>😔</span>
                  <p>{error}</p>
                  <Button variant="ghost" size="sm" onClick={onClose}>
                    Закрыть
                  </Button>
                </div>
              ) : profile ? (
                <>
                  {/* Banner & Avatar */}
                  <div className="profile-modal__banner">
                    <div className="profile-modal__banner-bg" />
                    <div className="profile-modal__avatar-wrapper">
                      <AvatarFrame size="l" frameSlug={profile.frameSlug}>
                        {profile.avatarUrl ? (
                          <img src={profile.avatarUrl} alt={profile.nickname} />
                        ) : (
                          <span className="profile-modal__avatar-placeholder">
                            {profile.nickname?.[0]?.toUpperCase() || "?"}
                          </span>
                        )}
                      </AvatarFrame>
                      <OnlineStatus
                        status={profile.onlineStatus}
                        currentGameType={profile.currentGameType}
                        lastSeenAt={profile.lastSeenAt}
                      />
                    </div>
                  </div>

                  {/* User Info */}
                  <div className="profile-modal__section profile-modal__info">
                    <div className="profile-modal__name-row">
                      <StyledNickname
                        name={profile.nickname}
                        customization={profile.nicknameStyle}
                        className="profile-modal__nickname"
                      />
                      <LevelBadge level={profile.level} xp={profile.xp} />
                      {profile.loginStreak > 0 && (
                        <span className="profile-modal__streak" title="Дней подряд">
                          🔥 {profile.loginStreak}
                        </span>
                      )}
                    </div>

                    <div className="profile-modal__member-since">
                      📅 На платформе с {formatMemberSince(profile.memberSince)}
                    </div>

                    {profile.bio && (
                      <div className="profile-modal__bio">
                        <span className="profile-modal__bio-icon">📝</span>
                        <span className="profile-modal__bio-text">{profile.bio}</span>
                      </div>
                    )}

                    {/* Actions */}
                    {profile.friendshipStatus !== "self" && (
                      <ProfileActions
                        friendshipStatus={profile.friendshipStatus}
                        requestId={profile.friendshipRequestId}
                        onAddFriend={handleAddFriend}
                        onRemoveFriend={handleRemoveFriend}
                        onAcceptRequest={handleAcceptRequest}
                        onCancelRequest={handleCancelRequest}
                        onMessage={handleMessage}
                        onBlock={handleBlock}
                        onInviteToGame={handleInvite}
                        loading={actionLoading}
                      />
                    )}
                  </div>

                  {/* Favorite Games */}
                  <FavoriteGames byGame={profile.stats?.byGame} />

                  {/* Achievements */}
                  <FeaturedAchievements achievements={profile.achievements} />

                  {/* Mutual Friends */}
                  <MutualFriends
                    friends={profile.mutualFriends}
                    onFriendClick={handleFriendClick}
                  />
                </>
              ) : null}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}

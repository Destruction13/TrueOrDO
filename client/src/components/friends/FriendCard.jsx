import { useState } from "react";
import { motion } from "framer-motion";
import AvatarFrame from "../ui/AvatarFrame";
import StyledNickname from "../ui/StyledNickname";
import "./FriendCard.css";

// Преобразование nicknameStyle в формат для StyledNickname
function toNicknameCustomization(style) {
  if (!style) return null;
  return {
    nicknameColorType: style.colorType,
    nicknameCustomColor: style.customColor,
    nicknameGradient: style.gradient,
    nicknameGlow: style.glow,
  };
}

// Статусы онлайн
const STATUS_CONFIG = {
  online: { label: "Онлайн", color: "#22c55e", dot: "🟢" },
  idle: { label: "Неактивен", color: "#eab308", dot: "🟡" },
  in_game: { label: "В игре", color: "#8b5cf6", dot: "🎮" },
  offline: { label: "Оффлайн", color: "#6b7280", dot: "⚫" },
};

/**
 * FriendCard — карточка друга в списке
 */
export default function FriendCard({
  user,
  isSearchResult = false,
  friendshipStatus,
  onRemove,
  onMessage,
  onInvite,
  onSendRequest,
  onOpenProfile,
}) {
  const [showActions, setShowActions] = useState(false);
  
  const {
    id,
    nickname,
    avatarUrl,
    frameSlug,
    nicknameStyle,
    onlineStatus = "offline",
    currentGameType,
    currentRoomCode,
    level,
  } = user;

  const status = STATUS_CONFIG[onlineStatus] || STATUS_CONFIG.offline;
  const initial = nickname?.[0]?.toUpperCase() || "?";

  // Форматирование времени "был(а) в сети"
  const formatLastSeen = (lastSeenAt) => {
    if (!lastSeenAt) return "";
    const diff = Date.now() - new Date(lastSeenAt).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "только что";
    if (minutes < 60) return `${minutes} мин. назад`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} ч. назад`;
    const days = Math.floor(hours / 24);
    return `${days} дн. назад`;
  };

  // Название игры
  const getGameName = (gameType) => {
    const games = {
      tod: "Правда или Действие",
      alias: "Alias",
      emotional: "Эмоциональный интеллект",
      codenames: "Codenames",
    };
    return games[gameType] || gameType;
  };

  const handleCardClick = (e) => {
    // Не открывать профиль если кликнули на кнопку
    if (e.target.closest('.friend-card__action') || e.target.closest('.friend-card__actions button')) {
      return;
    }
    onOpenProfile?.(id);
  };

  return (
    <motion.div
      className={`friend-card ${showActions ? "friend-card--expanded" : ""} ${onOpenProfile ? "friend-card--clickable" : ""}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      onClick={handleCardClick}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Аватар */}
      <div className="friend-card__avatar">
        <AvatarFrame size="xs" frameSlug={frameSlug}>
          {avatarUrl ? (
            <img src={avatarUrl} alt={nickname} className="friend-card__avatar-img" />
          ) : (
            <div className="friend-card__avatar-placeholder">{initial}</div>
          )}
        </AvatarFrame>
        <span 
          className={`friend-card__status-dot friend-card__status-dot--${onlineStatus}`}
          title={status.label}
        />
      </div>

      {/* Информация */}
      <div className="friend-card__info">
        <div className="friend-card__name">
          <StyledNickname 
            name={nickname} 
            customization={toNicknameCustomization(nicknameStyle)} 
          />
          {level && <span className="friend-card__level">Lv.{level}</span>}
        </div>
        <div className="friend-card__status">
          {onlineStatus === "in_game" && currentGameType ? (
            <span className="friend-card__game">
              🎮 {getGameName(currentGameType)}
            </span>
          ) : (
            <span className={`friend-card__status-text friend-card__status-text--${onlineStatus}`}>
              {status.label}
              {onlineStatus === "offline" && user.lastSeenAt && (
                <span className="friend-card__last-seen">
                  {" · "}{formatLastSeen(user.lastSeenAt)}
                </span>
              )}
            </span>
          )}
        </div>
      </div>

      {/* Действия */}
      <div className="friend-card__actions">
        {isSearchResult ? (
          // Для результатов поиска
          <>
            {friendshipStatus === "none" && (
              <button 
                className="friend-card__action friend-card__action--primary"
                onClick={onSendRequest}
                title="Добавить в друзья"
              >
                <span>+</span>
              </button>
            )}
            {friendshipStatus === "pending_sent" && (
              <span className="friend-card__pending">Заявка отправлена</span>
            )}
            {friendshipStatus === "pending_received" && (
              <span className="friend-card__pending">Ожидает ответа</span>
            )}
            {friendshipStatus === "friends" && (
              <span className="friend-card__already-friend">✓ Друг</span>
            )}
          </>
        ) : (
          // Для друзей
          <>
            {onMessage && (
              <button 
                className="friend-card__action"
                onClick={onMessage}
                title="Написать"
              >
                💬
              </button>
            )}
            {onInvite && onlineStatus !== "offline" && (
              <button 
                className="friend-card__action"
                onClick={onInvite}
                title="Пригласить в игру"
              >
                🎮
              </button>
            )}
            {onRemove && (
              <button 
                className="friend-card__action friend-card__action--danger"
                onClick={onRemove}
                title="Удалить из друзей"
              >
                ✕
              </button>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}

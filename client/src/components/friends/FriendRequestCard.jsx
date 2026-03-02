import { motion } from "framer-motion";
import AvatarFrame from "../ui/AvatarFrame";
import StyledNickname from "../ui/StyledNickname";
import "./FriendRequestCard.css";

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

// Форматирование времени
function formatTime(date) {
  if (!date) return "";
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "только что";
  if (minutes < 60) return `${minutes} мин. назад`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ч. назад`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} дн. назад`;
  return new Date(date).toLocaleDateString("ru-RU");
}

/**
 * FriendRequestCard — карточка заявки в друзья
 */
export default function FriendRequestCard({
  request,
  type, // "incoming" | "outgoing"
  onAccept,
  onReject,
  onCancel,
}) {
  const user = type === "incoming" ? request.sender : request.receiver;
  const {
    nickname,
    avatarUrl,
    frameSlug,
    nicknameStyle,
    level,
    onlineStatus,
  } = user || {};

  const initial = nickname?.[0]?.toUpperCase() || "?";
  const isOnline = onlineStatus === "online" || onlineStatus === "idle" || onlineStatus === "in_game";

  return (
    <motion.div
      className="friend-request-card"
      initial={{ opacity: 0, x: type === "incoming" ? -20 : 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
    >
      {/* Аватар */}
      <div className="friend-request-card__avatar">
        <AvatarFrame size="xs" frameSlug={frameSlug}>
          {avatarUrl ? (
            <img src={avatarUrl} alt={nickname} className="friend-request-card__avatar-img" />
          ) : (
            <div className="friend-request-card__avatar-placeholder">{initial}</div>
          )}
        </AvatarFrame>
        {isOnline && <span className="friend-request-card__online-dot" />}
      </div>

      {/* Информация */}
      <div className="friend-request-card__info">
        <div className="friend-request-card__name">
          <StyledNickname
            name={nickname}
            customization={toNicknameCustomization(nicknameStyle)}
          />
          {level && <span className="friend-request-card__level">Lv.{level}</span>}
        </div>
        <div className="friend-request-card__meta">
          <span className="friend-request-card__time">
            {formatTime(request.createdAt)}
          </span>
        </div>
      </div>

      {/* Действия */}
      <div className="friend-request-card__actions">
        {type === "incoming" ? (
          <>
            <button
              className="friend-request-card__btn friend-request-card__btn--accept"
              onClick={onAccept}
              title="Принять"
            >
              ✓
            </button>
            <button
              className="friend-request-card__btn friend-request-card__btn--reject"
              onClick={onReject}
              title="Отклонить"
            >
              ✕
            </button>
          </>
        ) : (
          <button
            className="friend-request-card__btn friend-request-card__btn--cancel"
            onClick={onCancel}
            title="Отменить"
          >
            Отменить
          </button>
        )}
      </div>
    </motion.div>
  );
}

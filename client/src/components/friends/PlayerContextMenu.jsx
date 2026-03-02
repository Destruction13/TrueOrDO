import { useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import AvatarFrame from "../ui/AvatarFrame";
import StyledNickname from "../ui/StyledNickname";
import "./PlayerContextMenu.css";

// Статусы онлайн
const ONLINE_STATUS_CONFIG = {
  online: { label: "Онлайн", color: "#2ecc71", icon: "🟢" },
  idle: { label: "Отошёл", color: "#f1c40f", icon: "🟡" },
  in_game: { label: "В игре", color: "#9b59b6", icon: "🎮" },
  offline: { label: "Оффлайн", color: "#6b6b6b", icon: "⚫" },
};

// Конфигурация игр
const GAME_CONFIG = {
  tod: { name: "Truth or Dare", icon: "🎭" },
  alias: { name: "Alias", icon: "📝" },
  codenames: { name: "Codenames", icon: "🕵️" },
  emotional: { name: "Emotional", icon: "💭" },
};

/**
 * Discord-style контекстное меню для игрока
 */
export default function PlayerContextMenu({
  odlerId,
  odlerNickname,
  avatar,
  frameSlug,
  onlineStatus = "offline",
  currentGameType,
  currentRoomCode,
  nicknameStyle,
  relationshipStatus = "none",
  socket,
  position,
  onClose,
  onOpenChat,
  onOpenProfile,
  onInviteToGame,
}) {
  const menuRef = useRef(null);

  // Закрытие при клике вне меню
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose?.();
      }
    };

    const handleEscape = (e) => {
      if (e.key === "Escape") {
        onClose?.();
      }
    };

    // Небольшая задержка чтобы не закрылось сразу после открытия
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  // Обработчики действий
  const handleViewProfile = useCallback(() => {
    onOpenProfile?.(odlerId);
    onClose?.();
  }, [onOpenProfile, odlerId, onClose]);

  const handleSendMessage = useCallback(() => {
    onOpenChat?.(odlerId);
    onClose?.();
  }, [onOpenChat, odlerId, onClose]);

  const handleAddFriend = useCallback(() => {
    if (!socket || !odlerId) return;
    socket.emit("friends:request:send", { targetUserId: odlerId }, (response) => {
      if (response.success) {
        console.log("[PlayerContextMenu] Friend request sent");
      }
    });
    onClose?.();
  }, [socket, odlerId, onClose]);

  const handleAcceptRequest = useCallback(() => {
    // Для этого нужен requestId, который может прийти из relationshipStatus
    onClose?.();
  }, [onClose]);

  const handleCancelRequest = useCallback(() => {
    onClose?.();
  }, [onClose]);

  const handleRemoveFriend = useCallback(() => {
    if (!socket || !odlerId) return;
    socket.emit("friends:remove", { friendId: odlerId }, (response) => {
      if (response.success) {
        console.log("[PlayerContextMenu] Friend removed");
      }
    });
    onClose?.();
  }, [socket, odlerId, onClose]);

  const handleBlock = useCallback(() => {
    if (!socket || !odlerId) return;
    socket.emit("friends:block", { targetUserId: odlerId }, (response) => {
      if (response.success) {
        console.log("[PlayerContextMenu] User blocked");
      }
    });
    onClose?.();
  }, [socket, odlerId, onClose]);

  const handleInviteToGame = useCallback(() => {
    onInviteToGame?.(odlerId);
    onClose?.();
  }, [onInviteToGame, odlerId, onClose]);

  const handleJoinGame = useCallback(() => {
    if (!currentRoomCode || !currentGameType) return;
    // Навигация к игре
    const gameUrls = {
      tod: `/tod?code=${currentRoomCode}`,
      alias: `/alias?code=${currentRoomCode}`,
      codenames: `/codenames?code=${currentRoomCode}`,
      emotional: `/emotional?code=${currentRoomCode}`,
    };
    const url = gameUrls[currentGameType];
    if (url) {
      window.location.href = url;
    }
    onClose?.();
  }, [currentRoomCode, currentGameType, onClose]);

  // Определяем статус
  const statusConfig = ONLINE_STATUS_CONFIG[onlineStatus] || ONLINE_STATUS_CONFIG.offline;
  const gameConfig = currentGameType ? GAME_CONFIG[currentGameType] : null;

  // Определяем какие действия показывать
  const canSendMessage = relationshipStatus === "friends";
  const canAddFriend = relationshipStatus === "none";
  const canRemoveFriend = relationshipStatus === "friends";
  const canCancelRequest = relationshipStatus === "pending_sent";
  const canAcceptRequest = relationshipStatus === "pending_received";
  const canBlock = relationshipStatus !== "blocked" && relationshipStatus !== "self";
  const canUnblock = relationshipStatus === "blocked";
  const canInvite = relationshipStatus === "friends" && onlineStatus !== "offline";
  const canJoinGame = onlineStatus === "in_game" && currentRoomCode;

  return (
    <motion.div
      ref={menuRef}
      className="player-context-menu"
      style={{ top: position?.y, left: position?.x }}
      initial={{ opacity: 0, scale: 0.95, y: -10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.15 }}
    >
      {/* Header с аватаром и именем */}
      <div className="player-context-menu__header">
        <AvatarFrame size="s" frameSlug={frameSlug}>
          {avatar ? (
            <img src={avatar} alt="" />
          ) : (
            <div className="player-context-menu__avatar-placeholder">
              {odlerNickname?.[0]?.toUpperCase() || "?"}
            </div>
          )}
        </AvatarFrame>
        <div className="player-context-menu__info">
          <StyledNickname
            name={odlerNickname}
            customization={nicknameStyle}
            className="player-context-menu__name"
          />
          <div
            className="player-context-menu__status"
            style={{ color: statusConfig.color }}
          >
            <span className="player-context-menu__status-icon">{statusConfig.icon}</span>
            <span>
              {onlineStatus === "in_game" && gameConfig
                ? `Играет в ${gameConfig.name}`
                : statusConfig.label}
            </span>
          </div>
        </div>
      </div>

      {/* Разделитель */}
      <div className="player-context-menu__divider" />

      {/* Действия */}
      <div className="player-context-menu__actions">
        {/* Профиль - всегда доступен */}
        <button
          className="player-context-menu__action"
          onClick={handleViewProfile}
        >
          <span className="player-context-menu__action-icon">👤</span>
          <span>Профиль</span>
        </button>

        {/* Написать сообщение */}
        {canSendMessage && (
          <button
            className="player-context-menu__action"
            onClick={handleSendMessage}
          >
            <span className="player-context-menu__action-icon">💬</span>
            <span>Написать</span>
          </button>
        )}

        {/* Присоединиться к игре */}
        {canJoinGame && (
          <button
            className="player-context-menu__action player-context-menu__action--highlight"
            onClick={handleJoinGame}
          >
            <span className="player-context-menu__action-icon">🎮</span>
            <span>Присоединиться к игре</span>
          </button>
        )}

        {/* Пригласить в игру */}
        {canInvite && (
          <button
            className="player-context-menu__action"
            onClick={handleInviteToGame}
          >
            <span className="player-context-menu__action-icon">📨</span>
            <span>Пригласить в игру</span>
          </button>
        )}

        {/* Разделитель перед friend actions */}
        <div className="player-context-menu__divider" />

        {/* Добавить в друзья */}
        {canAddFriend && (
          <button
            className="player-context-menu__action player-context-menu__action--primary"
            onClick={handleAddFriend}
          >
            <span className="player-context-menu__action-icon">➕</span>
            <span>Добавить в друзья</span>
          </button>
        )}

        {/* Принять заявку */}
        {canAcceptRequest && (
          <button
            className="player-context-menu__action player-context-menu__action--primary"
            onClick={handleAcceptRequest}
          >
            <span className="player-context-menu__action-icon">✓</span>
            <span>Принять заявку</span>
          </button>
        )}

        {/* Отменить заявку */}
        {canCancelRequest && (
          <button
            className="player-context-menu__action"
            onClick={handleCancelRequest}
          >
            <span className="player-context-menu__action-icon">✕</span>
            <span>Отменить заявку</span>
          </button>
        )}

        {/* Удалить из друзей */}
        {canRemoveFriend && (
          <button
            className="player-context-menu__action player-context-menu__action--danger"
            onClick={handleRemoveFriend}
          >
            <span className="player-context-menu__action-icon">👤−</span>
            <span>Удалить из друзей</span>
          </button>
        )}

        {/* Разблокировать */}
        {canUnblock && (
          <button
            className="player-context-menu__action"
            onClick={handleBlock}
          >
            <span className="player-context-menu__action-icon">🔓</span>
            <span>Разблокировать</span>
          </button>
        )}

        {/* Заблокировать */}
        {canBlock && (
          <button
            className="player-context-menu__action player-context-menu__action--danger"
            onClick={handleBlock}
          >
            <span className="player-context-menu__action-icon">🚫</span>
            <span>Заблокировать</span>
          </button>
        )}
      </div>
    </motion.div>
  );
}

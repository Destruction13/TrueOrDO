import { useState } from "react";
import { motion } from "framer-motion";
import AvatarFrame from "../ui/AvatarFrame";
import "./SearchUserCard.css";

// Icons as simple components
const FaUserPlus = () => <span>➕</span>;
const FaUserCheck = () => <span>✓</span>;
const FaClock = () => <span>⏳</span>;
const FaBan = () => <span>🚫</span>;

/**
 * Карточка пользователя в результатах поиска
 * @param {object} user - данные пользователя
 * @param {string} relationshipStatus - статус отношений: none/pending_sent/pending_received/friends/blocked
 * @param {function} onAddFriend - добавить в друзья
 * @param {function} onAcceptRequest - принять заявку
 * @param {function} onCancelRequest - отменить заявку
 */
export default function SearchUserCard({ 
  user, 
  relationshipStatus = "none",
  onAddFriend,
  onAcceptRequest,
  onCancelRequest,
}) {
  const [loading, setLoading] = useState(false);

  const handleAction = async (action) => {
    if (loading) return;
    setLoading(true);
    try {
      await action?.(user.id);
    } finally {
      setLoading(false);
    }
  };

  const renderActionButton = () => {
    if (loading) {
      return (
        <div className="search-user-btn search-user-btn--loading">
          <span className="search-user-spinner" />
        </div>
      );
    }

    switch (relationshipStatus) {
      case "friends":
        return (
          <div className="search-user-btn search-user-btn--friends">
            <FaUserCheck />
            <span>Друзья</span>
          </div>
        );
      
      case "pending_sent":
        return (
          <motion.button
            className="search-user-btn search-user-btn--pending"
            onClick={() => handleAction(onCancelRequest)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            title="Отменить заявку"
          >
            <FaClock />
            <span>Отправлено</span>
          </motion.button>
        );
      
      case "pending_received":
        return (
          <motion.button
            className="search-user-btn search-user-btn--accept"
            onClick={() => handleAction(onAcceptRequest)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <FaUserCheck />
            <span>Принять</span>
          </motion.button>
        );
      
      case "blocked":
        return (
          <div className="search-user-btn search-user-btn--blocked">
            <FaBan />
            <span>Заблокирован</span>
          </div>
        );
      
      default: // none
        return (
          <motion.button
            className="search-user-btn search-user-btn--add"
            onClick={() => handleAction(onAddFriend)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <FaUserPlus />
            <span>Добавить</span>
          </motion.button>
        );
    }
  };

  return (
    <motion.div 
      className="search-user-card"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      layout
    >
      <div className="search-user-avatar">
        <AvatarFrame
          src={user.avatar}
          frameSlug={user.frameSlug}
          size={44}
          showFrame={!!user.frameSlug}
        />
        {user.onlineStatus === "online" && (
          <div className="search-user-online-dot" />
        )}
      </div>

      <div className="search-user-info">
        <span className="search-user-nickname">{user.nickname}</span>
        {user.onlineStatus && (
          <span className={`search-user-status search-user-status--${user.onlineStatus}`}>
            {user.onlineStatus === "online" && "В сети"}
            {user.onlineStatus === "in_game" && "В игре"}
            {user.onlineStatus === "idle" && "Неактивен"}
            {user.onlineStatus === "offline" && "Не в сети"}
          </span>
        )}
      </div>

      <div className="search-user-action">
        {renderActionButton()}
      </div>
    </motion.div>
  );
}

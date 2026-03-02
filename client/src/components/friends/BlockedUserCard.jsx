import { useState } from "react";
import { motion } from "framer-motion";
import "./BlockedUserCard.css";

// Icons as simple components
const FaBan = () => <span>🚫</span>;
const FaUnlock = () => <span>🔓</span>;

/**
 * Карточка заблокированного пользователя
 */
export default function BlockedUserCard({ 
  user, 
  blockedAt,
  onUnblock,
}) {
  const [loading, setLoading] = useState(false);

  const handleUnblock = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await onUnblock?.(user.id);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return "";
    const d = new Date(date);
    return d.toLocaleDateString("ru-RU", { 
      day: "numeric", 
      month: "short",
      year: "numeric"
    });
  };

  return (
    <motion.div 
      className="blocked-user-card"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      layout
    >
      <div className="blocked-user-avatar">
        {user.avatar ? (
          <img src={user.avatar} alt={user.nickname} />
        ) : (
          <div className="blocked-user-avatar-placeholder">
            <FaBan />
          </div>
        )}
      </div>

      <div className="blocked-user-info">
        <span className="blocked-user-nickname">{user.nickname}</span>
        {blockedAt && (
          <span className="blocked-user-date">
            Заблокирован {formatDate(blockedAt)}
          </span>
        )}
      </div>

      <motion.button
        className="blocked-user-unblock-btn"
        onClick={handleUnblock}
        disabled={loading}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        title="Разблокировать"
      >
        {loading ? (
          <span className="blocked-user-spinner" />
        ) : (
          <>
            <FaUnlock />
            <span>Разблокировать</span>
          </>
        )}
      </motion.button>
    </motion.div>
  );
}

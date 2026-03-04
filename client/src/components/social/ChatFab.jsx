import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import { useSocial } from "./SocialIntegration";
import "./ChatFab.css";

/**
 * ChatFab — кнопка чата рядом с Lo-Fi плеером.
 * Открывает модалку друзей, чтобы выбрать собеседника.
 */
export default function ChatFab() {
  const { user } = useAuth();
  const { unreadMessagesCount, isMessengerOpen, toggleMessenger, isCompactChatOpen } = useSocial();

  const badge = useMemo(() => {
    if (!unreadMessagesCount) return null;
    return unreadMessagesCount > 99 ? "99+" : String(unreadMessagesCount);
  }, [unreadMessagesCount]);

  if (!user) return null;
  if (isCompactChatOpen) return null;

  return (
    <div className="chat-fab-container">
      <motion.button
        className="chat-fab"
        onClick={() => toggleMessenger?.()}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        title={isMessengerOpen ? "Закрыть чат" : "Чат"}
        aria-label={isMessengerOpen ? "Закрыть чат" : "Чат"}
        type="button"
      >
        💬
        <AnimatePresence>
          {badge && (
            <motion.span
              className="chat-fab__badge"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
            >
              {badge}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}

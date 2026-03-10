import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import { useSocial } from "./SocialIntegration";
import "./ChatFab.css";

/**
 * ChatFab — кнопка чата рядом с Lo-Fi плеером.
 * Открывает MessengerModal.
 */
export default function ChatFab() {
  const { user } = useAuth();
  const { unreadMessagesCount, isMessengerModalOpen, toggleMessenger } = useSocial();

  const badge = useMemo(() => {
    if (!unreadMessagesCount) return null;
    return unreadMessagesCount > 99 ? "99+" : String(unreadMessagesCount);
  }, [unreadMessagesCount]);
  if (!user || isMessengerModalOpen) return null;

  return (
    <div className="chat-fab-container">
      <motion.button
        className={`chat-fab ${isMessengerModalOpen ? "chat-fab--active" : ""}`}
        onClick={() => toggleMessenger?.()}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        title={isMessengerModalOpen ? "Закрыть мессенджер" : "Мессенджер"}
        aria-label={isMessengerModalOpen ? "Закрыть мессенджер" : "Мессенджер"}
        type="button"
      >
        💬
        <AnimatePresence>
          {badge && !isMessengerModalOpen && (
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

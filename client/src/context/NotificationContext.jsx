import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import ToastNotification from "../components/ui/ToastNotification";

// ═══════════════════════════════════════════════════════════════════════════
// NOTIFICATION CONTEXT
// ═══════════════════════════════════════════════════════════════════════════

const NotificationContext = createContext(null);

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotification must be used within NotificationProvider");
  }
  return context;
}

// ═══════════════════════════════════════════════════════════════════════════
// NOTIFICATION PROVIDER
// ═══════════════════════════════════════════════════════════════════════════

export function NotificationProvider({ children, socket, isChatOpen, activeChatPartnerId }) {
  const [notifications, setNotifications] = useState([]);
  const [history, setHistory] = useState([]);

  // Add notification
  const addNotification = useCallback((notification) => {
    const id = Date.now() + Math.random();
    const newNotification = {
      id,
      type: "info",
      duration: 5000,
      ...notification,
      createdAt: new Date(),
    };

    setNotifications((prev) => [...prev, newNotification]);
    setHistory((prev) => [newNotification, ...prev].slice(0, 50));

    // Auto remove after duration
    if (newNotification.duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, newNotification.duration);
    }

    return id;
  }, []);

  // Remove notification
  const removeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // Mark as read in history
  const markAsRead = useCallback((id) => {
    setHistory((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // Clear history
  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  // Listen for socket events
  useEffect(() => {
    if (!socket) return;

    const handleFriendRequest = (data) => {
      addNotification({
        type: "social",
        title: "Заявка в друзья",
        message: `${data.fromNickname || "Игрок"} хочет добавить вас в друзья`,
        avatar: data.fromAvatar,
        actions: [
          {
            label: "Принять",
            onClick: () => socket.emit("friends:request:accept", { requestId: data.requestId }),
            variant: "primary",
          },
          {
            label: "Отклонить",
            onClick: () => socket.emit("friends:request:reject", { requestId: data.requestId }),
          },
        ],
      });
    };

    const handleFriendAccepted = (data) => {
      addNotification({
        type: "success",
        title: "Заявка принята",
        message: `${data.nickname || "Игрок"} принял вашу заявку в друзья`,
        avatar: data.avatar,
      });
    };

    const handleGameInvite = (data) => {
      const GAME_CONFIG = {
        tod: "Правда или Действие",
        alias: "Alias",
        emotional: "Крокодил Эмоций",
        codenames: "Codenames"
      };
      const readableGameName = data.gameName || GAME_CONFIG[data.gameType] || data.gameType;

      addNotification({
        type: "social",
        title: "Приглашение в игру",
        message: `${data.fromNickname || "Игрок"} приглашает в ${readableGameName}`,
        avatar: data.fromAvatar,
        duration: 30000,
        actions: [
          {
            label: "Присоединиться",
            onClick: () => {
              window.location.href = `/${data.gameType}/${data.roomCode}`;
            },
            variant: "primary",
          },
          {
            label: "Отклонить",
            onClick: () => { },
          },
        ],
      });
    };

    const handleNewMessage = (data) => {
      // server payload: { message, conversationId, senderId }
      const msg = data?.message;
      const senderId = data?.senderId;

      // Не показываем toast, если чат сейчас открыт и это сообщение от активного собеседника
      if (isChatOpen && activeChatPartnerId && senderId && String(activeChatPartnerId) === String(senderId)) {
        return;
      }

      const senderNickname = msg?.sender?.nickname || "Игрок";
      const senderAvatar = msg?.sender?.avatarUrl || msg?.sender?.avatarUrl || null;
      const preview = msg?.content
        ? msg.content.substring(0, 50) + (msg.content.length > 50 ? "..." : "")
        : "";

      addNotification({
        type: "social",
        title: "Новое сообщение",
        message: `${senderNickname}${preview ? `: ${preview}` : ""}`,
        avatar: senderAvatar,
        duration: 3000,
      });
    };

    socket.on("friends:request:received", handleFriendRequest);
    socket.on("friends:request:accepted", handleFriendAccepted);
    socket.on("game:invite:received", handleGameInvite);
    socket.on("messages:received", handleNewMessage);

    return () => {
      socket.off("friends:request:received", handleFriendRequest);
      socket.off("friends:request:accepted", handleFriendAccepted);
      socket.off("game:invite:received", handleGameInvite);
      socket.off("messages:received", handleNewMessage);
    };
  }, [socket, addNotification, isChatOpen, activeChatPartnerId]);

  const value = {
    notifications,
    history,
    unreadCount: history.filter((n) => !n.read).length,
    addNotification,
    removeNotification,
    markAsRead,
    clearAll,
    clearHistory,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}

      {/* Toast Container */}
      <div className="toast-container">
        <AnimatePresence mode="popLayout">
          {notifications.map((notification) => (
            <ToastNotification
              key={notification.id}
              notification={notification}
              onClose={() => removeNotification(notification.id)}
            />
          ))}
        </AnimatePresence>
      </div>
    </NotificationContext.Provider>
  );
}

export default NotificationProvider;

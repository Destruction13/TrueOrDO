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

export function NotificationProvider({ children, socket }) {
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
      addNotification({
        type: "social",
        title: "Приглашение в игру",
        message: `${data.fromNickname || "Друг"} приглашает вас в ${data.gameType}`,
        avatar: data.fromAvatar,
        duration: 30000,
        actions: [
          {
            label: "Присоединиться",
            onClick: () => {
              window.location.href = `/${data.gameType}?room=${data.roomCode}`;
            },
            variant: "primary",
          },
          {
            label: "Отклонить",
            onClick: () => {},
          },
        ],
      });
    };

    const handleNewMessage = (data) => {
      addNotification({
        type: "social",
        title: "Новое сообщение",
        message: data.content?.substring(0, 50) + (data.content?.length > 50 ? "..." : ""),
        avatar: data.senderAvatar,
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
  }, [socket, addNotification]);

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

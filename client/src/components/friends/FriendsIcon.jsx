import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import FriendsDropdown from "./FriendsDropdown";
import "./FriendsIcon.css";

/**
 * FriendsIcon — иконка друзей в хедере с бейджами
 * Показывает количество онлайн друзей и непрочитанных заявок
 */
export default function FriendsIcon({ socket }) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [onlineFriendsCount, setOnlineFriendsCount] = useState(0);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [hasNewInvite, setHasNewInvite] = useState(false);

  // Загрузка начальных данных
  const loadCounts = useCallback(() => {
    if (!socket || !user) return;

    // Получаем список друзей для подсчёта онлайн
    socket.emit("friends:list", { filter: "online" }, (response) => {
      if (response.success) {
        setOnlineFriendsCount(response.friends?.length || 0);
      }
    });

    // Получаем входящие заявки
    socket.emit("friends:requests:pending", {}, (response) => {
      if (response.success) {
        setPendingRequestsCount(response.requests?.length || 0);
      }
    });

    // Получаем непрочитанные сообщения
    socket.emit("messages:unread:count", {}, (response) => {
      if (response.success) {
        setUnreadMessagesCount(response.count || 0);
      }
    });
  }, [socket, user]);

  // Загружаем данные при монтировании и когда появляется user
  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  // Подписка на real-time события
  useEffect(() => {
    if (!socket) return;

    // Новая заявка в друзья
    const handleRequestReceived = (data) => {
      setPendingRequestsCount((prev) => prev + 1);
      setHasNewInvite(true);
      setTimeout(() => setHasNewInvite(false), 3000);
    };

    // Заявка принята (от нас)
    const handleRequestAccepted = () => {
      loadCounts(); // Перезагружаем всё
    };

    // Изменение статуса друга
    const handleStatusUpdate = (data) => {
      // Обновляем счётчик онлайн
      loadCounts();
    };

    // Новое сообщение
    const handleMessageReceived = () => {
      setUnreadMessagesCount((prev) => prev + 1);
    };

    // Сообщения прочитаны
    const handleMessagesRead = (data) => {
      if (data.count) {
        setUnreadMessagesCount((prev) => Math.max(0, prev - data.count));
      }
    };

    // Приглашение в игру
    const handleGameInvite = () => {
      setHasNewInvite(true);
      setTimeout(() => setHasNewInvite(false), 3000);
    };

    socket.on("friends:request:received", handleRequestReceived);
    socket.on("friends:request:accepted", handleRequestAccepted);
    socket.on("friends:status:update", handleStatusUpdate);
    socket.on("messages:received", handleMessageReceived);
    socket.on("messages:read:confirmed", handleMessagesRead);
    socket.on("game:invite:received", handleGameInvite);

    return () => {
      socket.off("friends:request:received", handleRequestReceived);
      socket.off("friends:request:accepted", handleRequestAccepted);
      socket.off("friends:status:update", handleStatusUpdate);
      socket.off("messages:received", handleMessageReceived);
      socket.off("messages:read:confirmed", handleMessagesRead);
      socket.off("game:invite:received", handleGameInvite);
    };
  }, [socket, loadCounts]);

  // Не показываем если не авторизован
  if (!user) return null;

  const totalBadge = pendingRequestsCount + unreadMessagesCount;

  return (
    <div className="friends-icon-wrapper">
      <motion.button
        className={`friends-icon ${isOpen ? "friends-icon--active" : ""} ${hasNewInvite ? "friends-icon--pulse" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        title="Друзья"
      >
        {/* Иконка */}
        <svg 
          className="friends-icon__svg" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
        >
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>

        {/* Бейдж с общим количеством уведомлений */}
        <AnimatePresence>
          {totalBadge > 0 && (
            <motion.span
              className="friends-icon__badge friends-icon__badge--notifications"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
            >
              {totalBadge > 99 ? "99+" : totalBadge}
            </motion.span>
          )}
        </AnimatePresence>

        {/* Индикатор онлайн друзей (маленькая точка) */}
        {onlineFriendsCount > 0 && totalBadge === 0 && (
          <span className="friends-icon__online-dot" title={`${onlineFriendsCount} онлайн`} />
        )}
      </motion.button>

      {/* Выпадающее меню */}
      <AnimatePresence>
        {isOpen && (
          <FriendsDropdown
            socket={socket}
            onClose={() => setIsOpen(false)}
            pendingRequestsCount={pendingRequestsCount}
            onRequestsChange={(count) => setPendingRequestsCount(count)}
            onMessagesRead={() => loadCounts()}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

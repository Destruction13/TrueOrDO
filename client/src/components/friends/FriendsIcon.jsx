import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import FriendsDropdown from "./FriendsDropdown";
import "./FriendsIcon.css";

/**
 * FriendsIcon — иконка друзей в хедере с бейджами
 * Показывает количество онлайн друзей и непрочитанных заявок
 *
 * unreadCount и pendingCount приходят из SocialProvider (единый источник истины),
 * чтобы не было двойного счётчика.
 */
export default function FriendsIcon({
  socket,
  pendingCount = 0,
  unreadCount = 0,
  onlineFriendsCount: onlineFriendsCountProp,
  onClick,
  isConnected,
}) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [onlineFriendsCount, setOnlineFriendsCount] = useState(0);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [hasNewInvite, setHasNewInvite] = useState(false);

  // Загрузка начальных данных (только заявки и онлайн — unread берём из пропов)
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

    // unread: теперь управляется через SocialProvider + messages:unread:sync,
    // здесь больше не нужен отдельный обработчик messages:read:confirmed для unread.

    // Приглашение в игру
    const handleGameInvite = () => {
      setHasNewInvite(true);
      setTimeout(() => setHasNewInvite(false), 3000);
    };

    socket.on("friends:request:received", handleRequestReceived);
    socket.on("friends:request:accepted", handleRequestAccepted);
    socket.on("friends:status:update", handleStatusUpdate);
    socket.on("game:invite:received", handleGameInvite);

    return () => {
      socket.off("friends:request:received", handleRequestReceived);
      socket.off("friends:request:accepted", handleRequestAccepted);
      socket.off("friends:status:update", handleStatusUpdate);
      socket.off("game:invite:received", handleGameInvite);
    };
  }, [socket, loadCounts]);

  // Не показываем если не авторизован
  if (!user) return null;

  // Используем пропы из SocialProvider, если переданы, иначе — локальный state
  const effectiveOnline = typeof onlineFriendsCountProp === "number" ? onlineFriendsCountProp : onlineFriendsCount;
  const effectivePending = pendingCount || pendingRequestsCount;
  const effectiveUnread = unreadCount;

  const totalBadge = effectivePending + effectiveUnread;

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
        {effectiveOnline > 0 && totalBadge === 0 && (
          <span className="friends-icon__online-dot" title={`${effectiveOnline} онлайн`} />
        )}
      </motion.button>

      {/* Выпадающее меню */}
      <AnimatePresence>
        {isOpen && (
          <FriendsDropdown
            socket={socket}
            onClose={() => setIsOpen(false)}
            pendingRequestsCount={effectivePending}
            onRequestsChange={(count) => setPendingRequestsCount(count)}
            onMessagesRead={() => loadCounts()}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

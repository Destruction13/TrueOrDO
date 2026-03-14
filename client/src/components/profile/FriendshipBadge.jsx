import { useState, useEffect, useCallback, memo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotification } from '../../context/NotificationContext';
import { useSocketReconnection } from '../../hooks/useSocketReconnection';
import './FriendshipBadge.css';
import './CommonTooltip.css';

/**
 * Бейдж управления дружбой в профиле пользователя
 * Отображает текущий статус дружбы и позволяет управлять им
 * 
 * @param {Object} props
 * @param {string} props.targetUserId - ID пользователя профиля
 * @param {string} props.currentUserId - ID текущего пользователя
 * @param {Object} props.socket - Socket.IO инстанс
 * @param {string} [props.initialStatus='none'] - Начальный статус дружбы
 * @param {string} [props.friendRequestId] - ID заявки для pending статусов
 * @param {Function} [props.onReloadProfile] - Callback для перезагрузки данных профиля
 */
function FriendshipBadge({ 
  targetUserId, 
  currentUserId, 
  socket,
  initialStatus = 'none',
  friendRequestId,
  onReloadProfile
}) {
  const [friendshipStatus, setFriendshipStatus] = useState(initialStatus);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmPopup, setShowConfirmPopup] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const [showHoverTooltip, setShowHoverTooltip] = useState(false);
  const [hoverTooltipPos, setHoverTooltipPos] = useState({ x: 0, y: 0 });
  const { addNotification } = useNotification();
  const hoverTimeoutRef = useRef(null);

  // Ref для хранения данных touch событий
  const touchDataRef = useRef({
    startX: 0,
    startY: 0,
    startTime: 0
  });

  // Ref для кнопки бейджа (для позиционирования popup)
  const badgeRef = useRef(null);

  // Обработка переподключения Socket.IO
  useSocketReconnection(socket, () => {
    // При восстановлении соединения перезагружаем данные профиля
    if (onReloadProfile) {
      onReloadProfile();
    }
  });

  // Не показываем бейдж в своём профиле
  if (!targetUserId || !currentUserId || targetUserId === currentUserId) {
    return null;
  }

  // Обновление статуса при изменении initialStatus
  useEffect(() => {
    setFriendshipStatus(initialStatus);
  }, [initialStatus]);

  // Получение конфигурации для текущего статуса
  const getStatusConfig = useCallback(() => {
    const configs = {
      friends: {
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="8.5" cy="7" r="4" />
            <polyline points="17 11 19 13 23 9" />
          </svg>
        ),
        className: 'friendship-badge--friends',
        hoverTooltip: 'Друг',
        tooltip: 'Удалить из друзей',
        ariaLabel: 'Удалить из друзей',
        confirmText: 'Удалить из друзей'
      },
      none: {
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="8.5" cy="7" r="4" />
            <line x1="20" y1="8" x2="20" y2="14" />
            <line x1="23" y1="11" x2="17" y2="11" />
          </svg>
        ),
        className: 'friendship-badge--none',
        hoverTooltip: 'Добавить в друзья',
        tooltip: 'Добавить в друзья',
        ariaLabel: 'Добавить в друзья',
        confirmText: 'Добавить в друзья'
      },
      pending_sent: {
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="8.5" cy="7" r="4" />
            <circle cx="19" cy="11" r="4" />
          </svg>
        ),
        className: 'friendship-badge--pending-sent',
        hoverTooltip: 'Исходящая',
        tooltip: 'Исходящий запрос дружбы',
        ariaLabel: 'Отменить заявку в друзья',
        confirmText: 'Отменить заявку'
      },
      pending_received: {
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="8.5" cy="7" r="4" />
            <circle cx="19" cy="11" r="4" />
          </svg>
        ),
        className: 'friendship-badge--pending-received',
        hoverTooltip: 'Входящая',
        tooltip: 'Принять заявку в друзья',
        ariaLabel: 'Принять заявку в друзья',
        confirmText: 'Принять заявку'
      }
    };

    return configs[friendshipStatus] || configs.none;
  }, [friendshipStatus]);

  const config = getStatusConfig();

  // Обработка наведения мыши - показываем hover tooltip
  const handleMouseEnter = useCallback(() => {
    if (badgeRef.current && !showConfirmPopup) {
      const rect = badgeRef.current.getBoundingClientRect();
      setHoverTooltipPos({ x: rect.left + rect.width / 2, y: rect.top - 35 });
      // Задержка 0.8s перед показом тултипа
      hoverTimeoutRef.current = setTimeout(() => {
        setShowHoverTooltip(true);
      }, 800);
    }
  }, [showConfirmPopup]);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setShowHoverTooltip(false);
  }, []);

  // Обработка клика по бейджу - показываем popup
  const handleBadgeClick = useCallback(() => {
    if (isLoading) return;
    
    // Скрываем hover tooltip при клике
    setShowHoverTooltip(false);
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    
    // Вычисляем позицию popup
    const element = badgeRef.current;
    
    if (element) {
      const rect = element.getBoundingClientRect();
      setPopupPosition({
        x: rect.right + 8,
        y: rect.top + rect.height / 2 - 18
      });
      setShowConfirmPopup(true);
    }
  }, [isLoading]);

  // Закрытие popup
  const handleClosePopup = useCallback(() => {
    setShowConfirmPopup(false);
  }, []);

  // Подтверждение действия
  const handleConfirm = useCallback(async () => {
    // Проверка наличия socket перед отправкой
    if (!socket) {
      addNotification({
        type: 'error',
        message: 'Нет соединения с сервером. Попробуйте позже.',
        duration: 4000
      });
      return;
    }

    // Проверка что не идет загрузка
    if (isLoading) {
      return;
    }

    // Проверка наличия targetUserId
    if (!targetUserId) {
      addNotification({
        type: 'error',
        message: 'Не указан пользователь',
        duration: 3000
      });
      return;
    }

    setIsLoading(true);

    try {
      let eventName = '';
      let payload = {};

      // Определяем событие в зависимости от текущего статуса
      switch (friendshipStatus) {
        case 'none':
          eventName = 'social:friends:send';
          payload = { receiverId: targetUserId };
          break;
        case 'friends':
          eventName = 'social:friends:remove';
          payload = { friendId: targetUserId };
          break;
        case 'pending_sent':
          eventName = 'social:friends:cancel';
          payload = { requestId: friendRequestId };
          break;
        case 'pending_received':
          eventName = 'social:friends:accept';
          payload = { requestId: friendRequestId };
          break;
        default:
          setIsLoading(false);
          addNotification({
            type: 'error',
            message: 'Неизвестный статус дружбы',
            duration: 3000
          });
          return;
      }

      // Проверка наличия requestId для pending статусов
      if ((friendshipStatus === 'pending_sent' || friendshipStatus === 'pending_received') && !friendRequestId) {
        setIsLoading(false);
        addNotification({
          type: 'error',
          message: 'Не указан ID заявки',
          duration: 3000
        });
        return;
      }

      // Отправляем событие с acknowledgement
      socket.emit(eventName, payload, (response) => {
        setIsLoading(false);
        setShowConfirmPopup(false);

        if (response?.success) {
          // Обновляем локальный статус
          if (response.newStatus) {
            setFriendshipStatus(response.newStatus);
          }

          // Показываем уведомление об успехе
          const messages = {
            'social:friends:send': 'Заявка в друзья отправлена',
            'social:friends:remove': 'Пользователь удален из друзей',
            'social:friends:cancel': 'Заявка отменена',
            'social:friends:accept': 'Заявка принята'
          };

          addNotification({
            type: 'success',
            message: messages[eventName] || 'Действие выполнено',
            duration: 3000
          });
        } else {
          // Показываем ошибку
          addNotification({
            type: 'error',
            message: response?.error || 'Не удалось выполнить действие',
            duration: 4000
          });
        }
      });

      // Таймаут на случай если acknowledgement не придет
      setTimeout(() => {
        setIsLoading(false);
      }, 5000);

    } catch (error) {
      console.error('FriendshipBadge error:', error);
      setIsLoading(false);
      setShowConfirmPopup(false);
      addNotification({
        type: 'error',
        message: 'Произошла ошибка при выполнении действия',
        duration: 4000
      });
    }
  }, [socket, isLoading, friendshipStatus, targetUserId, friendRequestId, addNotification]);

  // Закрытие popup при клике вне его
  useEffect(() => {
    if (!showConfirmPopup) return;

    const handleClickOutside = (e) => {
      // Проверяем клик вне бейджа и вне popup
      const element = badgeRef.current;
      const isClickOnBadge = element && element.contains(e.target);
      const isClickOnPopup = e.target.closest('.friendship-badge__popup');
      
      if (!isClickOnBadge && !isClickOnPopup) {
        setShowConfirmPopup(false);
      }
    };

    // Небольшая задержка чтобы не закрыть popup сразу после открытия
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showConfirmPopup]);

  // Обработка клавиатурных событий (Enter/Space)
  const handleKeyDown = useCallback((e) => {
    // Enter или Space активируют кнопку
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleBadgeClick();
    }
    // Escape закрывает popup
    if (e.key === 'Escape' && showConfirmPopup) {
      e.preventDefault();
      handleClosePopup();
    }
  }, [handleBadgeClick, showConfirmPopup, handleClosePopup]);

  // Слушаем обновления статуса дружбы от сервера
  useEffect(() => {
    if (!socket) return;

    const handleFriendsUpdated = (data) => {
      // Обновляем статус если событие касается этого пользователя
      if (data.userId === targetUserId && data.newStatus) {
        setFriendshipStatus(data.newStatus);
      }
    };

    socket.on('social:friends:updated', handleFriendsUpdated);

    return () => {
      socket.off('social:friends:updated', handleFriendsUpdated);
    };
  }, [socket, targetUserId]);

  // Обработка touchStart - сохраняем начальные координаты и время
  const handleTouchStart = useCallback((e) => {
    const touch = e.touches[0];
    touchDataRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: Date.now()
    };
  }, []);

  // Обработка touchEnd - проверяем является ли это tap или swipe
  const handleTouchEnd = useCallback((e) => {
    const touch = e.changedTouches[0];
    const endX = touch.clientX;
    const endY = touch.clientY;
    const endTime = Date.now();

    // Вычисляем расстояние и длительность
    const deltaX = Math.abs(endX - touchDataRef.current.startX);
    const deltaY = Math.abs(endY - touchDataRef.current.startY);
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const duration = endTime - touchDataRef.current.startTime;

    // Проверяем критерии tap: distance < 10px и duration < 300ms
    const isTap = distance < 10 && duration < 300;

    if (isTap) {
      // Это tap - вызываем handleBadgeClick
      handleBadgeClick();
    }
    // Если не tap - это swipe, ничего не делаем
  }, [handleBadgeClick]);

  return (
    <>
      <button
        ref={badgeRef}
        className={`friendship-badge ${config.className} ${isLoading ? 'friendship-badge--loading' : ''}`}
        onClick={handleBadgeClick}
        onKeyDown={handleKeyDown}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        disabled={isLoading || !socket}
        aria-label={config.ariaLabel}
        style={{ position: 'relative' }}
      >
        <AnimatePresence mode="wait">
          <motion.span 
            key={friendshipStatus}
            className="friendship-badge__icon"
            initial={{ scale: 0.5, opacity: 0, rotate: -180 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.5, opacity: 0, rotate: 180 }}
            transition={{
              duration: 0.3,
              ease: "easeOut"
            }}
          >
            {config.icon}
          </motion.span>
        </AnimatePresence>
        <AnimatePresence>
          {isLoading && (
            <motion.span 
              className="friendship-badge__spinner" 
              aria-hidden="true"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle 
                  cx="12" 
                  cy="12" 
                  r="10" 
                  stroke="currentColor" 
                  strokeWidth="3" 
                  strokeLinecap="round" 
                  strokeDasharray="31.4 31.4" 
                />
              </svg>
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* Popup подтверждения через Portal */}
      {showConfirmPopup && createPortal(
        <motion.div 
          className="friendship-badge__popup"
          style={{
            left: `${popupPosition.x}px`,
            top: `${popupPosition.y}px`
          }}
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, x: -10, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{
            duration: 0.2,
            ease: "easeOut"
          }}
        >
          <button
            className="friendship-badge__confirm-btn"
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {config.confirmText}
          </button>
        </motion.div>,
        document.body
      )}

      {/* Hover tooltip через Portal */}
      {showHoverTooltip && createPortal(
        <div
          className="common-tooltip"
          style={{ left: hoverTooltipPos.x, top: hoverTooltipPos.y }}
        >
          {config.hoverTooltip}
        </div>,
        document.body
      )}
    </>
  );
}

/**
 * Custom comparison function для React.memo
 * Компонент имеет 4 состояния дружбы (friends, none, pending_sent, pending_received)
 * Перерендер нужен только при изменении критичных пропсов
 */
function arePropsEqual(prevProps, nextProps) {
  return (
    prevProps.targetUserId === nextProps.targetUserId &&
    prevProps.currentUserId === nextProps.currentUserId &&
    prevProps.initialStatus === nextProps.initialStatus &&
    prevProps.friendRequestId === nextProps.friendRequestId &&
    prevProps.socket === nextProps.socket
  );
}

export default memo(FriendshipBadge, arePropsEqual);

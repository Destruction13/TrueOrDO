import { useState, useCallback, memo } from 'react';
import { useNotification } from '../../context/NotificationContext';
import './AddFriendButton.css';

/**
 * Кнопка "Добавить в друзья"
 * Используется в профилях игроков когда пользователь не в друзьях
 * 
 * @param {Object} props
 * @param {string} props.targetUserId - ID пользователя
 * @param {Object} props.socket - Socket.IO инстанс
 * @param {Function} [props.onSuccess] - Callback при успешной отправке заявки
 */
function AddFriendButton({ targetUserId, socket, onSuccess }) {
  const [isLoading, setIsLoading] = useState(false);
  const { addNotification } = useNotification();

  const handleClick = useCallback(() => {
    if (!socket || !targetUserId || isLoading) return;

    setIsLoading(true);

    socket.emit('social:friends:send', { receiverId: targetUserId }, (response) => {
      setIsLoading(false);

      if (response?.success) {
        addNotification({
          type: 'success',
          message: 'Заявка в друзья отправлена',
          duration: 3000
        });
        onSuccess?.();
      } else {
        addNotification({
          type: 'error',
          message: response?.error || 'Не удалось отправить заявку',
          duration: 4000
        });
      }
    });

    // Таймаут на случай если acknowledgement не придет
    setTimeout(() => {
      setIsLoading(false);
    }, 5000);
  }, [socket, targetUserId, isLoading, addNotification, onSuccess]);

  return (
    <button
      className={`add-friend-button ${isLoading ? 'add-friend-button--loading' : ''}`}
      onClick={handleClick}
      disabled={isLoading || !socket}
      aria-label="Добавить в друзья"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="8.5" cy="7" r="4" />
        <line x1="20" y1="8" x2="20" y2="14" />
        <line x1="23" y1="11" x2="17" y2="11" />
      </svg>
      <span>Добавить в друзья</span>
    </button>
  );
}

export default memo(AddFriendButton);

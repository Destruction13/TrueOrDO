import { useEffect, useRef } from 'react';
import { useNotification } from '../context/NotificationContext';

/**
 * Хук для обработки переподключения Socket.IO
 * Показывает уведомления при потере и восстановлении соединения
 * 
 * @param {Object} socket - Socket.IO инстанс
 * @param {Function} onReconnect - Callback при восстановлении соединения
 * @returns {Object} - { isConnected, isReconnecting }
 */
export function useSocketReconnection(socket, onReconnect) {
  const { addNotification } = useNotification();
  const reconnectNotificationId = useRef(null);
  const isConnectedRef = useRef(true);

  useEffect(() => {
    if (!socket) return;

    // Обработка отключения
    const handleDisconnect = (reason) => {
      console.log('Socket disconnected:', reason);
      isConnectedRef.current = false;

      // Показываем уведомление о переподключении
      reconnectNotificationId.current = addNotification({
        type: 'warning',
        message: 'Переподключение...',
        duration: 0 // Не закрывать автоматически
      });
    };

    // Обработка восстановления соединения
    const handleConnect = () => {
      console.log('Socket connected');
      
      // Если это переподключение (не первое подключение)
      if (!isConnectedRef.current) {
        isConnectedRef.current = true;

        // Закрываем уведомление о переподключении
        if (reconnectNotificationId.current) {
          // Удаляем старое уведомление через небольшую задержку
          setTimeout(() => {
            // NotificationContext не имеет прямого API для удаления по ID
            // Поэтому просто показываем новое уведомление об успехе
          }, 100);
        }

        // Показываем уведомление об успешном восстановлении
        addNotification({
          type: 'success',
          message: 'Соединение восстановлено',
          duration: 3000
        });

        // Вызываем callback для повторной загрузки данных
        if (onReconnect) {
          onReconnect();
        }
      } else {
        // Первое подключение
        isConnectedRef.current = true;
      }
    };

    // Обработка ошибок подключения
    const handleConnectError = (error) => {
      console.error('Socket connection error:', error);
      
      addNotification({
        type: 'error',
        message: 'Ошибка подключения к серверу',
        duration: 4000
      });
    };

    // Подписываемся на события
    socket.on('disconnect', handleDisconnect);
    socket.on('connect', handleConnect);
    socket.on('connect_error', handleConnectError);

    // Отписываемся при размонтировании
    return () => {
      socket.off('disconnect', handleDisconnect);
      socket.off('connect', handleConnect);
      socket.off('connect_error', handleConnectError);
    };
  }, [socket, onReconnect, addNotification]);

  return {
    isConnected: isConnectedRef.current
  };
}

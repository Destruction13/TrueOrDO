/**
 * Утилиты для валидации Socket.IO перед отправкой событий
 * Обеспечивают консистентную обработку ошибок и уведомлений
 */

/**
 * Проверяет наличие socket соединения перед отправкой события
 * @param {Object} socket - Socket.IO инстанс
 * @param {Function} addNotification - Функция для показа уведомлений
 * @returns {boolean} true если socket доступен, false если нет
 */
export function validateSocket(socket, addNotification) {
  if (!socket) {
    if (addNotification) {
      addNotification({
        type: 'error',
        message: 'Нет соединения с сервером. Попробуйте позже.',
        duration: 4000
      });
    }
    return false;
  }

  if (!socket.connected) {
    if (addNotification) {
      addNotification({
        type: 'error',
        message: 'Соединение с сервером потеряно. Переподключение...',
        duration: 4000
      });
    }
    return false;
  }

  return true;
}

/**
 * Проверяет наличие обязательных параметров перед отправкой события
 * @param {Object} params - Объект с параметрами для проверки
 * @param {Array<string>} requiredFields - Массив обязательных полей
 * @param {Function} addNotification - Функция для показа уведомлений
 * @returns {boolean} true если все параметры присутствуют, false если нет
 */
export function validateParams(params, requiredFields, addNotification) {
  for (const field of requiredFields) {
    if (!params[field]) {
      if (addNotification) {
        addNotification({
          type: 'error',
          message: `Отсутствует обязательный параметр: ${field}`,
          duration: 3000
        });
      }
      return false;
    }
  }

  return true;
}

/**
 * Обертка для безопасной отправки Socket.IO событий с валидацией
 * @param {Object} options - Опции для отправки события
 * @param {Object} options.socket - Socket.IO инстанс
 * @param {string} options.event - Название события
 * @param {Object} options.payload - Данные для отправки
 * @param {Function} options.onSuccess - Callback при успехе
 * @param {Function} options.onError - Callback при ошибке
 * @param {Function} options.addNotification - Функция для показа уведомлений
 * @param {number} [options.timeout=5000] - Таймаут для ответа (мс)
 * @returns {boolean} true если событие отправлено, false если нет
 */
export function emitWithValidation({
  socket,
  event,
  payload,
  onSuccess,
  onError,
  addNotification,
  timeout = 5000
}) {
  // Проверка socket
  if (!validateSocket(socket, addNotification)) {
    if (onError) {
      onError(new Error('Socket не доступен'));
    }
    return false;
  }

  // Отправка события
  let timeoutId;
  let isCompleted = false;

  socket.emit(event, payload, (response) => {
    if (isCompleted) return;
    isCompleted = true;

    clearTimeout(timeoutId);

    if (response?.success || response?.ok) {
      if (onSuccess) {
        onSuccess(response);
      }
    } else {
      const error = response?.error || 'Не удалось выполнить действие';
      
      if (addNotification) {
        addNotification({
          type: 'error',
          message: error,
          duration: 4000
        });
      }

      if (onError) {
        onError(new Error(error));
      }
    }
  });

  // Таймаут на случай если acknowledgement не придет
  timeoutId = setTimeout(() => {
    if (isCompleted) return;
    isCompleted = true;

    const error = 'Превышено время ожидания ответа от сервера';
    
    if (addNotification) {
      addNotification({
        type: 'error',
        message: error,
        duration: 4000
      });
    }

    if (onError) {
      onError(new Error(error));
    }
  }, timeout);

  return true;
}

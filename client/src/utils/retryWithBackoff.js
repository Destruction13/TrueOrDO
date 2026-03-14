/**
 * Retry utility with exponential backoff
 * Повторяет операцию с экспоненциальной задержкой при ошибках
 * 
 * @param {Function} operation - Async функция для выполнения
 * @param {number} maxRetries - Максимальное количество попыток (по умолчанию 3)
 * @param {number} baseDelay - Базовая задержка в мс (по умолчанию 1000)
 * @returns {Promise<any>} - Результат операции или последняя ошибка
 * 
 * @example
 * const result = await retryWithBackoff(
 *   async () => await saveData(),
 *   3,
 *   1000
 * );
 */
export async function retryWithBackoff(operation, maxRetries = 3, baseDelay = 1000) {
  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Выполняем операцию
      const result = await operation();
      return result;
    } catch (error) {
      lastError = error;
      
      // Проверяем, является ли ошибка сетевой/таймаут
      const isRetryableError = isNetworkError(error);
      
      // Если это не сетевая ошибка (например, валидация), не повторяем
      if (!isRetryableError) {
        throw error;
      }
      
      // Если это последняя попытка, выбрасываем ошибку
      if (attempt === maxRetries - 1) {
        throw lastError;
      }
      
      // Вычисляем задержку с экспоненциальным ростом: delay = baseDelay * 2^attempt
      const delay = baseDelay * Math.pow(2, attempt);
      
      // Ждем перед следующей попыткой
      await sleep(delay);
    }
  }
  
  // Если все попытки исчерпаны, выбрасываем последнюю ошибку
  throw lastError;
}

/**
 * Проверяет, является ли ошибка сетевой/таймаут
 * @param {Error} error - Ошибка для проверки
 * @returns {boolean} - true если ошибка сетевая
 */
function isNetworkError(error) {
  // Проверяем типичные сетевые ошибки
  if (!error) return false;
  
  const message = error.message?.toLowerCase() || '';
  const errorString = error.toString().toLowerCase();
  
  // Список паттернов сетевых ошибок
  const networkErrorPatterns = [
    'network',
    'timeout',
    'connection',
    'socket',
    'econnrefused',
    'enotfound',
    'etimedout',
    'превышено время ожидания',
    'нет соединения'
  ];
  
  // Проверяем наличие паттернов в сообщении об ошибке
  const hasNetworkPattern = networkErrorPatterns.some(pattern => 
    message.includes(pattern) || errorString.includes(pattern)
  );
  
  // Проверяем специфичные для Socket.IO ошибки
  const isSocketError = error.type === 'TransportError' || 
                        error.type === 'TimeoutError' ||
                        error.code === 'ECONNREFUSED' ||
                        error.code === 'ETIMEDOUT';
  
  return hasNetworkPattern || isSocketError;
}

/**
 * Вспомогательная функция для задержки
 * @param {number} ms - Время задержки в миллисекундах
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

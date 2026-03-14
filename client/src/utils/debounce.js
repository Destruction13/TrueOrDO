/**
 * Утилита debounce для отложенного выполнения функций
 * Используется для оптимизации частых операций (автосохранение, поиск и т.д.)
 */

/**
 * Создает debounced версию функции, которая откладывает выполнение
 * до тех пор, пока не пройдет указанное время с последнего вызова
 * 
 * @param {Function} func - Функция для debounce
 * @param {number} delay - Задержка в миллисекундах (по умолчанию 500ms)
 * @returns {Function} Debounced функция с методом cancel()
 * 
 * @example
 * const saveNote = debounce((note) => {
 *   socket.emit('profile:note:set', { note });
 * }, 500);
 * 
 * // Вызовы в течение 500ms будут игнорироваться, выполнится только последний
 * saveNote('Hello');
 * saveNote('Hello World'); // Только этот вызов выполнится через 500ms
 */
export function debounce(func, delay = 500) {
  let timeoutId = null;

  const debouncedFunction = function (...args) {
    // Очищаем предыдущий таймер
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // Устанавливаем новый таймер
    timeoutId = setTimeout(() => {
      func.apply(this, args);
      timeoutId = null;
    }, delay);
  };

  // Метод для отмены отложенного вызова
  debouncedFunction.cancel = function () {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return debouncedFunction;
}

/**
 * Создает throttled версию функции, которая выполняется не чаще
 * чем раз в указанный интервал времени
 * 
 * @param {Function} func - Функция для throttle
 * @param {number} limit - Минимальный интервал между вызовами в миллисекундах
 * @returns {Function} Throttled функция
 * 
 * @example
 * const handleScroll = throttle(() => {
 *   console.log('Scroll event');
 * }, 200);
 */
export function throttle(func, limit = 200) {
  let inThrottle = false;

  return function (...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

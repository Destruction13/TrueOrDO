/**
 * Утилиты для безопасной обработки заметок о друзьях
 * Защита от XSS атак и корректная обработка специальных символов
 */

/**
 * Санитизирует текст заметки, удаляя опасные HTML теги и скрипты
 * @param {string} note - Исходный текст заметки
 * @returns {string} Безопасный текст заметки
 */
export function sanitizeNote(note) {
  if (!note || typeof note !== 'string') {
    return '';
  }

  // Ограничение длины
  const trimmed = note.slice(0, 500);

  // Экранирование HTML тегов
  let sanitized = trimmed
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');

  // Сохранение переносов строк
  sanitized = sanitized.replace(/\n/g, '\\n');

  return sanitized;
}

/**
 * Парсит санитизированную заметку обратно для отображения
 * @param {string} sanitizedNote - Санитизированный текст
 * @returns {string} Текст для отображения с переносами строк
 */
export function parseNote(sanitizedNote) {
  if (!sanitizedNote || typeof sanitizedNote !== 'string') {
    return '';
  }

  // Восстановление переносов строк
  let parsed = sanitizedNote.replace(/\\n/g, '\n');

  // Декодирование HTML entities
  parsed = parsed
    .replace(/&#x2F;/g, '/')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&');

  return parsed;
}

/**
 * Валидирует заметку перед сохранением
 * @param {string} note - Текст заметки
 * @returns {{valid: boolean, error?: string}} Результат валидации
 */
export function validateNote(note) {
  if (!note) {
    return { valid: true };
  }

  if (typeof note !== 'string') {
    return { valid: false, error: 'Заметка должна быть текстом' };
  }

  if (note.length > 500) {
    return { valid: false, error: 'Заметка не может быть длиннее 500 символов' };
  }

  return { valid: true };
}

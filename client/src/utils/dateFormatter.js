/**
 * Утилиты для форматирования дат в приложении PartyChaos
 */

const RUSSIAN_MONTHS = [
  'янв.', 'февр.', 'мар.', 'апр.', 'мая', 'июня',
  'июля', 'авг.', 'сент.', 'окт.', 'нояб.', 'дек.'
];

/**
 * Форматирует дату регистрации пользователя в русском формате
 * @param {string|Date} dateInput - ISO строка даты или объект Date
 * @returns {string} Отформатированная строка вида "Участник с DD MMM YYYY г."
 * @example
 * formatRegistrationDate('2024-01-15T10:30:00Z') // "Участник с 15 янв. 2024 г."
 */
export function formatRegistrationDate(dateInput) {
  if (!dateInput) {
    return 'Участник с неизвестной даты';
  }

  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    
    if (isNaN(date.getTime())) {
      return 'Участник с неизвестной даты';
    }

    const day = date.getDate();
    const month = RUSSIAN_MONTHS[date.getMonth()];
    const year = date.getFullYear();

    return `Участник с ${day} ${month} ${year} г.`;
  } catch (error) {
    console.error('Error formatting registration date:', error);
    return 'Участник с неизвестной даты';
  }
}

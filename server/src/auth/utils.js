const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const SALT_ROUNDS = 12;

/**
 * Хеширование пароля
 */
async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Проверка пароля
 */
async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * Генерация случайного токена
 */
function generateToken(length = 32) {
  return crypto.randomBytes(length).toString("hex");
}

/**
 * Хеширование токена для хранения в БД
 */
function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Валидация email
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Валидация пароля (минимум 8 символов)
 */
function isValidPassword(password) {
  return typeof password === "string" && password.length >= 8;
}

/**
 * Валидация никнейма (1-30 символов, любые печатные символы)
 * Разрешены пробелы, эмодзи, любые Unicode символы
 * Запрещены только управляющие символы и пустые строки
 */
function isValidNickname(nickname) {
  if (!nickname || typeof nickname !== "string") return false;
  const trimmed = nickname.trim();
  // Минимум 1 символ, максимум 30 символов после trim
  if (trimmed.length < 1 || trimmed.length > 30) return false;
  // Запрещаем только управляющие символы (кроме пробелов)
  // eslint-disable-next-line no-control-regex
  const controlCharsRegex = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/;
  return !controlCharsRegex.test(trimmed);
}

/**
 * Санитизация строки
 */
function sanitizeString(str, maxLength = 500) {
  if (!str || typeof str !== "string") return "";
  return str.trim().slice(0, maxLength);
}

/**
 * Генерация уникального 4-значного тега для пользователя (Discord-style)
 * Формат: "0001" - "9999" (без #, # добавляется при отображении)
 * @param {object} prisma - Prisma client
 * @param {string} nickname - Никнейм пользователя
 * @returns {Promise<string>} - Уникальный тег
 */
async function generateUniqueTag(prisma, nickname) {
  const MAX_ATTEMPTS = 100;
  
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    // Генерируем случайный 4-значный тег (0001-9999)
    const tag = String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0');
    
    // Проверяем уникальность комбинации nickname+tag
    const existing = await prisma.user.findFirst({
      where: { nickname, tag }
    });
    
    if (!existing) {
      return tag;
    }
  }
  
  // Если не удалось найти уникальный тег за MAX_ATTEMPTS попыток,
  // пробуем последовательный поиск свободного тега
  for (let i = 1; i <= 9999; i++) {
    const tag = String(i).padStart(4, '0');
    const existing = await prisma.user.findFirst({
      where: { nickname, tag }
    });
    if (!existing) {
      return tag;
    }
  }
  
  // Все 9999 тегов заняты для этого никнейма
  throw new Error(`Все теги для никнейма "${nickname}" заняты`);
}

module.exports = {
  hashPassword,
  verifyPassword,
  generateToken,
  hashToken,
  isValidEmail,
  isValidPassword,
  isValidNickname,
  sanitizeString,
  generateUniqueTag
};

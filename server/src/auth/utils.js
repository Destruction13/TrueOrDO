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
 * Валидация никнейма (3-30 символов, буквы (вкл. кириллицу), цифры, _, -)
 */
function isValidNickname(nickname) {
  if (!nickname || typeof nickname !== "string") return false;
  // Разрешаем латиницу, кириллицу, цифры, _, -
  const nicknameRegex = /^[a-zA-Zа-яА-ЯёЁ0-9_-]{3,30}$/;
  return nicknameRegex.test(nickname);
}

/**
 * Санитизация строки
 */
function sanitizeString(str, maxLength = 500) {
  if (!str || typeof str !== "string") return "";
  return str.trim().slice(0, maxLength);
}

module.exports = {
  hashPassword,
  verifyPassword,
  generateToken,
  hashToken,
  isValidEmail,
  isValidPassword,
  isValidNickname,
  sanitizeString
};

# Система аутентификации

## 🔐 Обзор

PartyChaos использует полноценную систему аутентификации с поддержкой:
- Email + пароль
- OAuth (Discord, Google)
- Верификация email
- Восстановление пароля
- Session-based авторизация

---

## 📋 Возможности

- ✅ Регистрация по email + пароль
- ✅ Подтверждение email письмом
- ✅ Вход / Выход
- ✅ Восстановление пароля
- ✅ OAuth (Discord, Google)
- ✅ Профиль пользователя (никнейм, био, аватар)
- ✅ Интеграция с Socket.IO (userId доступен в сокетах)
- ✅ Rate limiting (защита от брутфорса)
- ✅ Уникальные теги (#0001-#9999)

---

## 🔑 Архитектура

### Session-based авторизация

Используется express-session с Prisma session store:

```javascript
app.use(session({
  store: new PrismaSessionStore(prisma),
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: NODE_ENV === "production",
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 дней
  }
}));
```

### Хранение паролей

Пароли хешируются с помощью bcryptjs (12 раундов):

```javascript
const passwordHash = await bcrypt.hash(password, 12);
```

### Токены

Токены для верификации email и восстановления пароля:
- Генерируются с помощью `crypto.randomBytes(32)`
- Хешируются SHA-256 перед сохранением в БД
- Одноразовые (помечаются как использованные)
- Имеют срок действия

---

## 📡 API Endpoints

### Регистрация

**POST** `/api/auth/register`

**Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "nickname": "Player1"
}
```

**Response:**
```json
{
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "nickname": "Player1",
    "tag": "0001",
    "emailVerifiedAt": null
  }
}
```

**Валидация:**
- Email: валидный формат
- Пароль: минимум 8 символов
- Никнейм: 2-20 символов

**Процесс:**
1. Проверка существования email
2. Хеширование пароля
3. Генерация уникального тега (#0001-#9999)
4. Создание пользователя
5. Отправка письма с подтверждением
6. Создание сессии

---

### Вход

**POST** `/api/auth/login`

**Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "nickname": "Player1",
    "tag": "0001",
    "emailVerifiedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Процесс:**
1. Поиск пользователя по email
2. Проверка пароля
3. Создание сессии
4. Обновление lastLoginDate и loginStreak

---

### Выход

**POST** `/api/auth/logout`

**Response:**
```json
{
  "success": true
}
```

**Процесс:**
1. Удаление сессии из БД
2. Очистка cookie

---

### Текущий пользователь

**GET** `/api/auth/me`

**Response:**
```json
{
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "nickname": "Player1",
    "tag": "0001",
    "avatarUrl": "/uploads/avatars/avatar.jpg",
    "bio": "Игрок",
    "emailVerifiedAt": "2024-01-01T00:00:00.000Z",
    "xp": 100,
    "level": 2,
    "subscription": {
      "tier": "vip",
      "expiresAt": "2024-12-31T23:59:59.999Z"
    }
  }
}
```

---

### Подтверждение email

**GET** `/api/auth/verify-email?token=...`

**Response:**
Redirect на `/profile?verified=true`

**Процесс:**
1. Поиск токена в БД
2. Проверка срока действия
3. Обновление emailVerifiedAt
4. Пометка токена как использованного
5. Разблокировка достижения "Подтверждённый email"

---

### Повторная отправка письма

**POST** `/api/auth/resend-verification`

**Response:**
```json
{
  "success": true,
  "message": "Письмо отправлено"
}
```

**Rate limit:** 5 писем в час

---

### Запрос сброса пароля

**POST** `/api/auth/forgot-password`

**Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Письмо отправлено"
}
```

**Процесс:**
1. Поиск пользователя по email
2. Генерация токена
3. Отправка письма со ссылкой
4. Токен действителен 1 час

**Rate limit:** 5 писем в час

---

### Сброс пароля

**POST** `/api/auth/reset-password`

**Body:**
```json
{
  "token": "reset-token",
  "password": "newpassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Пароль изменён"
}
```

**Процесс:**
1. Поиск токена в БД
2. Проверка срока действия
3. Хеширование нового пароля
4. Обновление passwordHash
5. Пометка токена как использованного
6. Удаление всех сессий пользователя

---

## 🔗 OAuth

### Discord OAuth

**GET** `/api/auth/discord`

Редирект на Discord OAuth страницу.

**GET** `/api/auth/discord/callback`

Callback от Discord после авторизации.

**Процесс:**
1. Получение access token от Discord
2. Получение данных пользователя
3. Поиск пользователя по discordId
4. Если не найден — создание нового пользователя
5. Создание сессии
6. Redirect на `/profile`

**Данные от Discord:**
- `id` → `discordId`
- `username` → `discordUsername`
- `email` → `email` (если не занят)
- `avatar` → `avatarUrl`

---

### Google OAuth

**GET** `/api/auth/google`

Редирект на Google OAuth страницу.

**GET** `/api/auth/google/callback`

Callback от Google после авторизации.

**Процесс:**
1. Получение access token от Google
2. Получение данных пользователя
3. Поиск пользователя по googleId
4. Если не найден — создание нового пользователя
5. Создание сессии
6. Redirect на `/profile`

**Данные от Google:**
- `sub` → `googleId`
- `email` → `email`
- `name` → `nickname`
- `picture` → `avatarUrl`

---

## 👤 Профиль

### Получить профиль

**GET** `/api/me`

**Response:**
```json
{
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "nickname": "Player1",
    "tag": "0001",
    "avatarUrl": "/uploads/avatars/avatar.jpg",
    "bio": "Короткая биография",
    "biography": "Длинная биография до 500 символов",
    "emailVerifiedAt": "2024-01-01T00:00:00.000Z",
    "xp": 100,
    "level": 2,
    "loginStreak": 5,
    "subscription": {
      "tier": "vip",
      "expiresAt": "2024-12-31T23:59:59.999Z"
    },
    "customization": {
      "frameAll": "cyberpunk",
      "nicknameColorType": "gradient",
      "nicknameGradientId": "gradient-id"
    }
  }
}
```

---

### Обновить профиль

**PATCH** `/api/me`

**Body:**
```json
{
  "nickname": "NewNickname",
  "bio": "Новая биография",
  "biography": "Длинная биография"
}
```

**Response:**
```json
{
  "user": {
    "id": "user-id",
    "nickname": "NewNickname",
    "bio": "Новая биография",
    "biography": "Длинная биография"
  }
}
```

**Валидация:**
- Никнейм: 2-20 символов
- Био: до 100 символов
- Биография: до 500 символов

---

### Загрузить аватар

**POST** `/api/me/avatar`

**Content-Type:** `multipart/form-data`

**Body:**
```
avatar: <file>
```

**Response:**
```json
{
  "avatarUrl": "/uploads/avatars/user-id-1234567890.jpg"
}
```

**Ограничения:**
- Максимальный размер: 10MB
- Форматы: JPG, PNG, GIF, WebP

**Процесс:**
1. Валидация файла
2. Сохранение в `server/uploads/avatars/`
3. Имя файла: `{userId}-{timestamp}.{ext}`
4. Обновление avatarUrl в БД
5. Удаление старого аватара (если был)

---

## 🔒 Безопасность

### Rate Limiting

**Auth endpoints** (login, register):
- 10 попыток за 15 минут
- По IP адресу

**Email endpoints** (resend, forgot-password):
- 5 писем за 1 час
- По IP адресу

```javascript
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Слишком много попыток. Попробуйте позже." }
});

const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: "Слишком много запросов. Попробуйте позже." }
});
```

---

### Валидация

```javascript
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPassword(password) {
  return password.length >= 8;
}

function isValidNickname(nickname) {
  return nickname.length >= 2 && nickname.length <= 20;
}

function sanitizeString(str) {
  return str.trim().replace(/[<>]/g, "");
}
```

---

### Хеширование токенов

```javascript
// Генерация токена
const token = crypto.randomBytes(32).toString("hex");

// Хеширование для хранения в БД
const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

// Проверка токена
const inputHash = crypto.createHash("sha256").update(inputToken).digest("hex");
const dbToken = await prisma.emailVerificationToken.findUnique({
  where: { tokenHash: inputHash }
});
```

---

## 📧 Email отправка

### Nodemailer конфигурация

```javascript
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false, // TLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});
```

---

### Письмо верификации

**Тема:** "Подтвердите ваш email"

**Содержание:**
```
Привет, {nickname}!

Спасибо за регистрацию на PartyChaos.

Подтвердите ваш email, перейдя по ссылке:
{APP_BASE_URL}/verify-email?token={token}

Ссылка действительна 24 часа.

Если вы не регистрировались, проигнорируйте это письмо.
```

---

### Письмо восстановления пароля

**Тема:** "Сброс пароля"

**Содержание:**
```
Привет, {nickname}!

Вы запросили сброс пароля на PartyChaos.

Перейдите по ссылке для установки нового пароля:
{APP_BASE_URL}/reset-password?token={token}

Ссылка действительна 1 час.

Если вы не запрашивали сброс пароля, проигнорируйте это письмо.
```

---

## 🎨 Клиентские компоненты

### AuthScreen.jsx

Форма входа/регистрации с переключением режимов.

**Режимы:**
- `login` — вход
- `register` — регистрация

**Функции:**
- Валидация полей
- Отображение ошибок
- OAuth кнопки (Discord, Google)
- Ссылка "Забыли пароль?"

---

### ProfileScreen.jsx

Страница профиля пользователя.

**Разделы:**
- Основная информация (никнейм, тег, email)
- Аватар (загрузка, предпросмотр)
- Биография (короткая и длинная)
- Статистика (XP, уровень, стрик)
- Достижения
- Статистика игр
- Кастомизация (рамки, никнейм)
- Подписка (статус, продление)

---

### VerifyEmail.jsx

Страница подтверждения email.

**Процесс:**
1. Извлечение токена из URL
2. Отправка запроса на сервер
3. Отображение результата (успех / ошибка)
4. Redirect на профиль

---

### ResetPassword.jsx

Страница сброса пароля.

**Процесс:**
1. Извлечение токена из URL
2. Форма ввода нового пароля
3. Отправка запроса на сервер
4. Отображение результата
5. Redirect на логин

---

## 🔄 Интеграция с Socket.IO

### Middleware

```javascript
io.use((socket, next) => {
  const sessionId = socket.handshake.auth.sessionId;
  if (sessionId) {
    // Загрузить сессию из БД
    const session = await sessionStore.get(sessionId);
    if (session && session.userId) {
      socket.data.userId = session.userId;
    }
  }
  next();
});
```

### Доступ к userId в обработчиках

```javascript
socket.on("alias:create", async (data) => {
  const userId = socket.data.userId;
  if (userId) {
    // Пользователь авторизован
    const user = await prisma.user.findUnique({ where: { id: userId } });
    // Использовать данные пользователя
  }
});
```

---

## 🎯 Уникальные теги

Каждый пользователь получает уникальный 4-значный тег (#0001-#9999).

### Генерация тега

```javascript
async function generateUniqueTag(prisma, nickname) {
  // Найти все занятые теги для этого никнейма
  const existingUsers = await prisma.user.findMany({
    where: { nickname },
    select: { tag: true }
  });
  
  const takenTags = existingUsers.map(u => u.tag);
  
  // Найти первый свободный тег
  for (let i = 1; i <= 9999; i++) {
    const tag = String(i).padStart(4, "0");
    if (!takenTags.includes(tag)) {
      return tag;
    }
  }
  
  throw new Error("Все теги заняты для этого никнейма");
}
```

### Поиск пользователя

Пользователя можно найти по комбинации никнейм + тег:

```javascript
const user = await prisma.user.findUnique({
  where: {
    nickname_tag: {
      nickname: "Player1",
      tag: "0001"
    }
  }
});
```

---

## 📊 Статистика авторизации

### Login streak

Количество дней подряд, когда пользователь заходил в систему.

```javascript
// При логине
const today = new Date().toDateString();
const lastLogin = user.lastLoginDate?.toDateString();

if (lastLogin === today) {
  // Уже заходил сегодня
} else if (lastLogin === yesterday) {
  // Заходил вчера — увеличить стрик
  user.loginStreak += 1;
} else {
  // Стрик прерван
  user.loginStreak = 1;
}

user.lastLoginDate = new Date();
await prisma.user.update({ where: { id: user.id }, data: user });
```

### XP и уровни

XP начисляется за:
- Первый вход: +10 XP
- Ежедневный вход: +5 XP
- Завершение игры: +10-50 XP (зависит от игры)
- Победа: +20-100 XP
- Достижения: +50-500 XP

Уровень рассчитывается по формуле:
```javascript
level = Math.floor(Math.sqrt(xp / 100)) + 1;
```

Пример:
- 0 XP → уровень 1
- 100 XP → уровень 2
- 400 XP → уровень 3
- 900 XP → уровень 4

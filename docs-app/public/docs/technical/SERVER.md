# Серверная часть (Backend)

## 📁 Структура

```
server/
├── src/
│   ├── index.js                 # Главный файл сервера (~1500 строк)
│   ├── auth/                    # Модули аутентификации
│   │   ├── routes.js            # REST API endpoints
│   │   ├── oauth.js             # OAuth (Discord, Google)
│   │   ├── utils.js             # Хеширование, валидация
│   │   ├── email.js             # Отправка писем
│   │   └── session-store.js     # Prisma session store
│   ├── game/                    # Игровая логика
│   │   ├── wheels.js            # Правда или Действие
│   │   ├── alias.js             # Alias (Шляпа)
│   │   ├── codenames.js         # Codenames
│   │   ├── emotional.js         # Emotional Intelligence
│   │   ├── stats.js             # Статистика и достижения
│   │   ├── alias-turn-helpers.js
│   │   └── alias-check-turn.js
│   ├── social/                  # Социальные функции
│   │   ├── friends.js           # Система друзей
│   │   ├── chat.js              # Приватные чаты
│   │   ├── clans.js             # Кланы
│   │   ├── profile.js           # Профили пользователей
│   │   └── userPublic.js        # Публичные данные пользователя
│   └── subscription/            # Подписка и платежи
│       └── routes.js            # API подписки (Tribute)
├── prisma/
│   ├── schema.prisma            # Схема БД (~1200 строк, 40+ моделей)
│   ├── seed.js                  # Загрузка seed-контента
│   ├── dev.db                   # SQLite БД (development)
│   └── migrations/              # История миграций
├── data/                        # Игровой контент
│   ├── wheels.json              # Контент для Правда или Действие
│   ├── truth-questions.json     # Вопросы "Правда"
│   ├── truth-questions-chaos.json
│   ├── alias/                   # Слова для Alias
│   │   ├── easy.txt             # ~4000 слов
│   │   ├── normal.txt           # ~6600 слов
│   │   └── hard.txt             # ~2000 слов
│   └── emotional/               # Контент для Emotional Intelligence
│       ├── emotions.txt         # Список эмоций с категориями
│       └── words.txt            # Слова-ассоциации
├── uploads/                     # Загруженные файлы
│   └── avatars/                 # Аватары пользователей
├── .env                         # Переменные окружения (dev)
├── .env.production              # Переменные окружения (prod)
└── package.json
```

---

## 🚀 Главный файл сервера

### `server/src/index.js`

Основной файл, который:
1. Инициализирует Express приложение
2. Настраивает middleware (CORS, sessions, cookies)
3. Создаёт HTTP сервер и Socket.IO
4. Регистрирует REST API роуты
5. Регистрирует Socket.IO обработчики для всех игр
6. Отдаёт статику клиента в production

#### Основные компоненты

```javascript
// Инициализация
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: CLIENT_ORIGIN } });
const prisma = new PrismaClient();

// Middleware
app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(session({
  store: new PrismaSessionStore(prisma),
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, secure: NODE_ENV === "production" }
}));

// REST API
app.use("/api/auth", createAuthRouter(prisma, sessionStore, io));
app.use("/api/auth", createOAuthRouter(prisma, sessionStore, io));
app.use("/api/subscription", createSubscriptionRouter(prisma, io));

// Socket.IO
io.on("connection", (socket) => {
  // Регистрация обработчиков для всех игр
  registerTodHandlers(socket, io, prisma);
  registerAliasHandlers(socket, io, prisma);
  registerCodenamesHandlers(socket, io, prisma);
  registerEmotionalHandlers(socket, io, prisma);
  registerSocialHandlers(socket, io, prisma);
});

// Статика (production)
if (NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "..", "..", "client", "dist")));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "..", "client", "dist", "index.html"));
  });
}
```

---

## 🔌 REST API Endpoints

### Аутентификация (`/api/auth/*`)

| Метод | Endpoint | Описание | Body | Response |
|-------|----------|----------|------|----------|
| POST | `/register` | Регистрация | `{ email, password, nickname }` | `{ user }` |
| POST | `/login` | Вход | `{ email, password }` | `{ user }` |
| POST | `/logout` | Выход | — | `{ success: true }` |
| GET | `/me` | Текущий пользователь | — | `{ user }` |
| GET | `/verify-email?token=...` | Подтверждение email | — | Redirect |
| POST | `/resend-verification` | Повторная отправка письма | — | `{ success: true }` |
| POST | `/forgot-password` | Запрос сброса пароля | `{ email }` | `{ success: true }` |
| POST | `/reset-password` | Установка нового пароля | `{ token, password }` | `{ success: true }` |

### OAuth (`/api/auth/*`)

| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | `/discord` | Редирект на Discord OAuth |
| GET | `/discord/callback` | Callback от Discord |
| GET | `/google` | Редирект на Google OAuth |
| GET | `/google/callback` | Callback от Google |

### Профиль (`/api/me`)

| Метод | Endpoint | Описание | Body | Response |
|-------|----------|----------|------|----------|
| GET | `/` | Получить профиль | — | `{ user }` |
| PATCH | `/` | Обновить профиль | `{ nickname, bio, biography }` | `{ user }` |
| POST | `/avatar` | Загрузить аватар | `multipart/form-data` | `{ avatarUrl }` |

### Подписка (`/api/subscription/*`)

| Метод | Endpoint | Описание | Body | Response |
|-------|----------|----------|------|----------|
| GET | `/status` | Статус подписки | — | `{ subscription }` |
| POST | `/create` | Создать подписку | `{ tier, duration }` | `{ paymentUrl }` |
| POST | `/cancel` | Отменить подписку | — | `{ success: true }` |
| POST | `/payments/webhook` | Webhook от Tribute | — | `{ success: true }` |

---

## 🎮 Socket.IO События

### Общие события

| Событие | Направление | Описание | Payload |
|---------|-------------|----------|---------|
| `connection` | → Server | Подключение клиента | — |
| `disconnect` | → Server | Отключение клиента | — |
| `error` | ← Server | Ошибка | `{ error: string }` |

### Правда или Действие (`tod:*`)

#### Создание и присоединение

| Событие | Направление | Описание | Payload |
|---------|-------------|----------|---------|
| `tod:create` | → Server | Создать комнату | `{ name, avatarUrl, visitorId }` |
| `tod:join` | → Server | Присоединиться | `{ code, name, avatarUrl, visitorId }` |
| `tod:leave` | → Server | Покинуть комнату | — |
| `tod:room:state` | ← Server | Состояние комнаты | `{ room, players, settings }` |

#### Игровой процесс

| Событие | Направление | Описание | Payload |
|---------|-------------|----------|---------|
| `tod:choice` | → Server | Выбор "Правда" или "Действие" | `{ choice: "truth" \| "dare" }` |
| `tod:spin:wheel1` | → Server | Крутить колесо 1 | — |
| `tod:spin:wheel2` | → Server | Крутить колесо 2 | — |
| `tod:timer:start` | → Server | Запустить таймер | — |
| `tod:timer:reset` | → Server | Сбросить таймер | — |
| `tod:vote` | → Server | Проголосовать | `{ vote: "yes" \| "no" \| "report" }` |
| `tod:round:skip` | → Server | Пропустить раунд | — |

#### Broadcast события

| Событие | Описание | Payload |
|---------|----------|---------|
| `tod:spin:wheel1:result` | Результат колеса 1 | `{ category, index }` |
| `tod:spin:wheel2:result` | Результат колеса 2 | `{ item, index }` |
| `tod:timer:tick` | Тик таймера | `{ secondsLeft }` |
| `tod:round:complete` | Раунд завершён | `{ result, nextPlayer }` |

### Alias (`alias:*`)

#### Создание и присоединение

| Событие | Направление | Описание | Payload |
|---------|-------------|----------|---------|
| `alias:create` | → Server | Создать комнату | `{ name, avatarUrl, settings }` |
| `alias:join` | → Server | Присоединиться | `{ code, name, avatarUrl }` |
| `alias:leave` | → Server | Покинуть комнату | — |
| `alias:room:state` | ← Server | Состояние комнаты | `{ room, teams, settings, gameState }` |

#### Управление командами

| Событие | Направление | Описание | Payload |
|---------|-------------|----------|---------|
| `alias:team:create` | → Server | Создать команду | `{ name, color }` |
| `alias:team:join` | → Server | Присоединиться к команде | `{ teamId }` |
| `alias:team:leave` | → Server | Покинуть команду | — |
| `alias:team:delete` | → Server | Удалить команду | `{ teamId }` |
| `alias:team:shuffle` | → Server | Перемешать команды | — |

#### Игровой процесс

| Событие | Направление | Описание | Payload |
|---------|-------------|----------|---------|
| `alias:ready` | → Server | Игрок готов | — |
| `alias:start` | → Server | Начать игру | — |
| `alias:word:correct` | → Server | Слово угадано | — |
| `alias:word:skip` | → Server | Пропустить слово | — |
| `alias:pause` | → Server | Пауза | — |
| `alias:resume` | → Server | Продолжить | — |
| `alias:reset` | → Server | Сбросить игру | — |

#### Broadcast события

| Событие | Описание | Payload |
|---------|----------|---------|
| `alias:word:next` | Следующее слово | `{ word, teamId, explainerId }` |
| `alias:timer:tick` | Тик таймера | `{ secondsLeft }` |
| `alias:turn:end` | Ход завершён | `{ teamId, score }` |
| `alias:game:winner` | Победитель | `{ teamId, teamName, score }` |

### Codenames (`codenames:*`)

#### Создание и присоединение

| Событие | Направление | Описание | Payload |
|---------|-------------|----------|---------|
| `codenames:create` | → Server | Создать комнату | `{ name, avatarUrl }` |
| `codenames:join` | → Server | Присоединиться | `{ code, name, avatarUrl }` |
| `codenames:leave` | → Server | Покинуть комнату | — |
| `codenames:room:state` | ← Server | Состояние комнаты | `{ room, players, board, gameState }` |

#### Управление командами

| Событие | Направление | Описание | Payload |
|---------|-------------|----------|---------|
| `codenames:team:join` | → Server | Присоединиться к команде | `{ team: "red" \| "blue" }` |
| `codenames:role:set` | → Server | Выбрать роль | `{ role: "captain" \| "operative" \| "spectator" }` |

#### Игровой процесс

| Событие | Направление | Описание | Payload |
|---------|-------------|----------|---------|
| `codenames:start` | → Server | Начать игру | — |
| `codenames:hint:give` | → Server | Дать подсказку | `{ word, number }` |
| `codenames:card:select` | → Server | Выбрать карточку | `{ cardId }` |
| `codenames:card:confirm` | → Server | Подтвердить выбор | — |
| `codenames:card:cancel` | → Server | Отменить выбор | — |
| `codenames:turn:end` | → Server | Завершить ход | — |
| `codenames:pause` | → Server | Пауза | — |
| `codenames:resume` | → Server | Продолжить | — |
| `codenames:reset` | → Server | Сбросить игру | — |

### Emotional Intelligence (`emotional:*`)

#### Создание и присоединение

| Событие | Направление | Описание | Payload |
|---------|-------------|----------|---------|
| `emotional:create` | → Server | Создать комнату | `{ name, avatarUrl }` |
| `emotional:join` | → Server | Присоединиться | `{ code, name, avatarUrl }` |
| `emotional:leave` | → Server | Покинуть комнату | — |
| `emotional:room:state` | ← Server | Состояние комнаты | `{ room, players, gameState }` |

#### Игровой процесс

| Событие | Направление | Описание | Payload |
|---------|-------------|----------|---------|
| `emotional:start` | → Server | Начать игру | — |
| `emotional:emotion:select` | → Server | Выбрать эмоцию | `{ emotion }` |
| `emotional:guess` | → Server | Угадать эмоцию | `{ emotion }` |
| `emotional:vote` | → Server | Проголосовать | `{ playerId }` |
| `emotional:reset` | → Server | Сбросить игру | — |

### Социальные функции (`social:*`)

#### Друзья

| Событие | Направление | Описание | Payload |
|---------|-------------|----------|---------|
| `social:friends:list` | → Server | Список друзей | — |
| `social:friends:requests` | → Server | Заявки в друзья | — |
| `social:friends:send` | → Server | Отправить заявку | `{ receiverId }` |
| `social:friends:accept` | → Server | Принять заявку | `{ requestId }` |
| `social:friends:reject` | → Server | Отклонить заявку | `{ requestId }` |
| `social:friends:remove` | → Server | Удалить друга | `{ friendId }` |

#### Чаты

| Событие | Направление | Описание | Payload |
|---------|-------------|----------|---------|
| `social:chat:list` | → Server | Список чатов | — |
| `social:chat:messages` | → Server | Сообщения чата | `{ conversationId }` |
| `social:chat:send` | → Server | Отправить сообщение | `{ receiverId, content }` |
| `social:chat:read` | → Server | Прочитать сообщения | `{ conversationId }` |

#### Кланы

| Событие | Направление | Описание | Payload |
|---------|-------------|----------|---------|
| `social:clan:create` | → Server | Создать клан | `{ name, tag, description }` |
| `social:clan:join` | → Server | Вступить в клан | `{ clanId }` |
| `social:clan:leave` | → Server | Покинуть клан | — |
| `social:clan:chat` | → Server | Отправить сообщение в клан | `{ content }` |

---

## 🗄️ In-Memory State

Сервер использует in-memory хранилище для игровых комнат (не сохраняется в БД):

### Правда или Действие
```javascript
const rooms = new Map(); // code -> { id, code, hostId, players: [], settings: {} }
const playerSockets = new Map(); // playerId -> socketId
const timers = new Map(); // roomId -> { intervalId, endsAt }
```

### Alias
```javascript
const aliasRooms = new Map(); // code -> { room, teams: [], gameState: {} }
const aliasPlayerSockets = new Map(); // playerId -> socketId
const aliasTimers = new Map(); // roomId -> { intervalId, endsAt }
const aliasPausedRooms = new Map(); // roomCode -> { isPaused, pausedAt, remainingTime }
const aliasRoundHistory = new Map(); // roomId -> [{ word, correct, timestamp }]
```

### Codenames
```javascript
const codenamesRooms = new Map(); // code -> { room, players: [], board: [], gameState: {} }
const codenamesPlayerSockets = new Map(); // playerId -> socketId
const codenamesTimers = new Map(); // roomId -> { intervalId, endsAt, phase }
const codenamePendingTimers = new Map(); // roomCode -> { timeoutId, cardId }
```

### Emotional Intelligence
```javascript
const emotionalRooms = new Map(); // code -> { room, players: [], gameState: {} }
const emotionalPausedRooms = new Map(); // roomCode -> { isPaused, pausedAt }
```

---

## 🔒 Middleware и безопасность

### Rate Limiting

```javascript
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 10, // 10 попыток
  message: { error: "Слишком много попыток. Попробуйте позже." }
});

const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 час
  max: 5, // 5 писем
  message: { error: "Слишком много запросов. Попробуйте позже." }
});
```

### Session Store

```javascript
// Prisma-based session store
class PrismaSessionStore extends Store {
  async get(sid, callback) {
    const session = await prisma.session.findUnique({ where: { sid } });
    if (!session || session.expiresAt < new Date()) {
      return callback(null, null);
    }
    callback(null, JSON.parse(session.data));
  }
  
  async set(sid, session, callback) {
    await prisma.session.upsert({
      where: { sid },
      create: { sid, userId, data: JSON.stringify(session), expiresAt },
      update: { data: JSON.stringify(session), expiresAt }
    });
    callback(null);
  }
  
  async destroy(sid, callback) {
    await prisma.session.delete({ where: { sid } });
    callback(null);
  }
}
```

### CORS

```javascript
app.use(cors({
  origin: CLIENT_ORIGIN, // http://localhost:5173 или https://partychaos.ru
  credentials: true // Разрешить cookies
}));
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

### Типы писем

1. **Верификация email**
   - Тема: "Подтвердите ваш email"
   - Ссылка: `${APP_BASE_URL}/verify-email?token=...`
   - Срок действия: 24 часа

2. **Восстановление пароля**
   - Тема: "Сброс пароля"
   - Ссылка: `${APP_BASE_URL}/reset-password?token=...`
   - Срок действия: 1 час

---

## 🔐 Хеширование и токены

### Пароли (bcryptjs)

```javascript
// Хеширование (12 раундов)
const passwordHash = await bcrypt.hash(password, 12);

// Проверка
const isValid = await bcrypt.compare(password, passwordHash);
```

### Токены (crypto)

```javascript
// Генерация токена
const token = crypto.randomBytes(32).toString("hex");

// Хеширование токена для хранения в БД
const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
```

---

## 📊 Статистика и достижения

### Запись статистики

```javascript
// После завершения раунда ToD
await recordTodRoundComplete(prisma, userId, {
  choice: "truth",
  result: "success",
  duration: 45
});

// После завершения игры Alias
await recordAliasGameComplete(prisma, userId, {
  teamId,
  won: true,
  score: 30,
  duration: 600
});
```

### Разблокировка достижений

```javascript
// Автоматическая проверка достижений
await unlockAchievementByEvent(prisma, userId, "tod_first_game");
await unlockAchievementByEvent(prisma, userId, "alias_win_10");
```

---

## 🔄 Жизненный цикл игровой комнаты

### 1. Создание комнаты

```javascript
// Клиент
socket.emit("alias:create", { name: "Player1", avatarUrl: "..." });

// Сервер
const code = await generateAliasRoomCode(prisma);
const room = await prisma.aliasRoom.create({ data: { code, hostId: playerId } });
aliasRooms.set(code, { room, teams: [], gameState: {} });
socket.join(code);
socket.emit("alias:room:state", buildAliasRoomState(code));
```

### 2. Присоединение игроков

```javascript
// Клиент
socket.emit("alias:join", { code: "ABC123", name: "Player2" });

// Сервер
const player = await prisma.aliasPlayer.create({ data: { roomId, name } });
socket.join(code);
io.to(code).emit("alias:room:state", buildAliasRoomState(code));
```

### 3. Игровой процесс

```javascript
// Клиент
socket.emit("alias:word:correct");

// Сервер
team.score += 1;
const nextWord = getNextWord(roomId);
socket.emit("alias:word:next", { word: nextWord });
io.to(code).emit("alias:room:state", buildAliasRoomState(code));
```

### 4. Завершение игры

```javascript
// Сервер
if (team.score >= settings.targetScore) {
  io.to(code).emit("alias:game:winner", { teamId, teamName, score });
  await recordAliasGameComplete(prisma, userId, { won: true });
}
```

### 5. Очистка

```javascript
// При disconnect
socket.on("disconnect", async () => {
  await leaveRoom(socket, io, prisma);
  // Если комната пустая — удалить из памяти
  if (room.players.length === 0) {
    aliasRooms.delete(code);
    stopAliasTimer(roomId);
  }
});
```

---

## 🛠️ Утилиты

### Генерация кодов комнат

```javascript
const { customAlphabet } = require("nanoid");
const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ROOM_CODE_LENGTH = 6;
const makeRoomCode = customAlphabet(ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH);

// Генерация уникального кода
async function generateRoomCode(prisma) {
  let code = makeRoomCode();
  let existing = await prisma.room.findUnique({ where: { code } });
  while (existing) {
    code = makeRoomCode();
    existing = await prisma.room.findUnique({ where: { code } });
  }
  return code;
}
```

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

## 📝 Логирование

```javascript
// Подключение игрока
console.log(`[Alias] Player ${playerId} joined room ${code}`);

// Ошибки
console.error(`[Alias] Error creating room:`, error);

// Игровые события
console.log(`[Alias] Team ${teamId} scored. New score: ${team.score}`);
```

---

## 🔧 Переменные окружения

См. `server/.env.example`:

```env
# Database
DATABASE_URL="file:./dev.db"

# Server
PORT=3001
NODE_ENV=development
CLIENT_ORIGIN=http://localhost:5173

# Session
SESSION_SECRET=your-super-secret-session-key

# App URLs
APP_BASE_URL=http://localhost:5173

# SMTP (Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-character-app-password
SMTP_FROM="PartyChaos <your-email@gmail.com>"

# OAuth (Discord)
DISCORD_CLIENT_ID=your-discord-client-id
DISCORD_CLIENT_SECRET=your-discord-client-secret
DISCORD_REDIRECT_URI=http://localhost:3001/api/auth/discord/callback

# OAuth (Google)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3001/api/auth/google/callback

# Tribute (Платёжная система)
TRIBUTE_API_KEY=your-tribute-api-key
TRIBUTE_WEBHOOK_URL=http://localhost:3001/api/subscription/payments/webhook
```

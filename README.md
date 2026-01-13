# True or Do (Правда или действие)

Одностраничная SPA для игры "Правда или действие" с мультиплеером, комнатами и синхронизацией через WebSocket.

## Требования

- Node.js LTS (18+)
- npm

## Быстрый старт (dev)

```bash
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Откройте `http://localhost:5173`.

## Продакшн (локально)

```bash
npm install
npm run db:migrate
npm run db:seed
npm run build
npm run start

cd C:\cloudflared
.\cloudflared.exe tunnel --url http://localhost:3001

```

Сервер отдаёт API и статический клиент из `client/dist`.

## Скрипты

- `npm run dev` — сервер + клиент параллельно.
- `npm run build` — сборка клиента.
- `npm run start` — запуск сервера (API + статика).
- `npm run db:migrate` — миграции Prisma.
- `npm run db:seed` — проверка/инициализация seed-контента.
- `npm run db:reset` — сброс БД.

## База данных

SQLite файл хранится по пути:

```
server/prisma/dev.db
```

### Сброс БД

```bash
npm run db:reset
npm run db:migrate
npm run db:seed
```

## Контент заданий

Seed-контент находится в `server/data/wheels.json`.

- Колесо 1: 4 категории.
- Колесо 2: 12 сценариев на категорию.
- Каждый сценарий содержит `tags` и `rating` для будущих фильтров.

После изменения контента перезапустите сервер.

## Настройки окружения

Создайте файл `server/.env` на основе `server/.env.example`:

```env
# Database
DATABASE_URL="file:./dev.db"

# Server
PORT=3001
CLIENT_ORIGIN=http://localhost:5173

# Session
SESSION_SECRET=your-super-secret-session-key-change-in-production

# App URLs (для ссылок в письмах)
# Локально: http://localhost:5173
# Cloudflare tunnel: https://your-tunnel.trycloudflare.com
# Production: https://your-domain.com
APP_BASE_URL=http://localhost:5173

# SMTP (Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="True or Do <your-email@gmail.com>"
```

### Настройка Gmail SMTP

1. Перейдите в [Google Account Security](https://myaccount.google.com/security)
2. Включите **2-Step Verification**
3. Перейдите в **App passwords**
4. Создайте пароль для приложения "Mail"
5. Используйте 16-символьный пароль как `SMTP_PASS`

### Переменные

- `PORT` — порт сервера (по умолчанию `3001`)
- `CLIENT_ORIGIN` — origin клиента для CORS
- `SESSION_SECRET` — секрет для подписи cookies (обязательно поменяйте в production!)
- `APP_BASE_URL` — базовый URL для ссылок в письмах
- `SMTP_*` — настройки SMTP для отправки писем

## Игровая логика (кратко)

- До 20 игроков в комнате.
- Ходящий выбирает "Правда" или "Действие".
- Два колеса: категория -> сценарий.
- Таймер запускается после получения задания.
- Ведущий может сбросить таймер или пропустить раунд.
- Голосуют все кроме ходящего.
- Результат: строгое большинство от всех доступных голосов (все кроме ходящего). Иначе — "не засчитано".
- "Репорт" большинством даёт страйк. 2 страйка = `disqualified`.

## Авторизация

Система поддерживает полноценную авторизацию:

### Возможности

- ✅ Регистрация по email + пароль
- ✅ Подтверждение email письмом
- ✅ Вход / Выход
- ✅ Восстановление пароля
- ✅ Профиль пользователя (никнейм, био, аватар)
- ✅ Интеграция с Socket.IO (userId доступен в сокетах)

### API Эндпоинты

**Auth:**

- `POST /api/auth/register` — регистрация
- `POST /api/auth/login` — вход
- `POST /api/auth/logout` — выход
- `GET /api/auth/me` — текущий пользователь
- `GET /api/auth/verify-email?token=...` — подтверждение email
- `POST /api/auth/resend-verification` — повторная отправка письма
- `POST /api/auth/forgot-password` — запрос сброса пароля
- `POST /api/auth/reset-password` — установка нового пароля

**Profile:**

- `GET /api/me` — получить профиль
- `PATCH /api/me` — обновить профиль (nickname, bio)
- `POST /api/me/avatar` — загрузить аватар (multipart/form-data)

### Архитектура

- **Сессии**: httpOnly cookies с Prisma session store
- **Пароли**: bcrypt с 12 раундами
- **Токены**: одноразовые, хранятся как SHA-256 хеш
- **Rate limiting**: 10 попыток на login/register за 15 минут
- **Аватары**: хранятся в `server/uploads/avatars/`, макс. 2MB

### Фронтенд страницы

- `/login`, `/register` — вход/регистрация
- `/verify-email?token=...` — подтверждение email
- `/reset-password?token=...` — сброс пароля
- `/profile` — профиль пользователя (требует авторизации)

## Структура проекта

```
server/                    # Express + Socket.IO + Prisma + SQLite
  src/
    index.js              # Главный файл сервера
    auth/                 # Модули авторизации
      routes.js           # API эндпоинты
      utils.js            # Хеширование, валидация
      email.js            # Отправка писем
      session-store.js    # Prisma session store
    game/
      wheels.js           # Логика игровых колёс
  prisma/
    schema.prisma         # Модели БД
  uploads/
    avatars/              # Загруженные аватары
client/                   # Vite + React SPA
  src/
    api/auth.js           # API клиент
    context/AuthContext.jsx
    components/auth/      # Auth компоненты
```

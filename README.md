# PartyChaos — Мультиплеерные игры для вечеринок

Одностраничная SPA с мультиплеерными играми для вечеринок. Комнаты, синхронизация через WebSocket, адаптивный интерфейс.

## 🎮 Доступные игры

### Правда или Действие
Классическая игра с колёсами выбора категорий и заданий, таймером, голосованием и системой страйков.

### Alias (Шляпа)
Командная игра на объяснение слов:
- 3 уровня сложности (лёгкий / средний / сложный)
- Настраиваемый таймер и целевой счёт
- Штраф за пропуск (опционально)
- Неограниченное количество команд

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

## Контент игр

### Правда или Действие

Seed-контент находится в `server/data/wheels.json`.

- Колесо 1: 4 категории.
- Колесо 2: 12 сценариев на категорию.
- Каждый сценарий содержит `tags` и `rating` для будущих фильтров.

### Alias

Слова находятся в `server/data/alias/`:

- `easy.txt` — лёгкие слова (~4000)
- `normal.txt` — средние слова (~6600)
- `hard.txt` — сложные слова (~2000)

Формат: одно слово на строку.

После изменения контента выполните `npm run db:seed` и перезапустите сервер.

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

## Игровая логика

### Правда или Действие

- До 20 игроков в комнате.
- Ходящий выбирает "Правда" или "Действие".
- Два колеса: категория → сценарий.
- Таймер запускается после получения задания.
- Ведущий может сбросить таймер или пропустить раунд.
- Голосуют все кроме ходящего.
- Результат: строгое большинство от всех доступных голосов. Иначе — "не засчитано".
- "Репорт" большинством даёт страйк. 2 страйка = `disqualified`.

### Alias

- Неограниченное число команд и игроков.
- Команды ходят по очереди, объясняющие в команде чередуются.
- Перед стартом все игроки (кроме зрителей) должны нажать "Готов".
- Объясняющий видит слово, остальные — угадывают.
- **Угадали (+1)** — следующее слово.
- **Пропустить (0 или -1)** — следующее слово, штраф по настройкам (счёт не уходит ниже 0).
- По истечении таймера ход переходит к следующей команде.
- Победитель — команда, первой набравшая целевой счёт.
- Ведущий может: ставить на паузу, пропускать ход, сбрасывать игру.

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
      wheels.js           # Логика колёс (Правда или Действие)
      alias.js            # Логика Alias
  data/
    wheels.json           # Контент для Правда или Действие
    alias/                # Слова для Alias
      easy.txt
      normal.txt
      hard.txt
  prisma/
    schema.prisma         # Модели БД
    seed.js               # Загрузка контента в БД
  uploads/
    avatars/              # Загруженные аватары
client/                   # Vite + React SPA
  src/
    api/auth.js           # API клиент
    context/AuthContext.jsx
    pages/
      TruthOrDarePage.jsx # Страница Правда или Действие
      AliasPage.jsx       # Страница Alias
    components/
      auth/               # Auth компоненты
      alias/              # Компоненты Alias
      ui/                 # Переиспользуемые UI компоненты
deploy/                   # Скрипты деплоя
  install.sh              # Установка с нуля
  update.sh               # Обновление из git
  selftest.sh             # Проверка работоспособности
```

---

## 🚀 Production Deployment (VPS)

Инструкция для деплоя на Ubuntu 24.04 VPS с доменом **partychaos.ru**.

### Требования

- VPS с Ubuntu 24.04 LTS
- Минимум 1 GB RAM, 10 GB диска
- Публичный IPv4 адрес
- Доступ по SSH (root или sudo)
- Домен с настроенными DNS записями

### 1. Настройка DNS

В панели управления доменом создайте A-записи:

| Тип | Имя | Значение |
|-----|-----|----------|
| A | @ | `ВАШ_IP_VPS` |
| A | www | `ВАШ_IP_VPS` |

> ⚠️ DNS изменения могут применяться до 24 часов. Проверьте: `dig partychaos.ru +short`

### 2. Установка

Подключитесь к VPS по SSH и выполните:

```bash
# Клонируем репозиторий во временную папку
cd /tmp
git clone https://github.com/Destruction13/TrueOrDO.git
cd TrueOrDO

# Запускаем установку
sudo bash deploy/install.sh
```

Скрипт автоматически:
- Установит Node.js 20 LTS, nginx, certbot, PM2
- Создаст системного пользователя `partychaos`
- Склонирует проект в `/opt/partychaos`
- Соберёт фронтенд
- Настроит базу данных SQLite
- Получит SSL сертификат Let's Encrypt
- Настроит nginx и запустит бэкенд

### 3. Настройка SMTP (обязательно для email)

После установки отредактируйте `/opt/partychaos/server/.env`:

```bash
sudo nano /opt/partychaos/server/.env
```

Заполните SMTP настройки для работы подтверждения email и восстановления пароля:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-character-app-password
SMTP_FROM="PartyСhaos <your-email@gmail.com>"
```

После изменения перезапустите:

```bash
sudo -u partychaos pm2 restart partychaos
```

### 4. Проверка

```bash
sudo bash /opt/partychaos/deploy/selftest.sh
```

Все проверки должны показать ✓

### 5. Обновление

При появлении новых коммитов в репозитории:

```bash
sudo bash /opt/partychaos/deploy/update.sh
```

Скрипт автоматически:
- Создаст бэкап базы данных
- Обновит код из git
- Пересоберёт фронтенд
- Применит миграции Prisma
- Перезапустит бэкенд без даунтайма

### Полезные команды

```bash
# Статус бэкенда
sudo -u partychaos pm2 status

# Логи бэкенда (последние 100 строк)
sudo -u partychaos pm2 logs partychaos --lines 100

# Логи в реальном времени
sudo -u partychaos pm2 logs partychaos

# Перезапуск бэкенда
sudo -u partychaos pm2 restart partychaos

# Перезапуск nginx
sudo systemctl restart nginx

# Статус nginx
sudo systemctl status nginx

# Обновление SSL сертификата (автоматически по cron, но можно вручную)
sudo certbot renew
```

### Расположение файлов

| Что | Путь |
|-----|------|
| Приложение | `/opt/partychaos/` |
| База данных (SQLite) | `/opt/partychaos/server/prisma/prod.db` |
| Бэкапы БД | `/opt/partychaos/backups/` |
| Environment | `/opt/partychaos/server/.env` |
| Загруженные аватары | `/opt/partychaos/server/uploads/avatars/` |
| Nginx конфиг | `/etc/nginx/sites-available/partychaos.ru` |
| SSL сертификаты | `/etc/letsencrypt/live/partychaos.ru/` |
| PM2 логи | `~partychaos/.pm2/logs/` |

### Бэкап базы данных

Бэкапы создаются автоматически при каждом `update.sh`. Для ручного бэкапа:

```bash
cp /opt/partychaos/server/prisma/prod.db /opt/partychaos/backups/prod.db.$(date +%Y%m%d_%H%M%S).bak
```

### Восстановление из бэкапа

```bash
# Остановить бэкенд
sudo -u partychaos pm2 stop partychaos

# Восстановить БД
cp /opt/partychaos/backups/prod.db.TIMESTAMP.bak /opt/partychaos/server/prisma/prod.db

# Запустить бэкенд
sudo -u partychaos pm2 start partychaos
```

### Архитектура деплоя

```
┌─────────────────────────────────────────────────────────────┐
│                         Internet                            │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTPS (443)
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                     Nginx (reverse proxy)                   │
│  - SSL termination (Let's Encrypt)                          │
│  - Static files: /opt/partychaos/client/dist               │
│  - Proxy /api/* → localhost:3001                           │
│  - Proxy /socket.io/* → localhost:3001 (WebSocket)         │
│  - Proxy /uploads/* → localhost:3001                       │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTP (3001, localhost only)
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   Node.js Backend (PM2)                     │
│  - Express API (/api/*)                                     │
│  - Socket.IO (WebSocket)                                    │
│  - Prisma ORM                                               │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   SQLite Database                           │
│  /opt/partychaos/server/prisma/prod.db                     │
└─────────────────────────────────────────────────────────────┘
```

### Troubleshooting

**Сайт не открывается:**
1. Проверьте DNS: `dig partychaos.ru +short` должен показать IP вашего VPS
2. Проверьте nginx: `sudo systemctl status nginx`
3. Проверьте firewall: `sudo ufw status` (порты 80, 443 должны быть открыты)

**502 Bad Gateway:**
1. Бэкенд не запущен: `sudo -u partychaos pm2 status`
2. Смотрите логи: `sudo -u partychaos pm2 logs partychaos --lines 50`

**WebSocket не работает (игра не синхронизируется):**
1. Проверьте selftest: `sudo bash /opt/partychaos/deploy/selftest.sh`
2. Убедитесь что nginx проксирует `/socket.io/`

**SSL сертификат не получен:**
1. DNS ещё не обновился — подождите и повторите
2. Порт 80 закрыт — `sudo ufw allow 80`
3. Вручную: `sudo certbot certonly --nginx -d partychaos.ru -d www.partychaos.ru`

**База данных повреждена:**
1. Восстановите из бэкапа (см. выше)
2. Или сбросьте: `cd /opt/partychaos/server && sudo -u partychaos npx prisma migrate reset`

# API Reference

Полный справочник всех API endpoints и Socket.IO событий.

---

## 📡 REST API Endpoints

### Authentication

| Method | Endpoint | Auth | Description | Request | Response |
|--------|----------|------|-------------|---------|----------|
| POST | `/api/auth/register` | ❌ | Регистрация | `{ email, password, nickname }` | `{ user }` |
| POST | `/api/auth/login` | ❌ | Вход | `{ email, password }` | `{ user }` |
| POST | `/api/auth/logout` | ✅ | Выход | — | `{ success: true }` |
| GET | `/api/auth/me` | ✅ | Текущий пользователь | — | `{ user }` |
| GET | `/api/auth/verify-email` | ❌ | Подтверждение email | `?token=...` | Redirect |
| POST | `/api/auth/resend-verification` | ✅ | Повторная отправка письма | — | `{ success: true }` |
| POST | `/api/auth/forgot-password` | ❌ | Запрос сброса пароля | `{ email }` | `{ success: true }` |
| POST | `/api/auth/reset-password` | ❌ | Сброс пароля | `{ token, password }` | `{ success: true }` |

### OAuth

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/auth/discord` | Редирект на Discord OAuth |
| GET | `/api/auth/discord/callback` | Callback от Discord |
| GET | `/api/auth/google` | Редирект на Google OAuth |
| GET | `/api/auth/google/callback` | Callback от Google |

### Profile & Customization

| Method | Endpoint | Auth | Description | Request | Response |
|--------|----------|------|-------------|---------|----------|
| GET | `/api/me` | ✅ | Получить профиль | — | `{ user }` |
| PATCH | `/api/me` | ✅ | Обновить профиль | `{ nickname?, bio?, biography? }` | `{ user }` |
| POST | `/api/me/avatar` | ✅ | Загрузить аватар | `multipart/form-data` | `{ avatarUrl }` |
| GET | `/api/me/customization` | ✅ | Получить кастомизацию | — | `{ customization }` |
| PATCH | `/api/me/customization` | ✅ | Обновить кастомизацию | `{ frameSlug?, nicknameStyle? }` | `{ customization }` |
| GET | `/api/frames` | ❌ | Список рамок аватаров | — | `{ frames: [...] }` |
| GET | `/api/nickname-gradients` | ❌ | Градиенты никнейма | — | `{ gradients: [...] }` |
| GET | `/api/nickname-glows` | ❌ | Свечения никнейма | — | `{ glows: [...] }` |
| GET | `/api/nickname-effects` | ✅ | Эффекты никнейма (PRO) | — | `{ effects: [...] }` |

### Stats & Achievements

| Method | Endpoint | Auth | Description | Request | Response |
|--------|----------|------|-------------|---------|----------|
| GET | `/api/me/stats` | ✅ | Статистика пользователя | — | `{ stats }` |
| GET | `/api/me/achievements` | ✅ | Достижения пользователя | — | `{ achievements: [...] }` |
| GET | `/api/achievements` | ❌ | Все достижения | — | `{ achievements: [...] }` |
| PATCH | `/api/me/achievements/featured` | ✅ | Избранные достижения | `{ achievementIds: [...] }` | `{ featured: [...] }` |

### Subscription

| Method | Endpoint | Auth | Description | Request | Response |
|--------|----------|------|-------------|---------|----------|
| GET | `/api/subscription/status` | ✅ | Статус подписки | — | `{ subscription }` |
| GET | `/api/subscription/plans` | ❌ | Список тарифов | — | `{ plans: [...] }` |
| POST | `/api/subscription/create` | ✅ | Создать подписку | `{ tier, duration }` | `{ paymentUrl }` |
| POST | `/api/subscription/cancel` | ✅ | Отменить подписку | — | `{ success: true }` |
| GET | `/api/subscription/payments/history` | ✅ | История платежей | `{ limit?, offset? }` | `{ payments: [...] }` |
| POST | `/api/subscription/payments/webhook` | ❌ | Webhook от Tribute | Tribute payload | `{ success: true }` |

### Utility

| Method | Endpoint | Auth | Description | Response |
|--------|----------|------|-------------|----------|
| GET | `/api/health` | ❌ | Health check | `{ ok: true }` |
| GET | `/api/wheels` | ❌ | Получить контент колёс ToD | `{ categories: [...] }` |

---

## 🔌 Socket.IO Events

### Connection

| Event | Direction | Description | Payload |
|-------|-----------|-------------|---------|
| `connect` | → Server | Подключение клиента | — |
| `disconnect` | → Server | Отключение клиента | — |
| `error` | ← Server | Ошибка | `{ error: string }` |

---

## 🎮 Truth or Dare (ToD)

### Room Management

| Event | Direction | Description | Payload |
|-------|-----------|-------------|---------|
| `room:create` | → Server | Создать комнату | `{ name, avatarUrl?, visitorId? }` |
| `room:join` | → Server | Присоединиться | `{ code, name, avatarUrl?, visitorId? }` |
| `room:rejoin` | → Server | Переподключиться | `{ playerId, roomCode }` |
| `room:leave` | → Server | Покинуть комнату | — |
| `room:state` | → Server | Запросить состояние | — |
| `room:end` | → Server | Завершить игру | — |
| `player:update_profile` | → Server | Обновить профиль игрока | `{ avatarUrl?, frameSlug?, nicknameStyle? }` |

### Game Flow

| Event | Direction | Description | Payload |
|-------|-----------|-------------|---------|
| `round:start` | → Server | Начать раунд | — |
| `round:mode` | → Server | Выбор "Правда" или "Действие" | `{ mode: "truth" \| "dare" }` |
| `round:custom_decision` | → Server | Кастомное задание | `{ decision: "accept" \| "refuse" }` |
| `round:task_accept` | → Server | Принять задание | — |
| `round:done` | → Server | Задание выполнено | — |
| `round:refuse` | → Server | Отказаться от задания | — |
| `spin:wheel1_start` | → Server | Крутить колесо категорий | — |
| `spin:wheel2_start` | → Server | Крутить колесо заданий | — |
| `vote:cast` | → Server | Проголосовать | `{ vote: "approve" \| "report" }` |

### Admin Controls

| Event | Direction | Description | Payload |
|-------|-----------|-------------|---------|
| `admin:kick` | → Server | Кикнуть игрока (host) | `{ playerId }` |
| `admin:reset_room` | → Server | Сбросить комнату (host) | — |
| `admin:skip_round` | → Server | Пропустить раунд (host) | — |
| `admin:reset_timer` | → Server | Сбросить таймер (host) | — |
| `admin:toggle_pause` | → Server | Пауза/продолжить (host) | — |

### User Binding

| Event | Direction | Description | Payload |
|-------|-----------|-------------|---------|
| `user:bind:visitorId` | → Server | Привязать браузер к аккаунту | `{ visitorId }` |

### Broadcast Events

| Event | Description | Payload |
|-------|-------------|---------|
| `player:list` | Список игроков | `{ players: [...] }` |
| `room:state` | Состояние комнаты | `{ room, players, round, content }` |
| `game:paused` | Игра на паузе | `{ isPaused: boolean }` |
| `round:started` | Раунд начался | `{ round, currentPlayer }` |
| `round:ended` | Раунд завершён | `{ results, nextPlayer }` |
| `player:kicked` | Игрок кикнут | `{ playerId }` |
| `timer:tick` | Тик таймера | `{ secondsLeft }` |
| `player:connection_status` | Статус подключения | `{ playerId, connectionStatus, playerName }` |
| `spin:wheel1_start` | Запуск колеса 1 | `{ roundId, startedAtMs, durationMs, categoryId, index }` |
| `spin:wheel1_result` | Результат колеса 1 | `{ roundId, categoryId, categoryTitle, index }` |
| `spin:wheel2_start` | Запуск колеса 2 | `{ roundId, startedAtMs, durationMs, itemId, index, reelItems? }` |
| `spin:wheel2_result` | Результат колеса 2 | `{ roundId, itemId, itemLabel, itemText, index, reelItems?, startedAtMs?, durationMs? }` |
| `spin:final` | Финальное задание | `{ roundId, finalText, mode?, categoryTitle?, itemText?, forcedMode? }` |
| `round:task_accepted` | Задание принято | `{ roomId, roundId, currentPlayerId, taskAcceptedAt }` |
| `round:task_accept_tick` | Тик таймера принятия | `{ roundId, remaining }` |
| `round:mode_forced` | Режим выбран сервером (chaos) | `{ roundId, mode, currentPlayerId }` |
| `voting:timer_tick` | Тик таймера голосования | `{ roundId, remaining }` |
| `session:replaced` | Сессия заменена | `{ message }` |

---

## 🎯 Alias

### Room Management

| Event | Direction | Description | Payload |
|-------|-----------|-------------|---------|
| `alias:room:create` | → Server | Создать комнату | `{ name, avatarUrl?, settings?, visitorId? }` |
| `alias:room:join` | → Server | Присоединиться | `{ code, name, avatarUrl? }` |
| `alias:room:rejoin` | → Server | Переподключиться | `{ playerId, roomCode }` |
| `alias:room:leave` | → Server | Покинуть комнату | — |
| `alias:player:update_profile` | → Server | Обновить профиль | `{ avatarUrl?, frameSlug?, nicknameStyle? }` |

### Team Management

| Event | Direction | Description | Payload |
|-------|-----------|-------------|---------|
| `alias:teams:create` | → Server | Создать команду | `{ name, color? }` |
| `alias:teams:rename` | → Server | Переименовать команду | `{ teamId, name }` |
| `alias:teams:join` | → Server | Присоединиться к команде | `{ teamId }` |
| `alias:teams:leave` | → Server | Покинуть команду | — |
| `alias:teams:shuffle` | → Server | Перемешать команды | — |

### Game Flow

| Event | Direction | Description | Payload |
|-------|-----------|-------------|---------|
| `alias:settings:update` | → Server | Обновить настройки (host) | `{ difficulty?, turnSeconds?, targetScore?, skipPenalty? }` |
| `alias:ready:set` | → Server | Игрок готов | — |
| `alias:turn:start` | → Server | Начать игру (host) | — |
| `alias:turn:next` | → Server | Слово угадано | — |
| `alias:turn:skip` | → Server | Пропустить слово | — |
| `alias:turn:skipTurn` | → Server | Пропустить ход (host) | — |
| `alias:pause` | → Server | Пауза (host) | — |
| `alias:reset` | → Server | Сбросить игру (host) | — |

### History & Leaderboard

| Event | Direction | Description | Payload |
|-------|-----------|-------------|---------|
| `alias:history:get` | → Server | Получить историю раунда | — |
| `alias:history:update` | → Server | Обновить слово в истории | `{ index, correct }` |
| `alias:cyber:score` | → Server | Отправить CyberRunner счёт | `{ score }` |
| `alias:report:confirm` | → Server | Подтвердить отчёт | — |

### Broadcast Events

| Event | Description | Payload |
|-------|-------------|---------|
| `alias:state:sync` | Синхронизация состояния | `{ room, teams, gameState }` |

---

## 🕵️ Codenames

### Room Management

| Event | Direction | Description | Payload |
|-------|-----------|-------------|---------|
| `codenames:room:create` | → Server | Создать комнату | `{ name, avatarUrl?, visitorId? }` |
| `codenames:room:join` | → Server | Присоединиться | `{ code, name, avatarUrl? }` |
| `codenames:room:rejoin` | → Server | Переподключиться | `{ playerId, roomCode }` |
| `codenames:room:leave` | → Server | Покинуть комнату | — |
| `codenames:room:state` | ← Server | Состояние комнаты | `{ room, players, board, gameState }` |
| `codenames:player:update_profile` | → Server | Обновить профиль | `{ avatarUrl?, frameSlug?, nicknameStyle? }` |

### Team Management

| Event | Direction | Description | Payload |
|-------|-----------|-------------|---------|
| `codenames:team:join` | → Server | Присоединиться к команде | `{ team: "red" \| "blue" }` |
| `codenames:team:rename` | → Server | Переименовать команду | `{ team: "red" \| "blue", name }` |
| `codenames:role:set` | → Server | Выбрать роль | `{ role: "captain" \| "operative" \| "spectator" }` |

### Game Flow

| Event | Direction | Description | Payload |
|-------|-----------|-------------|---------|
| `codenames:game:start` | → Server | Начать игру (host) | — |
| `codenames:game:pause` | → Server | Пауза (host) | — |
| `codenames:game:resume` | → Server | Продолжить (host) | — |
| `codenames:game:reset` | → Server | Сбросить игру (host) | — |
| `codenames:hint:give` | → Server | Дать подсказку (captain) | `{ word, number }` |
| `codenames:hint:edit` | → Server | Редактировать подсказку (captain) | `{ word, number }` |
| `codenames:card:vote` | → Server | Голосовать за карточку | `{ cardId }` |
| `codenames:card:cancelVote` | → Server | Отменить голос | — |
| `codenames:card:reveal` | → Server | Открыть карточку | `{ cardId }` |
| `codenames:turn:end` | → Server | Завершить ход | — |
| `codenames:player:kick` | → Server | Кикнуть игрока (host) | `{ playerId }` |
| `codenames:settings:update` | → Server | Обновить настройки (host) | `{ timerSeconds?, allowHintEdit? }` |

### Broadcast Events

| Event | Description | Payload |
|-------|-------------|---------|
| `codenames:state:sync` | Синхронизация состояния | `{ room, players, board, gameState }` |
| `codenames:timer:tick` | Тик таймера | `{ secondsLeft, phase }` |
| `codenames:card:revealed` | Карточка открыта | `{ cardId, type, team }` |
| `codenames:game:winner` | Победитель | `{ team: "red" \| "blue", score }` |
| `codenames:hint:given` | Подсказка дана | `{ word, number, team }` |
| `codenames:turn:changed` | Смена хода | `{ team: "red" \| "blue" }` |

---

## 🎭 Emotional Intelligence

### Room Management

| Event | Direction | Description | Payload |
|-------|-----------|-------------|---------|
| `emotional:room:create` | → Server | Создать комнату | `{ name, avatarUrl?, visitorId? }` |
| `emotional:room:join` | → Server | Присоединиться | `{ code, name, avatarUrl? }` |
| `emotional:room:rejoin` | → Server | Переподключиться | `{ playerId, roomCode }` |
| `emotional:room:leave` | → Server | Покинуть комнату | — |
| `emotional:room:kick` | → Server | Кикнуть игрока (host) | `{ playerId }` |
| `emotional:room:state` | ← Server | Состояние комнаты | `{ room, players, gameState }` |
| `emotional:player:update_profile` | → Server | Обновить профиль | `{ avatarUrl?, frameSlug?, nicknameStyle? }` |

### Game Flow

| Event | Direction | Description | Payload |
|-------|-----------|-------------|---------|
| `emotional:game:start` | → Server | Начать игру (host) | — |
| `emotional:game:pause` | → Server | Пауза (host) | — |
| `emotional:game:resume` | → Server | Продолжить (host) | — |
| `emotional:game:new` | → Server | Новая игра (host) | — |
| `emotional:round:next` | → Server | Следующий раунд | — |
| `emotional:emotion:select` | → Server | Выбрать эмоцию (leader) | `{ emotion }` |
| `emotional:guess` | → Server | Угадать эмоцию | `{ emotion }` |
| `emotional:vote` | → Server | Проголосовать | `{ playerId }` |
| `emotional:settings:update` | → Server | Обновить настройки (host) | `{ roundSeconds?, votingSeconds? }` |

### Broadcast Events

| Event | Description | Payload |
|-------|-------------|---------|
| `emotional:state:sync` | Синхронизация состояния | `{ room, players, gameState }` |
| `emotional:round:start` | Начало раунда | `{ leaderId, words, emotion }` |
| `emotional:round:end` | Конец раунда | `{ winnerId, emotion, scores }` |
| `emotional:game:winner` | Победитель | `{ playerId, score, totalRounds }` |
| `emotional:timer:tick` | Тик таймера | `{ secondsLeft, phase }` |
| `emotional:player:kicked` | Игрок кикнут | `{ playerId }` |

---

## 👥 Social Features

### Friends

| Event | Direction | Description | Payload |
|-------|-----------|-------------|---------|
| `friends:register` | → Server | Регистрация для уведомлений | — |
| `friends:list` | → Server | Список друзей | — |
| `friends:request:send` | → Server | Отправить заявку | `{ receiverId }` |
| `friends:request:accept` | → Server | Принять заявку | `{ requestId }` |
| `friends:request:reject` | → Server | Отклонить заявку | `{ requestId }` |
| `friends:request:cancel` | → Server | Отменить заявку | `{ requestId }` |
| `friends:requests:pending` | → Server | Входящие заявки | — |
| `friends:requests:sent` | → Server | Исходящие заявки | — |
| `friends:remove` | → Server | Удалить друга | `{ friendId }` |
| `friends:block` | → Server | Заблокировать | `{ userId }` |
| `friends:unblock` | → Server | Разблокировать | `{ userId }` |
| `friends:blocked:list` | → Server | Список заблокированных | — |
| `friends:status` | → Server | Статус друга | `{ userId }` |
| `friends:search` | → Server | Поиск пользователей | `{ query, limit? }` |

#### Broadcast Events

| Event | Description | Payload |
|-------|-------------|---------|
| `friends:list:update` | Обновление списка друзей | `{ friends: [...] }` |
| `friends:request:received` | Получена заявка | `{ request }` |
| `friends:request:accepted` | Заявка принята | `{ friendId }` |
| `friends:status:changed` | Статус друга изменён | `{ userId, status, gameType?, roomCode? }` |
| `friends:removed` | Друг удалён | `{ userId }` |
| `friends:blocked` | Пользователь заблокирован | `{ userId }` |

### Messages

| Event | Direction | Description | Payload |
|-------|-----------|-------------|---------|
| `messages:conversations` | → Server | Список диалогов | `{ limit?, offset? }` |
| `messages:history` | → Server | История сообщений | `{ conversationId, limit?, offset? }` |
| `messages:send` | → Server | Отправить сообщение | `{ receiverId, content, type? }` |
| `messages:read` | → Server | Прочитать сообщения | `{ conversationId }` |
| `messages:readUpTo` | → Server | Прочитать до сообщения | `{ conversationId, messageId }` |
| `messages:unread:count` | → Server | Количество непрочитанных | — |
| `messages:conversation:delete` | → Server | Удалить диалог | `{ conversationId }` |
| `messages:game:invite` | → Server | Приглашение в игру | `{ receiverId, gameType, roomCode }` |

#### Broadcast Events

| Event | Description | Payload |
|-------|-------------|---------|
| `messages:new` | Новое сообщение | `{ message, conversation }` |
| `messages:read` | Сообщения прочитаны | `{ conversationId, readUpTo }` |
| `messages:typing` | Пользователь печатает | `{ conversationId, userId, isTyping }` |
| `messages:unread:updated` | Обновление непрочитанных | `{ count }` |
| `messages:game:invite:received` | Получено приглашение | `{ invite }` |

### Clans

| Event | Direction | Description | Payload |
|-------|-----------|-------------|---------|
| `clans:create` | → Server | Создать клан | `{ name, tag, description?, avatarUrl?, isPublic? }` |
| `clans:delete` | → Server | Удалить клан (leader) | — |
| `clans:update` | → Server | Обновить клан (leader/admin) | `{ name?, description?, isPublic? }` |
| `clans:avatar:update` | → Server | Обновить аватар (leader/admin) | `{ avatarUrl }` |
| `clans:get` | → Server | Получить информацию | `{ clanId }` |
| `clans:my` | → Server | Мой клан | — |
| `clans:search` | → Server | Поиск кланов | `{ query, limit?, offset? }` |
| `clans:popular` | → Server | Популярные кланы | `{ limit?, offset? }` |
| `clans:join` | → Server | Вступить в клан | `{ clanId }` |
| `clans:leave` | → Server | Покинуть клан | — |
| `clans:member:kick` | → Server | Исключить участника (leader/admin) | `{ memberId }` |
| `clans:members` | → Server | Список участников | `{ clanId?, limit?, offset? }` |
| `clans:request:send` | → Server | Заявка на вступление | `{ clanId }` |
| `clans:request:accept` | → Server | Принять заявку (leader/admin) | `{ requestId }` |
| `clans:request:reject` | → Server | Отклонить заявку (leader/admin) | `{ requestId }` |
| `clans:request:cancel` | → Server | Отменить заявку | `{ requestId }` |
| `clans:requests` | → Server | Заявки клана (leader/admin) | `{ limit?, offset? }` |
| `clans:requests:my` | → Server | Мои заявки | — |
| `clans:promote` | → Server | Повысить до админа (leader) | `{ memberId }` |
| `clans:demote` | → Server | Понизить с админа (leader) | `{ memberId }` |
| `clans:transfer` | → Server | Передать лидерство (leader) | `{ memberId }` |
| `clans:message:send` | → Server | Отправить сообщение в чат | `{ content }` |
| `clans:message:delete` | → Server | Удалить сообщение (leader/admin) | `{ messageId }` |
| `clans:report` | → Server | Жалоба на клан | `{ clanId, reason }` |

#### Broadcast Events

| Event | Description | Payload |
|-------|-------------|---------|
| `clans:updated` | Клан обновлён | `{ clan }` |
| `clans:member:joined` | Участник вступил | `{ member }` |
| `clans:member:left` | Участник покинул | `{ memberId }` |
| `clans:member:kicked` | Участник исключён | `{ memberId }` |
| `clans:member:promoted` | Участник повышен | `{ memberId, role }` |
| `clans:member:demoted` | Участник понижен | `{ memberId, role }` |
| `clans:leader:transferred` | Лидерство передано | `{ newLeaderId }` |
| `clans:message:new` | Новое сообщение в чате | `{ message }` |
| `clans:message:deleted` | Сообщение удалено | `{ messageId }` |
| `clans:request:received` | Получена заявка | `{ request }` |

### Profile

| Event | Direction | Description | Payload |
|-------|-----------|-------------|---------|
| `profile:get` | → Server | Получить профиль | `{ userId }` |
| `profile:status:update` | → Server | Обновить статус | `{ status, gameType?, roomCode? }` |
| `profile:note:set` | → Server | Установить заметку о пользователе | `{ userId, note }` |
| `profile:note:get` | → Server | Получить заметку | `{ userId }` |

#### Broadcast Events

| Event | Description | Payload |
|-------|-------------|---------|
| `profile:status:changed` | Статус изменён | `{ userId, status, gameType?, roomCode? }` |
| `profile:updated` | Профиль обновлён | `{ userId, changes }` |

---

## 📊 Stats & Achievements

### Stats

| Event | Direction | Description | Payload |
|-------|-----------|-------------|---------|
| `stats:get` | → Server | Получить статистику | `{ userId? }` |
| `stats:game:get` | → Server | Статистика по игре | `{ gameType, userId? }` |
| `stats:update` | ← Server | Обновление статистики | `{ stats }` |

### Achievements

| Event | Direction | Description | Payload |
|-------|-----------|-------------|---------|
| `achievements:get` | → Server | Получить достижения | `{ userId? }` |
| `achievements:unlock` | ← Server | Достижение разблокировано | `{ achievement }` |
| `achievements:progress` | ← Server | Прогресс достижения | `{ achievementId, progress, total }` |
| `achievements:featured:set` | → Server | Установить избранные | `{ achievementIds: [...] }` |

### Leaderboards

| Event | Direction | Description | Payload |
|-------|-----------|-------------|---------|
| `leaderboard:global` | → Server | Глобальная таблица лидеров | `{ limit?, offset? }` |
| `leaderboard:game` | → Server | Таблица лидеров по игре | `{ gameType, limit?, offset? }` |
| `leaderboard:friends` | → Server | Таблица лидеров друзей | `{ gameType?, limit?, offset? }` |
| `leaderboard:clan` | → Server | Таблица лидеров клана | `{ clanId?, limit?, offset? }` |

---

## 🎨 Customization

### Avatar Frames

| Event | Direction | Description | Payload |
|-------|-----------|-------------|---------|
| `customization:frame:set` | → Server | Установить рамку | `{ frameSlug, gameType? }` |
| `customization:frame:unlock` | ← Server | Рамка разблокирована | `{ frameSlug }` |
| `customization:frames:list` | → Server | Список доступных рамок | — |

### Nickname Styling

| Event | Direction | Description | Payload |
|-------|-----------|-------------|---------|
| `customization:nickname:set` | → Server | Кастомизация никнейма | `{ colorType, customColor?, gradientId?, glowId?, effectId? }` |
| `customization:nickname:preview` | → Server | Превью стиля | `{ colorType, customColor?, gradientId?, glowId?, effectId? }` |
| `customization:nickname:unlock` | ← Server | Стиль разблокирован | `{ type, id }` |

### Profile Widgets

| Event | Direction | Description | Payload |
|-------|-----------|-------------|---------|
| `customization:widget:add` | → Server | Добавить виджет | `{ widgetType, position, config? }` |
| `customization:widget:remove` | → Server | Удалить виджет | `{ widgetId }` |
| `customization:widget:reorder` | → Server | Изменить порядок | `{ widgetIds: [...] }` |
| `customization:widget:update` | → Server | Обновить виджет | `{ widgetId, config }` |

---

## 🔔 Notifications

| Event | Direction | Description | Payload |
|-------|-----------|-------------|---------|
| `notification` | ← Server | Уведомление | `{ type, data, createdAt }` |
| `notification:read` | → Server | Отметить прочитанным | `{ notificationId }` |
| `notification:read:all` | → Server | Отметить все прочитанными | — |
| `notification:list` | → Server | Список уведомлений | `{ limit?, offset?, unreadOnly? }` |
| `notification:count` | → Server | Количество непрочитанных | — |

**Типы уведомлений:**
- `friend_request` — заявка в друзья
- `friend_accepted` — заявка принята
- `friend_online` — друг онлайн
- `message` — новое сообщение
- `clan_invite` — приглашение в клан
- `clan_request` — заявка на вступление в клан
- `clan_accepted` — заявка в клан принята
- `clan_kicked` — исключение из клана
- `clan_promoted` — повышение роли
- `clan_demoted` — понижение роли
- `game_invite` — приглашение в игру
- `achievement_unlocked` — достижение разблокировано
- `level_up` — повышение уровня
- `subscription_expiring` — подписка истекает
- `subscription_expired` — подписка истекла

---

## 📝 Response Formats

### User Object

```json
{
  "id": "string",
  "email": "string",
  "nickname": "string",
  "tag": "string",
  "avatarUrl": "string?",
  "bio": "string?",
  "biography": "string?",
  "emailVerifiedAt": "datetime?",
  "xp": "number",
  "level": "number",
  "loginStreak": "number",
  "onlineStatus": "online | idle | in_game | offline",
  "currentGame": {
    "type": "tod | alias | codenames | emotional",
    "roomCode": "string"
  },
  "subscription": {
    "tier": "vip | pro",
    "expiresAt": "datetime"
  },
  "customization": {
    "frameSlug": "string?",
    "nicknameStyle": {
      "colorType": "solid | gradient | custom",
      "customColor": "string?",
      "gradientId": "string?",
      "glowId": "string?",
      "effectId": "string?"
    }
  }
}
```

### Room Object (ToD)

```json
{
  "id": "string",
  "code": "string",
  "hostId": "string",
  "players": [
    {
      "id": "string",
      "name": "string",
      "avatarUrl": "string?",
      "frameSlug": "string?",
      "nicknameStyle": "object?",
      "status": "active | shamed | chaos | disqualified",
      "strikes": "number",
      "isHost": "boolean"
    }
  ],
  "settings": {
    "timerSeconds": "number",
    "allowSkip": "boolean",
    "maxPlayers": "number"
  },
  "round": {
    "number": "number",
    "currentPlayerId": "string",
    "mode": "truth | dare",
    "task": "string",
    "category": "string",
    "phase": "spinning | voting | executing",
    "votes": {
      "approve": "number",
      "report": "number"
    }
  }
}
```

### Clan Object

```json
{
  "id": "string",
  "name": "string",
  "tag": "string",
  "description": "string?",
  "avatarUrl": "string?",
  "leaderId": "string",
  "isPublic": "boolean",
  "memberCount": "number",
  "maxMembers": "number",
  "level": "number",
  "xp": "number",
  "createdAt": "datetime",
  "members": [
    {
      "userId": "string",
      "role": "leader | admin | member",
      "joinedAt": "datetime"
    }
  ]
}
```

### Message Object

```json
{
  "id": "string",
  "conversationId": "string",
  "senderId": "string",
  "content": "string",
  "type": "text | game_invite | system",
  "metadata": "object?",
  "readAt": "datetime?",
  "createdAt": "datetime"
}
```

### Achievement Object

```json
{
  "id": "string",
  "slug": "string",
  "name": "string",
  "description": "string",
  "iconUrl": "string",
  "category": "games | social | progression | special",
  "rarity": "common | rare | epic | legendary",
  "xpReward": "number",
  "unlockedAt": "datetime?",
  "progress": {
    "current": "number",
    "total": "number"
  }
}
```

### Stats Object

```json
{
  "userId": "string",
  "global": {
    "gamesPlayed": "number",
    "gamesWon": "number",
    "winRate": "number",
    "totalPlaytime": "number",
    "favoriteGame": "string"
  },
  "tod": {
    "gamesPlayed": "number",
    "truthsCompleted": "number",
    "daresCompleted": "number",
    "tasksRefused": "number",
    "votesReceived": "number"
  },
  "alias": {
    "gamesPlayed": "number",
    "wordsGuessed": "number",
    "wordsSkipped": "number",
    "highestScore": "number",
    "cyberRunnerBest": "number"
  },
  "codenames": {
    "gamesPlayed": "number",
    "gamesWon": "number",
    "hintsGiven": "number",
    "cardsRevealed": "number",
    "perfectGames": "number"
  },
  "emotional": {
    "gamesPlayed": "number",
    "emotionsGuessed": "number",
    "roundsWon": "number",
    "perfectRounds": "number"
  }
}
```

### Error Response

```json
{
  "error": "string",
  "code": "string?",
  "details": "object?"
}
```

---

## 🔒 Authentication

### Session Cookie

- **Name**: `connect.sid`
- **HttpOnly**: `true`
- **Secure**: `true` (production)
- **SameSite**: `Lax`
- **Max-Age**: 30 days

### Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/auth/login` | 10 requests | 15 minutes |
| `/api/auth/register` | 10 requests | 15 minutes |
| `/api/auth/resend-verification` | 5 requests | 1 hour |
| `/api/auth/forgot-password` | 5 requests | 1 hour |

---

## 📌 Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 429 | Too Many Requests |
| 500 | Internal Server Error |

---

## 🔍 Query Parameters

### Pagination

```
?limit=20&offset=0
```

### Filtering

```
?gameType=alias&status=active
```

### Sorting

```
?sortBy=createdAt&order=desc
```

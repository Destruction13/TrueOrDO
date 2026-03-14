# Социальные функции

## 👥 Обзор

PartyChaos включает полноценную социальную систему:
- Друзья (заявки, принятие, удаление)
- Приватные чаты между пользователями
- Кланы (создание, управление, чат)
- Профили пользователей
- Онлайн-статус

---

## 🤝 Система друзей

### Отправка заявки

**Socket:** `social:friends:send`

**Payload:**
```json
{
  "receiverId": "user-id"
}
```

**Процесс:**
1. Проверка блокировки
2. Проверка существующей дружбы
3. Проверка существующей заявки
4. Создание заявки
5. Уведомление получателя

**Rate Limiting:** 10 запросов в минуту

**Audit Logging:** Логируется событие FRIEND_REQUEST_SENT

---

### Принятие заявки

**Socket:** `social:friends:accept`

**Payload:**
```json
{
  "requestId": "request-id"
}
```

**Процесс:**
1. Проверка заявки
2. Создание дружбы (двусторонняя связь)
3. Удаление заявки
4. Уведомление отправителя
5. Разблокировка достижения "Первый друг"

**Rate Limiting:** 10 запросов в минуту

**Audit Logging:** Логируется событие FRIEND_REQUEST_ACCEPTED

---

### Отклонение заявки

**Socket:** `social:friends:reject`

**Payload:**
```json
{
  "requestId": "request-id"
}
```

**Процесс:**
1. Проверка заявки
2. Обновление статуса заявки на "rejected"
3. Уведомление отправителя

**Rate Limiting:** 10 запросов в минуту

**Audit Logging:** Логируется событие FRIEND_REQUEST_REJECTED

---

### Отмена заявки

**Socket:** `social:friends:cancel`

**Payload:**
```json
{
  "requestId": "request-id"
}
```

**Процесс:**
1. Проверка заявки
2. Удаление заявки
3. Уведомление получателя

**Rate Limiting:** 10 запросов в минуту

**Audit Logging:** Логируется событие FRIEND_REQUEST_CANCELLED

---

### Удаление друга

**Socket:** `social:friends:remove`

**Payload:**
```json
{
  "friendId": "user-id"
}
```

**Rate Limiting:** 10 запросов в минуту

**Audit Logging:** Логируется событие FRIEND_REMOVED

---

### Блокировка пользователя

**Socket:** `social:user:block`

**Payload:**
```json
{
  "userId": "user-id"
}
```

**Эффект:**
- Удаление дружбы (если была)
- Удаление заявок
- Невозможность отправить заявку
- Невозможность писать в чат

---

## 💬 Приватные чаты

### Отправка сообщения

**Socket:** `social:chat:send`

**Payload:**
```json
{
  "receiverId": "user-id",
  "content": "Привет!"
}
```

**Процесс:**
1. Проверка блокировки
2. Поиск/создание Conversation
3. Создание Message
4. Отправка уведомления получателю

---

### Получение сообщений

**Socket:** `social:chat:messages`

**Payload:**
```json
{
  "conversationId": "conversation-id",
  "limit": 50,
  "offset": 0
}
```

**Response:**
```json
{
  "messages": [
    {
      "id": "message-id",
      "senderId": "user-id",
      "content": "Привет!",
      "isRead": false,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### Прочитать сообщения

**Socket:** `social:chat:read`

**Payload:**
```json
{
  "conversationId": "conversation-id"
}
```

**Эффект:**
Все непрочитанные сообщения помечаются как прочитанные.

---

## 🏰 Кланы

### Создание клана

**Socket:** `social:clan:create`

**Payload:**
```json
{
  "name": "Название клана",
  "tag": "TAG",
  "description": "Описание",
  "isPublic": true
}
```

**Валидация:**
- Название: 3-30 символов
- Тег: 2-5 символов, уникальный
- Описание: до 500 символов

---

### Вступление в клан

**Socket:** `social:clan:join`

**Payload:**
```json
{
  "clanId": "clan-id"
}
```

**Процесс:**
1. Проверка существования клана
2. Проверка публичности (если приватный — создать заявку)
3. Создание ClanMember
4. Уведомление членов клана

---

### Чат клана

**Socket:** `social:clan:chat`

**Payload:**
```json
{
  "content": "Сообщение в чат клана"
}
```

**Broadcast:** Всем членам клана

---

### Управление кланом

**Роли:**
- **Owner** — владелец (полные права)
- **Admin** — администратор (управление членами)
- **Member** — участник (только чат)

**Права Owner:**
- Изменение названия, описания, аватара
- Назначение/снятие админов
- Кик участников
- Удаление клана

**Права Admin:**
- Кик участников
- Принятие/отклонение заявок

---

## 👤 Профили пользователей

### Публичный профиль

**Socket:** `social:profile:get`

**Payload:**
```json
{
  "userId": "user-id"
}
```

**Response:**
```json
{
  "user": {
    "id": "user-id",
    "nickname": "Player1",
    "tag": "0001",
    "avatarUrl": "/uploads/avatars/avatar.jpg",
    "bio": "Биография",
    "level": 5,
    "onlineStatus": "online",
    "currentGameType": "alias",
    "stats": {
      "gamesPlayed": 100,
      "gamesWon": 50
    },
    "achievements": [
      {
        "slug": "first_game",
        "level": 1,
        "unlockedAt": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

---

### Онлайн-статус

**Статусы:**
- `online` — онлайн
- `idle` — неактивен (5 минут без активности)
- `in_game` — в игре
- `offline` — оффлайн

**Обновление статуса:**
```javascript
// При подключении Socket.IO
socket.on("connect", () => {
  socket.emit("social:status:update", { status: "online" });
});

// При входе в игру
socket.emit("social:status:update", {
  status: "in_game",
  gameType: "alias",
  roomCode: "ABC123"
});
```

---

## 🔔 Уведомления

### Типы уведомлений

- `friend_request` — заявка в друзья
- `friend_accepted` — заявка принята
- `message` — новое сообщение
- `clan_invite` — приглашение в клан
- `clan_request` — заявка в клан
- `game_invite` — приглашение в игру

### Отправка уведомления

```javascript
// Серверная сторона
io.to(userId).emit("notification", {
  type: "friend_request",
  data: {
    senderId: "user-id",
    senderNickname: "Player1",
    senderAvatarUrl: "/uploads/avatars/avatar.jpg"
  },
  createdAt: new Date().toISOString()
});
```

---

## 📊 Компоненты

### Друзья

- `FriendsTab.jsx` — вкладка друзей
- `FriendCard.jsx` — карточка друга
- `FriendRequestCard.jsx` — карточка заявки
- `AddFriendModal.jsx` — модал добавления друга

### Чаты

- `ChatsTab.jsx` — вкладка чатов
- `ConversationList.jsx` — список чатов
- `ChatWindow.jsx` — окно чата
- `MessageBubble.jsx` — сообщение

### Кланы

- `ClansTab.jsx` — вкладка кланов
- `MyClanCard.jsx` — карточка моего клана
- `ClanSearchCard.jsx` — карточка клана в поиске
- `ClanModal.jsx` — модал клана
- `ClanChatWindow.jsx` — чат клана
- `ClanMemberCard.jsx` — карточка участника
- `ClanSettingsModal.jsx` — настройки клана

---

## 🔒 Приватность

### Блокировка

Заблокированный пользователь:
- Не видит ваш онлайн-статус
- Не может отправить заявку в друзья
- Не может писать в чат
- Не видит вас в поиске

### Приватные кланы

Приватный клан:
- Не отображается в поиске
- Вступление только по приглашению
- Заявки на вступление отключены


---

## 🔐 Безопасность и Rate Limiting

### Rate Limiting

Все Socket.IO обработчики друзей защищены rate limiting:

- **Лимит:** 10 запросов в минуту на пользователя
- **Окно:** 60 секунд
- **Действия:** `friends:send`, `friends:accept`, `friends:reject`, `friends:cancel`, `friends:remove`

При превышении лимита:
```json
{
  "success": false,
  "error": "Слишком много запросов. Попробуйте позже."
}
```

### Audit Logging

Все критические действия логируются для безопасности:

**Логируемые события:**
- `FRIEND_REQUEST_SENT` - отправка заявки в друзья
- `FRIEND_REQUEST_ACCEPTED` - принятие заявки
- `FRIEND_REQUEST_REJECTED` - отклонение заявки
- `FRIEND_REQUEST_CANCELLED` - отмена заявки
- `FRIEND_REMOVED` - удаление из друзей
- `RATE_LIMIT_EXCEEDED` - превышение лимита запросов

**Формат лога:**
```javascript
{
  timestamp: "2026-01-15T10:30:00.000Z",
  action: "FRIEND_REQUEST_SENT",
  userId: "user-id",
  receiverId: "target-user-id",
  requestId: "request-id"
}
```

---

## 📁 Архитектура модулей

### Серверные модули

**`server/src/social/friends.js`**
- Бизнес-логика управления друзьями
- Функции: `sendFriendRequest`, `acceptFriendRequest`, `rejectFriendRequest`, `cancelFriendRequest`, `removeFriend`
- Работа с БД через Prisma

**`server/src/social/friendsHandlers.js`** ⭐ NEW
- Socket.IO обработчики для событий друзей
- Rate limiting для защиты от спама
- Audit logging для безопасности
- Регистрация через `registerFriendsHandlers(socket, io, prisma)`

**`server/src/social/profile.js`**
- Обработчик `profile:note:set` для заметок о друзьях
- Использует upsert для предотвращения дубликатов

### Интеграция

Обработчики регистрируются в `server/src/index.js`:

```javascript
const { registerFriendsHandlers } = require("./social/friendsHandlers");

// В обработчике connection
registerFriendsHandlers(socket, io, prisma);
```

---

## 🗄️ База данных

### Модель FriendRequest

```prisma
model FriendRequest {
  id         String   @id @default(cuid())
  senderId   String
  receiverId String
  status     String   @default("pending")
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  
  sender   User @relation("SentFriendRequests")
  receiver User @relation("ReceivedFriendRequests")
  
  @@unique([senderId, receiverId])
  @@index([senderId])
  @@index([receiverId])
  @@index([status])
}
```

### Модель UserNote

```prisma
model UserNote {
  id          String   @id @default(cuid())
  userId      String
  targetUserId String
  note        String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  user       User @relation("UserNotes")
  targetUser User @relation("UserNotesAbout")
  
  @@unique([userId, targetUserId])
  @@index([userId])
}
```

---

## ✅ Чеклист реализации

- [x] Обработчик `profile:note:set` работает с upsert
- [x] Функции друзей существуют в `friends.js`
- [x] Socket.IO обработчики `social:friends:accept`
- [x] Socket.IO обработчики `social:friends:reject`
- [x] Socket.IO обработчики `social:friends:cancel`
- [x] Модель FriendRequest с индексами
- [x] Rate limiting (10 запросов/минуту)
- [x] Audit logging для событий безопасности
- [x] Все обработчики используют acknowledgements
- [x] Русский язык для UI текстов
- [x] Английский для кода

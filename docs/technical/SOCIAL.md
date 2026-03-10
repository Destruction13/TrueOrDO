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

---

### Удаление друга

**Socket:** `social:friends:remove`

**Payload:**
```json
{
  "friendId": "user-id"
}
```

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

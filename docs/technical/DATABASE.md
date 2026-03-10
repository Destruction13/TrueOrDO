# База данных

## 🗄️ Обзор

Проект использует **SQLite** в качестве базы данных и **Prisma ORM** для работы с ней.

### Основные характеристики

- **СУБД**: SQLite 3
- **ORM**: Prisma 5.7.1
- **Файл БД (dev)**: `server/prisma/dev.db`
- **Файл БД (prod)**: `server/prisma/prod.db`
- **Схема**: `server/prisma/schema.prisma` (~1200 строк)
- **Количество моделей**: 40+

---

## 📊 Структура базы данных

### Категории моделей

1. **Auth Models** — аутентификация и пользователи
2. **Game Models** — игровые комнаты и раунды
3. **Alias Models** — игра Alias
4. **Codenames Models** — игра Codenames
5. **Emotional Models** — игра Emotional Intelligence
6. **Customization Models** — кастомизация профиля
7. **Subscription Models** — подписка и платежи
8. **Social Models** — друзья, чаты, кланы
9. **Stats Models** — статистика и достижения

---

## 1. Auth Models

### User

Основная модель пользователя.

```prisma
model User {
  id              String    @id @default(cuid())
  email           String    @unique
  passwordHash    String?   // Опционально для OAuth
  emailVerifiedAt DateTime?
  nickname        String?
  tag             String?   // Уникальный 4-значный тег (#0001-#9999)
  avatarUrl       String?
  bio             String?
  biography       String?   // Длинная биография (до 500 символов)
  visitorId       String?   // Привязка к браузеру/устройству
  
  // OAuth провайдеры
  discordId       String?   @unique
  discordUsername String?
  googleId        String?   @unique
  
  // Онлайн-статус
  onlineStatus    String    @default("offline")
  lastSeenAt      DateTime?
  currentGameType String?
  currentRoomCode String?
  
  // Геймификация
  xp              Int       @default(0)
  level           Int       @default(1)
  loginStreak     Int       @default(0)
  lastLoginDate   DateTime?
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}
```

### Session

Сессии пользователей (для express-session).

```prisma
model Session {
  id        String   @id @default(cuid())
  sid       String   @unique
  userId    String
  data      String   // JSON session data
  expiresAt DateTime
  createdAt DateTime @default(now())
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```


### EmailVerificationToken

Токены для подтверждения email.

```prisma
model EmailVerificationToken {
  id        String    @id @default(cuid())
  userId    String
  tokenHash String    @unique
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime  @default(now())
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

### PasswordResetToken

Токены для восстановления пароля.

```prisma
model PasswordResetToken {
  id        String    @id @default(cuid())
  userId    String
  tokenHash String    @unique
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime  @default(now())
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

---

## 2. Game Models (Truth or Dare)

### Room

Комната игры "Правда или Действие".

```prisma
model Room {
  id            String    @id @default(cuid())
  code          String    @unique
  createdAt     DateTime  @default(now())
  gameStartedAt DateTime?
  hostId        String
  settings      String    @default("{}")
  
  players Player[]
  rounds  Round[]
}
```

### Player

Игрок в комнате.

```prisma
model Player {
  id                  String   @id @default(cuid())
  roomId              String
  name                String
  avatarUrl           String?
  frameSlug           String?
  nicknameStyle       String?  // JSON
  visitorId           String?
  status              String   @default("active")
  connectionStatus    String   @default("online")
  strikes             Int      @default(0)
  shameTitle          String?
  shameClearProgress  Int      @default(0)
  chaosClearProgress  Int      @default(0)
  truthStreak         Int      @default(0)
  dareStreak          Int      @default(0)
  joinedAt            DateTime @default(now())
  lastSeen            DateTime @default(now())
  
  room Room @relation(fields: [roomId], references: [id], onDelete: Cascade)
}
```

### Round

Раунд игры.

```prisma
model Round {
  id              String   @id @default(cuid())
  roomId          String
  startedAt       DateTime @default(now())
  endedAt         DateTime?
  currentPlayerId String?
  turnPlayerId    String?
  mode            String?
  timerSeconds    Int
  phase           String   @default("idle")
  taskStatus      String   @default("pending")
  taskAcceptedAt  DateTime?
  result          String?
  
  room  Room   @relation(fields: [roomId], references: [id], onDelete: Cascade)
  spins Spin[]
  votes Vote[]
}
```

---

## 3. Alias Models

### AliasRoom

Комната игры Alias.

```prisma
model AliasRoom {
  id                  String    @id @default(cuid())
  code                String    @unique
  hostId              String
  status              String    @default("lobby")
  settings            String    @default("{}")
  currentTeamId       String?
  currentExplainerId  String?
  turnStartedAt       DateTime?
  turnEndsAt          DateTime?
  currentWordId       String?
  deck                String    @default("[]")
  usedWordIds         String    @default("[]")
  createdAt           DateTime  @default(now())
  gameStartedAt       DateTime?
  
  teams   AliasTeam[]
  players AliasPlayer[]
}
```

### AliasTeam

Команда в Alias.

```prisma
model AliasTeam {
  id        String   @id @default(cuid())
  roomId    String
  name      String
  score     Int      @default(0)
  turnOrder Int      @default(0)
  creatorId String?
  createdAt DateTime @default(now())
  
  room    AliasRoom     @relation(fields: [roomId], references: [id], onDelete: Cascade)
  members AliasPlayer[]
}
```

### AliasPlayer

Игрок в Alias.

```prisma
model AliasPlayer {
  id               String   @id @default(cuid())
  roomId           String
  visitorId        String?
  name             String
  avatarUrl        String?
  frameSlug        String?
  nicknameStyle    String?
  teamId           String?
  isReady          Boolean  @default(false)
  isSpectator      Boolean  @default(false)
  connectionStatus String   @default("online")
  explainOrder     Int      @default(0)
  joinedAt         DateTime @default(now())
  lastSeen         DateTime @default(now())
  
  room AliasRoom  @relation(fields: [roomId], references: [id], onDelete: Cascade)
  team AliasTeam? @relation(fields: [teamId], references: [id], onDelete: SetNull)
}
```

### AliasWord

Слова для игры Alias.

```prisma
model AliasWord {
  id         String   @id @default(cuid())
  text       String
  difficulty String   // "easy" | "normal" | "hard"
  isActive   Boolean  @default(true)
  createdAt  DateTime @default(now())
  
  @@unique([text, difficulty])
  @@index([difficulty, isActive])
}
```

---

## 4. Codenames Models

### CodenamesRoom

Комната игры Codenames.

```prisma
model CodenamesRoom {
  id                String    @id @default(cuid())
  code              String    @unique
  hostId            String
  status            String    @default("lobby")
  currentTeam       String?   // "red" | "blue"
  phase             String    @default("lobby")
  hint              String?   // JSON: { word, number }
  guessesLeft       Int       @default(0)
  redScore          Int       @default(0)
  blueScore         Int       @default(0)
  redTarget         Int       @default(9)
  blueTarget        Int       @default(8)
  turnStartedAt     DateTime?
  turnEndsAt        DateTime?
  createdAt         DateTime  @default(now())
  gameStartedAt     DateTime?
  
  players CodenamesPlayer[]
  cards   CodenamesCard[]
}
```

### CodenamesPlayer

Игрок в Codenames.

```prisma
model CodenamesPlayer {
  id               String   @id @default(cuid())
  roomId           String
  visitorId        String?
  name             String
  avatarUrl        String?
  frameSlug        String?
  nicknameStyle    String?
  team             String?  // "red" | "blue" | null
  role             String   @default("operative")
  connectionStatus String   @default("online")
  joinedAt         DateTime @default(now())
  lastSeen         DateTime @default(now())
  
  room CodenamesRoom @relation(fields: [roomId], references: [id], onDelete: Cascade)
}
```

### CodenamesCard

Карточка на поле Codenames.

```prisma
model CodenamesCard {
  id        String   @id @default(cuid())
  roomId    String
  word      String
  type      String   // "red" | "blue" | "neutral" | "assassin"
  position  Int      // 0-24
  revealed  Boolean  @default(false)
  pending   Boolean  @default(false)
  createdAt DateTime @default(now())
  
  room CodenamesRoom @relation(fields: [roomId], references: [id], onDelete: Cascade)
}
```

---

## 5. Emotional Models

### EmotionalRoom

Комната игры Emotional Intelligence.

```prisma
model EmotionalRoom {
  id                String    @id @default(cuid())
  code              String    @unique
  hostId            String
  status            String    @default("lobby")
  phase             String    @default("lobby")
  currentLeaderId   String?
  currentEmotion    String?
  words             String?   // JSON массив слов
  roundNumber       Int       @default(0)
  createdAt         DateTime  @default(now())
  gameStartedAt     DateTime?
  
  players EmotionalPlayer[]
}
```

### EmotionalPlayer

Игрок в Emotional Intelligence.

```prisma
model EmotionalPlayer {
  id               String   @id @default(cuid())
  roomId           String
  visitorId        String?
  name             String
  avatarUrl        String?
  frameSlug        String?
  nicknameStyle    String?
  score            Int      @default(0)
  position         Int      @default(0)
  connectionStatus String   @default("online")
  joinedAt         DateTime @default(now())
  lastSeen         DateTime @default(now())
  
  room EmotionalRoom @relation(fields: [roomId], references: [id], onDelete: Cascade)
}
```

---

## 6. Customization Models

### Frame

Рамки для аватаров.

```prisma
model Frame {
  id         String   @id @default(cuid())
  name       String
  slug       String   @unique
  game       String   @default("all")
  accessType String   @default("free")
  price      Float?
  sortOrder  Int      @default(0)
  isActive   Boolean  @default(true)
  createdAt  DateTime @default(now())
}
```

### UserCustomization

Кастомизация пользователя.

```prisma
model UserCustomization {
  id                  String   @id @default(cuid())
  userId              String   @unique
  frameAll            String?
  frameCodenames      String?
  frameAlias          String?
  frameTod            String?
  frameEmotional      String?
  nicknameColorType   String   @default("basic")
  nicknameCustomColor String?
  nicknameGradientId  String?
  nicknameGlowId      String?
  nicknameEffectId    String?
  updatedAt           DateTime @updatedAt
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

---

## 7. Subscription Models

### Subscription

Подписка пользователя.

```prisma
model Subscription {
  id        String    @id @default(cuid())
  userId    String    @unique
  tier      String    // "vip" | "pro"
  status    String    @default("active")
  startsAt  DateTime
  expiresAt DateTime
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

### Payment

Платёж.

```prisma
model Payment {
  id              String    @id @default(cuid())
  userId          String
  amount          Float
  currency        String    @default("RUB")
  status          String    @default("pending")
  paymentMethod   String?
  externalId      String?   @unique
  metadata        String?   // JSON
  createdAt       DateTime  @default(now())
  completedAt     DateTime?
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

---

## 8. Social Models

### Friendship

Дружба между пользователями.

```prisma
model Friendship {
  id        String   @id @default(cuid())
  userId    String
  friendId  String
  createdAt DateTime @default(now())
  
  user   User @relation("UserFriends", fields: [userId], references: [id], onDelete: Cascade)
  friend User @relation("FriendOf", fields: [friendId], references: [id], onDelete: Cascade)
  
  @@unique([userId, friendId])
}
```

### FriendRequest

Заявка в друзья.

```prisma
model FriendRequest {
  id         String   @id @default(cuid())
  senderId   String
  receiverId String
  status     String   @default("pending")
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  
  sender   User @relation("SentFriendRequests", fields: [senderId], references: [id], onDelete: Cascade)
  receiver User @relation("ReceivedFriendRequests", fields: [receiverId], references: [id], onDelete: Cascade)
  
  @@unique([senderId, receiverId])
}
```

### Conversation

Приватный чат между двумя пользователями.

```prisma
model Conversation {
  id           String   @id @default(cuid())
  participant1 String
  participant2 String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  user1    User      @relation("ConversationParticipant1", fields: [participant1], references: [id], onDelete: Cascade)
  user2    User      @relation("ConversationParticipant2", fields: [participant2], references: [id], onDelete: Cascade)
  messages Message[]
  
  @@unique([participant1, participant2])
}
```

### Message

Сообщение в чате.

```prisma
model Message {
  id             String   @id @default(cuid())
  conversationId String
  senderId       String
  content        String
  isRead         Boolean  @default(false)
  createdAt      DateTime @default(now())
  
  conversation Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  sender       User         @relation("SentMessages", fields: [senderId], references: [id], onDelete: Cascade)
}
```

### Clan

Клан.

```prisma
model Clan {
  id          String   @id @default(cuid())
  name        String
  tag         String   @unique
  description String?
  avatarUrl   String?
  ownerId     String
  isPublic    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  owner    User          @relation("ClanOwner", fields: [ownerId], references: [id], onDelete: Cascade)
  members  ClanMember[]
  messages ClanMessage[]
  requests ClanRequest[]
}
```

---

## 9. Stats Models

### UserGameStats

Статистика игр пользователя.

```prisma
model UserGameStats {
  id           String   @id @default(cuid())
  userId       String
  gameType     String   // "tod" | "alias" | "codenames" | "emotional"
  gamesPlayed  Int      @default(0)
  gamesWon     Int      @default(0)
  totalTime    Int      @default(0)
  metadata     String?  // JSON с дополнительными метриками
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([userId, gameType])
}
```

### Achievement

Достижение.

```prisma
model Achievement {
  id          String   @id @default(cuid())
  slug        String   @unique
  name        String
  description String
  icon        String?
  category    String   // "tod" | "alias" | "codenames" | "emotional" | "social" | "general"
  maxLevel    Int      @default(1)
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  
  userAchievements UserAchievement[]
}
```

### UserAchievement

Достижение пользователя.

```prisma
model UserAchievement {
  id            String   @id @default(cuid())
  userId        String
  achievementId String
  level         Int      @default(1)
  progress      Int      @default(0)
  unlockedAt    DateTime @default(now())
  
  user        User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  achievement Achievement @relation(fields: [achievementId], references: [id], onDelete: Cascade)
  
  @@unique([userId, achievementId])
}
```

---

## 🔧 Prisma команды

### Миграции

```bash
# Создать миграцию
npx prisma migrate dev --name migration_name

# Применить миграции (production)
npx prisma migrate deploy

# Сбросить БД (удалить все данные)
npx prisma migrate reset

# Статус миграций
npx prisma migrate status
```

### Seed

```bash
# Загрузить seed-контент
npm run db:seed
```

### Prisma Studio

```bash
# Открыть GUI для просмотра БД
npx prisma studio
```

### Генерация клиента

```bash
# Сгенерировать Prisma Client
npx prisma generate
```

---

## 📈 Индексы

Для оптимизации запросов созданы индексы:

- `User`: `nickname`, `tag`, `nickname + tag`
- `Session`: `expiresAt`
- `AliasWord`: `difficulty + isActive`
- `Frame`: `game + isActive`, `accessType`
- `UserGameStats`: `userId + gameType`
- `UserAchievement`: `userId + achievementId`

---

## 🔄 Миграции

История миграций хранится в `server/prisma/migrations/`.

Каждая миграция содержит:
- `migration.sql` — SQL команды
- Timestamp в названии папки

Пример:
```
migrations/
├── 20240101000000_init/
│   └── migration.sql
├── 20240102000000_add_clans/
│   └── migration.sql
└── 20240103000000_add_achievements/
    └── migration.sql
```


---

## 10. Profile Models

### UserProfileGame

Игры, отображаемые в профиле пользователя (избранные игры).

```prisma
model UserProfileGame {
  id        String   @id @default(cuid())
  userId    String
  gameType  String   // "tod", "alias", "codenames", "emotional"
  position  Int      // Порядок отображения (0-3)
  isVisible Boolean  @default(true)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([userId, gameType])
  @@index([userId])
}
```

**Особенности:**
- Пользователь может выбрать до 4 игр для отображения в профиле
- `position` определяет порядок отображения (0 = первая)
- `isVisible` позволяет скрыть игру без удаления

### UserProfileWidget

Виджеты профиля (Discord-style доска профиля).

```prisma
model UserProfileWidget {
  id         String   @id @default(cuid())
  userId     String
  widgetType String   // "stats", "achievements", "friends", "activity", "clan", "custom"
  position   Int      // Порядок отображения
  config     String?  // JSON конфигурация виджета
  isVisible  Boolean  @default(true)
  
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId])
}
```

**Типы виджетов:**
- `stats` — статистика игр
- `achievements` — достижения
- `friends` — список друзей
- `activity` — последняя активность
- `clan` — информация о клане
- `custom` — кастомный виджет (текст, изображение)

**Конфигурация (JSON):**
```json
{
  "title": "Мои достижения",
  "showCount": 6,
  "sortBy": "rarity",
  "backgroundColor": "#1a1a2e"
}
```

### UserActivity

История активности пользователя (Discord-style).

```prisma
model UserActivity {
  id           String   @id @default(cuid())
  userId       String
  activityType String   // "game_played", "achievement_unlocked", "friend_added", "clan_joined", "level_up"
  gameType     String?  // Тип игры (если activityType = "game_played")
  metadata     String?  // JSON метаданные активности
  
  createdAt    DateTime @default(now())
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId, createdAt])
}
```

**Типы активности:**
- `game_played` — сыграна игра
- `achievement_unlocked` — разблокировано достижение
- `friend_added` — добавлен друг
- `clan_joined` — вступление в клан
- `clan_left` — выход из клана
- `level_up` — повышение уровня
- `subscription_purchased` — покупка подписки

**Метаданные (JSON):**
```json
{
  "gameType": "alias",
  "roomCode": "ABC123",
  "score": 42,
  "duration": 600,
  "players": 6
}
```

### UserNote

Приватные заметки о других пользователях.

```prisma
model UserNote {
  id        String   @id @default(cuid())
  userId    String   // Кто создал заметку
  targetId  String   // О ком заметка
  note      String   // Текст заметки (до 500 символов)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  user   User @relation("UserNotes", fields: [userId], references: [id], onDelete: Cascade)
  target User @relation("NotesAboutUser", fields: [targetId], references: [id], onDelete: Cascade)
  
  @@unique([userId, targetId])
  @@index([userId])
}
```

**Особенности:**
- Заметки видны только создателю
- Используются для запоминания информации о других игроках
- Отображаются в мини-профиле и полном профиле
- Можно редактировать и удалять

### UserSession

Сессии активности пользователя (Discord-style "Playing...").

```prisma
model UserSession {
  id          String    @id @default(cuid())
  userId      String
  sessionType String    // "game", "idle", "custom"
  gameType    String?   // Тип игры (если sessionType = "game")
  roomCode    String?   // Код комнаты (если sessionType = "game")
  status      String?   // Кастомный статус (если sessionType = "custom")
  emoji       String?   // Эмодзи статуса
  
  startedAt   DateTime  @default(now())
  endedAt     DateTime?
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId, startedAt])
}
```

**Типы сессий:**
- `game` — играет в игру (отображается "Playing Alias")
- `idle` — неактивен (отображается "Idle")
- `custom` — кастомный статус (отображается текст + эмодзи)

**Примеры:**
```
Playing Truth or Dare 🎲
Playing Alias 🎯
Idle 💤
Chilling 🎵
Studying 📚
```

---

## 📊 Обновлённая статистика моделей

### Общее количество моделей

| Категория | Количество |
|-----------|------------|
| Auth Models | 4 |
| Game Models (ToD) | 3 |
| Alias Models | 4 |
| Codenames Models | 3 |
| Emotional Models | 3 |
| Customization Models | 4 |
| Subscription Models | 2 |
| Social Models | 8 |
| Stats Models | 4 |
| Profile Models | 5 |
| **ИТОГО** | **40 моделей** |

### Покрытие документацией

- ✅ Auth Models: 100% (4/4)
- ✅ Game Models: 100% (3/3)
- ✅ Alias Models: 100% (4/4)
- ✅ Codenames Models: 100% (3/3)
- ✅ Emotional Models: 100% (3/3)
- ✅ Customization Models: 100% (4/4)
- ✅ Subscription Models: 100% (2/2)
- ✅ Social Models: 100% (8/8)
- ✅ Stats Models: 100% (4/4)
- ✅ Profile Models: 100% (5/5)

**Общее покрытие: 100% (40/40)**

---

## 🔗 Связи между моделями

### User → Profile Models

```
User
├── UserProfileGame (1:N) - избранные игры
├── UserProfileWidget (1:N) - виджеты профиля
├── UserActivity (1:N) - история активности
├── UserNote (1:N) - заметки о других
└── UserSession (1:N) - сессии активности
```

### Примеры запросов

**Получить профиль с виджетами:**
```javascript
const profile = await prisma.user.findUnique({
  where: { id: userId },
  include: {
    profileGames: {
      where: { isVisible: true },
      orderBy: { position: 'asc' }
    },
    profileWidgets: {
      where: { isVisible: true },
      orderBy: { position: 'asc' }
    },
    activities: {
      take: 10,
      orderBy: { createdAt: 'desc' }
    }
  }
});
```

**Получить активную сессию:**
```javascript
const activeSession = await prisma.userSession.findFirst({
  where: {
    userId: userId,
    endedAt: null
  },
  orderBy: { startedAt: 'desc' }
});
```

**Получить заметку о пользователе:**
```javascript
const note = await prisma.userNote.findUnique({
  where: {
    userId_targetId: {
      userId: currentUserId,
      targetId: targetUserId
    }
  }
});
```


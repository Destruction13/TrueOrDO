# Статистика и достижения

## 📊 Система статистики

### UserGameStats

Статистика по каждой игре хранится отдельно.

**Модель:**
```prisma
model UserGameStats {
  id          String @id @default(cuid())
  userId      String
  gameType    String // "tod" | "alias" | "codenames" | "emotional"
  gamesPlayed Int    @default(0)
  gamesWon    Int    @default(0)
  totalTime   Int    @default(0) // В секундах
  metadata    String? // JSON с дополнительными метриками
  
  @@unique([userId, gameType])
}
```

---

### Метрики по играм

#### Truth or Dare
```json
{
  "truthsCompleted": 50,
  "daresCompleted": 30,
  "truthsRefused": 5,
  "daresRefused": 10,
  "votesReceived": 100,
  "votesGiven": 80,
  "chaosEscapes": 2,
  "redemptions": 3
}
```

#### Alias
```json
{
  "wordsExplained": 500,
  "wordsGuessed": 450,
  "wordsSkipped": 50,
  "perfectRounds": 10,
  "longestStreak": 15
}
```

#### Codenames
```json
{
  "hintsGiven": 100,
  "cardsRevealed": 500,
  "assassinsHit": 5,
  "perfectGames": 3
}
```

#### Emotional Intelligence
```json
{
  "emotionsGuessed": 200,
  "votesReceived": 150,
  "perfectGuesses": 20
}
```

---

## 🏆 Система достижений

### Achievement

**Модель:**
```prisma
model Achievement {
  id          String @id @default(cuid())
  slug        String @unique
  name        String
  description String
  icon        String?
  category    String // "tod" | "alias" | "codenames" | "emotional" | "social" | "general"
  maxLevel    Int    @default(1)
  isActive    Boolean @default(true)
}
```

---

### Категории достижений

#### General (Общие)
- `first_login` — Первый вход
- `email_verified` — Подтверждённый email
- `profile_complete` — Заполненный профиль
- `level_10` — Достигнут 10 уровень
- `level_50` — Достигнут 50 уровень

#### Truth or Dare
- `tod_first_game` — Первая игра
- `tod_games_10` — 10 игр
- `tod_games_100` — 100 игр
- `tod_truth_master` — 50 правд выполнено
- `tod_dare_master` — 50 действий выполнено
- `tod_chaos_escape` — Выход из chaos режима

#### Alias
- `alias_first_game` — Первая игра
- `alias_win_10` — 10 побед
- `alias_win_100` — 100 побед
- `alias_words_1000` — 1000 слов объяснено
- `alias_perfect_round` — Идеальный раунд (все слова угаданы)
- `alias_streak_10` — 10 слов подряд

#### Codenames
- `codenames_first_game` — Первая игра
- `codenames_win_10` — 10 побед
- `codenames_captain_master` — 50 игр капитаном
- `codenames_perfect_game` — Идеальная игра (без ошибок)

#### Emotional
- `emotional_first_game` — Первая игра
- `emotional_win_10` — 10 побед
- `emotional_empathy_master` — 100 эмоций угадано

#### Social
- `first_friend` — Первый друг
- `friends_10` — 10 друзей
- `clan_founder` — Основатель клана
- `clan_member` — Участник клана
- `messages_100` — 100 сообщений отправлено

---

### Уровни достижений

Некоторые достижения имеют несколько уровней:

**Пример: "Игры в Alias"**
- Уровень 1: 10 игр
- Уровень 2: 50 игр
- Уровень 3: 100 игр
- Уровень 4: 500 игр
- Уровень 5: 1000 игр

---

## 📈 XP и уровни

### Начисление XP

**События:**
- Первый вход: +10 XP
- Ежедневный вход: +5 XP
- Завершение игры ToD: +10 XP
- Завершение игры Alias: +20 XP
- Завершение игры Codenames: +25 XP
- Завершение игры Emotional: +15 XP
- Победа: +50 XP (дополнительно)
- Достижение (уровень 1): +50 XP
- Достижение (уровень 2): +100 XP
- Достижение (уровень 3): +200 XP
- Достижение (уровень 4): +400 XP
- Достижение (уровень 5): +800 XP

### Формула уровня

```javascript
level = Math.floor(Math.sqrt(xp / 100)) + 1;
```

**Примеры:**
- 0 XP → уровень 1
- 100 XP → уровень 2
- 400 XP → уровень 3
- 900 XP → уровень 4
- 1600 XP → уровень 5
- 2500 XP → уровень 6
- 10000 XP → уровень 11

---

## 🔥 Стрики

### Login Streak

Количество дней подряд, когда пользователь заходил в систему.

**Логика:**
```javascript
const today = new Date().toDateString();
const lastLogin = user.lastLoginDate?.toDateString();
const yesterday = new Date(Date.now() - 86400000).toDateString();

if (lastLogin === today) {
  // Уже заходил сегодня
} else if (lastLogin === yesterday) {
  // Заходил вчера — увеличить стрик
  user.loginStreak += 1;
} else {
  // Стрик прерван
  user.loginStreak = 1;
}
```

**Награды за стрики:**
- 7 дней: +50 XP
- 30 дней: +200 XP
- 100 дней: +1000 XP

---

### Activity Streak

Количество дней подряд, когда пользователь играл в игры.

**Логика:**
Аналогична Login Streak, но проверяется при завершении игры.

---

## 📊 API

### Получить статистику

**Socket:** `stats:get`

**Response:**
```json
{
  "stats": {
    "tod": {
      "gamesPlayed": 50,
      "gamesWon": 25,
      "totalTime": 3600,
      "metadata": { ... }
    },
    "alias": { ... },
    "codenames": { ... },
    "emotional": { ... }
  }
}
```

---

### Получить достижения

**Socket:** `achievements:get`

**Response:**
```json
{
  "achievements": [
    {
      "slug": "first_game",
      "name": "Первая игра",
      "description": "Сыграйте первую игру",
      "icon": "🎮",
      "category": "general",
      "level": 1,
      "maxLevel": 1,
      "progress": 1,
      "unlockedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

## 🎯 Компоненты

### GameStats.jsx

Отображение статистики игр:
- Количество игр
- Процент побед
- Общее время
- Специфичные метрики

### Achievements.jsx

Список достижений:
- Разблокированные
- Заблокированные (с прогрессом)
- Фильтр по категориям
- Сортировка

### ProgressBar.jsx

Прогресс-бар для достижений:
```jsx
<ProgressBar
  current={progress}
  max={maxProgress}
  color="#6366f1"
/>
```

---

## 📈 Таблицы лидеров

### Глобальные лидеры

**Socket:** `leaderboard:global`

**Response:**
```json
{
  "leaderboard": [
    {
      "userId": "user-id",
      "nickname": "Player1",
      "tag": "0001",
      "avatarUrl": "/uploads/avatars/avatar.jpg",
      "xp": 10000,
      "level": 11,
      "gamesPlayed": 500,
      "gamesWon": 250
    }
  ]
}
```

### Лидеры по игре

**Socket:** `leaderboard:game`

**Payload:**
```json
{
  "gameType": "alias"
}
```

**Response:**
```json
{
  "leaderboard": [
    {
      "userId": "user-id",
      "nickname": "Player1",
      "tag": "0001",
      "gamesPlayed": 200,
      "gamesWon": 150,
      "winRate": 0.75
    }
  ]
}
```

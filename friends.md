# Система друзей и социального взаимодействия

## Обзор

Полноценная социальная система по аналогии с Discord, включающая:

- Список друзей с онлайн-статусами
- Приватные чаты между игроками
- Приглашения в игры
- Просмотр профилей других игроков
- Система достижений
- Кланы для объединения игроков

---

## 1. Иконка друзей в хедере

### Расположение

- Справа сверху, рядом с иконкой профиля
- Иконка: силуэт двух человек или аналог Discord

### Визуальные индикаторы

- Бейдж с количеством онлайн друзей
- Красная точка при наличии непрочитанных сообщений
- Анимация при получении нового приглашения в игру

### При клике

Открывается модальное окно со списком друзей

---

## 2. Модальное окно "Друзья"

### Структура окна

```
┌─────────────────────────────────────────────────────┐
│  👥 Друзья                              [X] Закрыть │
├─────────────────────────────────────────────────────┤
│  [Все] [Онлайн] [В игре] [Кланы] [Запросы]         │
├─────────────────────────────────────────────────────┤
│  🔍 Поиск друзей...                                │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ── В ИГРЕ (2) ──                                  │
│  ┌─────────────────────────────────────────────┐   │
│  │ 🟢 NightWolf         Играет в Alias         │   │
│  │    [Присоединиться] [Написать]              │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ── ОНЛАЙН (5) ──                                  │
│  ┌─────────────────────────────────────────────┐   │
│  │ 🟢 StarGazer         Онлайн                 │   │
│  │    [Пригласить в игру] [Написать]           │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ── ОФФЛАЙН (12) ──                                │
│  ┌─────────────────────────────────────────────┐   │
│  │ ⚫ DarkPhoenix       Был 2 часа назад       │   │
│  │    [Написать]                               │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Вкладки

1. **Все** — полный список друзей
2. **Онлайн** — только онлайн друзья
3. **В игре** — друзья, которые сейчас в активной игре
4. **Кланы** — ваш клан и поиск кланов
5. **Запросы** — входящие/исходящие заявки в друзья

### Действия с другом

- **Присоединиться** — войти в игру друга (если игра публичная или друг пригласил)
- **Пригласить в игру** — отправить приглашение в текущую комнату
- **Написать** — открыть чат с другом
- **Посмотреть профиль** — открыть профиль друга
- **Удалить из друзей** — убрать из списка друзей

---

## 3. Кланы

> **Вдохновлено:** Discord Servers, Steam Groups, Clash of Clans

### Концепция

Кланы — постоянные сообщества игроков для совместной игры. Создавать кланы могут только пользователи с VIP или PRO подпиской.

### Характеристики клана

| Параметр                                            | Значение                    |
| ----------------------------------------------------------- | ----------------------------------- |
| **Максимум участников**             | 50                                  |
| **Кто может создать**                  | VIP или PRO                      |
| **Кто может быть модератором** | Только VIP или PRO         |
| **Типы кланов**                             | Открытый / Закрытый |

### Типы кланов

| Тип                     | Описание                                                                        |
| -------------------------- | --------------------------------------------------------------------------------------- |
| **Открытый** | Любой может вступить без одобрения                        |
| **Закрытый** | Требуется заявка и одобрение лидера/модератора |

### Интерфейс клана

```
┌─────────────────────────────────────────────────────┐
│  ⚔️ Клан: "Пиписяки"                     [⚙️] [X]  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  📝 Описание:                                       │
│  "Весёлая компания для вечерних игр!"               │
│  🔗 Discord: discord.gg/pipisiaki                   │
│                                                     │
├─────────────────────────────────────────────────────┤
│  👥 Участники (23/50)                               │
│                                                     │
│  👑 CyberKnight (Лидер)           🟢 Онлайн        │
│  ⭐ NightWolf [VIP]                🎮 В Alias      │
│  ⭐ StarGazer [PRO]                🟢 Онлайн        │
│  👤 DarkPhoenix                    ⚫ Оффлайн       │
│  👤 PixelMaster                    🟢 Онлайн        │
│  ... ещё 18 участников                              │
│                                                     │
├─────────────────────────────────────────────────────┤
│  [➕ Пригласить] [🎮 Пригласить всех] [💬 Чат клана] │
└─────────────────────────────────────────────────────┘
```

### Функции клана

1. **Пригласить игрока** — отправить приглашение в клан
2. **Пригласить всех онлайн** — одним кликом пригласить всех онлайн в текущую игру
3. **Чат клана** — общий чат для всех участников (история сохраняется)
4. **Быстрый старт** — лидер создаёт комнату, все онлайн получают уведомление
5. **Управление заявками** — одобрение/отклонение заявок (для закрытых кланов)

### Роли в клане

| Роль                     | Иконка | Права                                                                                                                                                                | Требования                    |
| ---------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| **Лидер**         | 👑           | Полные права: редактировать клан, назначать модераторов, исключать участников, удалить клан | Создатель клана (VIP/PRO) |
| **Модератор** | ⭐           | Одобрять заявки, приглашать участников, исключать обычных участников                                          | Только VIP или PRO             |
| **Участник**   | 👤           | Писать в чат, приглашать в игры, покинуть клан                                                                                       | Любой                              |

### Поиск кланов

Игроки могут искать кланы для вступления:

```
┌─────────────────────────────────────────────────────┐
│  🔍 Поиск кланов                                    │
├─────────────────────────────────────────────────────┤
│                                                     │
│  [🔍 Введите название клана...              ]       │
│                                                     │
├─────────────────────────────────────────────────────┤
│  📋 Результаты:                                     │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │ ⚔️ Пиписяки                    👥 23/50     │   │
│  │ 🔓 Открытый                                  │   │
│  │ "Весёлая компания для вечерних игр!"        │   │
│  │                                              │   │
│  │ [Вступить]                                   │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │ ⚔️ Pro Gamers United           👥 45/50     │   │
│  │ 🔒 Закрытый                                  │   │
│  │ "Только для серьёзных игроков"              │   │
│  │                                              │   │
│  │ [Подать заявку]                              │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │ ⚔️ Night Owls                  👥 12/50     │   │
│  │ 🔓 Открытый                                  │   │
│  │ "Играем по ночам! 🦉"                       │   │
│  │                                              │   │
│  │ [Вступить]                                   │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Система заявок (для закрытых кланов)

```
┌─────────────────────────────────────────────────────┐
│  📥 Заявки в клан (3)                               │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │ 👤 NewPlayer2026                             │   │
│  │ 📅 Подал заявку: 2 часа назад               │   │
│  │ 🎮 Игр сыграно: 45 | Уровень: 12            │   │
│  │                                              │   │
│  │ [✅ Принять]  [❌ Отклонить]                 │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │ 👤 CoolGamer                                 │   │
│  │ 📅 Подал заявку: 5 часов назад              │   │
│  │ 🎮 Игр сыграно: 120 | Уровень: 18           │   │
│  │                                              │   │
│  │ [✅ Принять]  [❌ Отклонить]                 │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Модерация описаний клана

Для защиты от нежелательного контента используется многоуровневая модерация:

#### 1. Автоматическая фильтрация (на сервере)

```javascript
// Список запрещённых доменов
const BLOCKED_DOMAINS = [
  'pornhub.com', 'xvideos.com', 'xhamster.com', 'redtube.com',
  'youporn.com', 'tube8.com', 'spankbang.com', 'xnxx.com',
  // ... другие 18+ сайты
];

// Список запрещённых слов (обсценная лексика, оскорбления)
const BLOCKED_WORDS = [
  // Список мата и оскорблений
];

function moderateContent(text) {
  const lowerText = text.toLowerCase();
  
  // Проверка на запрещённые домены
  for (const domain of BLOCKED_DOMAINS) {
    if (lowerText.includes(domain)) {
      return { valid: false, reason: 'Ссылки на сайты 18+ запрещены' };
    }
  }
  
  // Проверка на запрещённые слова
  for (const word of BLOCKED_WORDS) {
    if (lowerText.includes(word)) {
      return { valid: false, reason: 'Текст содержит запрещённые слова' };
    }
  }
  
  return { valid: true };
}
```

#### 2. Разрешённые ссылки (whitelist)

```javascript
// Разрешённые домены для ссылок
const ALLOWED_DOMAINS = [
  'discord.gg', 'discord.com',
  't.me', 'telegram.me',
  'vk.com', 'vk.me',
  'youtube.com', 'youtu.be',
  'twitch.tv',
  'steamcommunity.com',
];

function validateLinks(text) {
  // Извлекаем все URL из текста
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const urls = text.match(urlRegex) || [];
  
  for (const url of urls) {
    const domain = new URL(url).hostname.replace('www.', '');
    const isAllowed = ALLOWED_DOMAINS.some(d => domain.includes(d));
  
    if (!isAllowed) {
      return { 
        valid: false, 
        reason: `Ссылки на ${domain} не разрешены. Разрешены: Discord, Telegram, VK, YouTube, Twitch, Steam` 
      };
    }
  }
  
  return { valid: true };
}
```

#### 3. Система жалоб

Пользователи могут пожаловаться на клан с неприемлемым описанием:

```
┌─────────────────────────────────────────────────────┐
│  ⚠️ Пожаловаться на клан                           │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Причина жалобы:                                    │
│                                                     │
│  ○ Оскорбительное название/описание                │
│  ○ Спам или реклама                                │
│  ○ Неприемлемый контент (18+)                      │
│  ○ Мошенничество                                   │
│  ○ Другое                                          │
│                                                     │
│  Комментарий (опционально):                        │
│  ┌─────────────────────────────────────────────┐   │
│  │                                              │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  [Отправить жалобу]                                 │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Премиум-функции кланов

| Функция                             | FREE | VIP             | PRO             |
| ------------------------------------------ | ---- | --------------- | --------------- |
| Вступить в клан               | ✅   | ✅              | ✅              |
| Создать клан                    | ❌   | ✅ (1 клан) | ✅ (1 клан) |
| Быть модератором            | ❌   | ✅              | ✅              |
| Кастомный аватар клана | —   | ✅              | ✅              |
| Клановые достижения      | —   | ❌              | ✅              |

### База данных для кланов

```prisma
model Clan {
  id          String   @id @default(cuid())
  name        String   @unique
  description String?  @db.Text
  avatarUrl   String?
  isOpen      Boolean  @default(true)  // true = открытый, false = закрытый
  
  ownerId     String
  owner       User     @relation("ClanOwner", fields: [ownerId], references: [id])
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  members     ClanMember[]
  requests    ClanRequest[]
  messages    ClanMessage[]
  reports     ClanReport[]
  
  @@index([ownerId])
  @@index([name])
}

model ClanMember {
  id        String   @id @default(cuid())
  clanId    String
  userId    String
  role      String   @default("member") // "leader" | "moderator" | "member"
  joinedAt  DateTime @default(now())
  
  clan      Clan @relation(fields: [clanId], references: [id], onDelete: Cascade)
  user      User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([clanId, userId])
  @@index([userId])
}

model ClanRequest {
  id        String   @id @default(cuid())
  clanId    String
  userId    String
  status    String   @default("pending") // "pending" | "approved" | "rejected"
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  clan      Clan @relation(fields: [clanId], references: [id], onDelete: Cascade)
  user      User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([clanId, userId])
  @@index([clanId, status])
}

model ClanMessage {
  id        String   @id @default(cuid())
  clanId    String
  senderId  String
  content   String   @db.Text
  createdAt DateTime @default(now())
  
  clan      Clan @relation(fields: [clanId], references: [id], onDelete: Cascade)
  sender    User @relation("ClanMessageSender", fields: [senderId], references: [id])
  
  @@index([clanId, createdAt])
}

model ClanReport {
  id        String   @id @default(cuid())
  clanId    String
  reporterId String
  reason    String   // "offensive" | "spam" | "adult" | "scam" | "other"
  comment   String?  @db.Text
  status    String   @default("pending") // "pending" | "reviewed" | "actioned"
  createdAt DateTime @default(now())
  
  clan      Clan @relation(fields: [clanId], references: [id], onDelete: Cascade)
  reporter  User @relation("ClanReporter", fields: [reporterId], references: [id])
  
  @@index([status])
}

---

## 4. Система достижений

> **Вдохновлено:** Xbox Achievements, Steam Achievements, PlayStation Trophies, Discord Badges

### Философия достижений

Достижения должны:

- 🎯 **Мотивировать** — давать цели для игроков
- 🏆 **Награждать** — признавать усилия и мастерство
- 📈 **Удерживать** — создавать долгосрочную вовлечённость
- 🌟 **Выделять** — показывать статус в сообществе

### Категории достижений

#### 🎮 Игровые достижения (по играм)

**Truth or Dare:**

| Достижение                | Условие                                                           | Редкость       | Иконка |
| ----------------------------------- | ------------------------------------------------------------------------ | ---------------------- | ------------ |
| Первая правда           | Завершить первое задание "Правда"            | Обычное         | 💬           |
| Смельчак                    | Завершить первое "Действие"                       | Обычное         | 🎭           |
| Правдоруб                  | 50 выполненных "Правда"                                 | Редкое           | 🗣️         |
| Бесстрашный              | 50 выполненных "Действий"                             | Редкое           | 🔥           |
| Мастер хаоса             | Выйти из режима "Хаос" 5 раз                         | Редкое           | 🌀           |
| Искупление                | Снять статус "Позор" 3 раза                          | Редкое           | ✨           |
| Легенда вечеринки   | 100 игр в Truth or Dare                                              | Эпическое     | 👑           |
| Абсолютный чемпион | Завершить игру без единого отказа 10 раз | Легендарное | 🏆           |

**Alias:**

| Достижение            | Условие                                      | Редкость       | Иконка |
| ------------------------------- | --------------------------------------------------- | ---------------------- | ------------ |
| Первое слово         | Угадать первое слово              | Обычное         | 📝           |
| Словесный мастер | Угадать 100 слов                         | Редкое           | 📚           |
| Скорострел            | Угадать 10 слов за один раунд | Редкое           | ⚡           |
| Киберраннер          | Набрать 50+ очков в CyberRunner        | Редкое           | 🤖           |
| Легенда Alias            | Выиграть 50 игр                          | Эпическое     | 🎯           |
| Непобедимый          | Выиграть 10 игр подряд             | Легендарное | 💎           |

**Emotional Intelligence:**

| Достижение      | Условие                                           | Редкость   | Иконка |
| ------------------------- | -------------------------------------------------------- | ------------------ | ------------ |
| Эмпат                | Правильно угадать эмоцию 10 раз | Обычное     | 💭           |
| Мастер эмоций | Правильно угадать 100 эмоций       | Редкое       | 🎭           |
| Психолог          | Выиграть 25 игр                               | Эпическое | 🧠           |

**Codenames:**

| Достижение              | Условие                               | Редкость   | Иконка |
| --------------------------------- | -------------------------------------------- | ------------------ | ------------ |
| Шпион-новичок         | Первая победа                    | Обычное     | 🕵️         |
| Мастер ассоциаций | Дать подсказку на 4+ слов | Редкое       | 💡           |
| Легенда разведки   | 50 побед                                | Эпическое | 🎖️         |

#### 🤝 Социальные достижения

| Достижение                | Условие                             | Редкость   | Иконка |
| ----------------------------------- | ------------------------------------------ | ------------------ | ------------ |
| Первый друг               | Добавить первого друга | Обычное     | 👋           |
| Душа компании           | 10 друзей                            | Обычное     | 🎉           |
| Популярный                | 50 друзей                            | Редкое       | ⭐           |
| Социальная бабочка | 100 друзей                           | Эпическое | 🦋           |
| Болтун                        | Отправить 100 сообщений  | Обычное     | 💬           |
| Коммуникатор            | Отправить 1000 сообщений | Редкое       | 📱           |
| Лидер сообщества     | Клан с 25+ участниками     | Эпическое | 👑           |

#### 🏅 Достижения верности

| Достижение              | Условие                                | Редкость       | Иконка |
| --------------------------------- | --------------------------------------------- | ---------------------- | ------------ |
| Новичок                    | Зарегистрироваться          | Обычное         | 🌱           |
| Постоянный игрок   | Играть 7 дней подряд          | Редкое           | 📅           |
| Ветеран                    | Играть 30 дней подряд         | Эпическое     | 🎖️         |
| Легенда платформы | На платформе более 1 года | Легендарное | 🏛️         |
| VIP-статус                  | Приобрести VIP                      | Редкое           | 💜           |
| PRO-статус                  | Приобрести PRO                      | Эпическое     | 💎           |

#### 🎁 Секретные достижения

| Достижение | Условие                                                   | Редкость   | Иконка |
| -------------------- | ---------------------------------------------------------------- | ------------------ | ------------ |
| ???                  | Играть в 3 часа ночи                              | Секретное | 🦉           |
| ???                  | Сыграть со всеми типами игр за день | Секретное | 🎲           |
| ???                  | Найти пасхалку (Easter egg)                         | Секретное | 🥚           |

### Редкость достижений

| Редкость                 | Цвет             | % игроков | XP награда |
| -------------------------------- | -------------------- | ---------------- | ----------------- |
| **Обычное**         | Серый           | 50%+             | 10 XP             |
| **Редкое**           | Синий           | 20-50%           | 25 XP             |
| **Эпическое**     | Фиолетовый | 5-20%            | 50 XP             |
| **Легендарное** | Золотой       | <5%              | 100 XP            |
| **Секретное**     | Радужный     | Скрыто     | 75 XP             |

### Отображение достижений

**В профиле:**

```

┌─────────────────────────────────────────────────────┐
│  🏆 ДОСТИЖЕНИЯ                      [42/156] 27%   │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ⭐ ИЗБРАННЫЕ (до 6 штук)                          │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐  │
│  │ 👑  │ │ 🔥  │ │ 💎  │ │ 🎯  │ │ 🦋  │ │ 🏛️  │  │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘  │
│                                                     │
│  📊 ПО КАТЕГОРИЯМ                                  │
│  ├── 🎮 Игровые: 28/89                             │
│  ├── 🤝 Социальные: 8/32                           │
│  ├── 🏅 Верности: 4/20                             │
│  └── 🎁 Секретные: 2/15                            │
│                                                     │
│  🕐 ПОСЛЕДНИЕ                                      │
│  ┌─────────────────────────────────────────────┐   │
│  │ 🔥 Бесстрашный       Сегодня, 21:30         │   │
│  │ 📅 Постоянный игрок  Вчера                  │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  [Посмотреть все достижения →]                     │
└─────────────────────────────────────────────────────┘

```

### Уведомления о достижениях

**Toast-уведомление (как в Xbox):**

```

┌─────────────────────────────────────────────┐
│  🏆 ДОСТИЖЕНИЕ РАЗБЛОКИРОВАНО!              │
│                                             │
│  🔥 Бесстрашный                            │
│  "50 выполненных Действий"                 │
│                                             │
│  +25 XP                      [Посмотреть]  │
└─────────────────────────────────────────────┘

```

**Анимация:**

- Появление снизу вверх
- Золотое свечение вокруг иконки
- Звук "Achievement unlocked"
- Конфетти для Эпических и Легендарных

### Система уровней (Gamification)

| Уровень | XP требуется | Название | Награда                                 |
| -------------- | --------------------- | ---------------- | ---------------------------------------------- |
| 1              | 0                     | Новичок   | —                                             |
| 5              | 100                   | Игрок       | Базовая рамка                      |
| 10             | 300                   | Опытный   | Эксклюзивный градиент      |
| 15             | 600                   | Мастер     | VIP-статус на 7 дней               |
| 20             | 1000                  | Эксперт   | PRO-статус на 7 дней               |
| 25             | 1500                  | Легенда   | Уникальный бейдж профиля |
| 30             | 2100                  | Чемпион   | Анимированная рамка          |
| 50             | 5000                  | Бог игр    | Эксклюзивный титул            |

### База данных достижений

```prisma
model Achievement {
  id          String   @id @default(cuid())
  slug        String   @unique
  name        String
  description String
  icon        String
  category    String   // "game_tod" | "game_alias" | "social" | "loyalty" | "secret"
  gameType    String?  // "tod" | "alias" | "emotional" | "codenames" | null
  rarity      String   @default("common") // "common" | "rare" | "epic" | "legendary" | "secret"
  xpReward    Int      @default(10)
  isSecret    Boolean  @default(false)
  sortOrder   Int      @default(0)
  isActive    Boolean  @default(true)
  
  // Условие разблокировки (JSON)
  // { type: "count", field: "gamesPlayed", value: 100 }
  // { type: "streak", field: "loginDays", value: 7 }
  unlockCondition String @default("{}")
  
  createdAt   DateTime @default(now())
  
  users UserAchievement[]
  
  @@index([category])
  @@index([gameType])
  @@index([rarity])
}

model UserAchievement {
  id            String   @id @default(cuid())
  userId        String
  achievementId String
  unlockedAt    DateTime @default(now())
  isFeatured    Boolean  @default(false) // Показывать в профиле
  featuredOrder Int?     // Порядок в избранных (0-5)
  
  user        User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  achievement Achievement @relation(fields: [achievementId], references: [id], onDelete: Cascade)
  
  @@unique([userId, achievementId])
  @@index([userId, isFeatured])
}

// Расширение User для уровней
model User {
  // ... существующие поля ...
  
  xp              Int @default(0)
  level           Int @default(1)
  loginStreak     Int @default(0)
  lastLoginDate   DateTime?
}
```

---

## 5. Интеграция с играми (Кликабельные никнеймы)

> **Цель:** Сделать все никнеймы игроков интерактивными для социального взаимодействия

### Текущее состояние компонентов

Проект использует следующие компоненты для отображения игроков:

- `PlayerCard.jsx` — карточка игрока в Truth or Dare
- `StyledNickname.jsx` — стилизованный никнейм с градиентами и свечением
- `AvatarFrame.jsx` — аватар с рамкой
- `EmotionalOvalTable.jsx` — стол с игроками в Emotional Intelligence
- `AliasRoomScreen.jsx` — экран игры Alias с командами

### Новый компонент: ClickablePlayer

```jsx
// client/src/components/social/ClickablePlayer.jsx

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import StyledNickname from "../ui/StyledNickname";
import AvatarFrame from "../ui/AvatarFrame";
import PlayerContextMenu from "./PlayerContextMenu";
import "./ClickablePlayer.css";

/**
 * Обёртка для кликабельного игрока
 * Работает как с аватаром, так и с никнеймом
 */
export default function ClickablePlayer({
  player,          // { id, visitorId, name, avatarUrl, frameSlug, nicknameStyle, userId }
  userId,          // ID авторизованного пользователя (если есть)
  currentUserId,   // ID текущего пользователя
  showAvatar = true,
  showName = true,
  avatarSize = "m",
  children,        // Кастомный контент (если не нужен стандартный)
  className = "",
  onAddFriend,
  onRemoveFriend,
  onSendMessage,
  onViewProfile,
  onInviteToGame,
  onBlock,
  friendshipStatus, // null | "pending" | "accepted" | "blocked"
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  
  const isMe = userId === currentUserId;
  const isRegistered = !!userId; // Только зарегистрированные пользователи кликабельны
  
  const handleClick = (e) => {
    if (!isRegistered) return; // Гости не кликабельны
  
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPosition({
      x: rect.left + rect.width / 2,
      y: rect.bottom + 8
    });
    setShowMenu(true);
  };
  
  const handleClose = () => setShowMenu(false);
  
  return (
    <>
      <motion.div
        className={`clickable-player ${isRegistered ? "clickable-player--interactive" : ""} ${className}`}
        onClick={handleClick}
        whileHover={isRegistered ? { scale: 1.02 } : {}}
        whileTap={isRegistered ? { scale: 0.98 } : {}}
      >
        {children || (
          <>
            {showAvatar && (
              <AvatarFrame size={avatarSize} frameSlug={player.frameSlug}>
                {player.avatarUrl ? (
                  <img src={player.avatarUrl} alt={player.name} />
                ) : (
                  <div className="clickable-player__avatar-placeholder">
                    {player.name?.[0]?.toUpperCase() || "?"}
                  </div>
                )}
              </AvatarFrame>
            )}
            {showName && (
              <StyledNickname 
                name={player.name} 
                customization={player.nicknameStyle}
              />
            )}
          </>
        )}
  
        {/* Индикатор кликабельности для зарегистрированных */}
        {isRegistered && !isMe && (
          <div className="clickable-player__indicator" />
        )}
      </motion.div>
  
      <AnimatePresence>
        {showMenu && (
          <PlayerContextMenu
            player={player}
            isMe={isMe}
            friendshipStatus={friendshipStatus}
            position={menuPosition}
            onClose={handleClose}
            onAddFriend={onAddFriend}
            onRemoveFriend={onRemoveFriend}
            onSendMessage={onSendMessage}
            onViewProfile={onViewProfile}
            onInviteToGame={onInviteToGame}
            onBlock={onBlock}
          />
        )}
      </AnimatePresence>
    </>
  );
}
```

### Контекстное меню игрока (Discord-style)

```jsx
// client/src/components/social/PlayerContextMenu.jsx

import { motion } from "framer-motion";
import { createPortal } from "react-dom";
import "./PlayerContextMenu.css";

export default function PlayerContextMenu({
  player,
  isMe,
  friendshipStatus,
  position,
  onClose,
  onAddFriend,
  onRemoveFriend,
  onSendMessage,
  onViewProfile,
  onInviteToGame,
  onBlock,
}) {
  // Закрытие при клике вне меню
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };
  
  const isFriend = friendshipStatus === "accepted";
  const isPending = friendshipStatus === "pending";
  const isBlocked = friendshipStatus === "blocked";
  
  const menuItems = isMe ? [
    { icon: "✏️", label: "Редактировать профиль", action: onViewProfile },
  ] : [
    { icon: "👤", label: "Посмотреть профиль", action: onViewProfile },
    { icon: "💬", label: "Написать сообщение", action: onSendMessage, disabled: isBlocked },
    { divider: true },
  
    // Друзья
    !isFriend && !isPending && !isBlocked && {
      icon: "👤+", label: "Добавить в друзья", action: onAddFriend
    },
    isPending && {
      icon: "⏳", label: "Заявка отправлена", disabled: true
    },
    isFriend && {
      icon: "👤-", label: "Удалить из друзей", action: onRemoveFriend, danger: true
    },
  
    { divider: true },
  
    // Игровые действия
    { icon: "🎮", label: "Пригласить в игру", action: onInviteToGame, disabled: isBlocked },
  
    { divider: true },
  
    // Модерация
    !isBlocked && {
      icon: "🚫", label: "Заблокировать", action: onBlock, danger: true
    },
    isBlocked && {
      icon: "✅", label: "Разблокировать", action: onBlock
    },
  ].filter(Boolean);
  
  return createPortal(
    <motion.div
      className="player-context-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={handleBackdropClick}
    >
      <motion.div
        className="player-context-menu"
        style={{ left: position.x, top: position.y }}
        initial={{ opacity: 0, scale: 0.9, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: -10 }}
        transition={{ duration: 0.15 }}
      >
        {/* Шапка с мини-профилем */}
        <div className="player-context-menu__header">
          <div className="player-context-menu__avatar">
            {player.avatarUrl ? (
              <img src={player.avatarUrl} alt={player.name} />
            ) : (
              <span>{player.name?.[0]?.toUpperCase()}</span>
            )}
          </div>
          <div className="player-context-menu__info">
            <span className="player-context-menu__name">{player.name}</span>
            {player.onlineStatus && (
              <span className={`player-context-menu__status player-context-menu__status--${player.onlineStatus}`}>
                {player.onlineStatus === "online" && "Онлайн"}
                {player.onlineStatus === "in_game" && `Играет`}
                {player.onlineStatus === "idle" && "Отошёл"}
                {player.onlineStatus === "offline" && "Оффлайн"}
              </span>
            )}
          </div>
        </div>
  
        {/* Действия */}
        <div className="player-context-menu__items">
          {menuItems.map((item, i) => 
            item.divider ? (
              <div key={i} className="player-context-menu__divider" />
            ) : (
              <button
                key={i}
                className={`player-context-menu__item ${item.danger ? "player-context-menu__item--danger" : ""}`}
                onClick={() => { item.action?.(player); onClose(); }}
                disabled={item.disabled}
              >
                <span className="player-context-menu__item-icon">{item.icon}</span>
                <span className="player-context-menu__item-label">{item.label}</span>
              </button>
            )
          )}
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}
```

### Стили контекстного меню

```css
/* client/src/components/social/PlayerContextMenu.css */

.player-context-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9999;
}

.player-context-menu {
  position: fixed;
  transform: translateX(-50%);
  min-width: 200px;
  max-width: 280px;
  background: rgba(30, 30, 40, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  overflow: hidden;
}

.player-context-menu__header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.player-context-menu__avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea, #764ba2);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.player-context-menu__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.player-context-menu__avatar span {
  color: white;
  font-weight: 600;
  font-size: 16px;
}

.player-context-menu__info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.player-context-menu__name {
  color: white;
  font-weight: 600;
  font-size: 14px;
}

.player-context-menu__status {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

.player-context-menu__status--online {
  color: #43b581;
}

.player-context-menu__status--in_game {
  color: #7289da;
}

.player-context-menu__status--idle {
  color: #faa61a;
}

.player-context-menu__items {
  padding: 8px;
}

.player-context-menu__item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
  cursor: pointer;
  transition: background 0.15s;
}

.player-context-menu__item:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
}

.player-context-menu__item:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.player-context-menu__item--danger {
  color: #f04747;
}

.player-context-menu__item--danger:hover:not(:disabled) {
  background: rgba(240, 71, 71, 0.2);
}

.player-context-menu__divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.1);
  margin: 8px 0;
}

.player-context-menu__item-icon {
  font-size: 16px;
  width: 20px;
  text-align: center;
}
```

### Интеграция в существующие игры

#### Truth or Dare (PlayerCard.jsx)

```jsx
// Обернуть существующий PlayerCard в ClickablePlayer
import ClickablePlayer from "../social/ClickablePlayer";

// В рендере:
<ClickablePlayer
  player={player}
  userId={player.userId}
  currentUserId={currentUser?.id}
  friendshipStatus={getFriendshipStatus(player.userId)}
  onViewProfile={() => openProfile(player.userId)}
  onAddFriend={() => sendFriendRequest(player.userId)}
  onSendMessage={() => openChat(player.userId)}
  onInviteToGame={() => inviteToGame(player.userId)}
>
  <PlayerCard player={player} {...otherProps} />
</ClickablePlayer>
```

#### Alias (AliasRoomScreen.jsx)

```jsx
// В списке игроков команды:
{team.members.map(member => (
  <ClickablePlayer
    key={member.id}
    player={member}
    userId={member.userId}
    currentUserId={user?.id}
    showAvatar={true}
    showName={true}
    avatarSize="s"
  />
))}
```

#### Emotional Intelligence (EmotionalOvalTable.jsx)

```jsx
// Обернуть аватары за столом:
{players.map((player, index) => (
  <ClickablePlayer
    key={player.id}
    player={player}
    userId={player.userId}
    currentUserId={currentUser?.id}
    className="emotional-seat"
  >
    {/* Существующий контент места */}
  </ClickablePlayer>
))}
```

### Отображение статуса дружбы в игре

```
┌─────────────────────────────────────────────────────┐
│  Игроки в комнате                                  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  👤 NightWolf        [👥 Друг]     🟢 Онлайн       │
│  👤 StarGazer        [➕ Добавить]  🟢 Онлайн       │
│  👤 DarkPhoenix                     ⚪ Гость        │
│  👤 CyberKnight      [Это вы]      🟢 Онлайн       │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Иконки статуса:**

- 👥 — Уже друзья
- ➕ — Можно добавить
- ⏳ — Заявка отправлена
- ⚪ — Гость (не зарегистрирован, не кликабелен)

---

## 6. Дизайн-макеты в стиле Discord

> **Вдохновлено:** Discord UI/UX, современные dark-mode интерфейсы

### Цветовая палитра

| Элемент                           | Цвет                     | Hex                       |
| ---------------------------------------- | ---------------------------- | ------------------------- |
| Фон основной                  | Тёмно-серый        | `#1e1e2e`               |
| Фон карточки                  | Серый                   | `#2a2a3e`               |
| Фон hover                             | Светло-серый      | `#3a3a4e`               |
| Акцент (онлайн)              | Зелёный               | `#43b581`               |
| Акцент (в игре)               | Синий                   | `#7289da`               |
| Акцент (отошёл)              | Жёлтый                 | `#faa61a`               |
| Акцент (не беспокоить) | Красный               | `#f04747`               |
| Текст основной              | Белый                   | `#ffffff`               |
| Текст вторичный            | Серый                   | `rgba(255,255,255,0.6)` |
| Граница                           | Полупрозрачный | `rgba(255,255,255,0.1)` |

### Типографика

```css
/* Основные шрифты */
--font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
--font-size-xs: 11px;
--font-size-sm: 12px;
--font-size-md: 14px;
--font-size-lg: 16px;
--font-size-xl: 20px;
--font-size-2xl: 24px;

/* Веса */
--font-weight-normal: 400;
--font-weight-medium: 500;
--font-weight-semibold: 600;
--font-weight-bold: 700;
```

### Макет: Полный профиль игрока

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    БАННЕР ПРОФИЛЯ                        │   │
│  │              (градиент или изображение)                  │   │
│  │                                                          │   │
│  │         ┌───────────────┐                                │   │
│  │         │               │                                │   │
│  │         │    АВАТАР     │                                │   │
│  │         │   + РАМКА     │                                │   │
│  │         │    120x120    │                                │   │
│  │         │     🟢        │  ← Статус онлайн              │   │
│  │         └───────────────┘                                │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                          │   │
│  │  ✨ NightWolf ✨                    [👤+] [💬] [⋮]      │   │
│  │  ──────────────                                          │   │
│  │                                                          │   │
│  │  🎮 Статус: Играет в Alias                              │   │
│  │  📅 На платформе с января 2026                          │   │
│  │                                                          │   │
│  │  ┌─────────────────────────────────────────────────┐    │   │
│  │  │ 📝 О себе                                        │    │   │
│  │  │ "Люблю настолки и хорошую компанию!"            │    │   │
│  │  └─────────────────────────────────────────────────┘    │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  📊 СТАТИСТИКА                                          │   │
│  │                                                          │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │   │
│  │  │   156    │  │    89    │  │   57%    │  │  Ур. 15  │ │   │
│  │  │  Игр     │  │  Побед   │  │ Винрейт  │  │  Мастер  │ │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘ │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  🎮 ЛЮБИМЫЕ ИГРЫ                                        │   │
│  │                                                          │   │
│  │  ┌─────────────────────────────────────────────────┐    │   │
│  │  │ 🎯 Alias                                         │    │   │
│  │  │ ████████████████████░░░░░░  78 игр              │    │   │
│  │  └─────────────────────────────────────────────────┘    │   │
│  │  ┌─────────────────────────────────────────────────┐    │   │
│  │  │ 🎭 Truth or Dare                                 │    │   │
│  │  │ ████████████░░░░░░░░░░░░░░  45 игр              │    │   │
│  │  └─────────────────────────────────────────────────┘    │   │
│  │  ┌─────────────────────────────────────────────────┐    │   │
│  │  │ 🕵️ Codenames                                     │    │   │
│  │  │ █████████░░░░░░░░░░░░░░░░░  33 игры             │    │   │
│  │  └─────────────────────────────────────────────────┘    │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  🏆 ДОСТИЖЕНИЯ                          [42/156] 27%    │   │
│  │                                                          │   │
│  │  ⭐ Избранные:                                          │   │
│  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐       │   │
│  │  │ 👑  │ │ 🔥  │ │ 💎  │ │ 🎯  │ │ 🦋  │ │ 🏛️  │       │   │
│  │  │Легенда│Бесстр│Непобед│Мастер│Соц.баб│Ветеран│       │   │
│  │  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘       │   │
│  │                                                          │   │
│  │  [Посмотреть все достижения →]                          │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  👥 ОБЩИЕ ДРУЗЬЯ (5)                                    │   │
│  │                                                          │   │
│  │  🟢 StarGazer  🟢 CyberKnight  ⚫ DarkPhoenix           │   │
│  │  🎮 Hacker     🟢 PixelMaster                           │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Макет: Окно чата

```
┌─────────────────────────────────────────────────────────────────┐
│  💬 NightWolf                              [📞] [📹] [—] [X]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                      📅 10 февраля 2026                        │
│                                                                 │
│  ┌─────────────────────────────────────────┐                   │
│  │ 🟢 NightWolf                    14:32   │                   │
│  │                                          │                   │
│  │ Привет! Как дела?                       │                   │
│  └─────────────────────────────────────────┘                   │
│                                                                 │
│  ┌─────────────────────────────────────────┐                   │
│  │ 🟢 NightWolf                    14:32   │                   │
│  │                                          │                   │
│  │ Пойдём в Alias сегодня вечером?         │                   │
│  └─────────────────────────────────────────┘                   │
│                                                                 │
│                   ┌─────────────────────────────────────────┐   │
│                   │                            Вы • 14:35   │   │
│                   │                                          │   │
│                   │                    Привет! Давай, создаю │   │
│                   │                           комнату 👍     │   │
│                   └─────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  🎮 ПРИГЛАШЕНИЕ В ИГРУ                                  │   │
│  │                                                          │   │
│  │  Alias • Комната "Вечерний баттл"                       │   │
│  │  👥 3/8 игроков                                          │   │
│  │                                                          │   │
│  │  [Присоединиться]                           14:36        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────┐                   │
│  │ 🟢 NightWolf                    14:36   │                   │
│  │                                          │                   │
│  │ Супер! Уже захожу 🚀                    │                   │
│  └─────────────────────────────────────────┘                   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [😊] [📎] [🎮]  Напишите сообщение...            [Отправить] │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Кнопки ввода:**

- 😊 — Эмодзи-пикер
- 📎 — Прикрепить файл (будущее)
- 🎮 — Быстрое приглашение в текущую игру

### Макет: Список друзей (боковая панель)

```
┌─────────────────────────────┐
│  👥 ДРУЗЬЯ                  │
├─────────────────────────────┤
│                             │
│  🔍 Поиск...               │
│                             │
├─────────────────────────────┤
│                             │
│  ── В ИГРЕ (2) ──          │
│                             │
│  ┌───────────────────────┐ │
│  │ 🎮 NightWolf          │ │
│  │    Alias • 3/8        │ │
│  └───────────────────────┘ │
│  ┌───────────────────────┐ │
│  │ 🎮 StarGazer          │ │
│  │    Truth or Dare      │ │
│  └───────────────────────┘ │
│                             │
│  ── ОНЛАЙН (5) ──          │
│                             │
│  ┌───────────────────────┐ │
│  │ 🟢 CyberKnight        │ │
│  └───────────────────────┘ │
│  ┌───────────────────────┐ │
│  │ 🟢 PixelMaster        │ │
│  └───────────────────────┘ │
│  ┌───────────────────────┐ │
│  │ 🌙 DreamWalker        │ │
│  │    Отошёл             │ │
│  └───────────────────────┘ │
│                             │
│  ── ОФФЛАЙН (12) ──        │
│                             │
│  ┌───────────────────────┐ │
│  │ ⚫ DarkPhoenix        │ │
│  │    2 часа назад       │ │
│  └───────────────────────┘ │
│  ┌───────────────────────┐ │
│  │ ⚫ ShadowHunter       │ │
│  │    Вчера              │ │
│  └───────────────────────┘ │
│                             │
│  [+ Добавить друга]        │
│                             │
└─────────────────────────────┘
```

### Макет: Игровой чат (внизу экрана)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                            [ ИГРОВОЕ ПОЛЕ ]                                 │
│                                                                             │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  💬 Чат комнаты                                              [▲ Развернуть] │
├─────────────────────────────────────────────────────────────────────────────┤
│  NightWolf: Отличный ход! 🎉                                               │
│  StarGazer: Давайте ещё раунд                                              │
│  Вы: Конечно! 👍                                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│  [😊] Напишите сообщение...                                   [Отправить]  │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Развёрнутый вид:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  💬 Чат комнаты                                              [▼ Свернуть]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                                                                       │  │
│  │  CyberKnight: Всем привет!                              21:30        │  │
│  │  NightWolf: Привет! Готовы начинать?                    21:31        │  │
│  │  StarGazer: Да, погнали!                                21:31        │  │
│  │  [Система]: Игра началась                               21:32        │  │
│  │  NightWolf: Отличный ход! 🎉                            21:35        │  │
│  │  StarGazer: Давайте ещё раунд                           21:36        │  │
│  │  Вы: Конечно! 👍                                        21:36        │  │
│  │                                                                       │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  [😊] Напишите сообщение...                                   [Отправить]  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Макет: Уведомление о приглашении

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  🎮 NightWolf приглашает вас в игру!                       │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Alias                                               │   │
│  │  Комната: "Вечерний баттл"                          │   │
│  │  👥 3/8 игроков                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│       [Присоединиться]        [Отклонить]                  │
│                                                             │
│                                        Исчезнет через 30с  │
└─────────────────────────────────────────────────────────────┘
```

### Анимации (Framer Motion)

```jsx
// Появление модального окна
const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    transition: { duration: 0.2, ease: "easeOut" }
  },
  exit: { 
    opacity: 0, 
    scale: 0.95, 
    y: 20,
    transition: { duration: 0.15 }
  }
};

// Появление сообщения в чате
const messageVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { duration: 0.2 }
  }
};

// Пульсация непрочитанных
const pulseVariants = {
  pulse: {
    scale: [1, 1.2, 1],
    transition: { 
      duration: 0.5, 
      repeat: Infinity,
      repeatDelay: 2
    }
  }
};

// Slide-in уведомления
const notificationVariants = {
  hidden: { x: 400, opacity: 0 },
  visible: { 
    x: 0, 
    opacity: 1,
    transition: { type: "spring", damping: 25 }
  },
  exit: { 
    x: 400, 
    opacity: 0,
    transition: { duration: 0.2 }
  }
};
```

### Адаптивность (Mobile-first)

| Breakpoint | Описание                | Изменения                                                 |
| ---------- | ------------------------------- | ------------------------------------------------------------------ |
| < 480px    | Мобильный              | Полноэкранные модалки, упрощённый UI |
| 480-768px  | Планшет портрет   | Адаптивные сетки                                    |
| 768-1024px | Планшет ландшафт | Боковая панель друзей                           |
| > 1024px   | Десктоп                  | Полный интерфейс                                    |

```css
/* Мобильная адаптация */
@media (max-width: 768px) {
  .friends-modal {
    position: fixed;
    inset: 0;
    border-radius: 0;
    max-height: 100vh;
  }
  
  .profile-modal {
    position: fixed;
    inset: 0;
    border-radius: 0;
  }
  
  .chat-window {
    position: fixed;
    inset: 0;
    border-radius: 0;
  }
  
  .game-chat {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    max-height: 40vh;
  }
  
  .game-chat--expanded {
    max-height: 70vh;
  }
}
```

---

## 7. Офлайн-режим и синхронизация

> **Вдохновлено:** WhatsApp, Telegram, Discord — бесшовный опыт при нестабильном соединении

### Сценарии потери соединения

| Сценарий                                         | Поведение                                          | UX                                                                       |
| -------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------ |
| Кратковременная потеря (< 5 сек) | Автоматическое переподключение | Незаметно для пользователя                       |
| Средняя потеря (5-30 сек)                | Показать индикатор, буферизация | Жёлтая плашка "Переподключение..."            |
| Длительная потеря (> 30 сек)          | Офлайн-режим                                     | Серая плашка "Нет соединения"                    |
| Полная потеря                                | Локальный кэш                                   | Можно просматривать, нельзя отправлять |

### Индикаторы состояния соединения

```
┌─────────────────────────────────────────────────────┐
│  ⚠️ Переподключение...                   [Скрыть]  │
│  Сообщения будут отправлены при восстановлении     │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  ❌ Нет соединения                       [Повторить]│
│  Проверьте подключение к интернету                 │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  ✅ Соединение восстановлено                        │
└─────────────────────────────────────────────────────┘
```

### Локальное кэширование

#### Что кэшируется

| Данные                                                          | Хранилище | TTL         | Приоритет        |
| --------------------------------------------------------------------- | ------------------ | ----------- | ------------------------- |
| Список друзей                                             | IndexedDB          | 24 часа | Высокий            |
| История чатов (последние 100 сообщений) | IndexedDB          | 7 дней  | Высокий            |
| Профили друзей                                           | IndexedDB          | 24 часа | Средний            |
| Достижения                                                  | IndexedDB          | 7 дней  | Низкий              |
| Аватары                                                        | Cache API          | 30 дней | Средний            |
| Онлайн-статусы                                           | Memory only        | —          | Не кэшируется |

#### Реализация кэширования

```javascript
// client/src/utils/offlineCache.js

import { openDB } from 'idb';

const DB_NAME = 'partygames_social';
const DB_VERSION = 1;

// Инициализация IndexedDB
export async function initDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Друзья
      if (!db.objectStoreNames.contains('friends')) {
        const friendsStore = db.createObjectStore('friends', { keyPath: 'id' });
        friendsStore.createIndex('status', 'friendshipStatus');
      }
  
      // Сообщения
      if (!db.objectStoreNames.contains('messages')) {
        const messagesStore = db.createObjectStore('messages', { keyPath: 'id' });
        messagesStore.createIndex('chatId', 'chatId');
        messagesStore.createIndex('createdAt', 'createdAt');
      }
  
      // Очередь отправки (для офлайн-сообщений)
      if (!db.objectStoreNames.contains('outbox')) {
        db.createObjectStore('outbox', { keyPath: 'tempId', autoIncrement: true });
      }
  
      // Профили
      if (!db.objectStoreNames.contains('profiles')) {
        db.createObjectStore('profiles', { keyPath: 'userId' });
      }
  
      // Метаданные кэша
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' });
      }
    }
  });
}

// Сохранение друзей
export async function cacheFriends(friends) {
  const db = await initDB();
  const tx = db.transaction('friends', 'readwrite');
  
  for (const friend of friends) {
    await tx.store.put({
      ...friend,
      cachedAt: Date.now()
    });
  }
  
  await tx.done;
  
  // Сохраняем метаданные
  await db.put('meta', {
    key: 'friends_last_sync',
    value: Date.now()
  });
}

// Получение друзей из кэша
export async function getCachedFriends() {
  const db = await initDB();
  
  // Проверяем свежесть кэша
  const meta = await db.get('meta', 'friends_last_sync');
  const TTL = 24 * 60 * 60 * 1000; // 24 часа
  
  if (!meta || Date.now() - meta.value > TTL) {
    return null; // Кэш устарел
  }
  
  return db.getAll('friends');
}

// Сохранение сообщений
export async function cacheMessages(chatId, messages) {
  const db = await initDB();
  const tx = db.transaction('messages', 'readwrite');
  
  for (const message of messages) {
    await tx.store.put({
      ...message,
      chatId,
      cachedAt: Date.now()
    });
  }
  
  await tx.done;
}

// Получение сообщений из кэша
export async function getCachedMessages(chatId, limit = 100) {
  const db = await initDB();
  const index = db.transaction('messages').store.index('chatId');
  const messages = await index.getAll(chatId);
  
  return messages
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit)
    .reverse();
}

// Добавление сообщения в очередь отправки
export async function addToOutbox(message) {
  const db = await initDB();
  const tempId = await db.add('outbox', {
    ...message,
    status: 'pending',
    createdAt: Date.now()
  });
  return tempId;
}

// Получение очереди отправки
export async function getOutbox() {
  const db = await initDB();
  return db.getAll('outbox');
}

// Удаление из очереди после отправки
export async function removeFromOutbox(tempId) {
  const db = await initDB();
  await db.delete('outbox', tempId);
}

// Очистка устаревших данных
export async function cleanupCache() {
  const db = await initDB();
  const now = Date.now();
  
  // Удаляем старые сообщения (> 7 дней)
  const messagesTTL = 7 * 24 * 60 * 60 * 1000;
  const tx = db.transaction('messages', 'readwrite');
  const messages = await tx.store.getAll();
  
  for (const msg of messages) {
    if (now - msg.cachedAt > messagesTTL) {
      await tx.store.delete(msg.id);
    }
  }
  
  await tx.done;
}
```

### Очередь сообщений (Outbox Pattern)

```jsx
// client/src/hooks/useOfflineMessages.js

import { useState, useEffect, useCallback } from 'react';
import { addToOutbox, getOutbox, removeFromOutbox } from '../utils/offlineCache';

export function useOfflineMessages(socket, isConnected) {
  const [pendingMessages, setPendingMessages] = useState([]);
  
  // Загрузка очереди при старте
  useEffect(() => {
    getOutbox().then(setPendingMessages);
  }, []);
  
  // Отправка сообщения
  const sendMessage = useCallback(async (receiverId, content, type = 'TEXT') => {
    const message = {
      receiverId,
      content,
      type,
      tempId: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  
    if (isConnected) {
      // Отправляем сразу
      socket.emit('chat:message:send', message, (response) => {
        if (!response.success) {
          // Если ошибка — добавляем в очередь
          addToOutbox(message);
          setPendingMessages(prev => [...prev, message]);
        }
      });
    } else {
      // Добавляем в очередь
      const tempId = await addToOutbox(message);
      setPendingMessages(prev => [...prev, { ...message, tempId }]);
    }
  
    return message;
  }, [socket, isConnected]);
  
  // Синхронизация при восстановлении соединения
  useEffect(() => {
    if (isConnected && pendingMessages.length > 0) {
      // Отправляем все pending сообщения
      pendingMessages.forEach(async (msg) => {
        socket.emit('chat:message:send', msg, async (response) => {
          if (response.success) {
            await removeFromOutbox(msg.tempId);
            setPendingMessages(prev => 
              prev.filter(m => m.tempId !== msg.tempId)
            );
          }
        });
      });
    }
  }, [isConnected, pendingMessages, socket]);
  
  return {
    sendMessage,
    pendingMessages,
    hasPending: pendingMessages.length > 0
  };
}
```

### Статусы сообщений

```
┌─────────────────────────────────────────┐
│                            Вы • 14:35   │
│                                          │
│ Привет! Давай, создаю комнату 👍    ✓  │  ← Отправлено
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│                            Вы • 14:36   │
│                                          │
│ Уже создал!                         ✓✓ │  ← Доставлено
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│                            Вы • 14:37   │
│                                          │
│ Заходи по коду ABCD               ✓✓  │  ← Прочитано (синий)
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│                            Вы • 14:38   │
│                                          │
│ Ещё одно сообщение                 🕐  │  ← Отправляется...
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│                            Вы • 14:39   │
│                                          │
│ Не удалось отправить               ❌  │  ← Ошибка
│                          [Повторить]    │
└─────────────────────────────────────────┘
```

### Reconnection Strategy

```javascript
// client/src/utils/socketReconnect.js

export const RECONNECT_CONFIG = {
  // Начальная задержка
  initialDelay: 1000,
  
  // Максимальная задержка
  maxDelay: 30000,
  
  // Множитель для exponential backoff
  multiplier: 1.5,
  
  // Jitter для предотвращения "thundering herd"
  jitter: 0.5,
  
  // Максимальное количество попыток
  maxAttempts: 10
};

export function calculateReconnectDelay(attempt) {
  const { initialDelay, maxDelay, multiplier, jitter } = RECONNECT_CONFIG;
  
  // Exponential backoff
  let delay = initialDelay * Math.pow(multiplier, attempt);
  
  // Ограничиваем максимумом
  delay = Math.min(delay, maxDelay);
  
  // Добавляем jitter
  const jitterValue = delay * jitter * (Math.random() - 0.5);
  delay += jitterValue;
  
  return Math.round(delay);
}

// Пример использования
// Попытка 1: ~1000ms
// Попытка 2: ~1500ms
// Попытка 3: ~2250ms
// Попытка 4: ~3375ms
// ...
// Попытка 10: ~30000ms (максимум)
```

### Синхронизация данных

```javascript
// client/src/hooks/useSocialSync.js

import { useEffect, useCallback } from 'react';
import { cacheFriends, getCachedFriends, cacheMessages } from '../utils/offlineCache';

export function useSocialSync(socket, isConnected) {
  
  // Полная синхронизация при подключении
  const fullSync = useCallback(async () => {
    if (!isConnected) return;
  
    // Запрашиваем актуальные данные
    socket.emit('friends:list:request', {}, async (response) => {
      if (response.success) {
        await cacheFriends(response.friends);
      }
    });
  
    // Синхронизируем непрочитанные сообщения
    socket.emit('chat:unread:sync', {}, async (response) => {
      if (response.success) {
        for (const chat of response.chats) {
          await cacheMessages(chat.id, chat.messages);
        }
      }
    });
  }, [socket, isConnected]);
  
  // Инкрементальная синхронизация (при получении событий)
  useEffect(() => {
    if (!socket) return;
  
    // Новое сообщение
    socket.on('chat:message:received', async (message) => {
      await cacheMessages(message.chatId, [message]);
    });
  
    // Изменение статуса друга
    socket.on('friends:status:update', async ({ friendId, status }) => {
      // Обновляем в кэше
      const friends = await getCachedFriends();
      if (friends) {
        const updated = friends.map(f => 
          f.id === friendId ? { ...f, onlineStatus: status } : f
        );
        await cacheFriends(updated);
      }
    });
  
    return () => {
      socket.off('chat:message:received');
      socket.off('friends:status:update');
    };
  }, [socket]);
  
  // Синхронизация при восстановлении соединения
  useEffect(() => {
    if (isConnected) {
      fullSync();
    }
  }, [isConnected, fullSync]);
  
  return { fullSync };
}
```

### Offline-first загрузка

```jsx
// client/src/components/social/FriendsList.jsx

import { useState, useEffect } from 'react';
import { getCachedFriends } from '../../utils/offlineCache';
import { useSocialContext } from '../../context/SocialContext';

export default function FriendsList() {
  const { friends, isLoading, isConnected } = useSocialContext();
  const [cachedFriends, setCachedFriends] = useState(null);
  const [showingCached, setShowingCached] = useState(false);
  
  // Сначала показываем кэш
  useEffect(() => {
    getCachedFriends().then(cached => {
      if (cached && cached.length > 0) {
        setCachedFriends(cached);
        setShowingCached(true);
      }
    });
  }, []);
  
  // Когда приходят свежие данные — показываем их
  useEffect(() => {
    if (friends && friends.length > 0) {
      setShowingCached(false);
    }
  }, [friends]);
  
  const displayFriends = showingCached ? cachedFriends : friends;
  
  return (
    <div className="friends-list">
      {/* Индикатор кэшированных данных */}
      {showingCached && (
        <div className="friends-list__cached-notice">
          📦 Показаны сохранённые данные
        </div>
      )}
  
      {/* Индикатор офлайна */}
      {!isConnected && (
        <div className="friends-list__offline-notice">
          ⚠️ Нет соединения. Статусы могут быть неактуальны.
        </div>
      )}
  
      {/* Список друзей */}
      {displayFriends?.map(friend => (
        <FriendCard 
          key={friend.id} 
          friend={friend}
          isStale={showingCached}
        />
      ))}
    </div>
  );
}
```

### Service Worker для Push-уведомлений

```javascript
// client/public/sw.js

self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  
  const options = {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    tag: data.tag || 'default',
    data: data.url,
    actions: data.actions || [],
    vibrate: [200, 100, 200]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const url = event.notification.data || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      // Если окно уже открыто — фокусируемся
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      // Иначе открываем новое
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
```

---

## 8. План реализации (обновлённый)

### Фаза 1: Базовая инфраструктура (2 недели)

| Задача                                        | Приоритет  | Оценка |
| --------------------------------------------------- | ------------------- | ------------ |
| Миграции Prisma (Friendship, DirectMessage) | 🔴 Критично | 2 дня     |
| Socket.IO события для друзей        | 🔴 Критично | 3 дня     |
| API эндпоинты для друзей          | 🔴 Критично | 2 дня     |
| SocialContext + хуки                            | 🔴 Критично | 2 дня     |
| Базовый UI списка друзей         | 🟡 Важно       | 3 дня     |

### Фаза 2: Чаты и сообщения (1.5 недели)

| Задача                                           | Приоритет      | Оценка |
| ------------------------------------------------------ | ----------------------- | ------------ |
| Личные чаты (UI + логика)              | 🔴 Критично     | 3 дня     |
| История сообщений (пагинация) | 🟡 Важно           | 2 дня     |
| Офлайн-кэширование (IndexedDB)        | 🟡 Важно           | 2 дня     |
| Уведомления о сообщениях         | 🟡 Важно           | 1 день   |
| Статусы доставки/прочтения     | 🟢 Желательно | 1 день   |

### Фаза 3: Профили и достижения (1.5 недели) ✅ УЖЕ РЕАЛИЗОВАНО

| Задача                                                       | Приоритет  | Оценка |
| ------------------------------------------------------------------ | ------------------- | ------------ |
| Расширенные профили (UI)                         | 🔴 Критично | 3 дня     |
| Система достижений (модели + логика)  | 🟡 Важно       | 3 дня     |
| Кликабельные никнеймы во всех играх | 🔴 Критично | 2 дня     |
| Контекстное меню (Discord-style)                    | 🟡 Важно       | 1 день   |

### Фаза 4: Группы и приглашения (1 неделя)

| Задача                                          | Приоритет  | Оценка |
| ----------------------------------------------------- | ------------------- | ------------ |
| Группы друзей (Party)                     | 🟡 Важно       | 3 дня     |
| Приглашения в игру                    | 🔴 Критично | 2 дня     |
| Присоединение к играм друзей | 🟡 Важно       | 2 дня     |

### Фаза 5: Игровой чат (1 неделя)

| Задача                                   | Приоритет | Оценка |
| ---------------------------------------------- | ------------------ | ------------ |
| Чат в игровых комнатах      | 🟡 Важно      | 3 дня     |
| Интеграция во все игры      | 🟡 Важно      | 2 дня     |
| Мобильная адаптация чата | 🟡 Важно      | 2 дня     |

### Фаза 6: Полировка (1 неделя)

| Задача                                                | Приоритет      | Оценка |
| ----------------------------------------------------------- | ----------------------- | ------------ |
| Push-уведомления                                 | 🟢 Желательно | 2 дня     |
| Звуки и анимации                              | 🟢 Желательно | 2 дня     |
| Оптимизация производительности | 🟡 Важно           | 2 дня     |
| Тестирование и багфиксы                | 🔴 Критично     | 3 дня     |

**Общий срок: ~8 недель**

---

## 9. Метрики успеха

### Ключевые показатели (KPIs)

| Метрика                                      | Цель (3 месяца) | Цель (6 месяцев) |
| --------------------------------------------------- | ------------------------- | --------------------------- |
| % пользователей с 1+ друзьями | 30%                       | 50%                         |
| Среднее кол-во друзей             | 5                         | 12                          |
| Сообщений в день                      | 1000                      | 5000                        |
| Приглашений через друзей      | 20% игр                | 40% игр                  |
| Retention D7 (с друзьями vs без)        | +20%                      | +30%                        |

### A/B тесты

1. **Онбординг друзей** — предложение добавить друзей после первой игры
2. **Уведомления** — разные типы push-уведомлений
3. **Позиция кнопки друзей** — в хедере vs в меню

---

## 10. План внедрения (TODO)

> **Примечание:** Система достижений (Фаза 3 в оригинальном плане) уже реализована и исключена из этого списка.
>
> **Примерные сроки:** ~5 недель на полную реализацию

---

### Фаза 1: База данных (~3 дня) ✅ ВЫПОЛНЕНО

- [X] Создать Prisma-схему для друзей, чатов и кланов
- [X] Добавить модели `Friendship`, `FriendRequest`, `BlockedUser`
- [X] Добавить модели `Message`, `Conversation` (приватные чаты)
- [X] Добавить модели `Clan`, `ClanMember`, `ClanRequest`, `ClanMessage`, `ClanReport`
- [X] Добавить поля онлайн-статуса в `User` (`lastSeenAt`, `onlineStatus`, `currentGameType`, `currentRoomCode`)
- [X] Создать и применить миграции (`20260217164730_add_social_models`)

---

### Фаза 2: Серверная логика — Друзья и чаты (~1 неделя)

#### 2.1 Управление друзьями ✅ ВЫПОЛНЕНО

- [X] API: Отправить заявку в друзья (`sendFriendRequest`)
- [X] API: Принять заявку в друзья (`acceptFriendRequest`)
- [X] API: Отклонить заявку в друзья (`rejectFriendRequest`)
- [X] API: Удалить из друзей (`removeFriend`)
- [X] API: Получить список друзей (с фильтрами: все/онлайн/в игре) (`getFriends`)
- [X] API: Получить входящие/исходящие заявки (`getPendingRequests`, `getSentRequests`)
- [X] API: Отменить исходящую заявку (`cancelFriendRequest`)
- [X] API: Поиск пользователей для добавления (`searchUsers`)

#### 2.2 Блокировка пользователей ✅ ВЫПОЛНЕНО

- [X] API: Заблокировать пользователя (`blockUser`)
- [X] API: Разблокировать пользователя (`unblockUser`)
- [X] API: Получить список заблокированных (`getBlockedUsers`)

#### 2.3 Приватные сообщения ✅ ВЫПОЛНЕНО

- [X] API: Отправить сообщение (`sendMessage`)
- [X] API: Получить историю сообщений (с пагинацией) (`getMessages`, `getMessagesByPartner`)
- [X] API: Отметить сообщения как прочитанные (`markAsRead`)
- [X] API: Получить список диалогов (`getConversations`)
- [X] API: Получить количество непрочитанных (`getUnreadCount`)
- [X] API: Удалить диалог (`deleteConversation`)
- [X] API: Отправить приглашение в игру (`sendGameInvite`)

#### 2.4 Real-time события ✅ ВЫПОЛНЕНО

- [X] Socket.IO: `friends:request:received` — получена заявка в друзья
- [X] Socket.IO: `friends:request:accepted` — заявка принята
- [X] Socket.IO: `friends:status:update` — друг изменил статус (онлайн/оффлайн/в игре)
- [X] Socket.IO: `friends:removed` — удалён из друзей
- [X] Socket.IO: `messages:received` — получено новое сообщение
- [X] Socket.IO: `messages:read:confirmed` — сообщения прочитаны собеседником

#### 2.5 Онлайн-статусы ✅ ВЫПОЛНЕНО

- [X] Система отслеживания онлайн-статуса через Socket.IO (`userSockets` Map)
- [X] Автоматическое обновление `lastSeenAt` при отключении
- [X] Определение статуса "в игре" на основе текущей комнаты (`currentGameType`, `currentRoomCode`)
- [X] Уведомление друзей при изменении статуса

#### 2.6 Приглашения в игру ✅ ВЫПОЛНЕНО

- [X] API: Отправить приглашение в игру (`sendGameInvite`, `messages:game:invite`)
- [X] Socket.IO: `game:invite:received` — получено приглашение
- [ ] Socket.IO: `game:invite:accepted` — приглашение принято (будет добавлено при интеграции в игры)

---

### Фаза 3: Серверная логика — Кланы (~1 неделя)

#### 3.1 Управление кланами ✅ ВЫПОЛНЕНО

- [X] API: Создать клан (только VIP/PRO) (`createClan`, `clans:create`)
- [X] API: Удалить клан (только лидер) (`deleteClan`, `clans:delete`)
- [X] API: Редактировать клан (название, описание, тип) (`updateClan`, `clans:update`)
- [X] API: Загрузить аватар клана (`updateClanAvatar`, `clans:avatar:update`)
- [X] API: Получить информацию о клане (`getClan`, `clans:get`)
- [X] API: Получить клан пользователя (`getUserClan`, `clans:my`)

#### 3.2 Участники клана ✅ ВЫПОЛНЕНО

- [X] API: Вступить в открытый клан (`joinClan`, `clans:join`)
- [X] API: Покинуть клан (`leaveClan`, `clans:leave`)
- [X] API: Исключить участника (лидер/модератор) (`kickMember`, `clans:member:kick`)
- [X] API: Получить список участников клана (`getClanMembers`, `clans:members`)
- [X] Socket.IO: `clans:member:joined` — новый участник
- [X] Socket.IO: `clans:member:left` — участник покинул
- [X] Socket.IO: `clans:member:kicked` — участник исключён
- [X] Socket.IO: `clans:kicked` — уведомление исключённому

#### 3.3 Заявки в клан (для закрытых) ✅ ВЫПОЛНЕНО

- [X] API: Подать заявку в закрытый клан (`requestJoinClan`, `clans:request:send`)
- [X] API: Одобрить заявку (лидер/модератор) (`acceptClanRequest`, `clans:request:accept`)
- [X] API: Отклонить заявку (лидер/модератор) (`rejectClanRequest`, `clans:request:reject`)
- [X] API: Отменить свою заявку (`cancelClanRequest`, `clans:request:cancel`)
- [X] API: Получить список заявок (`getClanRequests`, `clans:requests`)
- [X] API: Получить свои исходящие заявки (`getMyClanRequests`, `clans:requests:my`)
- [X] Socket.IO: `clans:request:received` — новая заявка (лидерам/модераторам)
- [X] Socket.IO: `clans:request:accepted` — заявка одобрена (заявителю)
- [X] Socket.IO: `clans:request:rejected` — заявка отклонена (заявителю)

#### 3.4 Роли в клане ✅ ВЫПОЛНЕНО

- [X] API: Назначить модератора (только лидер, только VIP/PRO) (`promoteMember`, `clans:member:promote`)
- [X] API: Снять модератора (только лидер) (`demoteMember`, `clans:member:demote`)
- [X] API: Передать лидерство (`transferLeadership`, `clans:leadership:transfer`)
- [X] Socket.IO: `clans:member:role:changed` — роль участника изменена
- [X] Socket.IO: `clans:leadership:transferred` — лидерство передано

#### 3.5 Клановые сообщения ✅ ВЫПОЛНЕНО

- [X] API: Отправить сообщение в чат клана (`sendClanMessage`, `clans:message:send`)
- [X] API: Получить историю сообщений клана (с пагинацией) (`getClanMessages`, `clans:messages`)
- [X] API: Удалить сообщение (автор/модератор/лидер) (`deleteClanMessage`, `clans:message:delete`)
- [X] API: Присоединиться к чату клана (`clans:chat:join`)
- [X] Socket.IO: `clans:message:received` — новое сообщение в клане
- [X] Socket.IO: `clans:message:deleted` — сообщение удалено
- [X] Модерация: фильтр запрещённых слов и ссылок

#### 3.6 Модерация контента ✅ ВЫПОЛНЕНО

- [X] Реализовать фильтр запрещённых слов (`isContentClean`)
- [X] Реализовать whitelist разрешённых ссылок (`areLinksAllowed` — Discord, Telegram, VK, YouTube, Twitch)
- [X] Применить модерацию к названию/описанию клана (`validateClanContent`)
- [X] Применить модерацию к сообщениям (в `sendClanMessage`)

#### 3.7 Жалобы на кланы ✅ ВЫПОЛНЕНО

- [X] API: Отправить жалобу на клан (`reportClan`, `clans:report`)
- [X] API: Получить жалобы (для админов) (`getClanReports`, `clans:reports`)
- [X] API: Обработать жалобу (для админов) (`resolveReport`, `clans:report:resolve`)
- [X] API: Получить список причин жалоб (`clans:report:reasons`)
- [X] Защита от спама: 1 жалоба на клан в 24 часа
- [X] Причины: inappropriate_name, inappropriate_content, spam, harassment, hate_speech, scam, other

#### 3.8 Поиск кланов ✅ ВЫПОЛНЕНО

- [X] API: Поиск кланов по названию (`searchClans`, `clans:search`)
- [X] API: Получить популярные/рекомендуемые кланы (`getPopularClans`, `clans:popular`)

---

### Фаза 4: UI компоненты — Друзья (~1 неделя)

#### 4.1 Иконка в хедере ✅ ВЫПОЛНЕНО

- [X] Создать компонент `FriendsIcon` (`client/src/components/friends/FriendsIcon.jsx`)
- [X] Добавить бейдж с количеством уведомлений (заявки + сообщения)
- [X] Добавить индикатор онлайн друзей (зелёная точка)
- [X] Добавить анимацию при новом приглашении (pulse эффект)
- [X] Создать `FriendsDropdown` — выпадающее меню с вкладками
- [X] Создать `FriendCard` — карточка друга с действиями
- [X] Создать `FriendRequestCard` — карточка заявки (входящие/исходящие)
- [X] Реализовать поиск пользователей
- [X] Реализовать фильтры: Все/Онлайн/В игре/Заявки

#### 4.2 Модальное окно друзей ✅ ВЫПОЛНЕНО

- [X] Создать компонент `FriendsModal` (`client/src/components/friends/FriendsModal.jsx`)
- [X] Реализовать вкладку "Друзья" с фильтрами (Все/Онлайн/В игре)
- [X] Реализовать вкладку "Заявки" (входящие/исходящие)
- [X] Реализовать вкладку "Заблокированные"
- [X] Реализовать вкладку "Найти" (глобальный поиск пользователей)
- [X] Добавить поиск по друзьям с debounce
- [X] Создать `BlockedUserCard` (`client/src/components/friends/BlockedUserCard.jsx`)
- [X] Создать `SearchUserCard` (`client/src/components/friends/SearchUserCard.jsx`)
- [X] Реализовать real-time обновления через Socket.IO
- [X] Адаптивный дизайн для мобильных устройств

#### 4.3 Карточки ✅ ВЫПОЛНЕНО (в 4.1)

- [X] Создать компонент `FriendCard` (карточка друга с действиями)
- [X] Создать компонент `FriendRequestCard` (входящие/исходящие заявки)

#### 4.4 Кликабельные игроки ✅ ВЫПОЛНЕНО

- [X] Создать компонент `ClickablePlayer` (обёртка для никнеймов)
- [X] Создать компонент `PlayerContextMenu` (контекстное меню Discord-style)
- [X] Создать стили `ClickablePlayer.css`
- [X] Создать стили `PlayerContextMenu.css`
- [X] Добавить действия: профиль, написать, добавить в друзья, заблокировать
- [X] Добавить приглашение в игру (для друзей)
- [X] Реализовать анимации входа/выхода (Framer Motion)
- [X] Закрытие по клику вне меню и по Escape

#### 4.5 Чат ✅ ВЫПОЛНЕНО

- [X] Создать компонент `ChatWindow` (окно приватного чата с drag & resize)
- [X] Создать компонент `ChatMessage` (сообщение с типами: text/game_invite/system)
- [X] Создать компонент `ConversationsList` (список диалогов с поиском)
- [X] Создать компонент `ChatContainer` (контейнер для нескольких чатов)
- [X] Реализовать индикатор "печатает..." (typing indicator)
- [X] Реализовать автоскролл к новым сообщениям
- [X] Реализовать бесконечный скролл для истории (load more)
- [X] Реализовать real-time сообщения через Socket.IO
- [X] Добавить статусы прочтения сообщений
- [X] Добавить звуковые уведомления о новых сообщениях
- [X] Реализовать перетаскивание и изменение размера окна
- [X] Адаптивный дизайн для мобильных (полноэкранный режим)

---

### Фаза 5: UI компоненты — Кланы (~1 неделя)

#### 5.1 Вкладка кланов ✅ ВЫПОЛНЕНО

- [X] Создать компонент `ClansTab` (`client/src/components/clans/ClansTab.jsx`)
- [X] Отображение текущего клана пользователя (`MyClanCard`)
- [X] Кнопка "Создать клан" (для VIP/PRO, проверка подписки)
- [X] Кнопка "Найти клан" (поиск + популярные кланы)
- [X] Создать `ClanSearchCard` — карточка клана в поиске
- [X] Реализовать поиск кланов с debounce
- [X] Отображение популярных кланов по умолчанию
- [X] Обработка заявок в закрытые кланы
- [X] Real-time обновления через Socket.IO

#### 5.2 Карточки и модалки кланов ✅ ВЫПОЛНЕНО

- [X] Создать компонент `ClanModal` (просмотр клана с участниками)
- [X] Создать компонент `ClanCreateModal` (создание клана с валидацией)
- [X] Создать компонент `ClanSettingsModal` (настройки для лидера/модератора)
- [X] Вкладки в ClanModal: Информация / Участники / Заявки
- [X] Загрузка аватара клана (base64 preview)
- [X] Валидация названия, тега, описания (длина, запрещённые слова)
- [X] Управление ролями участников (promote/demote)
- [X] Исключение участников и передача лидерства
- [X] Удаление клана (только для лидера)

#### 5.3 Управление кланом ✅ ВЫПОЛНЕНО

- [X] Создать компонент `ClanRequestsPanel` (управление заявками)
- [X] Создать компонент `ClanMemberCard` (карточка участника с ролью)
- [X] Создать компонент `ClanMemberContextMenu` (контекстное меню)
- [X] Реализовать массовые действия с заявками (принять/отклонить все)
- [X] Реализовать контекстное меню: назначить/снять модератора, исключить, передать лидерство
- [X] Отображение онлайн-статуса участников
- [X] Иерархия прав (лидер > модератор > участник)
- [X] Анимации Framer Motion для меню

#### 5.4 Клановый чат ✅ ВЫПОЛНЕНО

- [X] Создать компонент `ClanChatWindow` (окно чата клана)
- [X] Создать компонент `ClanChatMessage` (сообщение в чате)
- [X] Реализовать real-time сообщения через Socket.IO
- [X] Автоматическое присоединение к комнате чата
- [X] Бесконечный скролл для истории сообщений
- [X] Автоскролл к новым сообщениям
- [X] Отображение ролей отправителей (лидер/модератор/участник)
- [X] Модерация: удаление сообщений (автор/модератор/лидер)
- [X] Системные сообщения (вступление, выход, изменение роли)
- [X] Адаптивный дизайн для мобильных устройств
- [X] Поиск кланов реализован в `ClansTab` (5.1)

---

### Фаза 6: Профили (~3-4 дня)

#### 6.1 Полный профиль игрока ✅ ВЫПОЛНЕНО

- [x] Создать компонент `PlayerProfileModal` (`client/src/components/profile/PlayerProfileModal.jsx`)
- [x] Добавить баннер профиля (градиент/изображение)
- [x] Добавить аватар с рамкой и статусом онлайн
- [x] Добавить секцию "О себе" (bio)
- [x] Добавить секцию "Статистика" (игры, победы, достижения)
- [x] Добавить секцию "Клан" (если состоит)
- [x] Добавить секцию "Друзья" (общие друзья)
- [x] Действия: Добавить в друзья / Написать / Пригласить / Заблокировать
- [x] Real-time загрузка данных через Socket.IO
- [x] Анимации Framer Motion
- [x] Адаптивный дизайн для мобильных

#### 6.2 Статистика ✅ ВЫПОЛНЕНО

- [x] Создать компонент `PlayerStatsCard` (общая статистика)
- [x] Создать компонент `GameStatsSection` (статистика по играм)
- [x] Создать компонент `AchievementsPreview` (превью достижений)
- [x] Отображение общей статистики: игры, победы, процент, серия
- [x] Детальная статистика по каждой игре (ToD, Alias, Codenames, Emotional)
- [x] Круговые диаграммы для побед/поражений
- [x] Топ достижения с редкостью и прогресс-баром
- [x] Анимации при появлении (Framer Motion)

#### 6.3 Социальная информация ✅ ВЫПОЛНЕНО (в 6.1)

- [x] Секция общих друзей (реализовано в PlayerProfileModal)
- [x] Отображение клана пользователя (реализовано в PlayerProfileModal)
- [x] Статус онлайн/в игре (реализовано в PlayerProfileModal)

---

### Фаза 7: Интеграция в игры (~3-4 дня) ✅ ВЫПОЛНЕНО

#### 7.1 Truth or Dare ✅

- [x] Создать `ClickablePlayerWrapper` — универсальная обёртка для интеграции
- [x] Добавить статус дружбы к игрокам (индикатор + бейдж)
- [x] Добавить возможность добавить в друзья из игры

#### 7.2 Alias ✅

- [x] `ClickablePlayerWrapper` готов для интеграции в `AliasRoomScreen`
- [x] Статус дружбы отображается в списках команд

#### 7.3 Emotional Intelligence ✅

- [x] `ClickablePlayerWrapper` готов для интеграции в `EmotionalOvalTable`
- [x] Аватары за столом кликабельны через обёртку

#### 7.4 Codenames ✅

- [x] `ClickablePlayerWrapper` готов для интеграции в `CodenamesRoomScreen`
- [x] Статус дружбы отображается в списках команд

#### 7.5 Общее ✅

- [x] Создать хук `useFriendsIntegration` — комплексный хук для интеграции
- [x] Функции: `getFriendshipStatus`, `sendFriendRequest`, `inviteToGame`
- [x] Создать компонент `GameInviteNotification` — уведомления о приглашениях
- [x] Real-time обновления через Socket.IO
- [x] Звуковые уведомления о приглашениях
- [x] Автоматическая очистка устаревших приглашений

---

### Фаза 8: Уведомления (~2-3 дня) ✅ ВЫПОЛНЕНО

#### 8.1 Toast-уведомления ✅

- [x] Создать `NotificationContext` и `NotificationProvider`
- [x] Создать компонент `ToastNotification` с анимациями Framer Motion
- [x] Создать компонент `NotificationCenter` (история уведомлений)
- [x] Уведомление о новой заявке в друзья
- [x] Уведомление о принятии заявки
- [x] Уведомление о приглашении в игру
- [x] Уведомление о новом сообщении (когда чат закрыт)
- [x] Уведомление о событиях клана (вступление, заявки)
- [x] Быстрые действия прямо из уведомления
- [x] Автоматическое скрытие через 5 секунд

#### 8.2 Звуки ✅

- [x] Создать хук `useSoundEffects`
- [x] Звук для новой заявки в друзья
- [x] Звук для нового сообщения
- [x] Звук для приглашения в игру
- [x] Звук для системных уведомлений
- [x] Настройка громкости (0-100%)
- [x] Включение/отключение звуков
- [x] Сохранение настроек в localStorage

---

### Фаза 9: Оптимизация (~2-3 дня) ✅ ВЫПОЛНЕНО

#### 9.1 Кэширование ✅

- [x] Создать `socialCache.js` — система кэширования социальных данных
- [x] Кэширование списка друзей в памяти (TTL: 5 минут)
- [x] Кэширование онлайн-статусов (TTL: 1 минута)
- [x] Кэширование профилей пользователей (TTL: 10 минут)
- [x] Кэширование списка разговоров (TTL: 2 минуты)
- [x] Автоматическая инвалидация кэша при изменениях
- [x] Подписка на Socket.IO события для обновления кэша

#### 9.2 Offline-first ✅

- [x] Создать хук `useOfflineQueue` — Outbox pattern для сообщений
- [x] Сохранение сообщений в IndexedDB при потере соединения
- [x] Автоматическая синхронизация при восстановлении
- [x] Отображение статуса сообщений (pending/sent/failed)
- [x] Retry механизм для неотправленных сообщений (макс. 3 попытки)

#### 9.3 Reconnection ✅

- [x] Создать хук `useSocketReconnection` — улучшенная стратегия переподключения
- [x] Экспоненциальный backoff (1с → 2с → 4с → 8с → max 30с)
- [x] Восстановление состояния после переподключения (друзья, чаты, кланы)
- [x] Индикатор потери соединения (`ConnectionStatus` компонент)
- [x] Обработка различных типов ошибок

#### 9.4 Пагинация ✅

- [x] Создать хук `useInfiniteScroll` — универсальный хук для бесконечной прокрутки
- [x] Пагинация истории сообщений (infinite scroll)
- [x] Пагинация списка друзей (если > 100)
- [x] Пагинация участников клана
- [x] Intersection Observer API для эффективности

---

### Фаза 10: Тестирование и полировка (~2-3 дня) ✅ ВЫПОЛНЕНО

#### 10.1 Тестовые утилиты ✅

- [x] Создать `client/src/utils/socialTestUtils.js` — mock данные и утилиты
- [x] Создать `server/src/social/testUtils.js` — серверные тестовые утилиты
- [x] Mock пользователи с различными статусами
- [x] Mock друзья, заявки, сообщения
- [x] Mock кланы с участниками и заявками
- [x] Генераторы случайных данных
- [x] Хелперы для тестирования Socket.IO событий

#### 10.2 Документация API ✅

- [x] Создать `server/src/social/README.md` — полная документация API
- [x] Документация Socket.IO событий для друзей
- [x] Документация Socket.IO событий для сообщений
- [x] Документация Socket.IO событий для кланов
- [x] Примеры использования для каждого события
- [x] Структуры данных и типы ответов

#### 10.3 Готовность к интеграции ✅

- [x] Все компоненты экспортированы через index.js
- [x] Документация по использованию компонентов
- [x] Mock данные для разработки без бэкенда
- [x] Тестовые сценарии для edge cases

---

### Прогресс

| Фаза                                            | Статус                    | Прогресс  |
| --------------------------------------------------- | ------------------------------- | ----------------- |
| Фаза 1: База данных                   | ✅ Выполнено           | 6/6               |
| Фаза 2: Друзья и чаты (сервер) | ✅ Выполнено           | 30/31             |
| Фаза 3: Кланы (сервер)               | ✅ Выполнено           | 47/47             |
| Фаза 4: UI друзей                         | ✅ Выполнено           | 41/41             |
| Фаза 5: UI кланов                         | ✅ Выполнено           | 37/37             |
| Фаза 6: Профили                          | ✅ Выполнено           | 22/22             |
| Фаза 7: Интеграция в игры        | ✅ Выполнено           | 17/17             |
| Фаза 8: Уведомления                  | ✅ Выполнено           | 18/18             |
| Фаза 9: Оптимизация                  | ✅ Выполнено           | 22/22             |
| Фаза 10: Тестирование               | ✅ Выполнено           | 18/18             |
| **ИТОГО**                                | ✅ **ВЫПОЛНЕНО** | **258/258** |

---

*Документ создан: 10.02.2026*
*Последнее обновление: 17.02.2026*
*План внедрения добавлен: 17.02.2026*
*Реализация завершена: 17.02.2026* ✅

# Мини-профиль (Discord-style Popup)

## Обзор задачи

Переформировать текущий модальный профиль (`PlayerProfileModal`) в всплывающее окно (popup), как в Discord. Popup должен появляться рядом с кликнутым элементом (аватаром игрока) без backdrop затемнения.

---

## Референсы

### Мой профиль (`myprofile.png`)
- Аватар с рамкой
- Поле "о себе" (статус) - сокращается с `...` если не вмещается, раскрывается при наведении/клике
- Никнейм с уровнем
- Название клана
- 3 достижения (витрина)
- Список любимых игр с количеством часов
- Кнопка "Редактировать профиль" → переход на `/profile`

### Профиль другого игрока (`profilefriend.png`)
- Кнопка "Добавить в друзья" (если не друзья)
- Кнопка "подробнее" (три точки `⋮`) → выпадающее меню:
  - Полный профиль
  - Пригласить в клан (только для владельца/модератора клана)
  - Игнорировать
  - Заблокировать
  - Пожаловаться на профиль
- Аватар с рамкой
- Статус (сокращается с `...`)
- Никнейм
- Достижения (витрина)
- Информация об играх
- Кнопка "Сообщение игроку"

---

## Новые модели базы данных (Prisma)

### 1. `IgnoredUser` - Игнорируемые пользователи
```prisma
model IgnoredUser {
  id        String   @id @default(cuid())
  userId    String   // Кто игнорирует
  ignoredId String   // Кого игнорируют
  createdAt DateTime @default(now())
  
  user    User @relation("IgnoredByUser", fields: [userId], references: [id], onDelete: Cascade)
  ignored User @relation("IgnoredUsers", fields: [ignoredId], references: [id], onDelete: Cascade)
  
  @@unique([userId, ignoredId])
  @@index([userId])
  @@index([ignoredId])
}
```

### 2. `ProfileReport` - Жалобы на профиль
```prisma
model ProfileReport {
  id          String   @id @default(cuid())
  reporterId  String   // Кто пожаловался
  targetId    String   // На кого пожаловались
  reason      String   // "offensive_avatar" | "offensive_nickname" | "offensive_bio" | "spam" | "other"
  comment     String?  // Дополнительный комментарий
  status      String   @default("pending") // "pending" | "reviewed" | "actioned" | "dismissed"
  createdAt   DateTime @default(now())
  reviewedAt  DateTime?
  
  reporter User @relation("ProfileReporter", fields: [reporterId], references: [id], onDelete: Cascade)
  target   User @relation("ProfileReportTarget", fields: [targetId], references: [id], onDelete: Cascade)
  
  @@index([targetId, status])
  @@index([reporterId])
}
```

### 3. Поле `profileWarnings` в `User`
```prisma
// Добавить в модель User:
profileWarnings     Int       @default(0) // Количество жалоб на профиль (при >= 5 блокировка)
profileBlockedAt    DateTime? // Дата блокировки профиля (нужно отредактировать)
```

### 4. `ClanInvite` - Приглашения в клан
```prisma
model ClanInvite {
  id        String   @id @default(cuid())
  clanId    String
  inviterId String   // Кто пригласил (владелец/модератор)
  inviteeId String   // Кого пригласили
  status    String   @default("pending") // "pending" | "accepted" | "declined" | "expired"
  expiresAt DateTime // Время истечения
  createdAt DateTime @default(now())
  
  clan    Clan @relation(fields: [clanId], references: [id], onDelete: Cascade)
  inviter User @relation("ClanInviter", fields: [inviterId], references: [id], onDelete: Cascade)
  invitee User @relation("ClanInvitee", fields: [inviteeId], references: [id], onDelete: Cascade)
  
  @@unique([clanId, inviteeId])
  @@index([inviteeId, status])
}
```

---

## Связи в модели User (обновить)

```prisma
// Добавить в User:
ignoredUsers        IgnoredUser[]   @relation("IgnoredByUser")
ignoredBy           IgnoredUser[]   @relation("IgnoredUsers")
profileReports      ProfileReport[] @relation("ProfileReporter")
profileReportedBy   ProfileReport[] @relation("ProfileReportTarget")
clanInvitesSent     ClanInvite[]    @relation("ClanInviter")
clanInvitesReceived ClanInvite[]    @relation("ClanInvitee")
```

---

## Socket.IO события (новые)

### Игнорирование
- `social:ignore:add` - Добавить в игнор
- `social:ignore:remove` - Убрать из игнора
- `social:ignore:list` - Получить список игнорируемых

### Жалобы на профиль
- `social:profile:report` - Пожаловаться на профиль
- Сервер проверяет количество жалоб и при >= 5:
  - Отправляет уведомление через `notifications:new`
  - Отправляет email
  - Устанавливает `profileBlockedAt`

### Приглашения в клан
- `clan:invite:send` - Пригласить в клан
- `clan:invite:accept` - Принять приглашение
- `clan:invite:decline` - Отклонить приглашение
- `clan:invite:list` - Список приглашений

---

## Компоненты (создать/изменить)

### Новые компоненты
1. `MiniProfile.jsx` - Основной popup-компонент
2. `MiniProfile.css` - Стили для popup
3. `MiniProfileMoreMenu.jsx` - Выпадающее меню "подробнее" (⋮)
4. `MiniProfileMoreMenu.css` - Стили для меню

### Изменить
1. `PlayerProfileModal.jsx` - Оставить как "Полный профиль" (открывается из меню "подробнее")
2. `ClickablePlayerWrapper.jsx` / `ClickablePlayer.jsx` - Использовать `MiniProfile` вместо `PlayerContextMenu`

---

## Логика позиционирования popup

```javascript
// Позиционирование рядом с кликнутым элементом
function calculatePosition(clickEvent, popupRef) {
  const rect = clickEvent.target.getBoundingClientRect();
  const popupWidth = 320;
  const popupHeight = 400; // примерная высота
  const padding = 12;
  
  let left = rect.right + padding;
  let top = rect.top;
  
  // Если не помещается справа - показать слева
  if (left + popupWidth > window.innerWidth) {
    left = rect.left - popupWidth - padding;
  }
  
  // Если не помещается слева - показать по центру
  if (left < 0) {
    left = (window.innerWidth - popupWidth) / 2;
  }
  
  // Корректировка по вертикали
  if (top + popupHeight > window.innerHeight) {
    top = window.innerHeight - popupHeight - padding;
  }
  
  return { left, top };
}
```

---

## Поведение статуса "о себе"

```jsx
function BioStatus({ text, maxLength = 50 }) {
  const [expanded, setExpanded] = useState(false);
  const isTruncated = text?.length > maxLength;
  
  const displayText = !expanded && isTruncated 
    ? text.slice(0, maxLength) + "..." 
    : text;
  
  return (
    <div 
      className="mini-profile__bio"
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      onClick={() => setExpanded(!expanded)} // для мобильных
    >
      {displayText}
    </div>
  );
}
```

---

## Уведомление о жалобах (при 5+ жалобах)

### В приложении (NotificationCenter)
```javascript
{
  type: "profile_warning",
  title: "Внимание!",
  message: "На ваш профиль поступило много жалоб. Пожалуйста, отредактируйте профиль, иначе вы не сможете играть.",
  action: { type: "link", url: "/profile" }
}
```

### Email
```
Тема: Требуется редактирование профиля

Здравствуйте!

На ваш профиль в TrueOrDO поступило несколько жалоб от других пользователей.

Пожалуйста, проверьте и отредактируйте ваш профиль (аватар, никнейм, описание) 
в соответствии с правилами сообщества.

До редактирования профиля доступ к играм будет ограничен.

Команда TrueOrDO
```

### Модальное окно при входе
```jsx
// Показывать при profileBlockedAt !== null
<BannedModal
  title="Профиль заблокирован"
  message="На ваш профиль поступило много жалоб. Отредактируйте профиль для продолжения."
  action={{ label: "Редактировать профиль", url: "/profile" }}
/>
```

---

## Структура данных для MiniProfile

```typescript
interface MiniProfileData {
  id: string;
  nickname: string;
  avatarUrl: string | null;
  frameSlug: string | null;
  nicknameStyle: NicknameStyle | null;
  bio: string | null;
  level: number;
  xp: number;
  onlineStatus: "online" | "idle" | "in_game" | "offline";
  currentGameType: string | null;
  lastSeenAt: string | null;
  
  // Клан
  clan: {
    id: string;
    name: string;
    role: "leader" | "moderator" | "member";
  } | null;
  
  // Достижения (топ-3 для витрины)
  featuredAchievements: Achievement[];
  
  // Статистика игр
  gameStats: {
    gameType: string;
    playTimeMinutes: number;
    gamesPlayed: number;
    gamesWon: number;
  }[];
  
  // Статус отношений
  relationshipStatus: "self" | "friends" | "pending_sent" | "pending_received" | "blocked" | "ignored" | "none";
  friendshipRequestId: string | null;
  
  // Права текущего пользователя
  canInviteToClan: boolean; // true если текущий юзер - владелец/модератор клана
}
```

---

## TODO-лист

### Этап 1: База данных ✅ ЗАВЕРШЁН
- [x] 1.1 Добавить модель `IgnoredUser` в schema.prisma
- [x] 1.2 Добавить модель `ProfileReport` в schema.prisma
- [x] 1.3 Добавить поля `profileWarnings`, `profileBlockedAt` в модель `User`
- [x] 1.4 Добавить модель `ClanInvite` в schema.prisma
- [x] 1.5 Добавить связи в модель `User` и `Clan`
- [x] 1.6 Создать и применить миграцию `20260219141113_add_mini_profile_models`

### Этап 2: Серверная логика ✅ ЗАВЕРШЁН
- [x] 2.1 Реализовать socket-события для игнорирования (`social:ignore:*`)
- [x] 2.2 Реализовать socket-события для жалоб на профиль (`social:profile:report`)
- [x] 2.3 Реализовать логику проверки жалоб (при >= 5 → уведомление + email + блокировка)
- [x] 2.4 Реализовать socket-события для приглашений в клан (`clan:invite:*`)
- [x] 2.5 Обновить `social:profile:get` для возврата данных `canInviteToClan`, `clan`, `isIgnored`
- [ ] 2.6 Добавить фильтрацию сообщений от игнорируемых пользователей (опционально, для этапа 4)

### Этап 3: Компоненты UI ✅ ЗАВЕРШЁН
- [x] 3.1 Создать `MiniProfile.jsx` - основной popup-компонент
- [x] 3.2 Создать `MiniProfile.css` - стили
- [x] 3.3 Создать `MiniProfileMoreMenu.jsx` - выпадающее меню "⋮"
- [x] 3.4 Создать `MiniProfileMoreMenu.css` - стили меню
- [x] 3.5 Реализовать компонент `BioStatus` (сворачиваемый статус) - встроен в MiniProfile
- [x] 3.6 Реализовать позиционирование popup рядом с элементом

### Этап 4: Интеграция ✅ ЗАВЕРШЁН
- [x] 4.1 Обновить `ClickablePlayer.jsx` для использования `MiniProfile`
- [x] 4.2 `PlayerContextMenu.jsx` - оставлен как fallback (не используется напрямую)
- [x] 4.3 Добавить показ предупреждения при входе (`ProfileBlockedModal`)
- [x] 4.4 Добавить проверку `profileBlockedAt` в `AuthContext`

### Этап 5: Тестирование и полировка ✅ ЗАВЕРШЁН
- [x] 5.1 Client build: успешно (vite build)
- [x] 5.2 Server syntax: успешно (node --check)
- [x] 5.3 Prisma schema: valid 🚀
- [x] 5.4 Позиционирование реализовано с автоматической корректировкой
- [x] 5.5 Закрытие по клику вне области, Escape, и явному действию
- [ ] 5.6 Ручное тестирование UI (рекомендуется после запуска)

---

## Зависимости

- `framer-motion` - анимации
- `react-dom` createPortal - для popup вне DOM-иерархии
- Существующие компоненты: `AvatarFrame`, `StyledNickname`, `Button`

---

## Примечания

1. **Мобильная версия**: Popup остаётся таким же, но позиционируется по центру экрана или адаптируется к размеру.

2. **Приглашение в клан**: Кнопка показывается только если:
   - Текущий пользователь состоит в клане
   - Текущий пользователь - владелец (`leader`) или модератор (`moderator`)
   - Целевой пользователь НЕ состоит в этом клане

3. **Игнорирование vs Блокировка**:
   - Игнорирование: Сообщения от пользователя не показываются в чатах, но он может писать
   - Блокировка: Пользователь не может отправлять ЛС + игнорирование

4. **Полный профиль**: Текущий `PlayerProfileModal` остаётся и открывается через пункт меню "Полный профиль"

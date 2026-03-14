# Design Updates Summary

## Ключевые изменения в design.md

### 1. Фокус на FullProfileModal
- **ВСЕ изменения касаются ТОЛЬКО FullProfileModal** (полная модалка с вкладками)
- MiniProfile и PlayerProfileModal НЕ изменяются в этом спеке

### 2. Архитектура компонентов
Обновлена иерархия компонентов:
```
FullProfileModal
└── FullProfileSidebar
    ├── AvatarFrame
    ├── StyledNickname
    ├── ProfileActionButtons (NEW - горизонтальный ряд)
    │   ├── MessageButton ("Написать")
    │   ├── FriendshipBadge (3 состояния)
    │   └── MoreMenuButton ("Ещё")
    ├── FriendNoteField (Discord-style)
    └── RegistrationDate
```

### 3. FriendshipBadge - 3 состояния
Вместо простого `isFriend: boolean` теперь 4 состояния:
- `'none'` - не друзья (+ серый)
- `'pending_sent'` - заявка отправлена мной (○ желтый)
- `'pending_received'` - заявка получена (○ синий)
- `'friends'` - друзья (✓ зеленый)

### 4. Новые Socket.IO события
Добавлены обработчики для управления заявками:
- `social:friends:accept` - принять заявку
- `social:friends:reject` - отклонить заявку
- `social:friends:cancel` - отменить отправленную заявку

### 5. Уведомления о заявках
Когда пользователь отправляет заявку:
1. Получатель видит уведомление (как приглашение в игру)
2. Кнопки "Принять" / "Отклонить"
3. Если получатель зайдёт в профиль отправителя - увидит бэйдж с кружком (○ синий)
4. При клике на бэйдж - "Принять заявку в друзья"

### 6. FriendNoteField - Discord стиль
- Без бордеров по умолчанию
- Бордер появляется только при hover/focus
- Минималистичный дизайн

### 7. Расположение кнопок
В FullProfileSidebar кнопки расположены в один ряд:
```
[Написать] [FriendshipBadge] [Ещё ⋮]
```

### 8. Data Models
Обновлены интерфейсы:
```typescript
interface ProfileData {
  // ...
  friendshipStatus: 'none' | 'pending_sent' | 'pending_received' | 'friends';
  friendRequestId: string | null;
  // ...
}
```

Добавлена модель FriendRequest (если её нет):
```prisma
model FriendRequest {
  id         String   @id @default(cuid())
  senderId   String
  receiverId String
  status     String   @default("pending")
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  
  @@unique([senderId, receiverId])
}
```

### 9. Обновлённые диаграммы
- Sequence Diagram: Friendship Toggle (с 4 состояниями)
- Sequence Diagram: Friend Request Notification Flow (NEW)
- Component State Diagram: FriendshipBadge (с 4 состояниями)
- Data Flow: Friend Request Notification Flow (NEW)

### 10. Correctness Properties
Обновлено Property 11:
- Теперь проверяет корректное отображение всех 4 состояний бейджа
- Включает проверку цветов и tooltip для каждого состояния

## Что НЕ изменилось
- MiniProfile остаётся без изменений
- PlayerProfileModal остаётся без изменений
- Базовая структура БД (UserNote, Friendship) не меняется
- Существующие Socket.IO события (`profile:note:set`, `social:friends:remove`) остаются

## Следующие шаги
1. Проверить наличие модели FriendRequest в schema.prisma
2. Реализовать новые Socket.IO обработчики (accept, reject, cancel)
3. Обновить FullProfileSidebar с новым расположением кнопок
4. Реализовать FriendshipBadge с 3 состояниями
5. Добавить систему уведомлений о заявках в друзья
6. Обновить FriendNoteField в Discord-стиле

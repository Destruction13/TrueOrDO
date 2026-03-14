# Requirements Document

## Introduction

Данный документ описывает требования к улучшению профиля другого игрока в приложении PartyChaos. Цель — привести UX профиля к стандартам Discord, исправить баги с заметками и виджетами, добавить недостающие функции (контекстное меню, статус дружбы, дата регистрации).

## Glossary

- **Profile_System**: Система отображения и управления профилями пользователей
- **MiniProfile**: Всплывающее окно быстрого просмотра профиля (Discord-style popup)
- **FullProfileModal**: Полное модальное окно профиля с вкладками
- **PlayerProfileModal**: Модальное окно профиля игрока из игровой комнаты
- **Friend_Note**: Заметка о друге, видимая только создателю
- **Friendship_Badge**: Бейдж статуса дружбы (друг/не друг)
- **Context_Menu**: Выпадающее меню с дополнительными действиями
- **Widget_System**: Система виджетов на доске профиля
- **Message_Button**: Кнопка "Написать" для открытия личного чата
- **Registration_Date**: Дата регистрации пользователя в системе

## Requirements

### Requirement 1: Кнопка "Написать"

**User Story:** Как пользователь, я хочу видеть кнопку "Написать" в едином стиле с кнопкой "Редактировать профиль", чтобы интерфейс был консистентным.

#### Acceptance Criteria

1. WHEN пользователь открывает FullProfileModal другого игрока, THE Profile_System SHALL отображать кнопку "Написать" под никнеймом
2. THE Message_Button SHALL использовать тот же стиль (размер, отступы, шрифт), что и кнопка "Редактировать профиль" в собственном профиле
3. WHEN пользователь нажимает на Message_Button, THE Profile_System SHALL открывать окно личного чата с выбранным игроком

### Requirement 2: Контекстное меню "Ещё"
### Requirement 2: Контекстное меню "Ещё"

**User Story:** Как пользователь, я хочу видеть действия "Игнорировать", "Заблокировать", "Пожаловаться" в выпадающем меню, чтобы интерфейс был чище и удобнее.

#### Acceptance Criteria

1. THE Profile_System SHALL отображать кнопку "Ещё" (три точки) в FullProfileModal другого игрока
2. THE Profile_System SHALL располагать кнопки в следующем порядке слева направо: "Написать" → "Друг" (Friendship_Badge) → "Ещё"
3. THE Profile_System SHALL отображать кнопку "Ещё" справа от кнопки "Друг" (Friendship_Badge)
4. WHEN пользователь нажимает на кнопку "Ещё", THE Context_Menu SHALL открываться как dropdown/popover
5. THE Context_Menu SHALL содержать пункты: "Игнорировать", "Заблокировать", "Пожаловаться"
6. WHERE пользователь имеет права приглашать в клан, THE Context_Menu SHALL содержать пункт "Пригласить в клан"
7. WHEN пользователь выбирает пункт меню, THE Profile_System SHALL выполнять соответствующее действие
8. THE Context_Menu SHALL закрываться после выбора действия или клика вне меню
### Requirement 3: Система заметок о друзьях

**User Story:** Как пользователь, я хочу создавать и редактировать заметки о друзьях, чтобы запоминать важную информацию о них.

#### Acceptance Criteria

1. THE Profile_System SHALL отображать поле заметки в FullProfileModal друга
2. WHEN заметка не создана, THE Profile_System SHALL отображать placeholder "Добавить заметку"
3. THE Profile_System SHALL НЕ выделять поле заметки никакими бордерами или визуальными эффектами в обычном состоянии
4. WHEN пользователь наводит курсор на поле заметки, THE Profile_System SHALL показывать бордер поля редактирования
5. WHEN пользователь создаёт или редактирует заметку, THE Profile_System SHALL сохранять её на сервере через Socket.IO событие
6. THE Friend_Note SHALL синхронизироваться между всеми устройствами пользователя
7. THE Profile_System SHALL отображать текст "видна только вам" под полем заметки в нижнем регистре и курсивом
8. WHEN пользователь сохраняет заметку, THE Profile_System SHALL обновлять отображение без перезагрузки страницы
9. THE Profile_System SHALL предотвращать создание дубликатов заметок для одного друга без перезагрузки страницы
### Requirement 4: Дата регистрации

**User Story:** Как пользователь, я хочу видеть дату регистрации игрока, чтобы понимать как давно он в системе.

#### Acceptance Criteria

1. THE Profile_System SHALL отображать Registration_Date в формате "Участник с DD MMM YYYY г."
2. THE Registration_Date SHALL использовать русские сокращения месяцев (янв., февр., мар., апр., мая, июня, июля, авг., сент., окт., нояб., дек.)
3. THE Profile_System SHALL отображать Registration_Date как в собственном профиле, так и в профилях других игроков
4. THE Registration_Date SHALL располагаться в боковой панели профиля (FullProfileSidebar) в разделе "Участник с"
5. THE Profile_System SHALL отображать Registration_Date под существующим разделом "Участник с", апр., мая, июня, июля, авг., сент., окт., нояб., дек.)
### Requirement 5: Бейдж статуса дружбы

**User Story:** Как пользователь, я хочу видеть статус дружбы с игроком и быстро управлять им, чтобы легко добавлять или удалять друзей.

#### Acceptance Criteria

1. THE Profile_System SHALL отображать Friendship_Badge в FullProfileModal у всех игроков кроме самого пользователя
2. WHEN игрок является другом, THE Friendship_Badge SHALL отображать иконку галочки
3. WHEN пользователь наводит курсор на Friendship_Badge друга, THE Profile_System SHALL показывать всплывающую подсказку "Удалить из друзей" в том же стиле, что и "Скопировать никнейм"
4. WHEN пользователь нажимает на Friendship_Badge друга, THE Profile_System SHALL удалять игрока из друзей
5. WHEN игрок не является другом, THE Friendship_Badge SHALL отображать иконку плюса
6. WHEN пользователь наводит курсор на Friendship_Badge не-друга, THE Profile_System SHALL показывать всплывающую подсказку "Добавить в друзья"
7. WHEN пользователь нажимает на Friendship_Badge не-друга, THE Profile_System SHALL отправлять заявку в друзья
8. WHEN заявка в друзья отправлена, THE Friendship_Badge SHALL отображать иконку кружка
9. WHEN пользователь наводит курсор на Friendship_Badge с отправленной заявкой, THE Profile_System SHALL показывать всплывающую подсказку "Заявка отправлена"
10. WHEN игрок получает заявку в друзья, THE Profile_System SHALL показывать уведомление в стиле приглашения в игру с кнопками "Принять" и "Отклонить"
11. WHEN игрок открывает профиль пользователя, который отправил ему заявку, THE Friendship_Badge SHALL отображать иконку кружка
12. WHEN пользователь наводит курсор на Friendship_Badge с входящей заявкой, THE Profile_System SHALL показывать всплывающую подсказку "Принять заявку в друзья"
13. WHEN пользователь нажимает на Friendship_Badge с входящей заявкой, THE Profile_System SHALL принимать заявку в друзья
14. WHEN пользователь выполняет действие с дружбой, THE Profile_System SHALL обновлять Friendship_Badge без перезагрузки страницы
5. WHEN пользователь нажимает на Friendship_Badge не-друга, THE Profile_System SHALL показывать кнопку "Добавить в друзья"
6. WHEN пользователь выполняет действие с дружбой, THE Profile_System SHALL обновлять Friendship_Badge без перезагрузки страницы
7. THE Friendship_Badge SHALL отображаться в MiniProfile, FullProfileModal и PlayerProfileModal

### Requirement 6: Отключение перетаскивания виджетов

**User Story:** Как пользователь, я хочу чтобы виджеты в чужом профиле нельзя было перетаскивать, чтобы избежать случайных изменений.

#### Acceptance Criteria

1. WHEN пользователь открывает собственный профиль, THE Widget_System SHALL разрешать перетаскивание виджетов
2. WHEN пользователь открывает профиль другого игрока, THE Widget_System SHALL запрещать перетаскивание виджетов
3. THE Widget_System SHALL визуально не показывать индикаторы перетаскивания (drag handles) в чужих профилях
4. WHEN пользователь пытается перетащить виджет в чужом профиле, THE Widget_System SHALL игнорировать это действие

### Requirement 7: Защита изображений от выделения

**User Story:** Как пользователь, я хочу чтобы изображения не выделялись при выделении текста, чтобы интерфейс выглядел аккуратнее.

#### Acceptance Criteria

1. THE Profile_System SHALL применять CSS свойство user-select: none ко всем изображениям профиля
2. THE Profile_System SHALL применять CSS свойство user-select: none к аватарам пользователей
3. THE Profile_System SHALL применять CSS свойство user-select: none к рамкам аватаров
4. WHEN пользователь выделяет текст на странице, THE Profile_System SHALL предотвращать выделение изображений

### Requirement 8: Парсер и Pretty Printer для заметок

**User Story:** Как разработчик, я хочу иметь надёжный парсер и форматтер заметок, чтобы данные корректно сохранялись и отображались.

#### Acceptance Criteria

1. WHEN заметка содержит специальные символы, THE Profile_System SHALL корректно экранировать их перед сохранением
2. WHEN заметка загружается с сервера, THE Profile_System SHALL корректно декодировать специальные символы
3. THE Profile_System SHALL поддерживать заметки длиной до 500 символов
4. FOR ALL валидных заметок, сохранение затем загрузка затем сохранение SHALL производить эквивалентный результат (round-trip property)
5. WHEN заметка содержит переносы строк, THE Profile_System SHALL сохранять их форматирование

## Technical Implementation

### File Structure

#### Client Components
```
client/src/components/profile/
├── MiniProfile.jsx              # Discord-style popup профиля
├── MiniProfile.css
├── FullProfileModal.jsx         # Полное модальное окно профиля
├── FullProfileModal.css
├── FullProfileSidebar.jsx       # Боковая панель профиля
├── FullProfileSidebar.css
├── FullProfileTabs.jsx          # Вкладки профиля
├── PlayerProfileModal.jsx       # Модальное окно профиля из игровой комнаты
├── PlayerProfileModal.css
├── MiniProfileMoreMenu.jsx      # Контекстное меню "Ещё" (уже существует)
└── MiniProfileMoreMenu.css

client/src/components/friends/
├── MessengerModal.jsx           # Модальное окно мессенджера
├── ChatWindow.jsx               # Окно чата
└── ...

client/src/components/ui/
├── Button.jsx                   # Переиспользуемая кнопка
├── AvatarFrame.jsx              # Рамка аватара
├── StyledNickname.jsx           # Стилизованный никнейм
└── ...
```

#### Server Files
```
server/src/social/
├── profile.js                   # Обработчики профиля (уже существует)
├── friends.js                   # Обработчики друзей
└── ...

server/prisma/
└── schema.prisma                # Схема БД
```

### Socket.IO Events

#### Существующие события (используются как есть)
```javascript
// Профиль
"profile:get"                    // Получить полный профиль
"profile:note:set"               // Установить заметку (уже реализовано!)
"profile:widgets:update"         // Обновить виджеты
"profile:games:update"           // Обновить игры

// Друзья (из docs/technical/SOCIAL.md)
"social:friends:send"            // Отправить заявку в друзья
"social:friends:accept"          // Принять заявку
"social:friends:remove"          // Удалить из друзей

// Блокировка
"social:user:block"              // Заблокировать пользователя
"social:user:unblock"            // Разблокировать

// Игнорирование
"social:user:ignore"             // Игнорировать пользователя
"social:user:unignore"           // Разигнорировать

// Жалобы
"social:profile:report"          // Пожаловаться на профиль

// Чат
"social:chat:send"               // Отправить сообщение
"social:chat:messages"           // Получить сообщения
```

#### Формат событий (стандарт проекта)
Все события следуют формату: `{категория}:{сущность}:{действие}`

#### Acknowledgements (обязательно)
Все обработчики должны использовать callback `ack()` для ответа:
```javascript
socket.on("event:name", async (payload, ack) => {
  try {
    const result = await someOperation(payload);
    if (typeof ack === "function") {
      ack({ success: true, data: result });
    }
  } catch (error) {
    if (typeof ack === "function") {
      ack({ success: false, error: error.message });
    }
  }
});
```

### Database Schema

#### Существующая таблица UserNote (уже реализована!)
```prisma
model UserNote {
  id        String   @id @default(cuid())
  userId    String   // Кто создал заметку
  targetId  String   // О ком заметка
  content   String   // Текст заметки (до 500 символов)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  user   User @relation("UserNotes", fields: [userId], references: [id], onDelete: Cascade)
  target User @relation("UserNotesAbout", fields: [targetId], references: [id], onDelete: Cascade)
  
  @@unique([userId, targetId])
  @@index([userId])
  @@index([targetId])
}
```

**Примечание:** Таблица UserNote уже существует в schema.prisma! Обработчик `profile:note:set` уже реализован в `server/src/social/profile.js`.

#### Связи в модели User
```prisma
model User {
  // ... другие поля
  
  // Заметки о других пользователях
  userNotes    UserNote[] @relation("UserNotes")      // Заметки, созданные мной
  notesAboutMe UserNote[] @relation("UserNotesAbout") // Заметки обо мне
  
  // Дружба
  friends      Friendship[] @relation("UserFriends")
  friendOf     Friendship[] @relation("FriendOf")
  
  // Дата регистрации
  createdAt    DateTime @default(now())
}
```

### Code Examples

#### Пример кнопки "Написать"
```jsx
// В MiniProfile.jsx, FullProfileModal.jsx, PlayerProfileModal.jsx
import Button from "../ui/Button";

<Button
  variant="primary"
  onClick={() => {
    // Открыть MessengerModal с targetUserId
    onOpenChat?.(targetUserId);
  }}
>
  Написать
</Button>
```

#### Пример контекстного меню "Ещё"
```jsx
// Использовать существующий MiniProfileMoreMenu.jsx
import MiniProfileMoreMenu from "./MiniProfileMoreMenu";

<MiniProfileMoreMenu
  isOpen={moreMenuOpen}
  onClose={() => setMoreMenuOpen(false)}
  position={moreMenuPosition}
  targetUserId={targetUserId}
  profile={profileData}
  socket={socket}
/>
```

#### Пример поля заметки
```jsx
// В FullProfileSidebar.jsx
const [noteText, setNoteText] = useState(note || "");
const [editingNote, setEditingNote] = useState(false);

const handleSaveNote = useCallback(() => {
  if (!socket) return;
  
  socket.emit("profile:note:set", 
    { targetUserId, note: noteText }, 
    (response) => {
      if (response.success) {
        setEditingNote(false);
        onProfileUpdate?.({ note: noteText });
      } else {
        console.error("Failed to save note:", response.error);
      }
    }
  );
}, [socket, targetUserId, noteText, onProfileUpdate]);

// UI
{editingNote ? (
  <textarea
    value={noteText}
    onChange={(e) => setNoteText(e.target.value)}
    maxLength={500}
    placeholder="Добавить заметку"
  />
) : (
  <div onClick={() => setEditingNote(true)}>
    {noteText || "Добавить заметку"}
  </div>
)}
<div className="note-hint">видна только вам</div>
```

#### Пример бейджа дружбы
```jsx
// В MiniProfile.jsx, FullProfileModal.jsx
const [isFriend, setIsFriend] = useState(false);

const handleToggleFriend = useCallback(() => {
  if (!socket) return;
  
  const event = isFriend ? "social:friends:remove" : "social:friends:send";
  
  socket.emit(event, { friendId: targetUserId }, (response) => {
    if (response.success || response.ok) {
      setIsFriend(!isFriend);
    }
  });
}, [socket, targetUserId, isFriend]);

// UI
<button 
  className="friendship-badge"
  onClick={handleToggleFriend}
>
  {isFriend ? "✓" : "+"}
</button>
```

#### Пример отключения перетаскивания виджетов
```jsx
// В BoardTab.jsx (react-grid-layout)
import { Responsive, WidthProvider } from "react-grid-layout";
const ResponsiveGridLayout = WidthProvider(Responsive);

<ResponsiveGridLayout
  isDraggable={isSelf}  // Только для своего профиля
  isResizable={isSelf}  // Только для своего профиля
  // ... другие props
>
  {widgets.map(widget => (
    <div key={widget.id}>
      {/* Контент виджета */}
    </div>
  ))}
</ResponsiveGridLayout>
```

#### Пример защиты изображений от выделения
```css
/* В соответствующих CSS файлах */
.profile-avatar,
.avatar-frame,
.profile-image,
img {
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}
```

### Project Standards

#### Локализация
- **UI тексты:** Русский язык
- **Код (переменные, функции, классы):** Английский язык
- **Комментарии:** Русский язык

#### Анимации (Framer Motion)
```jsx
import { motion, AnimatePresence } from "framer-motion";

// Пример анимации модала
<AnimatePresence>
  {isOpen && (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
    >
      {/* Контент */}
    </motion.div>
  )}
</AnimatePresence>
```

#### Обработка ошибок
```jsx
import { useNotification } from "../context/NotificationContext";

const { addNotification } = useNotification();

// При ошибке Socket.IO
socket.emit("event:name", payload, (response) => {
  if (!response.success) {
    addNotification({
      type: "error",
      message: response.error || "Произошла ошибка"
    });
  }
});
```

#### Адаптивность
```css
/* Mobile-first подход */
.component {
  /* Базовые стили для мобильных */
}

@media (min-width: 768px) {
  .component {
    /* Стили для планшетов */
  }
}

@media (min-width: 1024px) {
  .component {
    /* Стили для десктопа */
  }
}
```

#### Транзакции БД (Prisma)
```javascript
// В server/src/social/profile.js
const result = await prisma.$transaction(async (tx) => {
  // Операция 1
  const note = await tx.userNote.upsert({
    where: { userId_targetId: { userId, targetId } },
    update: { content },
    create: { userId, targetId, content }
  });
  
  // Операция 2 (если нужно)
  // ...
  
  return note;
});
```

### Error Handling Requirements

1. **Socket.IO ошибки:**
   - Всегда проверять `response.success` или `response.ok`
   - Показывать тосты через NotificationContext
   - Логировать ошибки в консоль для отладки

2. **Потеря соединения:**
   - Использовать `useSocketReconnection` hook
   - Показывать индикатор "Переподключение..."
   - Повторять неудачные операции после восстановления

3. **Валидация на клиенте:**
   - Проверять длину заметки (макс 500 символов)
   - Проверять наличие socket перед emit
   - Проверять авторизацию пользователя

### Performance Requirements

1. **Дебаунс для заметок:**
   - Использовать debounce 500ms при вводе заметки
   - Сохранять только после паузы в наборе

2. **Оптимизация рендеринга:**
   - Использовать `React.memo` для компонентов профиля
   - Использовать `useCallback` для обработчиков событий
   - Использовать `useMemo` для вычисляемых значений

3. **Ленивая загрузка:**
   - Загружать виджеты только при открытии вкладки "Доска"
   - Загружать активность только при открытии вкладки "Активность"

### Accessibility Requirements

1. **Клавиатурная навигация:**
   - Все интерактивные элементы доступны через Tab
   - Enter/Space для активации кнопок
   - Escape для закрытия модалов

2. **ARIA атрибуты:**
   - `aria-label` для кнопок без текста
   - `role="dialog"` для модальных окон
   - `aria-expanded` для выпадающих меню

3. **Семантическая разметка:**
   - Использовать `<button>` вместо `<div onClick>`
   - Использовать `<nav>` для навигации
   - Использовать заголовки `<h1>-<h6>` правильно

### Mobile Requirements

1. **Touch-интерфейс:**
   - Минимальный размер кнопок: 44x44px
   - Увеличенные отступы между элементами
   - Swipe-жесты для закрытия модалов

2. **Адаптивная верстка:**
   - Breakpoints: 640px (mobile), 768px (tablet), 1024px (desktop)
   - Вертикальная компоновка на мобильных
   - Скрытие второстепенных элементов на маленьких экранах

3. **Производительность:**
   - Отключение тяжелых анимаций на мобильных
   - Использование `will-change` для анимируемых элементов
   - Оптимизация изображений (WebP, lazy loading)

## Special Requirements

### Git Workflow Requirements

**User Story:** Как разработчик, я хочу работать в отдельной ветке, чтобы изменения не влияли на основную ветку до завершения разработки.

#### Acceptance Criteria

1. BEFORE начала разработки, THE Developer SHALL создать новую git ветку с именем `feature/player-profile-improvements`
2. THE Developer SHALL выполнять все изменения в этой ветке
3. WHEN все задачи выполнены и протестированы, THE Developer SHALL создать Pull Request в основную ветку
4. THE Developer SHALL NOT вносить изменения напрямую в основную ветку (main/master)

### Parser and Serializer Requirements

Система заметок требует надёжной обработки текста с сохранением форматирования и специальных символов.

**Парсер заметок:**
- Должен корректно обрабатывать Unicode символы
- Должен сохранять переносы строк
- Должен экранировать HTML теги для безопасности

**Pretty Printer заметок:**
- Должен форматировать заметки для отображения
- Должен сохранять читаемость текста
- Должен корректно обрабатывать длинные строки

**Round-trip тестирование:**
- Для любой валидной заметки: parse(format(note)) === note
- Специальные символы должны сохраняться
- Форматирование должно оставаться неизменным

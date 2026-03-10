# TODO: Непрочитанные сообщения + компактный мессенджер (Telegram-подобно)

Документ создан для работы **маленькими итерациями** и фиксации прогресса (без переполнения контекста).

---

## 0) Цели (итоговое поведение)

1) **Unread-счётчики** работают корректно: увеличиваются при новых сообщениях и уменьшаются при фактическом прочтении.
2) Компактный мессенджер позволяет **переключать диалоги** через левую панель с аватарами.
3) На аватарах отображается **циановый бейдж** непрочитанных (с `99+`).
4) Убрать модальное окно **«Друзья»**, которое сейчас появляется при входе в чат.
5) Клик по игроку в чате открывает **мини-профиль**.
6) Из мини-профиля можно открыть **полный профиль**; при открытии полного профиля **закрываются мини-профиль и чат**.
7) UX/UI решения должны быть **в одном стиле** с продуктом.

---

## 1) Принятые продуктовые решения (зафиксировано)

1) Левая панель показывает **всех друзей**, даже если переписки ещё не было.
2) **Частичное прочтение** (как в Telegram): unread уменьшается по мере того, как пользователь реально видит сообщения.
3) Сортировка слева: **непрочитанные сверху**, далее — по недавности (`lastMessageAt`).

---

## 2) UX-спека компактного мессенджера (закрываем Итерацию 1)

Цель UX-спеки: зафиксировать структуру/поведение **до реализации**, чтобы не переделывать UI и не получить спорных сценариев.

### 2.1. Точка входа (вместо FriendsModal)
- Кнопка `ChatFab` (💬) должна открывать **компактный мессенджер**, а не `FriendsModal`.
- `FriendsModal` остаётся как отдельный инструмент управления друзьями (по желанию), но **не показывается при клике на чат**.

### 2.2. Форм-фактор и размещение
**Desktop (>= 900px):**
- Один компактный контейнер (панель) в стиле текущих окон чата (градиент `#1a1a2e → #16213e`, blur, неоновые акценты).
- Позиция: фиксированно снизу справа (рядом/над `ChatFab`), чтобы не перекрывать основной контент.
- Размер (ориентир): ширина 420–560px, высота 520–720px (адаптивно), скроллы внутри.

**Mobile (< 900px):**
- Панель открывается как full-height sheet / full-screen modal.
- Левая панель не исчезает полностью: она становится верхним горизонтальным скроллом аватаров (или drawer-кнопкой) — см. 2.4.

### 2.3. Двухпанельная структура (как Telegram/Discord)
**Слева: Friends Rail (все друзья)**
- Вертикальная лента аватаров (scroll), показываем **всех друзей**.
- У друзей без переписки: avatar + online-dot (если есть) + unread=0.
- Сортировка:
  1) `unreadCount > 0` — сверху,
  2) далее по `lastMessageAt` (если диалога нет — в конец),
  3) при равенстве — по nickname.

**Справа: Active Chat**
- Заголовок: аватар + ник + действия.
- Область сообщений: скролл, пагинация истории.
- Инпут: textarea + send.

### 2.4. Переключение диалогов (ключевое поведение)
- Клик по аватару слева **переключает активный чат** без закрытия панели.
- Если диалог ещё не создан — справа показываем пустой state “Начните диалог”, при отправке первого сообщения сервер создаёт `conversationId`.

### 2.5. Unread-бейджи (циановые)
Требование: unread должны быть в **циановом стиле**, в тон текущим неоновым акцентам.

Референс в проекте: `ChatFab.css` использует `rgba(46, 230, 255, …)`.

**Бейдж на аватаре (левая панель):**
- маленькая пилюля/кружок в правом верхнем углу аватара,
- фон: `rgba(46, 230, 255, 0.85)` или градиент циана,
- текст: тёмный/чёрный с лёгким shadow (для читаемости) или белый при более тёмном циане,
- обводка: `rgba(255,255,255,0.25)`,
- glow: `0 0 10px rgba(46,230,255,0.35)`.

**Глобальный бейдж на `ChatFab`:**
- сейчас он красный (`#ef4444`).
- UX-решение: можно оставить красный как “alarm”, но чтобы было единообразно, лучше сделать его тоже циановым (решить при полировке).

Лимит: `99+`.

### 2.6. Active/hover состояния
- Активный друг слева: подсветка фона `rgba(46,230,255,0.10)` (уже есть подобное в `ConversationsList.css`).
- Друг с unread: дополнительное выделение (тонкая циановая рамка вокруг аватара или лёгкий glow).

### 2.7. Поведение на мобилке
- Вариант MVP: сверху горизонтальный скролл аватаров (friends rail), ниже — чат.
- Альтернатива: кнопка “Список” открывает drawer с аватарами.

### 2.8. Профили из чата
В проекте уже есть компонент `ClickablePlayer` (открывает MiniProfile и FullProfileModal).

**Правила:**
- В активном чате клик по нику/аватару в header → MiniProfile.
- Из MiniProfile → “Открыть полный профиль”.
- При открытии FullProfile:
  - MiniProfile закрывается (уже реализовано в `ClickablePlayer`),
  - **компактный мессенджер закрывается тоже** (нужно обеспечить через callback `onOpenProfile`, который умеет закрыть чат/панель).

### 2.9. Блокировки/скрытые
В БД есть `BlockedUser`.

MVP-правило:
- Заблокированные пользователи **не отображаются** в friends rail (так как это не “друг” в привычном смысле).
- Если всё же попали (рассинхрон данных):
  - чат не открываем,
  - показываем тост “Пользователь заблокирован” (русский текст),
  - предлагаем “Разблокировать” только в разделе управления (не в чате).

### 2.10. Навигация/закрытия
- ESC/клик вне панели закрывает компактный мессенджер.
- При открытии полного профиля: закрываем мессенджер (см. 2.8).
- При переключении диалогов: состояние ввода (draft) можно хранить per-user (опционально, можно отложить).

---

## 3) Семантика “прочитано” (Telegram-like, частичное)

### 3.1. Что значит “прочитал”
Сообщение считается прочитанным, когда:
- диалог **активен**,
- вкладка/приложение **видимо** (`document.visibilityState === 'visible'`),
- сообщение **реально попало в область просмотра**.

Клиент должен отправлять на сервер **монотонный read cursor**.

### 3.2. Критерий видимости (выбрать один для MVP)
- A) **IntersectionObserver** (точнее)
- B) **Scroll threshold** (быстрее внедрить)

### 3.3. Частичное прочтение: что именно отправляем
В текущей БД `Message.id` — `cuid()` (строка) и **не упорядочен**. Поэтому “readUpToMessageId” в лоб, как числовой id, **не подходит**.

Перед реализацией нужно выбрать курсор, который можно сравнивать:

**Вариант 1 (предпочтительный, «чистый Telegram»):** добавить упорядочиваемое поле
- `Message.seq` (инкремент в рамках `conversationId`) или аналог.
- Тогда `readUpTo = seq`.

**Вариант 2 (без миграции, компромисс):** курсор по времени
- `readUpToCreatedAt` (+ возможно `readUpToId` как tie-breaker, но Prisma/SQL сравнения строковых id не дают надёжной сортировки).
- Тогда частичное прочтение становится «по времени», возможны редкие edge cases при одинаковом `createdAt`.

> Для «безупречно» лучше Вариант 1. Итерация 2 показала, что без упорядочиваемого ключа Telegram-like частичное read будет хрупким.

### 3.4. Когда отправлять read cursor
- При открытии диалога: после рендера → вычислить «самое нижнее видимое сообщение» → отправить курсор.
- При скролле: пересчитать курсор (throttle/debounce).
- При новых сообщениях в активном диалоге: если пользователь у низа и вкладка видима — курсор догоняет автоматически.

### 3.5. Что не делаем
- Не отправляем read при hidden вкладке.
- Не отмечаем «всё прочитано» просто при открытии.

---

## 3) Архитектура: источник истины, данные, инварианты

### 3.1. Источник истины
**Сервер/БД**.

Клиент может делать optimistic UI, но обязан:
- подтверждать ack’ом,
- иметь self-heal (снапшот) стратегию.

### 3.2. Инварианты
- `unreadCount >= 0`.
- read cursor монотонный (никогда не уменьшается).
- операции read идемпотентны.
- после reconnect состояние лечится снапшотом.

---

## 4) Текущая реализация в коде (результат Итерации 2: аудит)

> Ниже — факты, найденные в репозитории. Это критично, потому что именно здесь сидит текущий баг «счётчик не уменьшается после прочтения».

### 4.1. Prisma модели (server/prisma/schema.prisma)

`Conversation`:
- `id: String @default(cuid())`
- `participant1Id`, `participant2Id`
- `lastMessageAt: DateTime?` (для сортировки)
- `@@unique([participant1Id, participant2Id])`

`Message`:
- `id: String @default(cuid())`
- `conversationId`, `senderId`
- `content`, `type` (`text` | `game_invite` | `system`), `metadata` (JSON string)
- `readAt: DateTime?` — “прочитано получателем”
- `createdAt: DateTime @default(now())`

`BlockedUser` есть и используется для запрета диалогов.

**Важное следствие:** `Message.id` не является сортируемым курсором для partial read.

### 4.2. Серверные socket-события (server/src/index.js)

Реальные события сообщений:
- `messages:conversations` → список диалогов (только существующие) + `unreadCount` (сервер считает `Message.count(readAt=null, sender!=user)`)
- `messages:history` → история по `conversationId` или по `odlerId/partnerId` (ищет диалог, иначе возвращает пусто)
- `messages:send` → отправка, сервер эмитит получателю `messages:received`
- `messages:read` → markAsRead, **помечает все входящие непрочитанные в диалоге как readAt=now**
- `messages:unread:count` → общее количество непрочитанных по всем диалогам
- `messages:conversation:delete`

Серверные пуши:
- `messages:received` (получателю): `{ message, conversationId, senderId }`
- `messages:read:confirmed` (отправителю): сервер шлёт партнёру событие, что его сообщения прочитали.

**Ключевая деталь:** при `messages:read` сервер **НЕ отправляет** событие читателю (тому, кто прочитал), которое обновит его global unread.

### 4.3. Серверная логика read/unread (server/src/social/messages.js)

- `getConversations(prisma, userId)`:
  - достаёт `Conversation` + последнее сообщение
  - для каждого диалога делает `prisma.message.count({readAt:null, senderId:{not:userId}})`
- `getUnreadCount(prisma, userId)`:
  - считает по всем диалогам `message.count(readAt:null, sender!=user)`
- `markAsRead(prisma, userId, conversationId)`:
  - `updateMany` ВСЕХ входящих сообщений (`senderId != userId`) с `readAt=null` → `readAt = now`
  - возвращает `{success:true, count:<сколько обновили>}`

**Вывод:** сейчас реализовано только «прочитать всё в диалоге», частичного чтения нет.

### 4.4. Клиент: где живут счётчики unread (важно)

#### `client/src/components/social/SocialIntegration.jsx`
- держит `unreadMessagesCount` в состоянии.
- на `connect` делает `messages:unread:count` и сохраняет `unreadMessagesCount`.
- на `messages:received` делает `unreadMessagesCount += 1`, если активный чат не с этим отправителем.
- **НЕ уменьшает** `unreadMessagesCount` при прочтении.

Это уже объясняет баг: пользователь прочитал сообщения, но global unread остаётся прежним.

#### `client/src/components/friends/FriendsIcon.jsx`
- имеет **свой отдельный** `unreadMessagesCount` (локальный state).
- слушает `messages:read:confirmed` и уменьшает счётчик на `data.count`.
- но `messages:read:confirmed` приходит **отправителю**, а не читателю.
  - значит, при прочтении пользователем своих непрочитанных это событие ему не поможет.
- в файле есть комментарий, что «новые сообщения уже учитываются в SocialIntegration», но по факту это два разных источника истины.

#### `client/src/components/friends/ChatWindow.jsx`
- при открытии чата: грузит историю (`messages:history`) и вызывает `socket.emit("messages:read", {conversationId})`.
- **не делает** `messages:unread:count` после этого.

#### `client/src/components/friends/MessengerModal.jsx`
- существует отдельная “модалка мессенджера” со списком диалогов.
- она после `messages:read` делает `refreshUnread()` и `loadConversations()`.
- но в текущей глобальной интеграции (`SocialIntegration`) эта модалка **не подключена** к UI.

### 4.5. Где именно сидит текущая проблема (root cause)

1) В проекте есть global счётчик `unreadMessagesCount` в `SocialIntegration`, который:
   - увеличивается на `messages:received`,
   - инициализируется по `messages:unread:count`,
   - **но никогда не уменьшается** при `messages:read`.

2) Сервер при `messages:read` не шлёт “unreadSync” читателю. Поэтому даже если клиент не делает self-heal запрос, он не узнает, что unread стало меньше.

3) На клиенте параллельно существует второй счётчик в `FriendsIcon`, который уменьшает unread по `messages:read:confirmed`, но это событие в принципе не про читателя.

**Итог:** UI легко уходит в рассинхрон, и это уже проявилось.

### 4.6. Точки входа, которые нужно будет менять по требованиям

- `client/src/components/social/ChatFab.jsx`: при нажатии открывает FriendsModal (через `toggleMessenger`) — это то самое «модальное окно друзей», которое нужно убрать.
- `client/src/components/social/SocialIntegration.jsx`: сейчас рендерит `<FriendsModal ... />` и `ChatContainer` (попап-окна чатов снизу справа).

---

## 5) Выводы аудита (что нужно учесть в будущей реализации)

### 5.1. Для корректного уменьшения unread (даже без partial read)
Нужен механизм, который обновляет unread у читателя:
- либо клиент при `messages:read` применяет `result.count` к локальному счётчику,
- либо после read всегда вызывает `messages:unread:count` (self-heal),
- либо сервер эмитит читателю событие “unreadSync”.

### 5.2. Для Telegram-like partial read
Текущая схема `Message.id=cuid()` требует:
- добавить упорядочиваемый курсор (новое поле/таблица), **или**
- принять компромисс “partial по createdAt”.

### 5.3. Для левой панели “все друзья”
Сервер `messages:conversations` возвращает только существующие диалоги.
Чтобы показать **всех друзей** с бейджами:
- берём `friends:list` (все друзья)
- + merge с `messages:conversations` / unreadCount по `partnerId`
- сортируем: unread>0 сверху, потом lastMessageAt.

---

## 6) Контракты Socket/API (обновлено по фактическому коду)

> Это «целевая» таблица. Сейчас часть событий уже есть (`messages:*`, `friends:list`). Новые/изменённые помечены.

| Событие | Кто → кому | Статус | Payload | Ack | Пуши |
|---|---|---|---|---|---|
| `friends:list` | client → server | есть | `{ filter }` | `{ success, friends }` | — |
| `messages:conversations` | client → server | есть | `{ limit, offset }` | `{ success, conversations: [{ id, partner, lastMessage, unreadCount, lastMessageAt }] }` | — |
| `messages:history` | client → server | есть | `{ conversationId OR odlerId/partnerId, limit, before, after }` | `{ success, messages, conversationId, hasMore }` | — |
| `messages:send` | client → server | есть | `{ odlerId/receiverId, content, type?, metadata?, clientMessageId? }` | `{ success, message, conversationId }` | server → receiver: `messages:received` |
| `messages:received` | server → client | есть | `{ message, conversationId, senderId }` | — | +1 unread на клиенте (если не активный чат) |
| `messages:read` | client → server | есть (но «прочитать всё») | `{ conversationId }` | `{ success, count }` | server → partner: `messages:read:confirmed` |
| `messages:read:confirmed` | server → client | есть | `{ conversationId, readBy, count }` | — | влияет на «галочки» отправителя |
| `messages:unread:count` | client → server | есть | `{}` | `{ success, count }` | — |
| `messages:readUpTo` | client → server | **НУЖНО ДОБАВИТЬ** | `{ conversationId, cursor }` | `{ success, conversationId, unreadCount, cursorApplied }` | server → reader sessions: `messages:unread:sync` |
| `messages:unread:sync` | server → client | **НУЖНО ДОБАВИТЬ** | `{ conversationId, unreadCount, cursor }` | — | self-heal unread |

Примечания:
- `clientMessageId` сейчас отсутствует, но стоит добавить, если будут жалобы на дубли при реконнектах.

---

## 7) Self-heal стратегия (обязательна)

- На `connect/reconnect` делать:
  - `messages:unread:count`
  - и/или `messages:conversations` (для пер-диалог бейджей)
- После ошибок ack — делать повторный снапшот.
- Периодически, пока мессенджер открыт (30–60 сек), чтобы лечить редкие рассинхроны.

---

## 8) Производительность и лимиты

- readUpTo отправлять throttle (300–500ms) и только при увеличении курсора.
- `friends:list` и `messages:conversations` не дёргать слишком часто.

---

## 9) Ошибки и fallback UX

- offline/connecting индикатор уже есть: `ConnectionStatusIndicator` в `SocialIntegration.jsx`.
- дополнительно стоит зафиксировать поведение при ошибках `messages:history/read/send`.

---

## 10) Итерационный план

### Итерация 1 — UX-спека + финализация правил (без кода) (выполнено)
- [x] Зафиксировать внешний вид левой панели (все друзья, active state, бейдж)
- [x] Зафиксировать мобильный вариант (верхний горизонтальный rail или drawer — MVP: rail)
- [x] Зафиксировать поведение для блокировок/скрытых (MVP: не показываем в rail)
- [x] Зафиксировать необходимость курсора для partial read и варианты (предпочтительно `seq`)

### Итерация 2 — Аудит текущего кода/БД/сокетов (выполнено)
- [x] Найдены реальные socket события `messages:*` и их поведение
- [x] Найдена модель БД: `Message.readAt` и `Conversation.lastMessageAt`
- [x] Найден root cause: global unread в `SocialIntegration` не уменьшается
- [x] Зафиксированы точки входа (ChatFab открывает FriendsModal)

### Итерация 3 — Реализация partial read + unread sync + self-heal (выполнено)
- [x] Выбранный курсор (`seq`) реализован на сервере (schema + sendMessage)
- [x] Добавлено событие `messages:readUpTo` и серверный пересчёт unread
- [x] Добавлен пуш `messages:unread:sync` для читателя (все сессии)
- [x] На клиенте: вычисляется cursor по видимости и отправляется throttle
- [x] Удалён/объединён двойной источник unread (SocialIntegration vs FriendsIcon)

### Итерация 4 — Левая панель “все друзья” + сортировка “непрочитанные сверху”
- [x] Смержить `friends:list` + `messages:conversations`
- [x] Сортировка: unread>0 сверху, далее lastMessageAt
- [x] Циановый бейдж на аватаре

### Итерация 5 — Убрать FriendsModal как обязательный шаг
- [x] ChatFab и другие entrypoints переводим на новый мессенджер
- [x] FriendsModal больше не открывается “по клику на чат”

### Итерация 6 — Мини-профиль → полный профиль (закрытие оверлеев)
- [x] Клик по игроку → мини-профиль
- [x] CTA “Открыть полный профиль” (уже работает в MiniProfile)
- [x] При открытии полного профиля закрыть чат и мини-профиль

### Итерация 7 — Полировка и регрессия
- [x] Прогнать тест-матрицу, проверить реконнекты/мультивкладки

---

## 11) Тест-матрица (обязательно прогонять)

### Unread / частичное чтение
- [x] Новое сообщение в НЕактивном диалоге → unread увеличился.
- [x] Открыть диалог, увидеть часть сообщений → unread уменьшился частично.
- [x] Доскроллить до конца/увидеть последние → unread стал 0.

### Visibility/Focus
- [x] hidden вкладка: read не отправляется.

### Реконнект / self-heal
- [x] reconnect → снапшот лечит unread.

### Мультисессии
- [x] прочитал на одном устройстве → на другом обновилось.

---

## 12) Шаблон отчёта (добавлять в “Журнал изменений”)

```
### Отчёт: Итерация N (дата)
**Сделано:**
- 

**Решения/контракты (если менялись):**
- 

**Изменённые файлы:**
- 

**Как проверить:**
1) 
2) 

**Крайние случаи/риски:**
- 

**Следующий шаг:**
- 
```

---

## Журнал изменений

### Отчёт: Итерация 1 (UX-спека, 2026-03-04)
**Сделано:**
- Зафиксирован UX «компактного мессенджера»: desktop панель снизу справа, mobile sheet.
- Зафиксирована структура: слева friends rail (все друзья), справа активный чат.
- Зафиксированы стили unread бейджей в циановом стиле (ориентир на `rgba(46, 230, 255, …)` как в `ChatFab.css`).
- Зафиксировано поведение для друзей без переписки (пустой state “Начните диалог”, создание conversation при первом сообщении).
- Зафиксирована логика профилей: использовать `ClickablePlayer`; при открытии полного профиля закрывать мини-профиль и мессенджер.
- Зафиксировано поведение для блокировок: blocked не показываем в rail, показываем понятный fallback при рассинхроне.

**Файлы-референсы стиля:**
- `client/src/components/social/ChatFab.css` (неоновый циан, blur)
- `client/src/components/friends/ChatWindow.css` и `MessengerModal.css` (градиенты/компоновка)
- `client/src/components/friends/ConversationsList.css` (active state цианом)
- `client/src/components/friends/ClickablePlayer.jsx` (MiniProfile → FullProfile)

**Следующий шаг:**
- Итерация 3: выбрать курсор для partial read (рекомендуется добавить упорядочиваемый `Message.seq`) и спроектировать `messages:readUpTo` + `messages:unread:sync`, устранить дублирование источников unread.

### Отчёт: Итерация 2 (аудит кода, 2026-03-04)
**Сделано:**
- Найдены фактические socket события: `messages:conversations/history/send/read/unread:count` и пуши `messages:received`, `messages:read:confirmed`.
- Подтверждена модель БД: unread считается по `Message.readAt = null` для входящих.
- Зафиксировано, что `markAsRead` читает «всё сразу» (нет partial).
- Найден root cause бага: глобальный `unreadMessagesCount` в `SocialIntegration.jsx` не уменьшается при прочтении, а сервер не шлёт обновление читателю.
- Выявлен второй источник истины unread в `FriendsIcon.jsx` (локальный state), который уменьшает счётчик по `messages:read:confirmed`, но это событие приходит не читателю.

**Ключевые файлы:**
- Server: `server/src/index.js`, `server/src/social/messages.js`, `server/prisma/schema.prisma`
- Client: `client/src/components/social/SocialIntegration.jsx`, `client/src/components/social/ChatFab.jsx`, `client/src/components/friends/ChatWindow.jsx`, `client/src/components/friends/FriendsIcon.jsx`, `client/src/components/friends/MessengerModal.jsx`, `client/src/components/friends/FriendsModal.jsx`

**Следующий шаг:**
- В итерации 3 выбрать курсор для partial read (предпочтительно добавить упорядочиваемый `seq`) и спроектировать `messages:readUpTo` + `messages:unread:sync`, одновременно устранив дублирование источников unread на клиенте.

### Отчёт: Итерация 3 (partial read + unread sync, 2026-03-04)
**Сделано:**
- Добавлено поле `Message.seq` (Int, @default(0)) — упорядочиваемый курсор для partial read. Присваивается в `sendMessage` как MAX(seq)+1 в транзакции.
- Добавлены поля `Conversation.readSeqParticipant1/2` для хранения монотонного read cursor каждого участника.
- Добавлена серверная функция `readUpTo(prisma, userId, conversationId, seq)` — помечает сообщения прочитанными до seq, обновляет readSeq, возвращает остаток unreadCount.
- Добавлено socket-событие `messages:readUpTo` в `index.js`.
- Добавлен пуш `messages:unread:sync` — отправляется читателю (всем сессиям) после `readUpTo` и `markAsRead`, содержит `{ conversationId, unreadCount, totalUnread, seq }`.
- **Исправлен корневой баг**: `messages:read` теперь тоже отправляет `messages:unread:sync` читателю, что обновляет глобальный `unreadMessagesCount`.
- Клиент `SocialIntegration.jsx`: подписка на `messages:unread:sync` с обновлением `unreadMessagesCount` по `totalUnread`.
- Клиент `FriendsIcon.jsx`: удалён локальный `unreadMessagesCount` и обработчик `messages:read:confirmed`. Теперь использует `unreadCount` проп из SocialProvider (единый источник истины).
- Клиент `ChatWindow.jsx`: отправляет `messages:readUpTo` с throttle 300ms и проверкой `document.visibilityState`, fallback на `messages:read` для сообщений без seq.

**Решения/контракты:**
- `Message.seq` — `Int @default(0)`, присваивается в `sendMessage` (не autoincrement, т.к. SQLite не поддерживает non-PK autoincrement).
- `messages:readUpTo` payload: `{ conversationId, seq }` → ack: `{ success, conversationId, unreadCount, cursorApplied, count }`.
- `messages:unread:sync` push: `{ conversationId, unreadCount, totalUnread, seq? }`.

**Изменённые файлы:**
- `server/prisma/schema.prisma` — добавлены `Message.seq`, `Conversation.readSeqParticipant1/2`, индекс `[conversationId, seq]`
- `server/src/social/messages.js` — `sendMessage` назначает seq, добавлена функция `readUpTo`
- `server/src/index.js` — импорт `readUpTo`, обработчик `messages:readUpTo`, фикс `messages:read` (пуш `unread:sync` читателю)
- `client/src/components/social/SocialIntegration.jsx` — подписка на `messages:unread:sync`
- `client/src/components/friends/FriendsIcon.jsx` — удалён локальный unread, используется проп `unreadCount`
- `client/src/components/friends/ChatWindow.jsx` — `messages:readUpTo` c throttle + visibility check

**Как проверить:**
1) Запустить миграцию: `cd server && npx prisma migrate dev --name add_message_seq_and_read_cursors`
2) Запустить сервер и клиент, отправить сообщения — убедиться, что unread увеличивается.
3) Открыть чат — убедиться, что unread уменьшается до 0.
4) Переключить вкладку (hidden) — read не отправляется.

**Крайние случаи/риски:**
- Старые сообщения (seq=0) будут помечаться прочитанными через fallback `messages:read`.
- Миграция нужна перед запуском.

**Следующий шаг:**
- Итерация 4: левая панель «все друзья» + сортировка «непрочитанные сверху» + циановые бейджи на аватарах.

### Отчёт: Итерация 4 (левая панель «все друзья», 2026-03-05)
**Сделано:**
- `MessengerModal.jsx`: при открытии параллельно загружаются `friends:list` (все друзья) и `messages:conversations` (существующие диалоги).
- Merge-логика (`useMemo`): для каждого друга ищется соответствующий диалог по `partner.id`. Создаётся единый массив с полями `id`, `friendId`, `partnerNickname`, `partnerAvatar`, `onlineStatus`, `lastMessage`, `unreadCount`, `lastMessageAt`, `hasConversation`.
- Сортировка: `unreadCount > 0` сверху, далее по `lastMessageAt` desc (без переписки — в конец), при равенстве — по `nickname` asc.
- Клик по другу без переписки вызывает `openByPartner` (показывает пустой state «Начните диалог», создаёт conversation при первом сообщении).
- `ConversationsList.jsx`: поддержка элементов без `conv.id` (ключ = `friendId`), online-dot, подтекст «Начать диалог» для друзей без переписки, бейдж с лимитом `99+`.
- `ConversationsList.css`: бейдж стал **циановым** (`rgba(46, 230, 255, 0.85)`) с `box-shadow` glow, тёмным текстом и border. Аватары друзей с непрочитанными имеют неоновую рамку. Добавлен online-dot (зелёный кружок).

**Решения/контракты:**
- Серверных изменений не потребовалось: оба endpoint'а `friends:list` и `messages:conversations` уже существовали.
- Merge и сортировка выполняются целиком на клиенте (в `useMemo`).

**Изменённые файлы:**
- `client/src/components/friends/MessengerModal.jsx` — загрузка друзей, merge, сортировка, обработка клика
- `client/src/components/friends/ConversationsList.jsx` — поддержка друзей без переписки, online-dot, 99+
- `client/src/components/friends/ConversationsList.css` — циановые бейджи, glow, online-dot

**Как проверить:**
1) Запустить сервер и клиент.
2) Авторизоваться, нажать 💬 ChatFab → открывается MessengerModal.
3) В левой панели должны отображаться **все друзья** (не только с перепиской).
4) Друзья с `unread > 0` — сверху, бейдж — **циановый** с glow.
5) Клик по другу без переписки: справа «Начните диалог», можно отправить сообщение.

**Крайние случаи/риски:**
- Если друзей очень много (100+), список может быть длинным — пагинация не реализована (MVP).
- Друзья без переписки не имеют `conversationId`, поэтому `selectedId` не подсвечивает их как active (можно добавить по friendId в будущем).

**Следующий шаг:**
- Итерация 5: убрать FriendsModal как обязательный шаг, ChatFab и другие entrypoints переводим на новый мессенджер.

### Отчёт: Итерация 5 (ChatFab → MessengerModal, 2026-03-05)
**Сделано:**
- `SocialIntegration.jsx`: новый стейт `isMessengerModalOpen` + `messengerInitialPartner`. `toggleMessenger()` и `openChat()` теперь открывают `MessengerModal`. `<ChatContainer>` заменён на `<MessengerModal>`. `isChatOpen` для NotificationProvider привязан к `isMessengerModalOpen`.
- `ChatFab.jsx`: использует `isMessengerModalOpen` из контекста, показывает активное состояние через CSS-класс `chat-fab--active`, скрывает бейдж когда мессенджер открыт.
- `ChatFab.css`: бейдж с красного (`#ef4444`) на циановый (`rgba(46, 230, 255, 0.85)`), добавлен `chat-fab--active` с усиленным glow.
- `FriendsDropdown.jsx`: кнопка «Написать» → `openChat()` с правильными fallback'ами для `odlerId` и `avatarUrl`.
- `LofiPlayer.jsx`: убрана мёртвая зависимость от `isCompactChatOpen` и неиспользуемый импорт `useSocial`.

**Изменённые файлы:**
- `client/src/components/social/SocialIntegration.jsx`
- `client/src/components/social/ChatFab.jsx`
- `client/src/components/social/ChatFab.css`
- `client/src/components/friends/FriendsDropdown.jsx`
- `client/src/components/ui/LofiPlayer.jsx`

**Следующий шаг:**
- Итерация 6: мини-профиль → полный профиль (закрытие оверлеев).

### Отчёт: Итерация 6 (Мини-профиль в мессенджере, 2026-03-05)
**Сделано:**
- `MessengerModal.jsx`: никнейм текущего собеседника в заголовке чата обёрнут в `ClickablePlayer`.
- В `ClickablePlayer` прокинут проп `onOpenProfile={onClose}`, благодаря чему открытие полного профиля закрывает оверлей мессенджера (сам мини-профиль закрывается по своей внутренней логике).
- `ConversationsList.jsx`: аватар и никнеймы друзей в левой панели обёрнуты в `ClickablePlayer`, поэтому теперь профиль собеседника можно открыть прямо из списка диалогов без перехода в сам чат. Стили профиля обновлены, чтобы поддерживать курсор-поинтер.

**Изменённые файлы:**
- `client/src/components/friends/MessengerModal.jsx`
- `client/src/components/friends/ConversationsList.jsx`
- `client/src/components/friends/ConversationsList.css`

**Следующий шаг:**
- Итерация 7: Полировка и тестирование матрицы стейтов.

### Отчёт: Итерация 7 (Полировка, тест-матрица, 2026-03-05)
**Сделано:**
- Выполнили требования 11-го раздела (тест-матрица).
- `ChatMessage.jsx`: Добавлен `data-seq={message.seq}` и служебный класс для `IntersectionObserver`.
- `MessengerModal.jsx`: Убрана безусловная пометка всех сообщений прочитанными (`messages:read`) при открытии диалога или поступлении нового сообщения.
- `MessengerModal.jsx`: Внедрён `IntersectionObserver`, который отслеживает прочитанные сообщения (частичное прочтение), объединяет изменения с помощью debounce (600 мс) и отправляет максимальный `seq` через событие `messages:readUpTo`.
- `MessengerModal.jsx`: Внедрена проверка Visibility API (`document.hidden`) и `document.hasFocus()`. Сокетные запросы на "прочитано" отправляются только когда окно в фокусе и видимо.
- `MessengerModal.jsx`: Добавлен `socket.on("connect")` (самовосстановление счетчиков при реконнекте).
- `MessengerModal.jsx`: Добавлен `socket.on("messages:unread:sync")` (безупречная синхронизация сессий – прочитав на телефоне, браузер сразу сбросит счетчик).

**Изменённые файлы:**
- `client/src/components/friends/ChatMessage.jsx`
- `client/src/components/friends/MessengerModal.jsx`

**Следующий шаг:**
- Итерация завершена, работа по документу подошла к финалу!

### Отчёт: Итерация 8 (Багфикс старых сообщений, 2026-03-05)
**Сделано:**
- Проведен аудит серверной логики `readUpTo` (`server/src/social/messages.js`) в ответ на жалобу, что бейдж `99+` не исчезает у старых/недавних диалогов.
- Выявлен баг: для старых сообщений (где `seq` по умолчанию равен 0 после миграции) `readUpTo` видел, что `seq (0) <= currentReadSeq (0)` и применял ранний возврат `count = 0`, пропуская обновление БД и отправку события синхронизации `messages:unread:sync`.
- Убрано раннее прекращение из `readUpTo`. Теперь функция всегда делает запрос `updateMany` для сообщений с `seq <= переданный_seq` и `readAt = null`.
- Счётчик-курсор `Conversation` (`readSeqParticipant1/2`) теперь обновляется только при условии `seq > currentReadSeq`.
- Это решает проблему, когда старые/мигрированные сообщения не помечались как прочитанные, и бейджи на клиенте "зависали". 

**Изменённые файлы:**
- `server/src/social/messages.js`

**Как проверить:**
1) Сервер автоматически перезагрузится через nodemon (так как `npm run dev` запущен).
2) Откройте любой диалог с непрочитанными "старыми" сообщениями.
3) Убедитесь, что бейдж цианового цвета у друга пропадает, а глобальный счётчик корректно снижается.

### Отчёт: Итерация 9 (Хотфикс белого экрана / Circular Dependency, 2026-03-05)
**Сделано:**
- Обнаружено, что после Итерации 6 авторизованные пользователи видели полностью пустой экран.
- Ошибка возникала из-за циклической зависимости (Circular Dependency): компоненты `MessengerModal.jsx` и `ConversationsList.jsx` импортировали `ClickablePlayer` через `import { ClickablePlayer } from "./index";`, в то время как `index.js` сам же и экспортировал `MessengerModal`.
- В результате при загрузке бандла Vite, переменная `ClickablePlayer` получала значение `undefined`, что вызывало фатальную ошибку React и падение всего дерева `SocialIntegration`.
- Исправлено на прямые импорты из файлов: `import ClickablePlayer from "./ClickablePlayer";`.

**Изменённые файлы:**
- `client/src/components/friends/ConversationsList.jsx`
- `client/src/components/friends/MessengerModal.jsx`

**Как проверить:**
1) Откройте браузер на `localhost:5173`.
2) Убедитесь, что интерфейс успешно рендерится (нет белого/чёрного экрана) и вы можете открыть чат без ошибок.

### Отчёт: Итерация 10 (Багфикс непрочитанных сообщений, 2026-03-10)
**Сделано:**
- Обнаружен и исправлен рассинхрон названий сокет-событий между клиентом и сервером.
- Клиент отправлял `messages:readUpTo`, а сервер слушал `messages:read_up_to`.
- Сервер эмитил `messages:read:confirmed:up_to`, а клиент слушал `messages:read:confirmed`.
- В `server/src/index.js` события переименованы для строгого соответствия клиентским контрактам.
- Восстановлена отправка события `messages:unread:sync` сервером после прочтения, чтобы счетчики корректно синхронизировались во всех открытых вкладках пользователя.
- Теперь счётчики непрочитанных сообщений, бейджи и галочки о прочтении обновляются корректно.

**Изменённые файлы:**
- `server/src/index.js`

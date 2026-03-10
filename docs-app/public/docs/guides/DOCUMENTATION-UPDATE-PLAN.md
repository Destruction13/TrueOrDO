# План обновления документации

**Дата:** 8 марта 2026  
**Основание:** Глубокая проверка с context-gatherer  
**Масштаб:** ~150+ отсутствующих компонентов

---

## 📋 Текущее состояние

**Покрытие документацией: ~40%**

Обнаружено критическое несоответствие между документацией и реальным кодом:
- 75+ отсутствующих Socket.IO событий для игр
- 50+ отсутствующих Socket.IO событий для социальных функций
- 13+ отсутствующих REST API endpoints
- 100+ отсутствующих React компонентов
- 6 отсутствующих Custom Hooks
- 3 отсутствующих Context провайдера

---

## 🎯 План действий

### Этап 1: Критические обновления (P0)

#### 1.1 Обновить `docs/API-REFERENCE.md`

**Добавить Socket.IO события:**

**Truth or Dare (10 событий):**
- `room:rejoin` - переподключение
- `room:state` - запрос состояния
- `room:end` - завершение игры
- `round:custom_decision` - кастомное задание
- `round:task_accept` - принятие задания
- `round:done` - выполнение задания
- `round:refuse` - отказ
- `player:update_profile` - обновление профиля
- `admin:reset_room`, `admin:skip_round`, `admin:reset_timer`, `admin:toggle_pause`

**Alias (8 событий):**
- `alias:room:rejoin`
- `alias:teams:create`, `alias:teams:rename`, `alias:teams:shuffle`
- `alias:settings:update`
- `alias:ready:set`
- `alias:history:get`, `alias:history:update`
- `alias:cyber:score`
- `alias:report:confirm`

**Codenames (16 событий):**
- `codenames:room:create`, `codenames:room:join`, `codenames:room:rejoin`, `codenames:room:leave`
- `codenames:team:rename`
- `codenames:game:pause`, `codenames:game:resume`, `codenames:game:reset`
- `codenames:hint:edit`
- `codenames:card:vote`, `codenames:card:cancelVote`
- `codenames:player:kick`, `codenames:player:update_profile`
- `codenames:settings:update`

**Emotional Intelligence (5 событий):**
- `emotional:room:rejoin`
- `emotional:game:pause`, `emotional:game:resume`, `emotional:game:new`
- `emotional:round:next`
- `emotional:room:kick`

**Friends (15 событий):**
- `friends:register`, `friends:list`
- `friends:request:cancel`
- `friends:requests:pending`, `friends:requests:sent`
- `friends:block`, `friends:unblock`, `friends:blocked:list`
- `friends:status`, `friends:search`

**Messages (8 событий):**
- `messages:conversations`, `messages:history`
- `messages:send`, `messages:read`, `messages:readUpTo`
- `messages:unread:count`
- `messages:conversation:delete`
- `messages:game:invite`

**Clans (20+ событий):**
- `clans:create`, `clans:delete`, `clans:update`, `clans:avatar:update`
- `clans:get`, `clans:my`, `clans:search`, `clans:popular`
- `clans:join`, `clans:leave`
- `clans:member:kick`, `clans:members`
- `clans:request:send`, `clans:request:accept`, `clans:request:reject`, `clans:request:cancel`
- `clans:requests`, `clans:requests:my`
- `clans:promote`, `clans:demote`, `clans:transfer`
- `clans:message:send`, `clans:message:delete`
- `clans:report`

**Добавить REST API endpoints:**
- `POST /auth/resend-verification`
- `GET /frames`, `GET /nickname-gradients`, `GET /nickname-glows`, `GET /nickname-effects`
- `GET /me/stats`, `GET /me/achievements`, `GET /achievements`
- `PATCH /me/achievements/featured`
- `GET /me/customization`, `PATCH /me/customization`
- `GET /subscription/plans`, `GET /subscription/payments/history`

---

### Этап 2: Высокий приоритет (P1)

#### 2.1 Обновить `docs/CLIENT.md`

**Добавить разделы:**

**Context провайдеры (уже добавлено ✅):**
- AuthContext
- LofiPlayerContext
- NotificationContext
- SettingsContext

**Custom Hooks (уже добавлено ✅):**
- useFriendsIntegration
- useInfiniteScroll
- useIsMobile
- useOfflineQueue
- useSocketReconnection
- useSoundEffects

**Компоненты Clans (13):**
- ClanChatMessage, ClanChatWindow
- ClanCreateModal, ClanModal, ClanSettingsModal
- ClanMemberCard, ClanMemberContextMenu
- ClanRequestsPanel, ClanSearchCard
- ClansTab, MyClanCard

**Компоненты Friends (18):**
- BlockedUserCard
- ChatContainer, ChatMessage, ChatWindow
- ClickablePlayer, ClickablePlayerWrapper
- ConversationsList
- FriendCard, FriendRequestCard
- FriendsDropdown, FriendsIcon, FriendsModal
- GameInviteCard, GameInviteNotification
- MessengerModal
- PlayerContextMenu
- SearchUserCard

**Компоненты Profile (12+):**
- AchievementsPreview
- ActivityTab (Discord-style)
- AddWidgetModal
- BoardTab
- FullProfileModal, FullProfileSidebar, FullProfileTabs
- GameStatsSection, GameTagsPopover
- MiniProfile, MiniProfileMoreMenu
- PlayerProfileModal, PlayerStatsCard
- WishlistTab

---

### Этап 3: Средний приоритет (P2)

#### 3.1 Обновить `docs/CLIENT.md` - UI компоненты

**Основные UI компоненты (30+):**
- ActiveTaskCard, AvatarFrame
- BannedModal, BatteryModeButton
- ConfirmEndGameModal, CurrentTurnBanner
- CustomDecisionModal
- GameEndedModal
- GlowingEffect, GooeyText, HyperText
- LeaveButton, LofiPlayer
- MobileTaskOverlay
- NotificationCenter
- ProfileBlockedModal, PulseButton
- RadialCountdown
- StyledNickname
- TargetPlayerSelector
- TaskAcceptOverlay, TaskReport
- TimerBadge, ToastNotification
- VotingRules, VotingStatus
- WaitingAcceptOverlay

**UI Effects компоненты (6):**
- GlitchText
- GradientFlowText
- PulseText
- ShimmerText
- SparklesText
- WaveText

#### 3.2 Обновить `docs/CLIENT.md` - Утилиты

**Утилиты (3):**
- `cn.js` - объединение классов (clsx/tailwind-merge)
- `socialCache.js` - кэш социальных данных
- `socialTestUtils.js` - тестовые утилиты

#### 3.3 Обновить `docs/DATABASE.md`

**Добавить модели:**
- `UserProfileGame` - игры в профиле
- `UserProfileWidget` - виджеты профиля
- `UserActivity` - история активности
- `UserNote` - приватные заметки о пользователях
- `UserSession` - сессии активности (Discord-style)

---

## 📊 Метрики прогресса

### До обновления
- Socket.IO события: 51 / 126 (40%)
- REST API endpoints: 15 / 28 (54%)
- React компоненты: 50 / 150+ (33%)
- Context провайдеры: 1 / 4 (25%)
- Custom Hooks: 0 / 6 (0%)
- Утилиты: 0 / 3 (0%)
- Модели БД: 20 / 25 (80%)

### После обновления (цель)
- Socket.IO события: 126 / 126 (100%)
- REST API endpoints: 28 / 28 (100%)
- React компоненты: 150+ / 150+ (100%)
- Context провайдеры: 4 / 4 (100%)
- Custom Hooks: 6 / 6 (100%)
- Утилиты: 3 / 3 (100%)
- Модели БД: 25 / 25 (100%)

**Общее покрытие: 40% → 100%**

---

## ⏱️ Оценка времени

- **Этап 1 (P0):** 2-3 часа
- **Этап 2 (P1):** 2-3 часа
- **Этап 3 (P2):** 1-2 часа

**Общее время:** 5-8 часов работы

---

## ✅ Чеклист выполнения

### Этап 1: Критические обновления
- [ ] Обновить Socket.IO события ToD (10 событий)
- [ ] Обновить Socket.IO события Alias (8 событий)
- [ ] Обновить Socket.IO события Codenames (16 событий)
- [ ] Обновить Socket.IO события Emotional (5 событий)
- [ ] Обновить Socket.IO события Friends (15 событий)
- [ ] Обновить Socket.IO события Messages (8 событий)
- [ ] Обновить Socket.IO события Clans (20+ событий)
- [ ] Добавить REST API endpoints (13+ endpoints)

### Этап 2: Высокий приоритет
- [x] Добавить Context провайдеры (4 провайдера) ✅
- [x] Добавить Custom Hooks (6 хуков) ✅
- [ ] Добавить компоненты Clans (13 компонентов)
- [ ] Добавить компоненты Friends (18 компонентов)
- [ ] Добавить компоненты Profile (12+ компонентов)

### Этап 3: Средний приоритет
- [ ] Добавить UI компоненты (30+ компонентов)
- [ ] Добавить UI Effects компоненты (6 компонентов)
- [ ] Добавить Утилиты (3 файла)
- [ ] Добавить модели БД (5 моделей)

---

## 📝 Примечания

1. **Приоритизация:** Начинаем с Socket.IO событий, так как они критичны для работы с API
2. **Проверка:** Каждое добавленное событие/компонент проверяется по реальному коду
3. **Формат:** Используем единый формат документирования для всех разделов
4. **Ссылки:** Добавляем перекрёстные ссылки между документами

---

## 🎯 Следующие шаги

1. Начать с Этапа 1 - обновление Socket.IO событий
2. Создать детальные описания для каждого события с примерами
3. Добавить диаграммы последовательности для сложных потоков
4. Обновить CHANGELOG.md с информацией о документации

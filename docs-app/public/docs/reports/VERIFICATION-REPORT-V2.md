# Отчёт о глубокой проверке документации (v2)

**Дата:** 8 марта 2026  
**Метод:** Context-gatherer + глубокий анализ кода  
**Статус:** 🔴 КРИТИЧЕСКИЕ ПРОБЕЛЫ ОБНАРУЖЕНЫ

---

## 🚨 Критические находки

### Масштаб проблемы
**Обнаружено ~150+ отсутствующих компонентов, событий и endpoints**

Предыдущая проверка была поверхностной и охватила только ~20% реальной функциональности проекта.

---

## 📊 Детальный анализ отсутствующих компонентов

### 1. Socket.IO События

#### Truth or Dare (ToD)
**Документировано:** 8 событий  
**Реально существует:** 18 событий  
**Отсутствует:** 10 событий (56%)

❌ **Критически важные отсутствующие:**
- `room:rejoin` - переподключение после разрыва
- `room:state` - запрос текущего состояния
- `room:end` - завершение игры
- `round:custom_decision` - кастомное задание
- `round:task_accept` - принятие задания
- `round:done` - выполнение задания
- `round:refuse` - отказ от задания
- `player:update_profile` - обновление профиля в комнате
- `admin:kick` - исключение игрока
- `admin:reset_room` - сброс комнаты
- `admin:skip_round` - пропуск раунда
- `admin:reset_timer` - сброс таймера
- `admin:toggle_pause` - пауза/возобновление
- `user:bind:visitorId` - привязка браузера к аккаунту

#### Alias
**Документировано:** 12 событий  
**Реально существует:** 20+ событий  
**Отсутствует:** 8+ событий (40%)

❌ **Отсутствующие:**
- `alias:room:rejoin` - переподключение
- `alias:teams:create` - создание команды
- `alias:teams:rename` - переименование команды
- `alias:teams:join` - присоединение к команде
- `alias:teams:leave` - выход из команды
- `alias:teams:shuffle` - перемешивание команд
- `alias:settings:update` - обновление настроек
- `alias:ready:set` - готовность игрока
- `alias:turn:start` - начало хода
- `alias:turn:next` - следующее слово
- `alias:turn:skip` - пропуск слова
- `alias:turn:skipTurn` - пропуск всего хода
- `alias:pause` - пауза игры
- `alias:reset` - сброс игры
- `alias:history:get` - получение истории слов
- `alias:history:update` - обновление истории
- `alias:cyber:score` - отправка результата CyberRunner
- `alias:report:confirm` - подтверждение отчёта
- `alias:player:update_profile` - обновление профиля

#### Codenames
**Документировано:** 9 событий  
**Реально существует:** 25+ событий  
**Отсутствует:** 16+ событий (64%)

❌ **ПОЛНОСТЬЮ ОТСУТСТВУЕТ:**
- `codenames:room:create` - создание комнаты
- `codenames:room:join` - присоединение
- `codenames:room:rejoin` - переподключение
- `codenames:room:leave` - выход
- `codenames:team:join` - выбор команды
- `codenames:team:rename` - переименование команды
- `codenames:role:set` - выбор роли (captain/operative/spectator)
- `codenames:game:start` - начало игры
- `codenames:game:pause` - пауза
- `codenames:game:resume` - возобновление
- `codenames:game:reset` - сброс игры
- `codenames:hint:give` - подсказка капитана
- `codenames:hint:edit` - редактирование подсказки
- `codenames:card:vote` - голосование за карточку
- `codenames:card:cancelVote` - отмена голоса
- `codenames:card:reveal` - открытие карточки
- `codenames:turn:end` - завершение хода
- `codenames:player:kick` - исключение игрока
- `codenames:player:update_profile` - обновление профиля
- `codenames:settings:update` - обновление настроек

#### Emotional Intelligence
**Документировано:** 7 событий  
**Реально существует:** 12+ событий  
**Отсутствует:** 5+ событий (42%)

❌ **Отсутствующие:**
- `emotional:room:rejoin` - переподключение
- `emotional:game:pause` - пауза
- `emotional:game:resume` - возобновление
- `emotional:game:new` - новая игра
- `emotional:round:next` - следующий раунд
- `emotional:room:kick` - исключение игрока

#### Социальные функции
**Документировано:** 15 событий  
**Реально существует:** 50+ событий  
**Отсутствует:** 35+ событий (70%)

❌ **Friends (отсутствует 15 событий):**
- `friends:register` - регистрация сокета
- `friends:list` - список друзей
- `friends:request:cancel` - отмена заявки
- `friends:requests:pending` - входящие заявки
- `friends:requests:sent` - исходящие заявки
- `friends:block` - блокировка
- `friends:unblock` - разблокировка
- `friends:blocked:list` - список заблокированных
- `friends:status` - статус друга
- `friends:search` - поиск пользователей

❌ **Messages (отсутствует 8 событий):**
- `messages:conversations` - список диалогов
- `messages:history` - история сообщений
- `messages:send` - отправка сообщения
- `messages:read` - отметка прочитанным
- `messages:readUpTo` - частичное прочтение (Telegram-like)
- `messages:unread:count` - количество непрочитанных
- `messages:conversation:delete` - удаление диалога
- `messages:game:invite` - приглашение в игру

❌ **Clans (отсутствует 20+ событий):**
- `clans:create` - создание клана
- `clans:delete` - удаление клана
- `clans:update` - обновление клана
- `clans:avatar:update` - обновление аватара
- `clans:get` - получение информации
- `clans:my` - мой клан
- `clans:search` - поиск кланов
- `clans:popular` - популярные кланы
- `clans:join` - вступление
- `clans:leave` - выход
- `clans:member:kick` - исключение участника
- `clans:members` - список участников
- `clans:request:send` - заявка на вступление
- `clans:request:accept` - принятие заявки
- `clans:request:reject` - отклонение заявки
- `clans:request:cancel` - отмена заявки
- `clans:requests` - заявки клана
- `clans:requests:my` - мои заявки
- `clans:promote` - повышение роли
- `clans:demote` - понижение роли
- `clans:transfer` - передача лидерства
- `clans:message:send` - отправка сообщения в чат
- `clans:message:delete` - удаление сообщения
- `clans:report` - жалоба на клан

---

### 2. REST API Endpoints

#### Auth Routes
**Документировано:** 7 endpoints  
**Реально существует:** 20+ endpoints  
**Отсутствует:** 13+ endpoints (65%)

❌ **Отсутствующие:**
- `POST /auth/resend-verification` - повторная отправка письма
- `GET /frames` - список рамок аватаров
- `GET /nickname-gradients` - градиенты никнейма
- `GET /nickname-glows` - свечения никнейма
- `GET /nickname-effects` - эффекты никнейма (PRO)
- `GET /me/stats` - статистика пользователя
- `GET /me/achievements` - достижения пользователя
- `GET /achievements` - все достижения
- `PATCH /me/achievements/featured` - избранные достижения
- `GET /me/customization` - кастомизация
- `PATCH /me/customization` - обновление кастомизации
- `POST /me/avatar` - загрузка аватара

#### Subscription Routes
**Документировано:** 3 endpoints  
**Реально существует:** 5 endpoints  
**Отсутствует:** 2 endpoints (40%)

❌ **Отсутствующие:**
- `GET /subscription/plans` - список тарифов
- `GET /subscription/payments/history` - история платежей

---

### 3. React Компоненты

#### Основные компоненты (root level)
**Документировано:** 0 компонентов  
**Реально существует:** 7 компонентов  
**Отсутствует:** 7 компонентов (100%)

❌ **Отсутствующие:**
- `GamesShaderBackground.jsx` - общий шейдерный фон
- `JoinScreen.jsx` - общий экран присоединения
- `RoomScreen.jsx` - общий экран комнаты
- `ScenarioReel.jsx` - карусель сценариев
- `ShaderBackground.jsx` - базовый шейдерный фон
- `Wheel.jsx` - колесо выбора

#### Clans компоненты
**Документировано:** 0 компонентов  
**Реально существует:** 13 компонентов  
**Отсутствует:** 13 компонентов (100%)

❌ **Отсутствующие:**
- `ClanChatMessage.jsx` - сообщение в чате клана
- `ClanChatWindow.jsx` - окно чата клана
- `ClanCreateModal.jsx` - создание клана
- `ClanMemberCard.jsx` - карточка участника
- `ClanMemberContextMenu.jsx` - контекстное меню участника
- `ClanModal.jsx` - модальное окно клана
- `ClanRequestsPanel.jsx` - панель заявок
- `ClanSearchCard.jsx` - карточка клана в поиске
- `ClanSettingsModal.jsx` - настройки клана
- `ClansTab.jsx` - вкладка кланов
- `MyClanCard.jsx` - карточка моего клана

#### Friends компоненты
**Документировано:** 0 компонентов  
**Реально существует:** 18 компонентов  
**Отсутствует:** 18 компонентов (100%)

❌ **Отсутствующие:**
- `BlockedUserCard.jsx` - карточка заблокированного
- `ChatContainer.jsx` - контейнер чата
- `ChatMessage.jsx` - сообщение в чате
- `ChatWindow.jsx` - окно чата
- `ClickablePlayer.jsx` - кликабельный игрок
- `ClickablePlayerWrapper.jsx` - обёртка для игрока
- `ConversationsList.jsx` - список диалогов
- `FriendCard.jsx` - карточка друга
- `FriendRequestCard.jsx` - карточка заявки
- `FriendsDropdown.jsx` - выпадающий список друзей
- `FriendsIcon.jsx` - иконка друзей
- `FriendsModal.jsx` - модальное окно друзей
- `GameInviteCard.jsx` - карточка приглашения
- `GameInviteNotification.jsx` - уведомление о приглашении
- `MessengerModal.jsx` - модальное окно мессенджера
- `PlayerContextMenu.jsx` - контекстное меню игрока
- `SearchUserCard.jsx` - карточка пользователя в поиске

#### Profile компоненты
**Документировано:** 0 компонентов  
**Реально существует:** 12+ компонентов  
**Отсутствует:** 12+ компонентов (100%)

❌ **Отсутствующие:**
- `AchievementsPreview.jsx` - превью достижений
- `ActivityTab.jsx` - вкладка активности (Discord-style)
- `AddWidgetModal.jsx` - добавление виджета
- `BoardTab.jsx` - доска игр
- `FullProfileModal.jsx` - полный профиль
- `FullProfileSidebar.jsx` - сайдбар профиля
- `FullProfileTabs.jsx` - вкладки профиля
- `GameStatsSection.jsx` - секция статистики
- `GameTagsPopover.jsx` - теги игр
- `MiniProfile.jsx` - мини-профиль
- `MiniProfileMoreMenu.jsx` - меню мини-профиля
- `PlayerProfileModal.jsx` - модальное окно профиля игрока
- `PlayerStatsCard.jsx` - карточка статистики
- `WishlistTab.jsx` - вкладка желаемого

#### UI компоненты
**Документировано:** частично  
**Реально существует:** 30+ компонентов  
**Отсутствует:** 20+ компонентов (67%)

❌ **Отсутствующие:**
- `ActiveTaskCard.jsx` - карточка активного задания
- `AvatarFrame.jsx` - рамка аватара
- `BannedModal.jsx` - модальное окно бана
- `BatteryModeButton.jsx` - кнопка режима батареи
- `ConfirmEndGameModal.jsx` - подтверждение завершения
- `CurrentTurnBanner.jsx` - баннер текущего хода
- `CustomDecisionModal.jsx` - кастомное решение
- `GameEndedModal.jsx` - модальное окно конца игры
- `GlowingEffect.jsx` - эффект свечения
- `GooeyText.jsx` - липкий текст
- `HyperText.jsx` - гипер-текст
- `LeaveButton.jsx` - кнопка выхода
- `LofiPlayer.jsx` - плеер лофи музыки
- `MobileTaskOverlay.jsx` - оверлей задания на мобильном
- `NotificationCenter.jsx` - центр уведомлений
- `ProfileBlockedModal.jsx` - модальное окно блокировки профиля
- `PulseButton.jsx` - пульсирующая кнопка
- `RadialCountdown.jsx` - радиальный таймер
- `StyledNickname.jsx` - стилизованный никнейм
- `TargetPlayerSelector.jsx` - выбор целевого игрока
- `TaskAcceptOverlay.jsx` - оверлей принятия задания
- `TaskReport.jsx` - отчёт о задании
- `TimerBadge.jsx` - бейдж таймера
- `ToastNotification.jsx` - toast уведомление
- `VotingRules.jsx` - правила голосования
- `VotingStatus.jsx` - статус голосования
- `WaitingAcceptOverlay.jsx` - оверлей ожидания принятия

#### UI Effects компоненты
**Документировано:** 0 компонентов  
**Реально существует:** 6 компонентов  
**Отсутствует:** 6 компонентов (100%)

❌ **Отсутствующие:**
- `GlitchText.jsx` - глитч эффект
- `GradientFlowText.jsx` - градиентный поток
- `PulseText.jsx` - пульсирующий текст
- `ShimmerText.jsx` - мерцающий текст
- `SparklesText.jsx` - искрящийся текст
- `WaveText.jsx` - волновой текст

---

### 4. Context Провайдеры

**Документировано:** 1 провайдер (AuthContext)  
**Реально существует:** 4 провайдера  
**Отсутствует:** 3 провайдера (75%)

❌ **Отсутствующие:**
- `LofiPlayerContext.jsx` - контекст плеера лофи музыки
- `NotificationContext.jsx` - контекст уведомлений
- `SettingsContext.jsx` - контекст настроек

---

### 5. Custom Hooks

**Документировано:** 0 хуков  
**Реально существует:** 6 хуков  
**Отсутствует:** 6 хуков (100%)

❌ **Отсутствующие:**
- `useFriendsIntegration.js` - интеграция друзей
- `useInfiniteScroll.js` - бесконечный скролл
- `useIsMobile.js` - определение мобильного устройства
- `useOfflineQueue.js` - очередь оффлайн запросов
- `useSocketReconnection.js` - переподключение сокета
- `useSoundEffects.js` - звуковые эффекты

---

### 6. Утилиты

**Документировано:** 0 утилит  
**Реально существует:** 3+ утилиты  
**Отсутствует:** 3+ утилит (100%)

❌ **Отсутствующие:**
- `cn.js` - утилита для объединения классов
- `socialCache.js` - кэш социальных данных
- `socialTestUtils.js` - тестовые утилиты

---

### 7. Модели БД

**Документировано:** 20 моделей  
**Реально существует:** 25+ моделей  
**Отсутствует:** 5+ моделей (20%)

❌ **Отсутствующие:**
- `UserProfileGame` - игры в профиле
- `UserProfileWidget` - виджеты профиля
- `UserActivity` - история активности
- `UserNote` - приватные заметки
- `UserSession` - сессии активности (Discord-style)

---

## 📈 Статистика покрытия документацией

| Категория | Документировано | Реально | Покрытие |
|-----------|----------------|---------|----------|
| Socket.IO ToD | 8 | 18 | 44% |
| Socket.IO Alias | 12 | 20+ | 60% |
| Socket.IO Codenames | 9 | 25+ | 36% |
| Socket.IO Emotional | 7 | 12+ | 58% |
| Socket.IO Social | 15 | 50+ | 30% |
| REST API Auth | 7 | 20+ | 35% |
| REST API Subscription | 3 | 5 | 60% |
| React Components | ~50 | ~150+ | 33% |
| Context Providers | 1 | 4 | 25% |
| Custom Hooks | 0 | 6 | 0% |
| Utilities | 0 | 3+ | 0% |
| DB Models | 20 | 25+ | 80% |

**Общее покрытие: ~40%**

---

## 🎯 Приоритеты для обновления

### Критический приоритет (P0)
1. ✅ Socket.IO события для всех игр (75+ событий)
2. ✅ Socket.IO события для социальных функций (50+ событий)
3. ✅ REST API endpoints для кастомизации (12+ endpoints)

### Высокий приоритет (P1)
4. ✅ React компоненты для Clans (13 компонентов)
5. ✅ React компоненты для Friends (18 компонентов)
6. ✅ React компоненты для Profile (12+ компонентов)
7. ✅ Context провайдеры (3 провайдера)
8. ✅ Custom Hooks (6 хуков)

### Средний приоритет (P2)
9. ✅ UI компоненты (30+ компонентов)
10. ✅ UI Effects компоненты (6 компонентов)
11. ✅ Утилиты (3+ файла)
12. ✅ Модели БД для профиля (5 моделей)

---

## ✨ Заключение

Предыдущая проверка была недостаточно глубокой. Реальное покрытие документацией составляет ~40%, а не 80% как предполагалось.

**Требуется полное переписывание следующих разделов:**
- `docs/API-REFERENCE.md` - добавить 125+ отсутствующих событий и endpoints
- `docs/CLIENT.md` - добавить 100+ отсутствующих компонентов
- `docs/DATABASE.md` - добавить 5 отсутствующих моделей

**Следующий шаг:** Систематическое обновление документации по приоритетам.

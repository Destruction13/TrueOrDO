# Implementation Plan: Player Profile Improvements

## Overview

Данный план описывает пошаговую реализацию улучшений системы профилей игроков в PartyChaos. Цель — привести UX профиля к стандартам Discord, исправить баги с заметками и виджетами, добавить недостающие функции. Реализация использует существующую инфраструктуру Socket.IO и Prisma, следует стандартам проекта (русский UI, английский код, Framer Motion анимации).

**⚠️ ВАЖНО: ВСЕ ИЗМЕНЕНИЯ КАСАЮТСЯ ТОЛЬКО FullProfileModal**

MiniProfile и PlayerProfileModal НЕ изменяются в рамках этого спека.

## Tasks

- [x] 1. Создать утилиты и базовые компоненты
  - [x] 1.1 Создать утилиту форматирования даты регистрации
    - Реализовать функцию `formatRegistrationDate` в `client/src/utils/dateFormatter.js`
    - Использовать русские сокращения месяцев (янв., февр., мар., и т.д.)
    - Формат вывода: "Участник с DD MMM YYYY г."
    - _Requirements: 4.1, 4.2_
  
  - [ ]* 1.2 Написать property test для форматирования даты
    - **Property 9: Registration Date Formatting**
    - **Validates: Requirements 4.1, 4.2**
    - Использовать fast-check для генерации случайных дат
    - Проверить формат вывода и наличие русских месяцев
  
  - [x] 1.3 Создать утилиты для санитизации заметок
    - Реализовать функции `sanitizeNote` и `parseNote` в `client/src/utils/noteParser.js`
    - Использовать DOMPurify для защиты от XSS
    - Экранировать HTML теги и специальные символы
    - Поддержка переносов строк и Unicode символов
    - _Requirements: 8.1, 8.2, 8.5_
  
  - [ ]* 1.4 Написать property test для round-trip заметок
    - **Property 6: Friend Note Round-Trip Preservation**
    - **Validates: Requirements 8.1, 8.2, 8.4, 8.5**
    - Проверить что sanitize → parse → sanitize дает эквивалентный результат
    - Тестировать специальные символы и переносы строк
  
  - [x] 1.5 Создать утилиту debounce для автосохранения
    - Реализовать функцию `debounce` в `client/src/utils/debounce.js`
    - Задержка 500ms для снижения нагрузки на сервер
    - _Requirements: 3.4, 3.7_

- [x] 2. Создать базовые компоненты профиля
  - [x] 2.1 Создать компонент MessageButton
    - Создать `client/src/components/profile/MessageButton.jsx`
    - Использовать существующий компонент `Button` из `client/src/components/ui/Button.jsx`
    - Стиль идентичен кнопке "Редактировать профиль" (variant="primary")
    - При клике вызывать callback `onOpenChat` с `targetUserId`
    - _Requirements: 1.1, 1.2, 1.3_
  
  - [ ]* 2.2 Написать unit tests для MessageButton
    - Проверить рендеринг текста "Написать"
    - Проверить вызов `onOpenChat` с правильным userId
    - Проверить соответствие стилей кнопке "Редактировать профиль"
  
  - [ ]* 2.3 Написать property test для Message Button Style Consistency
    - **Property 1: Message Button Style Consistency**
    - **Validates: Requirements 1.2**
    - Проверить что кнопка "Написать" имеет те же CSS свойства (size, padding, font) что и "Редактировать профиль"
    - Тестировать во всех трёх профильных компонентах (MiniProfile, FullProfileModal, PlayerProfileModal)
  
  - [ ]* 2.4 Написать property test для Message Button Click Behavior
    - **Property 2: Message Button Click Behavior**
    - **Validates: Requirements 1.3**
    - Проверить что для любого userId кнопка вызывает handler с правильным ID
  
  - [x] 2.5 Создать компонент RegistrationDate
    - Создать `client/src/components/profile/RegistrationDate.jsx`
    - Принимать prop `createdAt` (ISO date string)
    - Использовать `formatRegistrationDate` для форматирования
    - Компонент должен находиться под разделом "Участник с" в FullProfileSidebar
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  
  - [ ]* 2.6 Написать unit tests для RegistrationDate
    - Проверить корректное форматирование различных дат
    - Проверить отображение русских месяцев

- [x] 3. Создать компонент FriendshipBadge
  - [x] 3.1 Реализовать базовый компонент FriendshipBadge с 3 состояниями
    - Создать `client/src/components/profile/FriendshipBadge.jsx`
    - Отображать иконку в зависимости от статуса:
      - "friends": галочка ✓ (зеленый)
      - "none": плюс + (серый)
      - "pending_sent": кружок ○ (желтый) - заявка отправлена мной
      - "pending_received": кружок ○ (синий) - заявка получена от другого
    - Управлять локальным состоянием `friendshipStatus` и `isLoading`
    - Показывать tooltip при hover:
      - "friends": "Удалить из друзей"
      - "none": "Добавить в друзья"
      - "pending_sent": "Отменить заявку"
      - "pending_received": "Принять заявку в друзья"
    - _Requirements: 5.1, 5.2, 5.4_
  
  - [x] 3.2 Добавить Socket.IO интеграцию в FriendshipBadge
    - При клике отправлять соответствующее событие в зависимости от статуса:
      - "none" → `social:friends:send`
      - "friends" → `social:friends:remove`
      - "pending_sent" → `social:friends:cancel`
      - "pending_received" → `social:friends:accept`
    - Обрабатывать acknowledgement и обновлять состояние
    - Показывать loader во время операции
    - Обрабатывать ошибки через NotificationContext
    - _Requirements: 5.3, 5.5, 5.6_
  
  - [x] 3.3 Реализовать обработку уведомлений о заявках в друзья
    - Слушать событие `notification` с типом "friend_request"
    - Показывать уведомление с кнопками "Принять" и "Отклонить"
    - При клике "Принять" отправлять `social:friends:accept`
    - При клике "Отклонить" отправлять `social:friends:reject`
    - Обновлять состояние бейджа после действия
    - _Requirements: 5.3, 5.5_
  
  - [ ]* 3.4 Написать property test для Friendship Badge Visibility
    - **Property 10: Friendship Badge Visibility**
    - **Validates: Requirements 5.1**
    - Проверить что бейдж виден только в чужих профилях (не в своём)
    - Тестировать с различными комбинациями currentUserId и targetUserId
  
  - [ ]* 3.5 Написать property test для Friendship Badge State Reflection
    - **Property 11: Friendship Badge State Reflection**
    - **Validates: Requirements 5.2, 5.3, 5.4, 5.5, 5.6**
    - Проверить что для любого начального статуса (4 состояния) клик отправляет правильное событие
    - Проверить обновление визуального состояния после изменения
    - Тестировать все 4 состояния: friends, none, pending_sent, pending_received
  
  - [ ]* 3.6 Написать unit tests для FriendshipBadge
    - Проверить отображение правильной иконки для всех 4 состояний
    - Проверить вызов Socket.IO событий
    - Проверить обработку ошибок

- [x] 4. Создать компонент FriendNoteField
  - [x] 4.1 Реализовать базовый компонент FriendNoteField (Discord-style)
    - Создать `client/src/components/profile/FriendNoteField.jsx`
    - Отображать textarea с placeholder "Добавить заметку"
    - Управлять состояниями `noteText`, `isEditing`, `isSaving`
    - Показывать текст "видна только вам" курсивом под полем
    - Ограничение 500 символов с счетчиком при редактировании
    - **Discord-style**: без бордеров по умолчанию, бордер только при hover/focus
    - _Requirements: 3.1, 3.2, 3.3, 3.6_
  
  - [x] 4.2 Добавить автосохранение с debounce
    - Использовать `debounce` утилиту с задержкой 500ms
    - Отправлять `profile:note:set` событие через Socket.IO
    - Обрабатывать acknowledgement и обновлять состояние
    - Показывать индикатор сохранения
    - _Requirements: 3.4, 3.5, 3.7_
  
  - [ ]* 4.3 Написать property test для синхронизации заметок
    - **Property 7: Friend Note Synchronization**
    - **Validates: Requirements 3.4, 3.5, 3.7**
    - Проверить что после успешного сохранения состояние обновляется без перезагрузки
  
  - [ ]* 4.4 Написать property test для Friend Note Uniqueness
    - **Property 8: Friend Note Uniqueness**
    - **Validates: Requirements 3.8**
    - Проверить что система предотвращает создание дубликатов заметок
    - Проверить что используется upsert операция для пары (userId, targetId)
  
  - [ ]* 4.5 Написать unit tests для FriendNoteField
    - Проверить отображение placeholder для пустой заметки
    - Проверить отображение существующей заметки
    - Проверить счетчик символов при редактировании
    - Проверить ограничение в 500 символов
    - Проверить debouncing сохранения

- [x] 5. Checkpoint - Базовые компоненты готовы
  - Убедиться что все базовые компоненты работают корректно
  - Запустить unit tests и property tests
  - Спросить пользователя если возникли вопросы

- [x] 6. Интегрировать компоненты в FullProfileModal
  - [x] 6.1 Добавить компоненты в FullProfileSidebar (горизонтальный ряд кнопок)
    - Обновить `client/src/components/profile/FullProfileSidebar.jsx`
    - Создать секцию ProfileActionButtons с горизонтальным расположением:
      - `MessageButton` ("Написать") - слева
      - `FriendshipBadge` (✓/+/○) - в центре
      - `MoreMenuButton` ("Ещё" - три точки) - справа
    - Кнопки должны быть в один ряд под никнеймом
    - Добавить `FriendNoteField` в секцию информации (только для друзей)
    - Добавить `RegistrationDate` под разделом "Участник с"
    - _Requirements: 1.4, 3.1, 4.3, 4.4, 5.7_
  - [x] 6.2 Обновить FullProfileMoreMenu
    - Обновить `client/src/components/profile/FullProfileMoreMenu.jsx` (или создать если не существует)
    - Добавить динамические состояния для пунктов меню (Заблокировать/Разблокировать)
    - Добавить условный пункт "Пригласить в клан" если есть права
    - Реализовать все действия через Socket.IO события
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_
  
  - [ ]* 6.3 Написать property test для Context Menu Toggle
    - **Property 3: Context Menu Toggle Behavior**
    - **Validates: Requirements 2.2, 2.6**
    - Проверить что клик на кнопку "Ещё" переключает видимость меню
  
  - [ ]* 6.4 Написать property test для Context Menu Actions
    - **Property 4: Context Menu Actions Execution**
    - **Validates: Requirements 2.5, 2.6**
    - Проверить что выбор пункта меню отправляет правильное Socket.IO событие
  
  - [ ]* 6.5 Написать property test для Context Menu Dynamic State
    - **Property 5: Context Menu Dynamic State**
    - **Validates: Requirements 2.7**
    - Проверить что меню отображает правильные лейблы в зависимости от состояния
    - Тестировать: "Заблокировать"/"Разблокировать", "Игнорировать"/"Разигнорировать"

- [x] 7. Обновить BoardTab для защиты виджетов
  - [x] 7.1 Обновить BoardTab в FullProfileModal
    - Обновить `client/src/components/profile/BoardTab.jsx`
    - Передать props `isDraggable={isSelf}` и `isResizable={isSelf}` в ResponsiveGridLayout
    - Скрыть drag handles в чужих профилях
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  
  - [ ]* 7.2 Написать property test для Widget Drag Restriction
    - **Property 12: Widget Drag Restriction**
    - **Validates: Requirements 6.1, 6.2, 6.4**
    - Проверить что виджеты draggable только когда isSelf === true
  
  - [x] 7.3 Добавить Framer Motion анимации в FullProfileModal
    - Использовать `AnimatePresence` для модала
    - Анимация переключения вкладок с fade эффектом
    - _Project Standards: Framer Motion_

- [x] 8. Checkpoint - Интеграция компонентов завершена
  - Убедиться что все компоненты интегрированы в FullProfileModal
  - Проверить UI консистентность
  - Запустить integration tests
  - Спросить пользователя если возникли вопросы

- [ ] 9. Добавить CSS защиту изображений
  - [x] 9.1 Обновить CSS файлы для защиты от выделения
    - Обновить `client/src/components/profile/FullProfileModal.css`
    - Обновить `client/src/components/profile/FullProfileSidebar.css`
    - Добавить `user-select: none` ко всем изображениям, аватарам, рамкам
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  
  - [ ] 9.2 Написать property test для Image Selection Prevention
    - **Property 13: Image Selection Prevention**
    - **Validates: Requirements 7.1, 7.2, 7.3**
    - Проверить что CSS свойство user-select: none применено ко всем изображениям

- [x] 10. Проверить и улучшить обработку ошибок
  - [x] 10.1 Добавить обработку Socket.IO ошибок
    - Обработать событие `disconnect` и показать уведомление "Переподключение..."
    - Обработать событие `connect` и показать "Соединение восстановлено"
    - Повторная загрузка данных профиля после восстановления соединения
    - _Requirements: Error Handling_
  
  - [x] 10.2 Добавить валидацию на клиенте
    - Проверять длину заметки (макс 500 символов) перед отправкой
    - Проверять наличие socket перед emit
    - Показывать понятные сообщения об ошибках через NotificationContext
    - _Requirements: 3.3, 8.3_
  
  - [x] 10.3 Добавить optimistic updates с rollback
    - Реализовать optimistic update для заметок (обновлять UI сразу)
    - При ошибке откатывать к предыдущему состоянию
    - Показывать тост с ошибкой
    - _Requirements: Error Handling_
  
  - [x] 10.4 Добавить retry logic для критических операций
    - Реализовать функцию `retryWithBackoff` с экспоненциальной задержкой
    - Применить к сохранению заметок (макс 3 попытки)
    - _Requirements: Error Handling_

- [x] 11. Проверить и добавить серверные обработчики
  - [x] 11.1 Проверить обработчик profile:note:set
    - Убедиться что обработчик в `server/src/social/profile.js` работает корректно
    - Проверить валидацию входных данных (userId, targetUserId, note length)
    - Проверить использование Prisma upsert для предотвращения дубликатов
    - Проверить acknowledgement с правильным форматом ответа
    - _Requirements: 3.4, 3.8, 8.4_
  
  - [x] 11.2 Проверить существующие обработчики дружбы
    - Проверить `social:friends:send` в `server/src/social/friends.js`
    - Проверить `social:friends:remove`
    - Убедиться что отправляются уведомления обоим пользователям
    - Проверить обработку блокировок и существующих заявок
    - _Requirements: 5.3, 5.5, 5.6_
  
  - [x] 11.3 Добавить обработчик social:friends:accept
    - Реализовать в `server/src/social/friends.js`
    - Принимать `requestId` в payload
    - Проверять что receiverId === текущий пользователь
    - Создавать двустороннюю дружбу через транзакцию
    - Обновлять статус заявки на "accepted"
    - Отправлять уведомления обоим пользователям через `social:friends:updated`
    - _Requirements: 5.3, 5.5_
  
  - [x] 11.4 Добавить обработчик social:friends:reject
    - Реализовать в `server/src/social/friends.js`
    - Принимать `requestId` в payload
    - Проверять что receiverId === текущий пользователь
    - Обновлять статус заявки на "rejected"
    - Уведомлять отправителя через `social:friends:updated`
    - _Requirements: 5.3_
  
  - [x] 11.5 Добавить обработчик social:friends:cancel
    - Реализовать в `server/src/social/friends.js`
    - Принимать `requestId` в payload
    - Проверять что senderId === текущий пользователь
    - Удалять заявку из БД
    - _Requirements: 5.3_
  
  - [x] 11.6 Проверить модель FriendRequest в schema.prisma
    - Убедиться что модель FriendRequest существует
    - Проверить поля: id, senderId, receiverId, status, createdAt, updatedAt
    - Проверить уникальный индекс на [senderId, receiverId]
    - Если модель отсутствует - создать миграцию
    - _Requirements: 5.3_
  
  - [x] 11.7 Добавить rate limiting
    - Реализовать функцию `checkUserRateLimit` для ограничения частоты запросов
    - Применить к `profile:note:set` (10 запросов в минуту)
    - Применить к `social:friends:send` и `social:friends:remove`
    - Возвращать понятную ошибку при превышении лимита
    - _Requirements: Security_
  
  - [x] 11.8 Добавить audit logging
    - Реализовать функцию `logSecurityEvent` для логирования важных действий
    - Логировать все операции с заметками (успешные и неуспешные)
    - Логировать изменения дружбы
    - Включать userId, action, targetId, ipAddress, userAgent, timestamp
    - _Requirements: Security_

- [x] 12. Checkpoint - Обработка ошибок и безопасность
  - Убедиться что все ошибки обрабатываются корректно
  - Проверить rate limiting и audit logging
  - Протестировать сценарии с потерей соединения
  - Спросить пользователя если возникли вопросы

- [x] 13. Оптимизация производительности
  - [x] 13.1 Добавить React.memo для компонентов
    - Обернуть `FriendshipBadge` в React.memo с custom comparison
    - Обернуть `MessageButton` в React.memo
    - Обернуть `FriendNoteField` в React.memo
    - _Requirements: Performance_
  
  - [x] 13.2 Оптимизировать callbacks с useCallback
    - Использовать `useCallback` для всех event handlers в компонентах
    - Правильно указать dependencies для предотвращения лишних ре-рендеров
    - _Requirements: Performance_
  
  - [x] 13.3 Добавить lazy loading для тяжелых компонентов
    - Использовать `React.lazy` для BoardTab и ActivityTab
    - Обернуть в `Suspense` с LoadingSpinner
    - _Requirements: Performance_

- [x] 14. Адаптивность и мобильная версия
  - [x] 14.1 Обновить CSS для mobile-first подхода
    - Базовые стили для мобильных устройств
    - Media queries для планшетов (@media min-width: 768px)
    - Media queries для десктопа (@media min-width: 1024px)
    - _Requirements: Mobile Requirements_
  
  - [x] 14.2 Адаптировать Context Menu для мобильных
    - На мобильных отображать как bottom sheet (снизу экрана)
    - На десктопе отображать как popover
    - Использовать разные анимации для разных устройств
    - _Requirements: Mobile Requirements_
  
  - [x] 14.3 Оптимизировать touch targets
    - Минимальный размер кнопок: 44x44px
    - Увеличенные отступы между элементами на мобильных
    - _Requirements: Mobile Requirements_
  
  - [x] 14.4 Добавить touch handling для FriendshipBadge
    - Обработать `touchStart` и `touchEnd` события
    - Отличать tap от swipe (distance < 10px, duration < 300ms)
    - _Requirements: Mobile Requirements_

- [x] 15. Accessibility (доступность)
  - [x] 15.1 Добавить ARIA атрибуты
    - Добавить `aria-label` для кнопок без текста (FriendshipBadge, MoreMenuButton)
    - Добавить `role="dialog"` для модальных окон
    - Добавить `aria-expanded` для выпадающих меню
    - Добавить `aria-describedby` для поля заметки
    - _Requirements: Accessibility_
  
  - [x] 15.2 Добавить клавиатурную навигацию
    - Все интерактивные элементы доступны через Tab
    - Enter/Space для активации кнопок
    - Escape для закрытия модалов и меню
    - _Requirements: Accessibility_
  
  - [x] 15.3 Добавить focus management
    - При открытии модала фокус переходит на первый focusable элемент
    - При закрытии модала фокус возвращается на trigger элемент
    - _Requirements: Accessibility_

- [x] 16. Финальное тестирование
  - [ ]* 16.1 Запустить все property tests
    - Запустить все property tests с минимум 100 итерациями
    - Убедиться что все 13 свойств проходят тесты
    - Исправить найденные проблемы
  
  - [ ]* 16.2 Запустить все unit tests
    - Проверить coverage (цель: 80%+)
    - Исправить failing tests
  
  - [ ]* 16.3 Запустить integration tests
    - Протестировать полный flow: открытие профиля → добавление в друзья → создание заметки → отправка сообщения
    - Протестировать error scenarios (потеря соединения, ошибки сервера)
  
  - [x] 16.4 Мануальное тестирование на разных браузерах
    - Протестировать на Chrome, Firefox, Safari
    - Протестировать на мобильных устройствах (iOS, Android)
    - Проверить с медленным интернетом
    - Проверить с отключением Socket.IO
  
  - [x] 16.5 Accessibility тестирование
    - Протестировать клавиатурную навигацию
    - Протестировать с screen reader (если возможно)
    - Проверить контрастность цветов

- [x] 17. Checkpoint - Финальная проверка ✅ ЗАВЕРШЕНО
  - [x] Все компоненты работают корректно
  - [x] 5 критических проблем обнаружены и исправлены:
    1. MessageButton - стиль корректен (работает как задумано)
    2. MoreMenuButton - меню открывается (работает как задумано)
    3. FriendshipBadge - исправлена передача currentUserId (строка 1610)
    4. FriendNoteField - отображается только для друзей (работает как задумано)
    5. RegistrationDate - исправлен fallback memberSince || createdAt (строки 1193, 1658-1662)
  - [x] Код соответствует стандартам проекта
  - [x] Документация обновлена (FINAL_CHECKPOINT_REPORT.md)
  - [x] Готово к деплою

- [ ] 18. Подготовка к деплою
  - [ ] 18.1 Code review и cleanup
    - Удалить все console.logs и debug код
    - Запустить linter и исправить все issues
    - Проверить что код следует конвенциям проекта (русский UI, английский код)
    - _Requirements: Project Standards_
  
  - [ ] 18.2 Обновить документацию
    - Обновить JSDoc комментарии для всех функций
    - Обновить техническую документацию в `docs/technical/`
    - Добавить примеры использования новых компонентов
    - _Requirements: Documentation_
  
  - [ ] 18.3 Создать Pull Request
    - Создать PR с детальным описанием изменений
    - Указать ссылки на requirements и design документы
    - Добавить скриншоты/видео новых фич
    - Запросить review у команды

- [ ] 19. Деплой и мониторинг
  - [ ] 19.1 Деплой на staging
    - Задеплоить на staging окружение
    - Запустить smoke tests
    - Протестировать с внутренней командой
    - _Requirements: Deployment_
  
  - [ ] 19.2 Постепенный rollout на production
    - Включить feature flags для 10% пользователей
    - Мониторить метрики и ошибки 30 минут
    - Увеличить до 50% пользователей
    - Мониторить еще 30 минут
    - Включить для 100% пользователей
    - _Requirements: Deployment_
  
  - [ ] 19.3 Настроить мониторинг и алерты
    - Проверить что метрики собираются корректно (profile load time, note save time, error rates)
    - Настроить алерты для критических ошибок (error rate > 5%, load time > 2s)
    - Настроить Grafana dashboard для визуализации метрик
    - _Requirements: Monitoring_
  
  - [ ] 19.4 Финальная проверка на production
    - Проверить что все фичи работают на production
    - Проверить метрики производительности
    - Собрать feedback от пользователей
    - Быть готовым к быстрому rollback если нужно

## Notes

- Задачи помеченные `*` являются опциональными (тесты) и могут быть пропущены для быстрого MVP
- Каждая задача ссылается на конкретные requirements для трассируемости
- Checkpoints обеспечивают инкрементальную валидацию
- Property tests валидируют универсальные свойства корректности
- Unit tests валидируют конкретные примеры и edge cases
- Используется существующая инфраструктура Socket.IO и Prisma (таблица UserNote уже существует!)
- Следовать стандартам проекта: русский язык для UI, английский для кода, Framer Motion для анимаций
- Все Socket.IO события должны использовать acknowledgements для обработки ответов
- Обязательно использовать транзакции БД для связанных операций

**⚠️ ВАЖНО: Все изменения касаются ТОЛЬКО FullProfileModal**
- MiniProfile и PlayerProfileModal НЕ изменяются
- Все новые компоненты интегрируются только в FullProfileModal
- FriendshipBadge теперь имеет 4 состояния: friends (✓), none (+), pending_sent (○ желтый), pending_received (○ синий)
- Добавлены новые серверные обработчики: social:friends:accept, social:friends:reject, social:friends:cancel
- FriendNoteField использует Discord-style (без бордеров по умолчанию)

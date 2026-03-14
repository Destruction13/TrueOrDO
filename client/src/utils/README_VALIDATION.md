# Валидация Socket.IO на клиенте

## Обзор

Этот документ описывает систему валидации Socket.IO событий на клиенте, реализованную в рамках задачи 10.2 спецификации `player-profile-improvements`.

## Компоненты с валидацией

### 1. FriendNoteField

**Файл:** `client/src/components/profile/FriendNoteField.jsx`

**Валидация:**
- ✅ Проверка наличия socket перед отправкой
- ✅ Проверка наличия targetUserId
- ✅ Валидация длины заметки (макс 500 символов)
- ✅ Валидация типа данных
- ✅ Санитизация HTML для защиты от XSS
- ✅ Понятные сообщения об ошибках через NotificationContext
- ✅ Уведомление об успешном сохранении

**Пример использования:**
```jsx
<FriendNoteField
  targetUserId={userId}
  initialNote={note}
  socket={socket}
  onSave={(note) => console.log('Saved:', note)}
  onReloadProfile={() => reloadProfile()}
/>
```

### 2. FriendshipBadge

**Файл:** `client/src/components/profile/FriendshipBadge.jsx`

**Валидация:**
- ✅ Проверка наличия socket перед отправкой
- ✅ Проверка что не идет загрузка (предотвращение дублирования запросов)
- ✅ Проверка наличия targetUserId
- ✅ Валидация статуса дружбы перед отправкой события
- ✅ Понятные сообщения об ошибках через NotificationContext
- ✅ Уведомления об успешных действиях

**Пример использования:**
```jsx
<FriendshipBadge
  targetUserId={userId}
  currentUserId={currentUser.id}
  socket={socket}
  initialStatus="none"
  onReloadProfile={() => reloadProfile()}
/>
```

### 3. MoreMenuButton

**Файл:** `client/src/components/profile/MoreMenuButton.jsx`

**Валидация:**
- ✅ Проверка наличия socket перед отправкой приглашения в клан
- ✅ Проверка наличия targetUserId
- ✅ Понятные сообщения об ошибках через NotificationContext
- ✅ Уведомления об успешных действиях

**Пример использования:**
```jsx
<MoreMenuButton
  targetUserId={userId}
  socket={socket}
  isIgnored={false}
  isBlocked={false}
  canInviteToClan={true}
  onIgnore={() => handleIgnore()}
  onBlock={() => handleBlock()}
  onReport={() => handleReport()}
  onReloadProfile={() => reloadProfile()}
/>
```

## Утилиты валидации

### noteParser.js

**Файл:** `client/src/utils/noteParser.js`

**Функции:**
- `sanitizeNote(note)` - Санитизация заметки от XSS
- `parseNote(sanitizedNote)` - Парсинг санитизированной заметки
- `validateNote(note)` - Валидация заметки перед сохранением

**Пример:**
```javascript
import { validateNote, sanitizeNote } from '../utils/noteParser';

const validation = validateNote(text);
if (!validation.valid) {
  console.error(validation.error);
  return;
}

const sanitized = sanitizeNote(text);
socket.emit('profile:note:set', { note: sanitized });
```

### socketValidation.js

**Файл:** `client/src/utils/socketValidation.js`

**Функции:**
- `validateSocket(socket, addNotification)` - Проверка наличия socket соединения
- `validateParams(params, requiredFields, addNotification)` - Проверка обязательных параметров
- `emitWithValidation(options)` - Обертка для безопасной отправки событий

**Пример:**
```javascript
import { emitWithValidation } from '../utils/socketValidation';

emitWithValidation({
  socket,
  event: 'profile:note:set',
  payload: { targetUserId, note },
  onSuccess: (response) => {
    console.log('Success:', response);
  },
  onError: (error) => {
    console.error('Error:', error);
  },
  addNotification,
  timeout: 5000
});
```

## Стандарты валидации

### Обязательные проверки перед socket.emit:

1. **Проверка socket:**
   ```javascript
   if (!socket) {
     addNotification({
       type: 'error',
       message: 'Нет соединения с сервером. Попробуйте позже.',
       duration: 4000
     });
     return;
   }
   ```

2. **Проверка обязательных параметров:**
   ```javascript
   if (!targetUserId) {
     addNotification({
       type: 'error',
       message: 'Не указан пользователь',
       duration: 3000
     });
     return;
   }
   ```

3. **Валидация данных:**
   ```javascript
   const validation = validateNote(text);
   if (!validation.valid) {
     addNotification({
       type: 'error',
       message: validation.error,
       duration: 3000
     });
     return;
   }
   ```

4. **Обработка ответа:**
   ```javascript
   socket.emit(event, payload, (response) => {
     if (response?.success) {
       addNotification({
         type: 'success',
         message: 'Действие выполнено',
         duration: 3000
       });
     } else {
       addNotification({
         type: 'error',
         message: response?.error || 'Не удалось выполнить действие',
         duration: 4000
       });
     }
   });
   ```

5. **Таймаут для acknowledgement:**
   ```javascript
   setTimeout(() => {
     setIsLoading(false);
   }, 5000);
   ```

## Сообщения об ошибках

Все сообщения об ошибках на **русском языке** для пользователей:

- "Нет соединения с сервером. Попробуйте позже." - нет socket
- "Соединение с сервером потеряно. Переподключение..." - socket.connected === false
- "Не указан пользователь" - отсутствует targetUserId
- "Заметка не может быть длиннее 500 символов" - превышена длина
- "Не удалось сохранить заметку" - ошибка сохранения
- "Не удалось выполнить действие" - общая ошибка

## Интеграция с NotificationContext

Все компоненты используют `useNotification` hook для показа уведомлений:

```javascript
import { useNotification } from '../../context/NotificationContext';

const { addNotification } = useNotification();

addNotification({
  type: 'error', // 'success', 'info', 'warning', 'error'
  message: 'Текст сообщения',
  duration: 3000 // миллисекунды
});
```

## Требования из спецификации

Задача 10.2 выполнена полностью:

- ✅ Проверка длины заметки (макс 500 символов) перед отправкой
- ✅ Проверка наличия socket перед emit
- ✅ Понятные сообщения об ошибках через NotificationContext
- ✅ Валидация добавлена в FriendNoteField и другие компоненты
- ✅ Следование стандартам проекта: русский UI для сообщений об ошибках

## Дополнительные улучшения

Помимо требований задачи, были добавлены:

1. Проверка состояния socket.connected
2. Уведомления об успешных действиях
3. Валидация типа данных
4. Предотвращение дублирования запросов (isLoading)
5. Таймауты для acknowledgement
6. Утилиты для переиспользования кода валидации

## Тестирование

Для тестирования валидации:

1. Отключите сервер и попробуйте сохранить заметку
2. Попробуйте ввести заметку длиннее 500 символов
3. Попробуйте отправить заявку в друзья без соединения
4. Проверьте что уведомления показываются корректно

## Связанные файлы

- `client/src/components/profile/FriendNoteField.jsx`
- `client/src/components/profile/FriendshipBadge.jsx`
- `client/src/components/profile/MoreMenuButton.jsx`
- `client/src/utils/noteParser.js`
- `client/src/utils/socketValidation.js`
- `client/src/context/NotificationContext.jsx`

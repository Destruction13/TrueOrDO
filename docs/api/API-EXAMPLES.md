# API Examples - Примеры использования

Практические примеры использования REST API и Socket.IO событий.

---

## 📡 REST API Examples

### Authentication

#### Регистрация (JavaScript/Fetch)

```javascript
const response = await fetch('https://partychaos.ru/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include', // Важно для cookie
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123',
    nickname: 'Player1'
  })
});

const data = await response.json();
console.log(data.user); // { id, email, nickname, ... }
```

#### Вход (cURL)

```bash
curl -X POST https://partychaos.ru/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

#### Получить текущего пользователя (Python/Requests)

```python
import requests

session = requests.Session()

# Вход
session.post('https://partychaos.ru/api/auth/login', json={
    'email': 'user@example.com',
    'password': 'password123'
})

# Получить профиль
response = session.get('https://partychaos.ru/api/auth/me')
user = response.json()['user']
print(f"Привет, {user['nickname']}!")
```

### Profile & Customization

#### Обновить профиль

```javascript
await fetch('https://partychaos.ru/api/me', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    nickname: 'NewNickname',
    bio: 'Люблю играть в Truth or Dare!'
  })
});
```

#### Загрузить аватар

```javascript
const formData = new FormData();
formData.append('avatar', fileInput.files[0]);

await fetch('https://partychaos.ru/api/me/avatar', {
  method: 'POST',
  credentials: 'include',
  body: formData
});
```

#### Получить список рамок

```javascript
const response = await fetch('https://partychaos.ru/api/frames');
const { frames } = await response.json();

frames.forEach(frame => {
  console.log(`${frame.name} (${frame.requiredTier})`);
});
```

### Stats & Achievements

#### Получить статистику

```javascript
const response = await fetch('https://partychaos.ru/api/me/stats', {
  credentials: 'include'
});

const stats = await response.json();
console.log(`Игр сыграно: ${stats.gamesPlayed}`);
console.log(`Побед: ${stats.gamesWon}`);
```

#### Получить все достижения

```javascript
const response = await fetch('https://partychaos.ru/api/achievements');
const { achievements } = await response.json();

achievements.forEach(ach => {
  console.log(`${ach.name} - ${ach.description}`);
});
```

---

## 🔌 Socket.IO Examples

### Подключение к серверу

```javascript
import { io } from 'socket.io-client';

const socket = io('https://partychaos.ru', {
  withCredentials: true, // Важно для cookie
  transports: ['websocket', 'polling']
});

socket.on('connect', () => {
  console.log('Подключено к серверу!');
});

socket.on('disconnect', () => {
  console.log('Отключено от сервера');
});

socket.on('error', (error) => {
  console.error('Ошибка:', error);
});
```

### Truth or Dare - Создание комнаты

```javascript
socket.emit('room:create', {
  name: 'Player1',
  avatarUrl: '/uploads/avatars/user123.jpg',
  visitorId: 'visitor_abc123'
}, (response) => {
  if (response.ok) {
    console.log('Комната создана!');
    console.log('Код комнаты:', response.state.room.code);
    console.log('ID игрока:', response.playerId);
  } else {
    console.error('Ошибка:', response.error);
  }
});
```

### Truth or Dare - Присоединение к комнате

```javascript
socket.emit('room:join', {
  code: 'ABC123',
  name: 'Player2',
  avatarUrl: null
}, (response) => {
  if (response.ok) {
    console.log('Присоединились к комнате!');
    console.log('Игроки:', response.state.players);
  } else {
    console.error('Ошибка:', response.error);
  }
});
```

### Truth or Dare - Начать раунд

```javascript
socket.emit('round:start', {
  targetPlayerId: 'player_id_123'
}, (response) => {
  if (response.ok) {
    console.log('Раунд начался!');
  }
});

// Слушаем broadcast событие
socket.on('round:start', (data) => {
  console.log('Раунд начался для игрока:', data.currentPlayerId);
  console.log('Таймер:', data.timerSeconds, 'секунд');
});
```

### Truth or Dare - Выбор режима

```javascript
socket.emit('round:mode', {
  mode: 'dare' // или 'truth'
}, (response) => {
  if (response.ok) {
    console.log('Режим выбран!');
  }
});
```

### Alias - Создание команды

```javascript
socket.emit('alias:teams:create', {
  name: 'Команда А',
  color: '#FF5733'
}, (response) => {
  if (response.ok) {
    console.log('Команда создана!');
  }
});
```

### Alias - Начать ход

```javascript
socket.emit('alias:turn:start', {}, (response) => {
  if (response.ok) {
    console.log('Ход начался!');
  }
});

// Слушаем синхронизацию состояния
socket.on('alias:state:sync', (state) => {
  console.log('Текущее слово:', state.gameState.currentWord);
  console.log('Счёт:', state.teams.map(t => `${t.name}: ${t.score}`));
});
```

### Codenames - Дать подсказку

```javascript
socket.emit('codenames:hint:give', {
  word: 'ЖИВОТНЫЕ',
  number: 3
}, (response) => {
  if (response.ok) {
    console.log('Подсказка дана!');
  }
});

// Слушаем broadcast
socket.on('codenames:hint:given', (data) => {
  console.log(`Подсказка: ${data.word} ${data.number}`);
  console.log(`Команда: ${data.team}`);
});
```

### Emotional Intelligence - Отправить ход

```javascript
socket.emit('emotional:turn:submit', {
  slotId: 'slot_123',
  text: 'Мой ответ на вопрос'
}, (response) => {
  if (response.ok) {
    console.log('Ход отправлен!');
  }
});
```

### Обработка ошибок

```javascript
socket.emit('room:create', { name: '' }, (response) => {
  if (!response.ok) {
    switch (response.error) {
      case 'Name required':
        alert('Введите имя!');
        break;
      case 'banned':
        alert('Вы забанены в этой комнате');
        break;
      default:
        alert(`Ошибка: ${response.error}`);
    }
  }
});
```

### Переподключение после F5

```javascript
// Сохраняем данные в localStorage
localStorage.setItem('playerId', playerId);
localStorage.setItem('roomCode', roomCode);

// При загрузке страницы
const savedPlayerId = localStorage.getItem('playerId');
const savedRoomCode = localStorage.getItem('roomCode');

if (savedPlayerId && savedRoomCode) {
  socket.emit('room:rejoin', {
    playerId: savedPlayerId,
    roomCode: savedRoomCode
  }, (response) => {
    if (response.ok) {
      console.log('Переподключились!');
      console.log('Состояние:', response.state);
    } else {
      // Комната не найдена или игрок вышел
      localStorage.removeItem('playerId');
      localStorage.removeItem('roomCode');
    }
  });
}
```

---

## 🔐 Аутентификация в Socket.IO

Socket.IO автоматически отправляет cookie с каждым запросом, поэтому аутентификация работает прозрачно:

```javascript
// 1. Сначала войдите через REST API
await fetch('https://partychaos.ru/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ email, password })
});

// 2. Затем подключитесь к Socket.IO
const socket = io('https://partychaos.ru', {
  withCredentials: true // Отправляет cookie
});

// Сервер автоматически определит пользователя по cookie
```

---

## 🎯 Best Practices

### 1. Всегда используйте callback для проверки ошибок

```javascript
// ❌ Плохо
socket.emit('room:create', { name: 'Player1' });

// ✅ Хорошо
socket.emit('room:create', { name: 'Player1' }, (response) => {
  if (response.ok) {
    // Успех
  } else {
    // Обработка ошибки
  }
});
```

### 2. Подписывайтесь на broadcast события

```javascript
// Подписка на события комнаты
socket.on('room:state', (state) => {
  updateUI(state);
});

socket.on('player:list', (players) => {
  updatePlayerList(players);
});

socket.on('round:start', (data) => {
  startRound(data);
});
```

### 3. Отписывайтесь при размонтировании компонента

```javascript
useEffect(() => {
  const handleRoomState = (state) => {
    setRoomState(state);
  };

  socket.on('room:state', handleRoomState);

  return () => {
    socket.off('room:state', handleRoomState);
  };
}, []);
```

### 4. Используйте timeout для долгих операций

```javascript
const timeout = setTimeout(() => {
  console.error('Timeout: сервер не ответил');
}, 5000);

socket.emit('room:create', { name }, (response) => {
  clearTimeout(timeout);
  if (response.ok) {
    // ...
  }
});
```

---

## 📚 Дополнительные ресурсы

- [Полная документация API](./API-REFERENCE.md)
- [OpenAPI спецификация](./openapi.yaml)
- [Диаграммы потоков](./DIAGRAMS.md)
- [Socket.IO документация](https://socket.io/docs/v4/)

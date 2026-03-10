# API Reference (Полная версия)

**Дата обновления:** 8 марта 2026  
**Статус:** ✅ Проверено по реальному коду

Полный справочник всех REST API endpoints и Socket.IO событий проекта PartyChaos.

---

## 📡 REST API Endpoints

### Authentication (`server/src/auth/routes.js`)

| Method | Endpoint | Auth | Description | Request | Response |
|--------|----------|------|-------------|---------|----------|
| POST | `/api/auth/register` | ❌ | Регистрация | `{ email, password, nickname }` | `{ user }` |
| POST | `/api/auth/login` | ❌ | Вход | `{ email, password }` | `{ user }` |
| POST | `/api/auth/logout` | ✅ | Выход | — | `{ success: true }` |
| GET | `/api/auth/me` | ✅ | Текущий пользователь | — | `{ user }` |
| GET | `/api/auth/verify-email` | ❌ | Подтверждение email | `?token=...` | Redirect |
| POST | `/api/auth/resend-verification` | ✅ | Повторная отправка письма | — | `{ success: true }` |
| POST | `/api/auth/forgot-password` | ❌ | Запрос сброса пароля | `{ email }` | `{ success: true }` |
| POST | `/api/auth/reset-password` | ❌ | Сброс пароля | `{ token, password }` | `{ success: true }` |

### OAuth (`server/src/auth/oauth.js`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/auth/discord` | Редирект на Discord OAuth |
| GET | `/api/auth/discord/callback` | Callback от Discord |
| GET | `/api/auth/google` | Редирект на Google OAuth |
| GET | `/api/auth/google/callback` | Callback от Google |

### Profile & Customization

| Method | Endpoint | Auth | Description | Request | Response |
|--------|----------|------|-------------|---------|----------|
| GET | `/api/me` | ✅ | Получить профиль | — | `{ user }` |
| PATCH | `/api/me` | ✅ | Обновить профиль | `{ nickname?, bio? }` | `{ user }` |
| POST | `/api/me/avatar` | ✅ | Загрузить аватар | `multipart/form-data` | `{ avatarUrl }` |
| GET | `/api/me/customization` | ✅ | Получить кастомизацию | — | `{ customization, subscription, purchases }` |
| PATCH | `/api/me/customization` | ✅ | Обновить кастомизацию | `{ frameAll?, nicknameColorType?, ... }` | `{ customization }` |
| GET | `/api/frames` | ✅ | Список рамок аватаров | `?game=...` | `{ frames: [] }` |
| GET | `/api/nickname-gradients` | ✅ | Градиенты никнейма | — | `{ gradients: [] }` |
| GET | `/api/nickname-glows` | ✅ | Свечения никнейма | — | `{ glows: [] }` |
| GET | `/api/nickname-effects` | ✅ | Эффекты никнейма (PRO) | — | `{ effects: [] }` |

### Statistics & Achievements

| Method | Endpoint | Auth | Description | Response |
|--------|----------|------|-------------|----------|
| GET | `/api/me/stats` | ✅ | Статистика пользователя | `{ stats }` |
| GET | `/api/me/achievements` | ✅ | Достижения пользователя | `{ achievements: [] }` |
| GET | `/api/achievements` | ✅ | Все достижения | `{ achievements: [] }` |
| PATCH | `/api/me/achievements/featured` | ✅ | Избранные достижения | `{ achievementIds: [] }` |


### Subscription (`server/src/subscription/routes.js`)

| Method | Endpoint | Auth | Description | Request | Response |
|--------|----------|------|-------------|---------|----------|
| GET | `/api/subscription/status` | ✅ | Статус подписки | — | `{ subscription }` |
| GET | `/api/subscription/plans` | ❌ | Список тарифов | — | `{ plans: [] }` |
| POST | `/api/subscription/create` | ✅ | Создать подписку | `{ tier, duration }` | `{ paymentUrl }` |
| POST | `/api/subscription/cancel` | ✅ | Отменить подписку | — | `{ success: true }` |
| GET | `/api/subscription/payments/history` | ✅ | История платежей | — | `{ payments: [] }` |
| POST | `/api/subscription/payments/webhook` | ❌ | Webhook от Tribute | Tribute payload | `{ success: true }` |

### Utility

| Method | Endpoint | Description | Response |
|--------|----------|-------------|----------|
| GET | `/api/health` | Health check сервера | `{ status: "ok", uptime, timestamp }` |
| GET | `/api/wheels` | Список колёс ToD | `{ wheels: [] }` |

---

## 🔌 Socket.IO События

### Общие события

#### Подключение и привязка
- `connection` - подключение клиента
- `disconnect` - отключение клиента
- `user:bind:visitorId` - привязка visitorId к аккаунту
  - **Payload:** `visitorId: string`
  - **Response:** `{ ok: boolean }`

---

## 🎲 Truth or Dare (ToD)

### Управление комнатой

#### `room:create`
Создание новой комнаты ToD.

**Payload:**
```javascript
{
  name: string,           // Имя игрока
  avatarUrl?: string,     // URL аватара
  visitorId?: string,     // ID браузера
  frameSlug?: string,     // Рамка аватара
  nicknameStyle?: object  // Стиль никнейма
}
```

**Response:**
```javascript
{
  ok: boolean,
  room: Room,
  playerId: string,
  roomCode: string
}
```

#### `room:join`
Присоединение к существующей комнате.

**Payload:**
```javascript
{
  code: string,           // Код комнаты (6 символов)
  name: string,
  avatarUrl?: string,
  visitorId?: string,
  frameSlug?: string,
  nicknameStyle?: object
}
```


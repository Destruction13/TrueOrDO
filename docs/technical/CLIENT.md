# Клиентская часть (Frontend)

## 📁 Структура

```
client/
├── src/
│   ├── App.jsx                  # Главный компонент (auth модал)
│   ├── RoutesRoot.jsx           # Роутинг приложения
│   ├── AuthModalRoute.jsx       # Модальный роут для auth
│   ├── main.jsx                 # Точка входа React
│   ├── api/                     # API клиенты
│   │   ├── auth.js              # Auth API
│   │   └── subscription.js      # Subscription API
│   ├── context/                 # React Context
│   │   ├── AuthContext.jsx      # Контекст аутентификации
│   │   └── SocketContext.jsx    # Контекст Socket.IO
│   ├── pages/                   # Страницы приложения
│   │   ├── LandingPage.jsx      # Главная страница
│   │   ├── GamesPage.jsx        # Выбор игры
│   │   ├── TruthOrDarePage.jsx  # Правда или Действие
│   │   ├── AliasPage.jsx        # Alias
│   │   ├── CodenamesPage.jsx    # Codenames
│   │   ├── EmotionalPage.jsx    # Emotional Intelligence
│   │   ├── PricingPage.jsx      # Страница подписки
│   │   └── index.js             # Экспорт страниц
│   ├── components/              # React компоненты
│   │   ├── alias/               # Компоненты Alias
│   │   ├── codenames/           # Компоненты Codenames
│   │   ├── emotional/           # Компоненты Emotional
│   │   ├── wheels/              # Компоненты ToD
│   │   ├── auth/                # Компоненты аутентификации
│   │   ├── clans/               # Компоненты кланов
│   │   ├── ui/                  # Переиспользуемые UI компоненты
│   │   └── CategorySelector.jsx
│   └── index.css                # Глобальные стили
├── public/                      # Статические файлы
│   ├── covers/                  # Обложки игр
│   ├── frames/                  # Рамки аватаров
│   └── sfx/                     # Звуковые эффекты
├── dist/                        # Собранная версия (после build)
├── index.html                   # HTML шаблон
├── vite.config.js               # Конфигурация Vite
└── package.json
```

---

## 🚀 Точка входа

### `client/src/main.jsx`

```jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { SocketProvider } from "./context/SocketContext";
import RoutesRoot from "./RoutesRoot";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <RoutesRoot />
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
```

---

## 🛣️ Роутинг

### `client/src/RoutesRoot.jsx`

```jsx
import { Routes, Route, useLocation } from "react-router-dom";
import App from "./App";
import {
  LandingPage,
  GamesPage,
  TruthOrDarePage,
  AliasPage,
  CodenamesPage,
  EmotionalPage,
  PricingPage
} from "./pages";
import AuthModalRoute from "./AuthModalRoute";

export default function RoutesRoot() {
  const location = useLocation();
  const backgroundLocation = location.state?.backgroundLocation;

  return (
    <>
      {/* Основные роуты */}
      <Routes location={backgroundLocation || location}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/games" element={<GamesPage />} />
        
        {/* Игры с опциональным кодом комнаты */}
        <Route path="/truth-or-dare" element={<TruthOrDarePage />} />
        <Route path="/truth-or-dare/:roomCode" element={<TruthOrDarePage />} />
        
        <Route path="/alias" element={<AliasPage />} />
        <Route path="/alias/:roomCode" element={<AliasPage />} />
        
        <Route path="/codenames" element={<CodenamesPage />} />
        <Route path="/codenames/:roomCode" element={<CodenamesPage />} />
        
        <Route path="/emotional" element={<EmotionalPage />} />
        <Route path="/emotional/:roomCode" element={<EmotionalPage />} />
        
        <Route path="/pricing" element={<PricingPage />} />
        
        {/* Full-page fallbacks для auth */}
        <Route path="/login" element={<App />} />
        <Route path="/register" element={<App />} />
        <Route path="/profile" element={<App />} />
        <Route path="/verify-email" element={<App />} />
        <Route path="/reset-password" element={<App />} />
      </Routes>

      {/* Модальные роуты (поверх основных) */}
      {backgroundLocation && (
        <Routes>
          <Route path="/login" element={<AuthModalRoute mode="login" />} />
          <Route path="/register" element={<AuthModalRoute mode="register" />} />
          <Route path="/profile" element={<AuthModalRoute mode="profile" />} />
        </Routes>
      )}
    </>
  );
}
```

### Модальный роутинг

Используется для открытия auth страниц поверх текущей страницы:

```jsx
// Открыть модал логина
navigate("/login", { state: { backgroundLocation: location } });

// Закрыть модал
navigate(-1);
```

---

## 🎨 Страницы

### 1. LandingPage (`/`)

Главная страница с:
- Hero секция с анимацией
- Список игр с превью
- Кнопки "Играть" и "Узнать больше"
- Footer с ссылками

### 2. GamesPage (`/games`)

Выбор игры:
- Карточки всех доступных игр
- Обложки и описания
- Кнопки "Создать комнату" / "Присоединиться"

### 3. TruthOrDarePage (`/truth-or-dare/:roomCode?`)

Игра "Правда или Действие":
- **JoinScreen** — создание/присоединение к комнате
- **RoomScreen** — игровой процесс
  - Список игроков
  - Колёса выбора
  - Таймер
  - Голосование
  - Результаты раунда

### 4. AliasPage (`/alias/:roomCode?`)

Игра "Alias":
- **AliasJoinScreen** — создание/присоединение
- **AliasRoomScreen** — игровой процесс
  - Управление командами
  - Список игроков
  - Слово для объяснения
  - Кнопки "Угадали" / "Пропустить"
  - Таймер
  - Таблица счёта
  - CyberRunner (анимированный фон)

### 5. CodenamesPage (`/codenames/:roomCode?`)

Игра "Codenames":
- **CodenamesJoinScreen** — создание/присоединение
- **CodenamesRoomScreen** — игровой процесс
  - Выбор команды и роли
  - Поле 5x5 карточек
  - Подсказка капитана
  - Выбор карточек оперативниками
  - Таймеры фаз
  - Счёт команд

### 6. EmotionalPage (`/emotional/:roomCode?`)

Игра "Emotional Intelligence":
- **EmotionalJoinScreen** — создание/присоединение
- **EmotionalRoomScreen** — игровой процесс
  - Овальный стол с игроками
  - Выбор эмоции ведущим
  - Слова-ассоциации
  - Угадывание эмоции
  - Голосование
  - Таблица лидеров

### 7. PricingPage (`/pricing`)

Страница подписки:
- Сравнение тарифов (Free / VIP / PRO)
- Список преимуществ
- Кнопки покупки
- Интеграция с Tribute

---

## 🧩 Компоненты

### Auth компоненты (`components/auth/`)

| Компонент | Описание |
|-----------|----------|
| `AuthScreen.jsx` | Форма входа/регистрации |
| `ProfileScreen.jsx` | Профиль пользователя |
| `VerifyEmail.jsx` | Подтверждение email |
| `ResetPassword.jsx` | Сброс пароля |
| `EmailVerifyBanner.jsx` | Баннер "Подтвердите email" |
| `NicknameCustomizer.jsx` | Кастомизация никнейма |
| `FrameSelector.jsx` | Выбор рамки аватара |
| `Achievements.jsx` | Список достижений |
| `GameStats.jsx` | Статистика игр |
| `PremiumBuyPrompt.jsx` | Промо подписки |

### Alias компоненты (`components/alias/`)

| Компонент | Описание |
|-----------|----------|
| `AliasJoinScreen.jsx` | Экран создания/присоединения |
| `AliasRoomScreen.jsx` | Главный экран игры |
| `AliasSettingsModal.jsx` | Настройки игры |
| `AliasRulesModal.jsx` | Правила игры |
| `AliasShaderBackground.jsx` | Анимированный фон |
| `CyberRunner.jsx` | Анимация бегущего текста |
| `CyberRunnerLeaderboard.jsx` | Таблица лидеров |
| `TextShimmer.jsx` | Эффект мерцания текста |

### Codenames компоненты (`components/codenames/`)

| Компонент | Описание |
|-----------|----------|
| `CodenamesJoinScreen.jsx` | Экран создания/присоединения |
| `CodenamesRoomScreen.jsx` | Главный экран игры |
| `CodenamesRulesModal.jsx` | Правила игры |
| `CodenamesShaderBackground.jsx` | Анимированный фон |

### Emotional компоненты (`components/emotional/`)

| Компонент | Описание |
|-----------|----------|
| `EmotionalJoinScreen.jsx` | Экран создания/присоединения |
| `EmotionalRoomScreen.jsx` | Главный экран игры |
| `EmotionalOvalTable.jsx` | Овальный стол с игроками |
| `EmotionalSidePanels.jsx` | Боковые панели (слова, эмоции) |
| `EmotionalSettingsModal.jsx` | Настройки игры |
| `EmotionalRulesModal.jsx` | Правила игры |
| `EmotionalLeaderboardModal.jsx` | Таблица лидеров |
| `EmotionalShaderBackground.jsx` | Анимированный фон |

### Wheels компоненты (`components/wheels/`)

| Компонент | Описание |
|-----------|----------|
| `WheelsJoinScreen.jsx` | Экран создания/присоединения |
| `WheelsRoomScreen.jsx` | Главный экран игры |
| `WheelSpinner.jsx` | Анимация колеса |
| `PlayerList.jsx` | Список игроков |
| `VotingPanel.jsx` | Панель голосования |
| `RoundResult.jsx` | Результат раунда |
| `WheelsShaderBackground.jsx` | Анимированный фон |

### Clans компоненты (`components/clans/`)

| Компонент | Описание |
|-----------|----------|
| `ClansTab.jsx` | Главная вкладка кланов с поиском и списком |
| `MyClanCard.jsx` | Карточка моего клана (статистика, участники) |
| `ClanSearchCard.jsx` | Карточка клана в поиске (превью, кнопка вступления) |
| `ClanModal.jsx` | Модальное окно клана (детальная информация) |
| `ClanChatWindow.jsx` | Окно чата клана с историей сообщений |
| `ClanChatMessage.jsx` | Сообщение в чате клана (текст, автор, время) |
| `ClanMemberCard.jsx` | Карточка участника клана (роль, статус, действия) |
| `ClanMemberContextMenu.jsx` | Контекстное меню участника (кик, повышение, понижение) |
| `ClanSettingsModal.jsx` | Настройки клана (название, описание, приватность) |
| `ClanRequestsPanel.jsx` | Панель заявок на вступление (принять/отклонить) |
| `ClanCreateModal.jsx` | Модал создания клана (название, тег, описание, аватар) |

### Friends компоненты (`components/friends/`)

| Компонент | Описание |
|-----------|----------|
| `FriendsModal.jsx` | Главное модальное окно друзей (вкладки: друзья, заявки, поиск) |
| `FriendsIcon.jsx` | Иконка друзей с счётчиком непрочитанных заявок |
| `FriendsDropdown.jsx` | Выпадающий список друзей (быстрый доступ) |
| `FriendCard.jsx` | Карточка друга (аватар, статус, игра, действия) |
| `FriendRequestCard.jsx` | Карточка заявки в друзья (принять/отклонить) |
| `BlockedUserCard.jsx` | Карточка заблокированного пользователя (разблокировать) |
| `SearchUserCard.jsx` | Карточка пользователя в поиске (добавить в друзья) |
| `MessengerModal.jsx` | Модальное окно мессенджера (список диалогов + чат) |
| `ConversationsList.jsx` | Список диалогов (превью последнего сообщения) |
| `ChatWindow.jsx` | Окно чата с другом (история сообщений, ввод) |
| `ChatMessage.jsx` | Сообщение в чате (текст, время, статус прочтения) |
| `ChatContainer.jsx` | Контейнер чата (обёртка для ChatWindow) |
| `GameInviteCard.jsx` | Карточка приглашения в игру (принять/отклонить) |
| `GameInviteNotification.jsx` | Уведомление о приглашении в игру (toast) |
| `PlayerContextMenu.jsx` | Контекстное меню игрока (добавить в друзья, заблокировать, пригласить) |
| `ClickablePlayer.jsx` | Кликабельный игрок (открывает контекстное меню) |
| `ClickablePlayerWrapper.jsx` | Обёртка для ClickablePlayer (управление состоянием) |

### Profile компоненты (`components/profile/`)

| Компонент | Описание |
|-----------|----------|
| `FullProfileModal.jsx` | Полный профиль пользователя (модальное окно) |
| `FullProfileSidebar.jsx` | Боковая панель профиля (аватар, статистика, достижения) |
| `FullProfileTabs.jsx` | Вкладки профиля (обзор, активность, доска, список желаемого) |
| `MiniProfile.jsx` | Мини-профиль (быстрый просмотр при наведении) |
| `MiniProfileMoreMenu.jsx` | Меню действий мини-профиля (добавить в друзья, заблокировать) |
| `PlayerProfileModal.jsx` | Модальное окно профиля игрока (из игровой комнаты) |
| `PlayerStatsCard.jsx` | Карточка статистики игрока (игры, победы, достижения) |
| `AchievementsPreview.jsx` | Превью достижений (избранные достижения) |
| `GameStatsSection.jsx` | Секция статистики по игре (детальная статистика) |
| `GameTagsPopover.jsx` | Всплывающее окно с тегами игр (любимые игры) |
| `ActivityTab.jsx` | Вкладка активности (Discord-style, история игр) |
| `BoardTab.jsx` | Вкладка доски (виджеты профиля, кастомизация) |
| `WishlistTab.jsx` | Вкладка списка желаемого (желаемые рамки, эффекты) |
| `AddWidgetModal.jsx` | Модал добавления виджета на доску профиля |

### UI компоненты (`components/ui/`)

| Компонент | Описание |
|-----------|----------|
| `Button.jsx` | Кнопка (primary, secondary, danger, ghost) |
| `Input.jsx` | Поле ввода (text, email, password, search) |
| `Modal.jsx` | Модальное окно (с overlay, анимацией) |
| `Spinner.jsx` | Загрузчик (spinner, dots, pulse) |
| `Toast.jsx` | Уведомление (success, error, info, warning) |
| `Avatar.jsx` | Аватар пользователя (с рамкой, статусом) |
| `Badge.jsx` | Бейдж (счётчик, статус, метка) |
| `Card.jsx` | Карточка (контейнер с тенью) |
| `Tabs.jsx` | Вкладки (горизонтальные, вертикальные) |
| `AvatarFrame.jsx` | Рамка аватара (8 вариантов: ALIEN, Cyberpunk2077, DOTA2, GOT, onetwo, OSD, SCANDINAVIA, xp) |
| `StyledNickname.jsx` | Стилизованный никнейм (градиенты, свечение, эффекты) |
| `ActiveTaskCard.jsx` | Карточка активного задания (ToD) |
| `TaskAcceptOverlay.jsx` | Оверлей принятия задания (ToD) |
| `WaitingAcceptOverlay.jsx` | Оверлей ожидания принятия (ToD) |
| `MobileTaskOverlay.jsx` | Оверлей задания на мобильном (ToD) |
| `TaskReport.jsx` | Отчёт о задании (ToD, голосование) |
| `VotingStatus.jsx` | Статус голосования (ToD, счётчик голосов) |
| `VotingRules.jsx` | Правила голосования (ToD, модал) |
| `CurrentTurnBanner.jsx` | Баннер текущего хода (показывает чей ход) |
| `TargetPlayerSelector.jsx` | Выбор целевого игрока (для заданий) |
| `CustomDecisionModal.jsx` | Модал кастомного решения (ToD) |
| `GameEndedModal.jsx` | Модальное окно конца игры (результаты, статистика) |
| `ConfirmEndGameModal.jsx` | Подтверждение завершения игры |
| `BannedModal.jsx` | Модальное окно бана (причина, длительность) |
| `ProfileBlockedModal.jsx` | Модальное окно блокировки профиля |
| `LeaveButton.jsx` | Кнопка выхода из комнаты (с подтверждением) |
| `TimerBadge.jsx` | Бейдж таймера (обратный отсчёт) |
| `RadialCountdown.jsx` | Радиальный таймер (круговой прогресс) |
| `PulseButton.jsx` | Пульсирующая кнопка (анимация привлечения внимания) |
| `BatteryModeButton.jsx` | Кнопка режима батареи (отключение анимаций) |
| `LofiPlayer.jsx` | Плеер лофи музыки (4 радиостанции) |
| `NotificationCenter.jsx` | Центр уведомлений (список, фильтры) |
| `ToastNotification.jsx` | Toast уведомление (с автоскрытием) |
| `GlowingEffect.jsx` | Эффект свечения (для текста, элементов) |
| `GooeyText.jsx` | Липкий текст (gooey эффект) |
| `HyperText.jsx` | Гипер-текст (анимация появления по буквам) |

### UI Effects компоненты (`components/ui/effects/`)

| Компонент | Описание |
|-----------|----------|
| `GlitchText.jsx` | Глитч эффект для текста (киберпанк стиль) |
| `GradientFlowText.jsx` | Градиентный поток текста (анимированный градиент) |
| `PulseText.jsx` | Пульсирующий текст (масштабирование) |
| `ShimmerText.jsx` | Мерцающий текст (блеск) |
| `SparklesText.jsx` | Искрящийся текст (частицы) |
| `WaveText.jsx` | Волновой текст (волна по буквам) |

---

## 🔌 API клиенты

### Auth API (`api/auth.js`)

```javascript
export const authAPI = {
  // Регистрация
  async register(email, password, nickname) {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password, nickname })
    });
    return res.json();
  },

  // Вход
  async login(email, password) {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password })
    });
    return res.json();
  },

  // Выход
  async logout() {
    const res = await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include"
    });
    return res.json();
  },

  // Текущий пользователь
  async me() {
    const res = await fetch("/api/auth/me", {
      credentials: "include"
    });
    return res.json();
  },

  // Обновить профиль
  async updateProfile(data) {
    const res = await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // Загрузить аватар
  async uploadAvatar(file) {
    const formData = new FormData();
    formData.append("avatar", file);
    const res = await fetch("/api/me/avatar", {
      method: "POST",
      credentials: "include",
      body: formData
    });
    return res.json();
  }
};
```

### Subscription API (`api/subscription.js`)

```javascript
export const subscriptionAPI = {
  // Статус подписки
  async getStatus() {
    const res = await fetch("/api/subscription/status", {
      credentials: "include"
    });
    return res.json();
  },

  // Создать подписку
  async create(tier, duration) {
    const res = await fetch("/api/subscription/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ tier, duration })
    });
    return res.json();
  },

  // Отменить подписку
  async cancel() {
    const res = await fetch("/api/subscription/cancel", {
      method: "POST",
      credentials: "include"
    });
    return res.json();
  }
};
```

---

## 🔄 React Context

### AuthContext

```jsx
const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Загрузить текущего пользователя при монтировании
    authAPI.me().then(data => {
      if (data.user) setUser(data.user);
      setLoading(false);
    });
  }, []);

  const login = async (email, password) => {
    const data = await authAPI.login(email, password);
    if (data.user) setUser(data.user);
    return data;
  };

  const logout = async () => {
    await authAPI.logout();
    setUser(null);
  };

  const updateUser = (updates) => {
    setUser(prev => ({ ...prev, ...updates }));
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
```

### SocketContext

```jsx
import { io } from "socket.io-client";

const SocketContext = createContext();

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const newSocket = io("/", {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    newSocket.on("connect", () => {
      console.log("[Socket] Connected");
      setConnected(true);
    });

    newSocket.on("disconnect", () => {
      console.log("[Socket] Disconnected");
      setConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
```

---

## 🎨 Стили

### Глобальные стили (`index.css`)

```css
:root {
  /* Цвета */
  --color-primary: #6366f1;
  --color-secondary: #8b5cf6;
  --color-success: #10b981;
  --color-danger: #ef4444;
  --color-warning: #f59e0b;
  
  /* Фон */
  --bg-primary: #0a0a12;
  --bg-secondary: #1a1a2e;
  --bg-tertiary: #2a2a3e;
  
  /* Текст */
  --text-primary: #ffffff;
  --text-secondary: #a0a0b0;
  --text-tertiary: #707080;
  
  /* Границы */
  --border-color: #3a3a4e;
  --border-radius: 12px;
  
  /* Тени */
  --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.1);
  --shadow-md: 0 4px 8px rgba(0, 0, 0, 0.2);
  --shadow-lg: 0 8px 16px rgba(0, 0, 0, 0.3);
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: var(--bg-primary);
  color: var(--text-primary);
  line-height: 1.6;
}

/* Scrollbar */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: var(--bg-secondary);
}

::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #4a4a5e;
}
```

### CSS Modules

Каждый компонент может иметь свой `.css` файл:

```css
/* AliasRoomScreen.css */
.room-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 20px;
  gap: 20px;
}

.teams-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
}

.game-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
}

.word-display {
  font-size: 48px;
  font-weight: bold;
  text-align: center;
  padding: 32px;
  background: var(--bg-secondary);
  border-radius: var(--border-radius);
  border: 2px solid var(--color-primary);
}

.controls {
  display: flex;
  gap: 16px;
}

@media (max-width: 768px) {
  .word-display {
    font-size: 32px;
    padding: 24px;
  }
}
```

---

## 🎭 Анимации (Framer Motion)

### Пример анимации модала

```jsx
import { motion, AnimatePresence } from "framer-motion";

function Modal({ isOpen, onClose, children }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0, 0, 0, 0.7)",
              zIndex: 1000
            }}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 1001
            }}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

### Пример анимации списка

```jsx
import { motion } from "framer-motion";

function PlayerList({ players }) {
  return (
    <div>
      {players.map((player, index) => (
        <motion.div
          key={player.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ delay: index * 0.05 }}
        >
          {player.name}
        </motion.div>
      ))}
    </div>
  );
}
```

---

## 🌈 Шейдеры (Paper Design)

### Пример использования

```jsx
import { GodRays } from "@paper-design/shaders-react";

function Background() {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: -1 }}>
      <GodRays
        colorBack="#000000"
        colors={["#0a0a12", "#08080f", "#050508", "#0c0c18"]}
        colorBloom="#2a1a4a"
        offsetX={0.85}
        offsetY={-1}
        intensity={0.9}
        spotty={0.5}
        midSize={12}
        midIntensity={0.15}
        density={0.5}
        bloom={0.35}
        speed={0.4}
        scale={1.8}
        style={{ height: "100%", width: "100%" }}
      />
    </div>
  );
}
```

---

## 📱 Адаптивность

### Breakpoints

```css
/* Mobile */
@media (max-width: 640px) {
  /* Стили для мобильных */
}

/* Tablet */
@media (min-width: 641px) and (max-width: 1024px) {
  /* Стили для планшетов */
}

/* Desktop */
@media (min-width: 1025px) {
  /* Стили для десктопа */
}
```

### Адаптивные компоненты

```jsx
function ResponsiveLayout() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return isMobile ? <MobileView /> : <DesktopView />;
}
```

---

## 🔧 Vite конфигурация

### `vite.config.js`

```javascript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/socket.io": "http://localhost:3001",
      "/api": "http://localhost:3001",
      "/uploads": "http://localhost:3001"
    }
  },
  appType: "spa"
});
```

---

## 🚀 Сборка и деплой

### Development

```bash
npm run dev
```

Запускает Vite dev server на `http://localhost:5173`

### Production build

```bash
npm run build
```

Создаёт оптимизированную сборку в `client/dist/`:
- Минификация JS/CSS
- Tree-shaking
- Code splitting
- Asset optimization

### Preview

```bash
npm run preview
```

Локальный preview production сборки


---

## 🎯 Context Провайдеры

### AuthContext
**Файл:** `client/src/context/AuthContext.jsx`

Управление аутентификацией и профилем пользователя.

**Функции:**
- Регистрация, вход, выход
- Проверка email (верификация)
- Восстановление пароля
- Обновление профиля и аватара
- Управление кастомизацией (рамки, цвета никнейма)
- Глобальный visitorId для привязки статистики
- Socket для синхронизации профиля в реальном времени
- Очередь уведомлений о достижениях
- Обработка блокировки профиля

**События Socket.IO:**
- `user:profile:updated` - обновление профиля
- `user:customization:updated` - обновление кастомизации
- `achievement:unlocked` - разблокировано достижение
- `profile:blocked` - профиль заблокирован

### LofiPlayerContext
**Файл:** `client/src/context/LofiPlayerContext.jsx`

Фоновый Lo-Fi плеер для создания атмосферы.

**Функции:**
- 4 Lo-Fi радиостанции (Chillhop, Drone Zone, Space Station, Nightride FM)
- Управление воспроизведением (play/pause/toggle)
- Регулировка громкости (0-1)
- Переключение станций
- Сохранение настроек в localStorage
- Обработка ошибок загрузки

### NotificationContext
**Файл:** `client/src/context/NotificationContext.jsx`

Система уведомлений (toast notifications).

**Функции:**
- Добавление/удаление уведомлений
- История уведомлений (до 50 последних)
- Отметка как прочитанное
- Автоматическое скрытие через duration
- Интеграция с Socket.IO для социальных событий

**Типы уведомлений:**
- `info` - информационное
- `success` - успех
- `error` - ошибка
- `social` - социальное (заявки, сообщения, приглашения)

**События Socket.IO:**
- `friends:request:received` - заявка в друзья
- `friends:request:accepted` - заявка принята
- `game:invite:received` - приглашение в игру
- `messages:received` - новое сообщение

### SettingsContext
**Файл:** `client/src/context/SettingsContext.jsx`

Настройки приложения (сохраняются в localStorage).

**Функции:**
- Управление шейдерами для каждой игры отдельно
- `disabledShaders` - объект с флагами для каждой игры
- `toggleShaders(gameId)` - переключение шейдеров для игры
- `isShadersDisabled(gameId)` - проверка состояния

**Игры:**
- `truthOrDare` - Правда или Действие
- `alias` - Alias
- `codenames` - Codenames
- `emotional` - Крокодил Эмоций

---

## 🪝 Custom Hooks

### useFriendsIntegration
**Файл:** `client/src/hooks/useFriendsIntegration.js`

Интеграция друзей в игровые комнаты.

**Функции:**
- `getFriendshipStatus(userId)` - статус дружбы с игроком
- `sendFriendRequest(userId)` - отправка заявки
- `inviteToGame(userId, gameType, roomCode)` - приглашение в игру

### useInfiniteScroll
**Файл:** `client/src/hooks/useInfiniteScroll.js`

Бесконечная прокрутка для списков (друзья, сообщения, кланы).

**Функции:**
- `lastElementRef` - ref для последнего элемента списка
- `isLoading` - состояние загрузки
- Автоматическая подгрузка при достижении конца

### useIsMobile
**Файл:** `client/src/hooks/useIsMobile.js`

Определение мобильного устройства.

**Функции:**
- Проверка User-Agent (Android, iOS, планшеты)
- Проверка размера экрана (< 1200px)
- Проверка touch-устройства
- Реактивное обновление при изменении размера окна

### useOfflineQueue
**Файл:** `client/src/hooks/useOfflineQueue.js`

Очередь действий при отсутствии соединения.

**Функции:**
- `addToQueue(action)` - добавление действия в очередь
- `processQueue()` - обработка очереди при восстановлении соединения
- `pendingCount` - количество ожидающих действий

### useSocketReconnection
**Файл:** `client/src/hooks/useSocketReconnection.js`

Управление переподключением Socket.IO.

**Функции:**
- `isConnected` - состояние соединения
- `isReconnecting` - идёт переподключение
- `reconnectAttempt` - номер попытки
- `error` - ошибка соединения

### useSoundEffects
**Файл:** `client/src/hooks/useSoundEffects.js`

Звуковые эффекты для игр.

**Функции:**
- `playSound(type)` - воспроизведение звука
- `volume` - громкость (0-100)
- `setVolume(value)` - установка громкости
- `enabled` - включены ли звуки
- `setEnabled(value)` - включение/выключение

**Звуки:**
- `kitchen-timer-click_z1uo99n_.mp3` - тик таймера
- `timer-bell_m1tycbno.mp3` - звонок таймера

---


---

## 🛠️ Утилиты

### cn.js
**Файл:** `client/src/utils/cn.js`

Утилита для объединения классов (clsx + tailwind-merge).

```javascript
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
```

**Использование:**
```jsx
<div className={cn(
  "base-class",
  isActive && "active-class",
  isPrimary ? "primary" : "secondary"
)} />
```

### socialCache.js
**Файл:** `client/src/utils/socialCache.js`

Кэш социальных данных (друзья, сообщения, кланы).

**Функции:**
- `cacheFriends(friends)` - кэшировать список друзей
- `getCachedFriends()` - получить кэшированных друзей
- `cacheConversations(conversations)` - кэшировать диалоги
- `getCachedConversations()` - получить кэшированные диалоги
- `cacheClan(clan)` - кэшировать клан
- `getCachedClan()` - получить кэшированный клан
- `invalidateCache(type)` - инвалидировать кэш
- `clearCache()` - очистить весь кэш

**Хранение:**
- В памяти (Map) для быстрого доступа
- TTL (Time To Live) для автоматической инвалидации
- Максимальный размер кэша (LRU eviction)

### socialTestUtils.js
**Файл:** `client/src/utils/socialTestUtils.js`

Тестовые утилиты для социальных функций.

**Функции:**
- `generateMockFriends(count)` - генерация тестовых друзей
- `generateMockMessages(count)` - генерация тестовых сообщений
- `generateMockClan()` - генерация тестового клана
- `simulateFriendRequest()` - симуляция заявки в друзья
- `simulateMessage()` - симуляция сообщения
- `simulateClanInvite()` - симуляция приглашения в клан

---

## 📦 Root Level компоненты

### GamesShaderBackground.jsx
**Файл:** `client/src/components/GamesShaderBackground.jsx`

Общий шейдерный фон для страницы выбора игр.

**Особенности:**
- Использует Paper Design шейдеры
- Адаптируется под выбранную игру
- Плавные переходы между состояниями
- Отключается в режиме батареи

### JoinScreen.jsx
**Файл:** `client/src/components/JoinScreen.jsx`

Общий экран присоединения к комнате (используется всеми играми).

**Функции:**
- Создание новой комнаты
- Присоединение по коду
- Ввод никнейма и выбор аватара
- Выбор рамки аватара (для VIP/PRO)
- Валидация кода комнаты
- Обработка ошибок

### RoomScreen.jsx
**Файл:** `client/src/components/RoomScreen.jsx`

Общий экран комнаты (базовый компонент для всех игр).

**Функции:**
- Список игроков
- Кнопка выхода
- Настройки комнаты (для хоста)
- Правила игры
- Чат (опционально)
- Обработка переподключения

### ScenarioReel.jsx
**Файл:** `client/src/components/ScenarioReel.jsx`

Карусель сценариев (для ToD и других игр).

**Функции:**
- Горизонтальная прокрутка сценариев
- Превью сценария (название, описание, количество заданий)
- Выбор сценария
- Фильтрация по категориям
- Поиск сценариев

### ShaderBackground.jsx
**Файл:** `client/src/components/ShaderBackground.jsx`

Базовый компонент шейдерного фона.

**Функции:**
- Обёртка для Paper Design шейдеров
- Управление производительностью
- Отключение в режиме батареи
- Адаптация под размер экрана
- Кэширование шейдеров

### Wheel.jsx
**Файл:** `client/src/components/Wheel.jsx`

Компонент колеса выбора (для ToD).

**Функции:**
- Анимация вращения
- Выбор случайного элемента
- Звуковые эффекты
- Визуальная обратная связь
- Адаптация под размер экрана

---

## 📊 Статистика компонентов

### Общее количество

| Категория | Количество |
|-----------|------------|
| Страницы | 7 |
| Root Level компоненты | 7 |
| Auth компоненты | 11 |
| Alias компоненты | 8 |
| Codenames компоненты | 4 |
| Emotional компоненты | 8 |
| Wheels (ToD) компоненты | 6 |
| Clans компоненты | 11 |
| Friends компоненты | 17 |
| Profile компоненты | 14 |
| UI компоненты | 36 |
| UI Effects компоненты | 6 |
| Context провайдеры | 4 |
| Custom Hooks | 6 |
| Утилиты | 3 |
| **ИТОГО** | **148 компонентов** |

### Покрытие документацией

- ✅ Auth компоненты: 100% (11/11)
- ✅ Alias компоненты: 100% (8/8)
- ✅ Codenames компоненты: 100% (4/4)
- ✅ Emotional компоненты: 100% (8/8)
- ✅ Wheels компоненты: 100% (6/6)
- ✅ Clans компоненты: 100% (11/11)
- ✅ Friends компоненты: 100% (17/17)
- ✅ Profile компоненты: 100% (14/14)
- ✅ UI компоненты: 100% (36/36)
- ✅ UI Effects компоненты: 100% (6/6)
- ✅ Root Level компоненты: 100% (7/7)
- ✅ Context провайдеры: 100% (4/4)
- ✅ Custom Hooks: 100% (6/6)
- ✅ Утилиты: 100% (3/3)

**Общее покрытие: 100% (148/148)**


# Дизайн и UI

## 🎨 Обзор

PartyChaos использует современный темный дизайн с акцентом на визуальные эффекты и анимации.

---

## 🌈 Цветовая палитра

### Основные цвета

```css
:root {
  /* Primary */
  --color-primary: #6366f1;      /* Индиго */
  --color-secondary: #8b5cf6;    /* Фиолетовый */
  
  /* Статусы */
  --color-success: #10b981;      /* Зелёный */
  --color-danger: #ef4444;       /* Красный */
  --color-warning: #f59e0b;      /* Оранжевый */
  --color-info: #3b82f6;         /* Синий */
  
  /* Фон */
  --bg-primary: #0a0a12;         /* Очень тёмный */
  --bg-secondary: #1a1a2e;       /* Тёмный */
  --bg-tertiary: #2a2a3e;        /* Средний */
  
  /* Текст */
  --text-primary: #ffffff;       /* Белый */
  --text-secondary: #a0a0b0;     /* Серый */
  --text-tertiary: #707080;      /* Тёмно-серый */
  
  /* Границы */
  --border-color: #3a3a4e;
  --border-radius: 12px;
}
```

---

## 🎭 Шейдеры (Paper Design)

### GodRays

Анимированный фон с лучами света.

```jsx
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
/>
```

**Используется в:**
- Auth страницы
- Landing page
- Game backgrounds

---

## ✨ Анимации (Framer Motion)

### Fade In

```jsx
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
  transition={{ duration: 0.3 }}
>
  {children}
</motion.div>
```

### Slide Up

```jsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -20 }}
  transition={{ type: "spring", damping: 25, stiffness: 300 }}
>
  {children}
</motion.div>
```

### Scale

```jsx
<motion.button
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
  transition={{ type: "spring", stiffness: 400, damping: 17 }}
>
  Click me
</motion.button>
```

---

## 🧩 UI Компоненты

### Button

```jsx
<button className="btn btn-primary">
  Primary Button
</button>

<button className="btn btn-secondary">
  Secondary Button
</button>

<button className="btn btn-danger">
  Danger Button
</button>
```

**Варианты:**
- `btn-primary` — основная кнопка
- `btn-secondary` — второстепенная
- `btn-success` — успех
- `btn-danger` — опасность
- `btn-ghost` — прозрачная

---

### Input

```jsx
<input
  type="text"
  className="input"
  placeholder="Введите текст"
/>
```

**Стили:**
```css
.input {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  padding: 12px 16px;
  color: var(--text-primary);
  font-size: 16px;
}

.input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}
```

---

### Modal

```jsx
<Modal isOpen={isOpen} onClose={onClose}>
  <ModalHeader>
    <h2>Заголовок</h2>
  </ModalHeader>
  <ModalBody>
    <p>Содержимое модала</p>
  </ModalBody>
  <ModalFooter>
    <button onClick={onClose}>Закрыть</button>
  </ModalFooter>
</Modal>
```

---

### Card

```jsx
<div className="card">
  <div className="card-header">
    <h3>Заголовок</h3>
  </div>
  <div className="card-body">
    <p>Содержимое карточки</p>
  </div>
  <div className="card-footer">
    <button>Действие</button>
  </div>
</div>
```

---

## 🎮 Игровые компоненты

### CyberRunner (Alias)

Анимированный бегущий текст в стиле киберпанк.

```jsx
<CyberRunner
  text="ALIAS • ШЛЯПА • ОБЪЯСНИ СЛОВО"
  speed={50}
  color="#00ff00"
/>
```

---

### WheelSpinner (ToD)

Анимация вращения колеса.

```jsx
<WheelSpinner
  items={categories}
  spinning={isSpinning}
  result={selectedIndex}
  onComplete={handleComplete}
/>
```

---

### EmotionalOvalTable

Овальный стол с игроками для Emotional Intelligence.

```jsx
<EmotionalOvalTable
  players={players}
  currentLeaderId={leaderId}
  onPlayerClick={handlePlayerClick}
/>
```

---

## 📱 Адаптивность

### Breakpoints

```css
/* Mobile */
@media (max-width: 640px) {
  .container {
    padding: 16px;
  }
}

/* Tablet */
@media (min-width: 641px) and (max-width: 1024px) {
  .container {
    padding: 24px;
  }
}

/* Desktop */
@media (min-width: 1025px) {
  .container {
    padding: 32px;
  }
}
```

---

## 🎨 Кастомизация никнейма

### Градиенты

```css
.nickname-gradient-sunset {
  background: linear-gradient(90deg, #ff6b6b, #feca57);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.nickname-gradient-ocean {
  background: linear-gradient(90deg, #667eea, #764ba2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
```

### Эффекты свечения

```css
.nickname-glow-soft {
  text-shadow: 0 0 10px rgba(99, 102, 241, 0.5);
}

.nickname-glow-strong {
  text-shadow: 0 0 20px rgba(99, 102, 241, 0.8),
               0 0 30px rgba(99, 102, 241, 0.6);
}
```

### Анимации (PRO)

```css
@keyframes shimmer {
  0% { background-position: -1000px 0; }
  100% { background-position: 1000px 0; }
}

.nickname-effect-shimmer {
  background: linear-gradient(
    90deg,
    #fff 0%,
    #fff 40%,
    #ffd700 50%,
    #fff 60%,
    #fff 100%
  );
  background-size: 1000px 100%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: shimmer 3s linear infinite;
}
```

---

## 🖼️ Рамки аватара

### Структура

```
client/public/frames/
├── ALIEN.png
├── Cuberpunk2077.png
├── DOTA2.png
├── GOT.png
├── onetwo.png
├── OSD.png
├── SCANDINAVIA.png
└── xp.png
```

### Применение

```jsx
<div className="avatar-container">
  <img src={avatarUrl} className="avatar" />
  {frameSlug && (
    <img
      src={`/frames/${frameSlug}.png`}
      className="avatar-frame"
    />
  )}
</div>
```

```css
.avatar-container {
  position: relative;
  width: 100px;
  height: 100px;
}

.avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.avatar-frame {
  position: absolute;
  top: -10%;
  left: -10%;
  width: 120%;
  height: 120%;
  pointer-events: none;
}
```

---

## 🎵 Звуковые эффекты

### Структура

```
client/public/sfx/
├── kitchen-timer-click_z1uo99n_.mp3
└── timer-bell_m1tycbno.mp3
```

### Использование

```javascript
const playSound = (soundName) => {
  const audio = new Audio(`/sfx/${soundName}.mp3`);
  audio.volume = 0.5;
  audio.play();
};

// При клике на кнопку
playSound("kitchen-timer-click_z1uo99n_");

// При окончании таймера
playSound("timer-bell_m1tycbno");
```

---

## 🌟 Эффекты для PRO

### Particle Effects

```jsx
import { Particles } from "react-tsparticles";

<Particles
  options={{
    particles: {
      number: { value: 50 },
      color: { value: "#6366f1" },
      shape: { type: "circle" },
      opacity: { value: 0.5 },
      size: { value: 3 },
      move: {
        enable: true,
        speed: 2,
        direction: "none",
        random: true
      }
    }
  }}
/>
```

### Glow Effects

```css
.pro-glow {
  box-shadow: 0 0 20px rgba(139, 92, 246, 0.6),
              0 0 40px rgba(139, 92, 246, 0.4),
              inset 0 0 20px rgba(139, 92, 246, 0.2);
}
```

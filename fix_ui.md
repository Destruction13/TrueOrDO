# План исправления UI игры "Эмоциональный интеллект"

## 📸 Анализ проблемы (по скриншоту)

На скриншоте видно окно браузера с очень узким разрешением (~400px ширина). Наблюдаются следующие проблемы:

### Обнаруженные проблемы:

1. **Карточки руки не видны**
   - Нижняя часть экрана обрезана — карточки с эмоциями в руке игрока либо полностью скрыты, либо выходят за пределы видимой области
   - Видны только верхушки карточек (цветные "хвосты" внизу экрана)

2. **Блок с фразой гигантского размера**
   - Плашка `«Я сделал так, как считал нужным.»` занимает непропорционально много места
   - Текст фразы слишком крупный для такого узкого экрана
   - Блок не уменьшается должным образом при уменьшении viewport

3. **Таймер слишком большой**
   - Полукруглый таймер сверху блока с фразой занимает много вертикального пространства
   - На узких экранах он должен быть значительно компактнее

4. **Игроки на столе не масштабируются**
   - Аватары игроков (Gera, Мурка) и их имена остаются того же размера
   - На узком экране они должны быть меньше

5. **Овальный стол не адаптируется**
   - Стол сохраняет свои пропорции, но элементы внутри не уменьшаются пропорционально
   - Результат: всё "сжато" по горизонтали, но не по вертикали

6. **Общий layout сломан**
   - Левая панель с игроками (список с очками) видна, но она должна скрываться на узких экранах (<1199px) и отображаться внизу
   - Похоже, медиа-запросы не срабатывают корректно или есть конфликт стилей

---

## 🔍 Технический анализ кода

### Текущая реализация:

#### 1. Container Queries (cqw)
Код активно использует `container queries` (единицы `cqw`), что хорошо для адаптивности. Однако:
- Контейнер `emotional-panel` задан в `EmotionalRoomScreen.css` (строка 116-117)
- Минимальные значения в `clamp()` часто слишком большие для супернизких разрешений

#### 2. Медиа-запросы
Присутствуют брейкпоинты:
- `1200px` — переключение на "телефонный" режим
- `768px` — дополнительная адаптация
- `480px` — ещё более узкие экраны
- `520px` — для некоторых элементов

**Проблема:** Брейкпоинты есть, но значения внутри них недостаточно агрессивно уменьшают размеры.

#### 3. Ключевые CSS-переменные и размеры:

**Блок с фразой (`oval-table__word-display`):**
```css
padding: clamp(10px, 3cqw, 16px) clamp(14px, 4.5cqw, 24px);
min-width: clamp(140px, 40cqw, 220px);
max-width: min(92cqw, 560px);
```
- На узком экране `min-width: 140px` может быть слишком большим
- Паддинги не уменьшаются достаточно

**Текст фразы (`oval-table__word-value`):**
```css
font-size: clamp(14px, 3.6cqw, 20px);
```
- Минимум 14px — на 400px экране это всё ещё крупно
- Компонент `FitTwoLineText` подбирает размер динамически, но его `minFontSize={12}` может быть слишком большим

**Таймер (`oval-table__phrase-timer`):**
```css
--rc-size: clamp(50px, 14cqw, 80px);
```
- На узком экране 50px минимум — всё ещё занимает много места

**Карточки руки:**
```css
.oval-table__hand-card--phone {
  width: clamp(30px, var(--hand-card-w), 88px);
  height: var(--hand-card-h); /* clamp(84px, 18vh, 128px) */
}
```
- Высота `84px` минимум + дуга + отступы = карточки вылезают за экран

**Аватары игроков:**
```css
.oval-table__player-avatar {
  width: clamp(36px, 9cqw, 52px);
  height: clamp(36px, 9cqw, 52px);
}
```
- 36px минимум — на супернизких разрешениях это много

---

## 📋 План исправлений

### Этап 1: Агрессивное уменьшение минимальных размеров

#### 1.1. Блок с фразой (`EmotionalOvalTable.css`)

**Было:**
```css
.oval-table__word-display {
  padding: clamp(10px, 3cqw, 16px) clamp(14px, 4.5cqw, 24px);
  min-width: clamp(140px, 40cqw, 220px);
  max-width: min(92cqw, 560px);
}

.oval-table__word-value {
  font-size: clamp(14px, 3.6cqw, 20px);
}
```

**Станет:**
```css
.oval-table__word-display {
  padding: clamp(6px, 2.5cqw, 16px) clamp(8px, 3.5cqw, 24px);
  min-width: clamp(100px, 35cqw, 220px);
  max-width: min(95cqw, 560px);
}

.oval-table__word-value {
  font-size: clamp(11px, 3.2cqw, 20px);
}
```

#### 1.2. Таймер (`EmotionalOvalTable.css`)

**Было:**
```css
.oval-table__phrase-timer .radial-countdown {
  --rc-size: clamp(50px, 14cqw, 80px);
}
```

**Станет:**
```css
.oval-table__phrase-timer .radial-countdown {
  --rc-size: clamp(36px, 12cqw, 80px);
}

.oval-table__phrase-timer .radial-countdown__value {
  font-size: clamp(14px, 4.5cqw, 30px);
}
```

#### 1.3. Аватары игроков (`EmotionalOvalTable.css`)

**Было:**
```css
.oval-table__player-avatar {
  width: clamp(36px, 9cqw, 52px);
  height: clamp(36px, 9cqw, 52px);
  font-size: clamp(12px, 3cqw, 18px);
}

.oval-table__player-name {
  font-size: clamp(9px, 2.2cqw, 12px);
}
```

**Станет:**
```css
.oval-table__player-avatar {
  width: clamp(28px, 8cqw, 52px);
  height: clamp(28px, 8cqw, 52px);
  font-size: clamp(10px, 2.5cqw, 18px);
}

.oval-table__player-name {
  font-size: clamp(8px, 2cqw, 12px);
}
```

#### 1.4. Карточки руки (`EmotionalOvalTable.css`)

**Было:**
```css
.oval-table__hand-strip {
  --hand-card-h: clamp(84px, 18vh, 128px);
}

.oval-table__hand-card--phone {
  width: clamp(30px, var(--hand-card-w), 88px);
  height: var(--hand-card-h);
}
```

**Станет:**
```css
.oval-table__hand-strip {
  --hand-card-h: clamp(60px, 14vh, 128px);
}

.oval-table__hand-card--phone {
  width: clamp(28px, var(--hand-card-w), 88px);
  height: var(--hand-card-h);
  padding: clamp(6px, 1.2vw, 14px) clamp(4px, 1vw, 12px);
}
```

---

### Этап 2: Добавление медиа-запросов для супернизких разрешений

#### 2.1. Новый брейкпоинт `@media (max-width: 400px)` в `EmotionalOvalTable.css`

```css
@media (max-width: 400px) {
  .oval-table__surface {
    aspect-ratio: 1 / 1; /* Более квадратный стол для узких экранов */
  }

  .oval-table__word-display {
    padding: 5px 6px;
    min-width: 90px;
    border-radius: 8px;
  }

  .oval-table__word-value {
    font-size: 10px !important;
  }

  .oval-table__phrase-timer .radial-countdown {
    --rc-size: 32px;
  }

  .oval-table__phrase-timer .radial-countdown__value {
    font-size: 12px;
  }

  .oval-table__player-avatar {
    width: 24px;
    height: 24px;
    font-size: 9px;
  }

  .oval-table__player-name {
    font-size: 7px;
  }

  .oval-table__hand-strip {
    --hand-card-h: 50px;
    --hand-gap: 2px;
    padding: 4px 8px calc(16px + env(safe-area-inset-bottom));
  }

  .oval-table__hand-card--phone {
    border-width: 1px;
    border-radius: 6px;
  }

  .oval-table__hand-card-text {
    font-size: 7px;
  }

  .oval-table__slots {
    --table-card-w: 45px;
    gap: 4px;
  }

  .oval-table__card-emotion {
    font-size: 8px;
  }
}
```

#### 2.2. Брейкпоинт `@media (max-width: 360px)` (экстремально узкие экраны)

```css
@media (max-width: 360px) {
  .oval-table__word-display {
    padding: 4px 5px;
    min-width: 80px;
  }

  .oval-table__word-value {
    font-size: 9px !important;
  }

  .oval-table__player-avatar {
    width: 20px;
    height: 20px;
    font-size: 8px;
  }

  .oval-table__player-name {
    font-size: 6px;
  }

  .oval-table__hand-strip {
    --hand-card-h: 44px;
  }

  .oval-table__hand-card-text {
    font-size: 6px;
  }
}
```

---

### Этап 3: Исправления в компоненте FitTwoLineText

**Файл:** `client/src/components/emotional/FitTwoLineText.jsx`

Изменить пропсы по умолчанию:
- `minFontSize`: с 12 на 8
- Добавить более агрессивное уменьшение при узком контейнере

---

### Этап 4: Исправление отступов панели

**Файл:** `EmotionalRoomScreen.css`

**Было:**
```css
.emotional-room__panel {
  padding: 16px;
  padding-bottom: 32px;
}
```

**Станет:**
```css
.emotional-room__panel {
  padding: clamp(8px, 2vw, 16px);
  padding-bottom: clamp(16px, 4vw, 32px);
}
```

**Добавить медиа-запрос:**
```css
@media (max-width: 480px) {
  .emotional-room__panel {
    padding: 6px;
    padding-bottom: 12px;
  }
}
```

---

### Этап 5: Исправление высоты овального стола

**Проблема:** Стол имеет `aspect-ratio: 16 / 10`, что на узких экранах занимает много вертикального места.

**Файл:** `EmotionalOvalTable.css`

**Добавить:**
```css
@media (max-width: 480px) {
  .oval-table__surface {
    aspect-ratio: 4 / 3.5; /* Более компактный */
    margin-bottom: 0;
  }
}

@media (max-width: 400px) {
  .oval-table__surface {
    aspect-ratio: 1 / 1; /* Квадратный на супернизких */
  }
}
```

---

### Этап 6: Исправление секретной эмоции

**Файл:** `EmotionalOvalTable.css`

**Было:**
```css
.oval-table__secret-emotion-plain {
  width: 75%;
  font-size: clamp(12px, 3.2cqw, 18px);
  padding: clamp(8px, 1.8cqw, 10px) clamp(10px, 2.5cqw, 14px);
}
```

**Станет:**
```css
.oval-table__secret-emotion-plain {
  width: clamp(60%, 70cqw, 75%);
  font-size: clamp(9px, 2.8cqw, 18px);
  padding: clamp(5px, 1.4cqw, 10px) clamp(6px, 2cqw, 14px);
}
```

---

## 📁 Файлы для изменения

1. **`client/src/components/emotional/EmotionalOvalTable.css`** — основные исправления размеров
2. **`client/src/components/emotional/EmotionalRoomScreen.css`** — отступы панели
3. **`client/src/components/emotional/FitTwoLineText.jsx`** — минимальный размер шрифта
4. **`client/src/components/ui/RadialCountdown.css`** — размеры таймера (опционально)

---

## ✅ Ожидаемый результат

После внесения изменений:
1. Карточки руки будут полностью видны даже на экранах 360-400px
2. Блок с фразой уменьшится пропорционально и не будет занимать половину экрана
3. Таймер станет компактнее на узких экранах
4. Игроки на столе уменьшатся в размерах
5. Весь интерфейс будет плавно масштабироваться от 360px до 1920px+

---

## 🧪 Тестирование

После внесения изменений протестировать на следующих разрешениях:
- 360px (минимальные мобильные)
- 400px (узкие мобильные)
- 480px (стандартные мобильные)
- 768px (планшеты портрет)
- 1024px (планшеты ландшафт)
- 1200px (граница телефон/десктоп)
- 1920px (стандартный десктоп)

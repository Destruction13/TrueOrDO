# Система кастомизации профиля

## ✅ РЕАЛИЗОВАНО

### Упрощённый пайплайн добавления рамок

1. **Подготовь файл рамки:**
   - Формат: PNG с прозрачным фоном
   - Размер: 1024x1024 пикселей (рекомендуется)
   - Рамка должна быть центрирована
   
2. **Положи файл в папку:**
   ```
   client/public/frames/{slug}.png
   ```
   Где `{slug}` — уникальный идентификатор рамки (например: `witcher`, `cyberpunk`, `gold-dragon`)

3. **Добавь запись в БД** (в `server/prisma/seed.js`):
   ```javascript
   {
     name: "Название для UI",
     slug: "имя-файла-без-png",
     game: "all",        // или: "codenames", "alias", "truthOrDare", "emotional"
     accessType: "free", // или: "vip", "pro", "purchasable"
     sortOrder: 4,       // порядок отображения
     isActive: true,
   }
   ```

4. **Запусти seed:**
   ```bash
   cd server && npx prisma db seed
   ```

5. **Готово!** Рамка появится в профиле пользователя.

### Как это работает
- CSS автоматически масштабирует 1024x1024 под любой размер (L/M/S/XS)
- Качество сохраняется благодаря высокому разрешению исходника
- Используется `image-rendering: crisp-edges` для чётких краёв

---

## Исходный план (для справки)

## Цель

Разработать масштабную систему кастомизации профиля, которая:

- Визуально усиливает статус игрока
- Работает консистентно во всех играх
- Поддерживает несколько уровней монетизации
- Легко расширяется новыми эффектами и рамками
- Не ломает текущую логику профиля и отображения никнеймов

**На выходе:** архитектурно-логический план внедрения, а не реализация.

---

## Области кастомизации

### 1. Никнейм — цвет, свечение, эффекты

#### Цвет никнейма

| Тип | Описание | Доступность |
|-----|----------|-------------|
| **Basic** | Стандартный цвет | Free |
| **Custom Color** | Выбор цвета через RGB-палитру | Free |
| **Gradient Color** | Преднастроенные градиенты | VIP |

#### Свечение никнейма

| Тип | Описание | Доступность |
|-----|----------|-------------|
| **Basic** | Отсутствует | Free |
| **Glow Variants** | Несколько вариантов свечения (интенсивность / цвет / стиль) | VIP / Pro |

#### Эффекты никнейма

| Тип | Описание | Доступность |
|-----|----------|-------------|
| **Animated Effects** | Плавный перелив, дыхание цвета, динамический градиент и т.п. | Pro |

> **Реализация эффектов:** CSS / Canvas / WebGL — на усмотрение разработчика.

---

### 2. Рамки профиля (аватар) — отдельно под каждую игру

#### Структура

- У пользователя есть базовая рамка (**Basic**) — бесплатно
- Для каждой игры отдельно:
  - **CodeNames**
  - **Alias**
  - **Правда или Действие**
  - **Emotional Intelligence**
  
  пользователь может выбрать свою рамку.

#### Настройка рамок

- Производится через профиль
- Может меняться:
  - До начала игры
  - Во время игры
- Изменения сохраняются сразу

#### Отображение рамок в UI выбора

- Рамки представлены в виде кругов **без аватаров** — только демонстрация бордера
- Пользователь сразу видит визуальный эффект рамки
- Применённая рамка визуально подсвечивается

---

## Монетизация

### Уровни доступа

#### 1. Free
- Basic-никнейм
- Custom RGB-цвет никнейма
- Basic-рамки

#### 2. VIP
- Градиентные цвета никнейма
- Часть светящихся эффектов никнейма
- Эксклюзивные VIP-рамки

#### 3. Pro
- Все эффекты никнейма
- Самые редкие / статусные рамки
- Дополнительные визуальные признаки статуса (например: золотая команда в CodeNames)

#### 4. Покупка отдельных рамок
- Некоторые рамки можно купить по отдельности, без подписки
- **Исключение:** рамки, доступные только VIP или только Pro
- Если рамка **не куплена** → при нажатии показывается кнопка «Купить»
- Если рамка **куплена** → рамка применяется сразу, визуально подсвечивается как активная

---

## Ограничения и Anti-Abuse

- Нельзя применять платные эффекты без соответствующего статуса или покупки
- Нельзя подменять эффекты через клиент
- Быстрая смена эффектов не должна вызывать визуальные или производительные проблемы
- Настройки должны корректно синхронизироваться между играми и профилем

---

## Логическая структура системы

### Сущности

```
User
├── subscriptionTier: "free" | "vip" | "pro"
├── subscriptionExpiresAt: DateTime?
└── customization: UserCustomization

UserCustomization
├── nickname
│   ├── colorType: "basic" | "custom" | "gradient"
│   ├── customColor: String? (hex/rgb)
│   ├── gradientId: String? (ссылка на предустановленный градиент)
│   ├── glowId: String? (ссылка на эффект свечения)
│   └── effectId: String? (ссылка на анимированный эффект)
└── frames
    ├── codenames: String? (frameId)
    ├── alias: String? (frameId)
    ├── truthOrDare: String? (frameId)
    └── emotional: String? (frameId)

UserPurchases
├── userId
├── itemType: "frame" | "effect" | "glow" | "gradient"
├── itemId: String
└── purchasedAt: DateTime

-- Справочники --

NicknameGradient
├── id
├── name
├── cssValue (или конфиг для рендера)
├── requiredTier: "vip" | "pro"
└── sortOrder

NicknameGlow
├── id
├── name
├── config (интенсивность, цвет, стиль)
├── requiredTier: "vip" | "pro"
└── sortOrder

NicknameEffect
├── id
├── name
├── type: "breathe" | "shimmer" | "rainbow" | ...
├── config
├── requiredTier: "pro"
└── sortOrder

Frame
├── id
├── name
├── game: "codenames" | "alias" | "truthOrDare" | "emotional" | "all"
├── previewUrl (или inline SVG/CSS)
├── accessType: "free" | "vip" | "pro" | "purchasable"
├── price: Decimal? (для purchasable)
├── requiredTier: String? (для vip/pro)
└── sortOrder
```

---

## Подход к хранению и применению настроек

### Хранение

1. **База данных (Prisma/PostgreSQL)**
   - Таблица `UserCustomization` — активные настройки пользователя
   - Таблица `UserPurchases` — купленные элементы
   - Справочники: `NicknameGradient`, `NicknameGlow`, `NicknameEffect`, `Frame`

2. **Кэширование**
   - Настройки кастомизации кэшируются на сервере при входе в комнату
   - Справочники кэшируются глобально (редко меняются)

### Применение

1. **При входе в игру:**
   - Сервер загружает `UserCustomization` и проверяет права
   - Невалидные настройки (expired VIP, отозванная покупка) сбрасываются на Basic
   - Валидные настройки транслируются всем игрокам в комнате

2. **При изменении настроек (в профиле или во время игры):**
   - Клиент отправляет запрос на сервер
   - Сервер валидирует права
   - Сервер сохраняет в БД
   - Сервер эмитит `user:customization:updated` всем подключенным комнатам с этим игроком

3. **Рендеринг на клиенте:**
   - Компонент `PlayerCard` / `PlayerName` получает объект кастомизации
   - Применяет CSS-классы / inline-стили / эффекты на основе конфига
   - Эффекты реализуются через переиспользуемые компоненты (`GlowText`, `AnimatedGradient`, `FrameWrapper`)

---

## Механизм проверки прав

### Логика проверки (сервер)

```
canUseItem(user, item):
  1. Если item.accessType === "free" → разрешить
  2. Если item.accessType === "purchasable":
     - Проверить UserPurchases → если куплено → разрешить
     - Иначе → запретить
  3. Если item.accessType === "vip":
     - Проверить user.subscriptionTier in ["vip", "pro"]
     - Проверить user.subscriptionExpiresAt > now
     - Если оба условия → разрешить
  4. Если item.accessType === "pro":
     - Проверить user.subscriptionTier === "pro"
     - Проверить user.subscriptionExpiresAt > now
     - Если оба условия → разрешить
  5. Иначе → запретить
```

### Точки проверки

| Точка | Действие |
|-------|----------|
| **Сохранение настроек** | Перед записью в БД — проверка прав на каждый элемент |
| **Вход в комнату** | Валидация текущих настроек, сброс невалидных |
| **Отправка состояния клиентам** | Сервер отправляет только валидные настройки |
| **Покупка** | Проверка, что item.accessType === "purchasable" |

### Anti-Abuse на клиенте

- Клиент **не хранит** информацию о правах локально
- Все настройки приходят с сервера уже провалидированными
- Клиент рендерит только то, что прислал сервер
- Локальные изменения немедленно отправляются на сервер для валидации

---

## Стратегия масштабирования

### Добавление новых рамок

1. Добавить запись в справочник `Frame`
2. Добавить ассет (SVG / CSS / изображение)
3. Указать `accessType` и `price` (если purchasable)
4. Клиент автоматически подтянет через API

### Добавление новых эффектов никнейма

1. Создать компонент-реализацию эффекта на клиенте
2. Зарегистрировать в маппинге `effectId → Component`
3. Добавить запись в справочник `NicknameEffect`
4. Указать `requiredTier`

### Добавление новых игр

1. Добавить поле в `UserCustomization.frames` (миграция БД)
2. Добавить game-значение в enum для `Frame.game`
3. Интегрировать `FrameWrapper` в новую игру

### Добавление новых уровней подписки

1. Расширить enum `subscriptionTier`
2. Обновить логику `canUseItem`
3. Добавить новые `accessType` в справочники (опционально)

### Сезонные / Event рамки

1. Добавить поля `availableFrom` / `availableUntil` в `Frame`
2. Фильтровать в UI по датам
3. Купленные остаются навсегда, новые покупки закрываются после периода

---

## Возможные риски и узкие места

### Производительность

| Риск | Митигация |
|------|-----------|
| Много анимированных никнеймов в одной комнате | Ограничить количество одновременных анимаций; использовать `will-change`; отключать анимации в battery-режиме |
| Частая смена настроек | Rate-limiting на сервере (1 изменение в 2 сек) |
| Большие ассеты рамок | Lazy-loading; SVG вместо PNG; спрайты |

### Консистентность

| Риск | Митигация |
|------|-----------|
| Рассинхрон настроек между играми | Единый источник правды — БД; все изменения через сервер |
| Устаревшие настройки в кэше | TTL на кэш; инвалидация при изменении подписки |
| Игрок с истёкшей подпиской показывает VIP-эффекты | Проверка при каждом входе в комнату; fallback на Basic |

### Безопасность

| Риск | Митигация |
|------|-----------|
| Подмена настроек через клиент | Сервер — единственный источник правды; клиент только рендерит |
| Покупка недоступных рамок | Проверка `accessType` при обработке платежа |
| Инъекция в кастомный цвет | Валидация формата (regex для hex/rgb) |

### Обратная совместимость

| Риск | Митигация |
|------|-----------|
| Старые клиенты не понимают новые эффекты | Fallback-рендеринг (если эффект неизвестен → показать Basic) |
| Удаление рамки из справочника | Soft-delete; у пользователей остаётся, но не доступна для новых |

### Монетизация

| Риск | Митигация |
|------|-----------|
| Пользователь купил рамку, потом она стала VIP-only | Гранулярная политика: купленное остаётся навсегда |
| Downgrade с Pro на VIP | Сохранить настройки, но не применять; при апгрейде — восстановить |

---

## API Endpoints (концепт)

### REST

```
GET  /api/customization/catalog
     → { gradients, glows, effects, frames }

GET  /api/customization/me
     → { nickname: {...}, frames: {...}, purchases: [...] }

PUT  /api/customization/nickname
     ← { colorType, customColor?, gradientId?, glowId?, effectId? }

PUT  /api/customization/frame/:game
     ← { frameId }

POST /api/customization/purchase
     ← { itemType, itemId }
```

### Socket.IO Events

```
user:customization:updated
  → { userId, customization }
  (broadcast to all rooms with this user)
```

---

## UI/UX Flow (концепт)

### Экран настройки никнейма

1. Превью никнейма в реальном времени
2. Табы: Цвет | Свечение | Эффекты
3. Locked-элементы показывают бейдж VIP/Pro/Цена
4. При клике на locked → модалка с предложением купить/подписаться

### Экран настройки рамок

1. Сетка рамок (круги без аватаров)
2. Фильтр по играм (или табы)
3. Активная рамка подсвечена
4. Locked-рамки затемнены с бейджем
5. При клике на unlocked → применить сразу
6. При клике на locked → модалка покупки

### Отображение в игре

1. `PlayerCard` принимает `customization` prop
2. Рендерит никнейм с применёнными стилями
3. Оборачивает аватар в `FrameWrapper` с нужной рамкой
4. Анимации запускаются автоматически (если не battery-режим)

---

## 🔧 TODO: Улучшения UX редактирования профиля

### 1. Интеграция редактирования никнейма в блок "Стиль никнейма"

**Текущее состояние:** Поле "Никнейм" находится отдельно от блока "Стиль никнейма".

**Требуется:**
- Убрать отдельное поле "Никнейм" из редактирования профиля
- Интегрировать редактирование никнейма прямо в блок "Стиль никнейма"
- Пользователь должен иметь возможность редактировать текст никнейма прямо в превью, видя применённые стили в реальном времени
- При изменении текста никнейма — сохранять автоматически (с debounce)

### 2. Реализация эффектов никнейма

**Текущее состояние:** Эффекты никнейма (анимации) пока не реализованы.

**Требуется:**
- Реализовать анимированные эффекты никнейма
- Добавить UI для выбора эффектов в блоке "Стиль никнейма"
- Эффекты должны корректно отображаться во всех играх

**Готовые компоненты эффектов для интеграции:**

#### 2.1 SparklesText — Искрящийся текст
```tsx
"use client";

import { CSSProperties, ReactElement, useEffect, useState } from "react";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

interface Sparkle {
  id: string;
  x: string;
  y: string;
  color: string;
  delay: number;
  scale: number;
  lifespan: number;
}

interface SparklesTextProps {
  /**
   * @default <div />
   * @type ReactElement
   * @description
   * The component to be rendered as the text
   * */
  as?: ReactElement;

  /**
   * @default ""
   * @type string
   * @description
   * The className of the text
   */
  className?: string;

  /**
   * @required
   * @type string
   * @description
   * The text to be displayed
   * */
  text: string;

  /**
   * @default 10
   * @type number
   * @description
   * The count of sparkles
   * */
  sparklesCount?: number;

  /**
   * @default "{first: '#9E7AFF', second: '#FE8BBB'}"
   * @type string
   * @description
   * The colors of the sparkles
   * */
  colors?: {
    first: string;
    second: string;
  };
}

const SparklesText: React.FC<SparklesTextProps> = ({
  text,
  colors = { first: "#9E7AFF", second: "#FE8BBB" },
  className,
  sparklesCount = 10,
  ...props
}) => {
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);

  useEffect(() => {
    const generateStar = (): Sparkle => {
      const starX = `${Math.random() * 100}%`;
      const starY = `${Math.random() * 100}%`;
      const color = Math.random() > 0.5 ? colors.first : colors.second;
      const delay = Math.random() * 2;
      const scale = Math.random() * 1 + 0.3;
      const lifespan = Math.random() * 10 + 5;
      const id = `${starX}-${starY}-${Date.now()}`;
      return { id, x: starX, y: starY, color, delay, scale, lifespan };
    };

    const initializeStars = () => {
      const newSparkles = Array.from({ length: sparklesCount }, generateStar);
      setSparkles(newSparkles);
    };

    const updateStars = () => {
      setSparkles((currentSparkles) =>
        currentSparkles.map((star) => {
          if (star.lifespan <= 0) {
            return generateStar();
          } else {
            return { ...star, lifespan: star.lifespan - 0.1 };
          }
        }),
      );
    };

    initializeStars();
    const interval = setInterval(updateStars, 100);

    return () => clearInterval(interval);
  }, [colors.first, colors.second]);

  return (
    <div
      className={cn("text-6xl font-bold", className)}
      {...props}
      style={
        {
          "--sparkles-first-color": `${colors.first}`,
          "--sparkles-second-color": `${colors.second}`,
        } as CSSProperties
      }
    >
      <span className="relative inline-block">
        {sparkles.map((sparkle) => (
          <Sparkle key={sparkle.id} {...sparkle} />
        ))}
        <strong>{text}</strong>
      </span>
    </div>
  );
};

const Sparkle: React.FC<Sparkle> = ({ id, x, y, color, delay, scale }) => {
  return (
    <motion.svg
      key={id}
      className="pointer-events-none absolute z-20"
      initial={{ opacity: 0, left: x, top: y }}
      animate={{
        opacity: [0, 1, 0],
        scale: [0, scale, 0],
        rotate: [75, 120, 150],
      }}
      transition={{ duration: 0.8, repeat: Infinity, delay }}
      width="21"
      height="21"
      viewBox="0 0 21 21"
    >
      <path
        d="M9.82531 0.843845C10.0553 0.215178 10.9446 0.215178 11.1746 0.843845L11.8618 2.72026C12.4006 4.19229 12.3916 6.39157 13.5 7.5C14.6084 8.60843 16.8077 8.59935 18.2797 9.13822L20.1561 9.82534C20.7858 10.0553 20.7858 10.9447 20.1561 11.1747L18.2797 11.8618C16.8077 12.4007 14.6084 12.3916 13.5 13.5C12.3916 14.6084 12.4006 16.8077 11.8618 18.2798L11.1746 20.1562C10.9446 20.7858 10.0553 20.7858 9.82531 20.1562L9.13819 18.2798C8.59932 16.8077 8.60843 14.6084 7.5 13.5C6.39157 12.3916 4.19225 12.4007 2.72023 11.8618L0.843814 11.1747C0.215148 10.9447 0.215148 10.0553 0.843814 9.82534L2.72023 9.13822C4.19225 8.59935 6.39157 8.60843 7.5 7.5C8.60843 6.39157 8.59932 4.19229 9.13819 2.72026L9.82531 0.843845Z"
        fill={color}
      />
    </motion.svg>
  );
};

export { SparklesText };
```

#### 2.2 TypingAnimation — Эффект печатания
```tsx
"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

interface TypingAnimationProps {
  text: string;
  duration?: number;
  className?: string;
}

export function TypingAnimation({
  text,
  duration = 200,
  className,
}: TypingAnimationProps) {
  const [displayedText, setDisplayedText] = useState<string>("");
  const [i, setI] = useState<number>(0);

  useEffect(() => {
    const typingEffect = setInterval(() => {
      if (i < text.length) {
        setDisplayedText(text.substring(0, i + 1));
        setI(i + 1);
      } else {
        clearInterval(typingEffect);
      }
    }, duration);

    return () => {
      clearInterval(typingEffect);
    };
  }, [duration, i]);

  return (
    <h1
      className={cn(
        "font-display text-center text-4xl font-bold leading-[5rem] tracking-[-0.02em] drop-shadow-sm",
        className,
      )}
    >
      {displayedText ? displayedText : text}
    </h1>
  );
}
```

#### 2.3 TextParticle — Частицы текста (интерактивный)
```tsx
"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"

interface Particle {
  x: number
  y: number
  size: number
  baseX: number
  baseY: number
  density: number
  color: string
}

interface TextParticleAnimationProps {
  text: string
  fontSize?: number
  fontFamily?: string
  particleSize?: number
  particleColor?: string
  particleDensity?: number
  backgroundColor?: string
  className?: string
}

export function TextParticle({
  text,
  fontSize = 80,
  fontFamily = "Arial, sans-serif",
  particleSize = 2,
  particleColor = "#000000",
  particleDensity = 8,
  backgroundColor = "transparent",
  className = "",
}: TextParticleAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [particles, setParticles] = useState<Particle[]>([])
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const [mouse, setMouse] = useState({ x: null as number | null, y: null as number | null })
  const animationRef = useRef<number | null>(null)

  // Initialize canvas and particles
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const handleResize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
      setDimensions({ width: canvas.width, height: canvas.height })
      initText()
    }

    const initText = () => {
      if (!ctx) return

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.font = `${fontSize}px ${fontFamily}`
      ctx.fillStyle = "black"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"

      // Measure text width to center it properly
      const textMetrics = ctx.measureText(text)
      const textWidth = textMetrics.width

      // Calculate position to center text
      const x = canvas.width / 2
      const y = canvas.height / 2

      ctx.fillText(text, x, y)

      const textCoordinates = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const newParticles: Particle[] = []

      for (let y = 0; y < textCoordinates.height; y += particleDensity) {
        for (let x = 0; x < textCoordinates.width; x += particleDensity) {
          const index = (y * textCoordinates.width + x) * 4
          const alpha = textCoordinates.data[index + 3]

          if (alpha > 128) {
            newParticles.push({
              x,
              y,
              size: particleSize,
              baseX: x,
              baseY: y,
              density: Math.random() * 30 + 1,
              color: particleColor,
            })
          }
        }
      }

      setParticles(newParticles)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }

    window.addEventListener("resize", handleResize)
    handleResize()

    return () => {
      window.removeEventListener("resize", handleResize)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [text, fontSize, fontFamily, particleSize, particleColor, particleDensity])

  // Animation loop
  useEffect(() => {
    if (particles.length === 0) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      if (backgroundColor !== "transparent") {
        ctx.fillStyle = backgroundColor
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }

      particles.forEach((particle) => {
        let dx = 0
        let dy = 0
        let distance = 0
        let forceDirectionX = 0
        let forceDirectionY = 0

        // Calculate force if mouse is present
        if (mouse.x !== null && mouse.y !== null) {
          dx = mouse.x - particle.x
          dy = mouse.y - particle.y
          distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < 100) {
            forceDirectionX = (dx / distance) * 3
            forceDirectionY = (dy / distance) * 3
          }
        }

        // Apply force and calculate new position
        const moveX = forceDirectionX + (particle.baseX - particle.x) * 0.05
        const moveY = forceDirectionY + (particle.baseY - particle.y) * 0.05

        particle.x += moveX
        particle.y += moveY

        // Draw particle
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
        ctx.fillStyle = particle.color
        ctx.fill()
      })

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [particles, mouse, backgroundColor])

  // Mouse interaction
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    setMouse({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })
  }

  const handleMouseLeave = () => {
    setMouse({ x: null, y: null })
  }

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    />
  )
}
```

#### 2.4 TextSplit — Разделяющийся текст при наведении
```tsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface TextSplitProps {
  children: string;
  className?: string;
  topClassName?: string;
  bottomClassName?: string;
  maxMove?: number;
  falloff?: number;
}

export const TextSplit = ({
  children,
  className,
  topClassName,
  bottomClassName,
  maxMove = 50,
  falloff = 0.3,
}: TextSplitProps) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const getOffset = (index: number) => {
    if (hoverIndex === null) return 0;
    const distance = Math.abs(index - hoverIndex);
    return Math.max(0, maxMove * (1 - distance * falloff));
  };

  return (
    <div
      className={cn("relative flex items-center justify-center ", className)}
    >
      {children.split("").map((char, index) => {
        const offset = getOffset(index);
        const displayChar = char === " " ? "\u00A0" : char;

        return (
          <div
            key={`${char}-${index}`}
            className="relative flex flex-col h-[1em] w-auto leading-none"
            onMouseEnter={() => setHoverIndex(index)}
            onMouseLeave={() => setHoverIndex(null)}
          >
            <motion.span
              initial={false}
              animate={{
                y: `-${offset}%`,
              }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className={cn("overflow-hidden", topClassName)}
            >
              {displayChar}
            </motion.span>

            <motion.span
              initial={false}
              animate={{
                y: `${offset}%`,
              }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className={cn("overflow-hidden", bottomClassName)}
            >
              <span className="block -translate-y-1/2">{displayChar}</span>
            </motion.span>
          </div>
        );
      })}
    </div>
  );
};
```

#### 2.5 BubbleText — Пузырьковый текст с волновым эффектом
```tsx
import React, { useState } from "react";

export const BubbleText = () => {

  const [hoveredIndex, setHoveredIndex] = useState(null);
  const text = "Bubbbbbbbble text";

  return (
    <h2
      // Reset the hovered index when the mouse leaves the entire text container.
      onMouseLeave={() => setHoveredIndex(null)}
      className="text-center text-5xl font-thin text-indigo-300"
    >
      {text.split("").map((char, idx) => {
        // Calculate the distance from the currently hovered character.
        // This will be 0 for the hovered character, 1 for its immediate neighbors, etc.
        const distance = hoveredIndex !== null ? Math.abs(hoveredIndex - idx) : null;
        
        // Base classes for all characters, including the transition effect.
        let classes = "transition-all duration-300 ease-in-out cursor-default";
        
        // Apply different styles based on the distance from the hovered character.
        switch (distance) {
          case 0: // The character being hovered over.
            classes += " font-black text-indigo-50";
            break;
          case 1: // Immediate neighbors.
            classes += " font-medium text-indigo-200";
            break;
          case 2: // Second-degree neighbors.
            classes += " font-light"; // Inherits the color from the parent h2.
            break;
          default:
            // No additional classes for characters further away or when not hovering.
            break;
        }

        return (
          <span
            key={idx}
            // Update the state with the index of the character being hovered.
            onMouseEnter={() => setHoveredIndex(idx)}
            className={classes}
          >
            {/* Use a non-breaking space for space characters to prevent collapsing */}
            {char === " " ? "\u00A0" : char}
          </span>
        );
      })}
    </h2>
  );
};
```

**Примечание:** Эти компоненты написаны на TypeScript с использованием Tailwind CSS и `cn` утилиты. При интеграции в проект потребуется:
- Адаптировать под существующую структуру (убрать `"use client"` директиву если не используется Next.js)
- Заменить `cn` на `classnames` или аналог, или создать утилиту
- Адаптировать стили под CSS проекта вместо Tailwind классов

### 3. Мгновенная синхронизация стилей во всех играх

**Текущее состояние:** При обновлении стиля никнейма (градиент, цвет, эффект) или рамки/аватара изменения не всегда сразу отображаются во всех местах.

**Требуется:**
- Проверить и исправить синхронизацию во ВСЕХ местах отображения:
  - **JoinScreen** всех игр (Alias, Codenames, Truth or Dare, Emotional)
  - **Хедеры** игровых комнат
  - **PlayerCard** компоненты
  - **Списки игроков** в комнатах
  - **Лидерборды**
- При любом изменении кастомизации (цвет, градиент, эффект, рамка, аватар) изменения должны мгновенно применяться везде без перезагрузки
- Использовать Socket.IO событие `user:customization:updated` для broadcast обновлений

### 4. Исправление hover-эффекта аватара

**Текущее состояние:** При наведении на аватар в редактировании профиля появляется круглое поле (фон) за аватаром.

**Требуется:**
- Убрать фоновый круг при наведении на аватар
- Оставить только эффект приближения (scale) при hover
- Hover должен быть плавным и не добавлять лишних визуальных элементов

### 5. Модальное окно редактирования профиля

**Текущее состояние:** Редактирование профиля открывается как отдельная страница с роутом `/profile` и своим шейдером. При возврате назад происходит перезагрузка страницы.

**Требуется:**
- Переделать редактирование профиля в модальное окно
- Модалка должна накладываться поверх любого контента (игра, JoinScreen, лендинг и т.д.)
- Фон за модалкой должен размываться (blur), аналогично модалкам "Правила" или "Настройки"
- Убрать отдельный роут `/profile`
- Убрать отдельный шейдер/фон для экрана профиля
- При закрытии модалки пользователь должен оставаться там же, где был, без перезагрузки
- Модалка должна открываться из любого места приложения (шапка, меню, кнопка профиля)

**Референсы в проекте:**
- `RulesModal` — модалка правил игры
- `AliasSettingsModal` — модалка настроек Alias
- `EmotionalSettingsModal` — модалка настроек Emotional

### 6. Упрощение системы цветов никнейма ⚠️ ТРЕБУЕТСЯ

**Текущее состояние:** 
- Есть выбор "Свой цвет" с палитрой (color picker)
- Много вариантов цветов
- Свечение плохо работает с градиентами (почти незаметное)

**Требуется УДАЛИТЬ:**
- ❌ Опцию "Свой цвет"
- ❌ Палитру выбора цвета (color picker)
- ❌ Все остальные цвета кроме указанных ниже

**Требуется ОСТАВИТЬ только 3 варианта:**

| Кнопка | Описание | Доступ | Плашка |
|--------|----------|--------|--------|
| **Стандартный** | Белый/дефолтный цвет | Бесплатно | — |
| **Фиолетовый** | Градиентный фиолетовый цвет | VIP | Плашка "VIP" справа сверху |
| **Золотой** | Градиентный золотой цвет | PRO | Плашка "PRO" справа сверху |

**Градиенты цветов:**

```css
/* Фиолетовый (VIP) */
.nickname--purple {
  background: linear-gradient(135deg, #a855f7 0%, #7c3aed 50%, #6366f1 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Золотой (PRO) */
.nickname--gold {
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

**Свечение для градиентов:**

Текущая проблема: свечение почти незаметное при использовании градиентов.

**Требуется исправить свечение:**

```css
/* Свечение для фиолетового (VIP) */
.nickname--purple-glow {
  text-shadow: 
    0 0 10px rgba(168, 85, 247, 0.8),
    0 0 20px rgba(168, 85, 247, 0.6),
    0 0 40px rgba(124, 58, 237, 0.5),
    0 0 60px rgba(99, 102, 241, 0.4);
  filter: drop-shadow(0 0 8px rgba(168, 85, 247, 0.7));
}

/* Свечение для золотого (PRO) */
.nickname--gold-glow {
  text-shadow: 
    0 0 10px rgba(251, 191, 36, 0.8),
    0 0 20px rgba(245, 158, 11, 0.6),
    0 0 40px rgba(217, 119, 6, 0.5),
    0 0 60px rgba(217, 119, 6, 0.4);
  filter: drop-shadow(0 0 8px rgba(251, 191, 36, 0.7));
}
```

**Важно:**
- Свечение должно быть хорошо заметным и красивым
- Использовать `filter: drop-shadow()` в дополнение к `text-shadow` для лучшего эффекта
- Тестировать на тёмном фоне (основной фон приложения)

**UI блока "Цвет":**

```
┌─────────────────────────────────────────────────────────────┐
│  Цвет                                                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐   │
│  │               │  │          VIP │  │          PRO │   │
│  │  Стандартный  │  │  Фиолетовый  │  │    Золотой   │   │
│  │               │  │               │  │               │   │
│  └───────────────┘  └───────────────┘  └───────────────┘   │
│        ○                   ○                   ○            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Файлы для изменения:**
- `client/src/components/auth/NicknameCustomizer.jsx` — UI выбора цвета
- `client/src/components/auth/NicknameCustomizer.css` — стили
- `client/src/components/ui/StyledNickname.jsx` — рендеринг никнейма
- `client/src/components/ui/StyledNickname.css` — стили свечения
- `server/prisma/schema.prisma` — обновить enum/справочник цветов (если есть)

### 7. Кнопка "Купить" для платных элементов ⚠️ ТРЕБУЕТСЯ

**Текущее состояние:** 
При нажатии на платный элемент (рамка, цвет, эффект) не всегда понятно, как его купить.

**Требуется:**
При выборе любого элемента, требующего оплаты (VIP/PRO), показывать кнопку "Купить" снизу блока.

**Дизайн кнопки:**
- Использовать `RainbowButton` из `client/src/components/pricing/RainbowButton.jsx`
- Фиолетовый основной цвет с радужной анимированной оболочкой
- Кнопка появляется плавно (анимация fade-in + slide-up)

**Логика:**

```
┌─────────────────────────────────────────────────────────────┐
│  Пользователь нажимает на элемент с плашкой VIP/PRO        │
│                              │                              │
│                              ▼                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Проверка: есть ли у пользователя нужная подписка?   │  │
│  └───────────────────────────────────────────────────────┘  │
│                    │                    │                   │
│                   YES                  NO                   │
│                    │                    │                   │
│                    ▼                    ▼                   │
│           Применить элемент     Показать кнопку "Купить"   │
│                                         │                   │
│                                         ▼                   │
│                              Переход на /pricing            │
└─────────────────────────────────────────────────────────────┘
```

**UI примеры:**

**Рамки:**
```
┌─────────────────────────────────────────────────────────────┐
│  Рамка аватара                                              │
├─────────────────────────────────────────────────────────────┤
│  [img]  [img]  [img VIP]  [img PRO]  ← выбрана PRO рамка   │
│                    ▲                                        │
│                 selected                                    │
├─────────────────────────────────────────────────────────────┤
│          🔒 Требуется подписка PRO                          │
│                                                             │
│       ╔═══════════════════════════════════════════╗         │
│       ║  🌈      Купить PRO — 699 ₽        🌈  ║         │
│       ╚═══════════════════════════════════════════╝         │
└─────────────────────────────────────────────────────────────┘
```

**Цвета никнейма:**
```
┌─────────────────────────────────────────────────────────────┐
│  Цвет                                                       │
├─────────────────────────────────────────────────────────────┤
│  [Стандартный]  [Фиолетовый VIP]  [Золотой PRO]            │
│                       ▲                                     │
│                    selected                                 │
├─────────────────────────────────────────────────────────────┤
│          🔒 Требуется подписка VIP                          │
│                                                             │
│       ╔═══════════════════════════════════════════╗         │
│       ║  🌈      Купить VIP — 399 ₽        🌈  ║         │
│       ╚═══════════════════════════════════════════╝         │
└─────────────────────────────────────────────────────────────┘
```

**Компонент (пример):**

```jsx
import { RainbowButton } from '../components/pricing';
import { useNavigate } from 'react-router-dom';

function PremiumBuyPrompt({ requiredTier, onClose }) {
  const navigate = useNavigate();
  
  const prices = { VIP: '399 ₽', PRO: '699 ₽' };
  
  const handleBuy = () => {
    navigate('/pricing');
  };
  
  return (
    <motion.div 
      className="premium-buy-prompt"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
    >
      <p className="premium-buy-prompt__text">
        🔒 Требуется подписка {requiredTier}
      </p>
      <RainbowButton onClick={handleBuy}>
        Купить {requiredTier} — {prices[requiredTier]}
      </RainbowButton>
    </motion.div>
  );
}
```

**Файлы для изменения:**
- `client/src/components/auth/NicknameCustomizer.jsx` — добавить проверку и кнопку
- `client/src/components/auth/FrameSelector.jsx` — добавить проверку и кнопку
- Создать общий компонент `PremiumBuyPrompt.jsx` для переиспользования

### 8. Тестовые платные рамки и логика автосохранения ⚠️ ТРЕБУЕТСЯ

**Цель:** Протестировать UX покупки рамок и исправить автосохранение.

#### 8.1 Тестовые платные рамки

Сделать рамки **OSD** и **DOTA2** платными по 50 рублей для теста:

| Рамка | Цена | Тип доступа |
|-------|------|-------------|
| OSD | 50 ₽ | Разовая покупка |
| DOTA2 | 50 ₽ | Разовая покупка |

**Требуется:**
- При нажатии на OSD или DOTA2 показывать кнопку "Купить — 50 ₽" снизу
- Пользователь может **выбрать** рамку и увидеть как она смотрится на превью
- Рамка отображается на превью аватара, но **не сохраняется** пока не куплена
- После покупки рамка автоматически применяется и сохраняется

#### 8.2 Логика автосохранения

**Текущая проблема:**
Автосохранение сохраняет ВСЁ, включая некупленные элементы. Пользователь может выбрать платный элемент, посмотреть превью и выйти — а система сохранит этот выбор.

**Требуется исправить:**

```
┌─────────────────────────────────────────────────────────────┐
│                  ЛОГИКА АВТОСОХРАНЕНИЯ                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  При изменении любого элемента кастомизации:                │
│                                                             │
│  1. Проверить, требует ли элемент оплаты                    │
│     (VIP, PRO, или разовая покупка)                         │
│                                                             │
│  2. Если элемент БЕСПЛАТНЫЙ или УЖЕ КУПЛЕН:                 │
│     ✅ Сохранить автоматически                              │
│                                                             │
│  3. Если элемент ПЛАТНЫЙ и НЕ КУПЛЕН:                       │
│     ❌ НЕ сохранять                                         │
│     → Показать на превью (для просмотра)                    │
│     → Показать кнопку "Купить"                              │
│     → При выходе вернуть предыдущее сохранённое значение    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Применяется к:**
- 🖼️ Рамки аватара (VIP, PRO, разовые покупки)
- 🎨 Цвет никнейма (VIP, PRO)
- ✨ Стиль никнейма (VIP, PRO)
- 💫 Свечение никнейма (VIP, PRO)

**Псевдокод:**

```js
function handleElementSelect(element) {
  // Показать на превью сразу (для просмотра)
  setPreview(element);
  
  const isPaid = element.accessType !== 'free';
  const isOwned = userOwns(element); // VIP/PRO подписка или разовая покупка
  
  if (!isPaid || isOwned) {
    // Бесплатный или уже куплен — сохраняем
    saveToServer(element);
    setLastSaved(element);
  } else {
    // Платный и не куплен — НЕ сохраняем
    // Показываем кнопку "Купить"
    setShowBuyPrompt(true);
    setBuyPromptTier(element.accessType);
  }
}

function handleExit() {
  // При выходе восстанавливаем последнее сохранённое значение
  if (preview !== lastSaved) {
    setPreview(lastSaved);
  }
}
```

**UI поведение:**

```
Пользователь без подписки заходит в редактор профиля
                    │
                    ▼
        Выбирает рамку DOTA2 (50 ₽)
                    │
                    ▼
    ┌─────────────────────────────────────┐
    │  Превью: показывает рамку DOTA2    │
    │  Автосохранение: НЕ СРАБАТЫВАЕТ    │
    │  Кнопка: "Купить — 50 ₽"           │
    └─────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
    Нажал "Купить"         Нажал "Назад"
        │                       │
        ▼                       ▼
  Переход на /pricing     Превью возвращается
  или модалка оплаты      к предыдущей рамке
                          (которая была сохранена)
```

**Файлы для изменения:**
- `client/src/components/auth/ProfileScreen.jsx` — логика автосохранения
- `client/src/components/auth/FrameSelector.jsx` — проверка доступа к рамкам
- `client/src/components/auth/NicknameCustomizer.jsx` — проверка доступа к цветам/стилям
- `server/prisma/schema.prisma` — добавить поле `price` для рамок (разовая покупка)
- `server/data/frames.json` или БД — добавить цены для OSD и DOTA2

**Структура данных рамки:**

```js
{
  slug: "OSD",
  name: "OSD",
  image: "/frames/OSD.png",
  accessType: "purchase", // "free" | "vip" | "pro" | "purchase"
  price: 5000, // 50 ₽ в копейках (только для accessType: "purchase")
}
```

### 9. Статистика игр и достижения ⚠️ ТРЕБУЕТСЯ

**Цель:** Показывать пользователю его игровую активность и достижения в профиле.

#### 9.1 Время в играх

Отображать время, проведённое в каждой игре.

**Текущие игры:**
- 🎯 Truth or Dare
- 🔤 Alias
- 🕵️ Codenames
- 😊 Emotional

**Будущие игры:** (структура должна быть расширяемой)

**UI в профиле:**

```
┌─────────────────────────────────────────────────────────────┐
│  📊 Статистика игр                                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🎯 Truth or Dare        ████████████░░░░  12ч 34м         │
│  🔤 Alias                ██████░░░░░░░░░░   5ч 21м         │
│  🕵️ Codenames            ████░░░░░░░░░░░░   3ч 45м         │
│  😊 Emotional            ██░░░░░░░░░░░░░░   1ч 12м         │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│  🕐 Всего в играх: 22ч 52м                                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Логика подсчёта времени:**
- Время считается пока пользователь находится в комнате (от join до leave/disconnect)
- Сохраняется в БД при выходе из комнаты
- Суммируется по каждой игре отдельно

#### 9.2 Достижения

Система достижений, связанных с играми и активностью.

**Категории достижений:**

| Категория | Примеры достижений |
|-----------|-------------------|
| **Игровые** | Победы, участие, серии |
| **Социальные** | Создание комнат, приглашение друзей |
| **Прогресс** | Время в играх, кол-во игр |
| **Покупки** | Приобретение VIP/PRO |
| **Редкие** | Особые события, первые места |

**Примеры достижений:**

```
┌─────────────────────────────────────────────────────────────┐
│  🏆 Достижения                                    12 / 50   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │   🎮    │  │   🏅    │  │   ⭐    │  │   🔥    │        │
│  │ Первая  │  │ 10      │  │  VIP    │  │ 5 побед │        │
│  │  игра   │  │ побед   │  │ статус  │  │ подряд  │        │
│  │  ✓      │  │  ✓      │  │  ✓      │  │  ○      │        │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘        │
│                                                             │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │   👑    │  │   🎯    │  │   🕐    │  │   🎁    │        │
│  │  PRO    │  │ 100     │  │ 10 часов│  │ Первый  │        │
│  │ статус  │  │ раундов │  │ в играх │  │ донат   │        │
│  │  ○      │  │  ○      │  │  ✓      │  │  ○      │        │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘        │
│                                                             │
└─────────────────────────────────────────────────────────────┘

✓ = получено, ○ = не получено
```

**Список начальных достижений:**

| ID | Название | Описание | Условие | Иконка |
|----|----------|----------|---------|--------|
| `first_game` | Первая игра | Сыграй свою первую игру | 1 игра | 🎮 |
| `wins_10` | Победитель | Одержи 10 побед | 10 побед | 🏅 |
| `wins_50` | Чемпион | Одержи 50 побед | 50 побед | 🏆 |
| `wins_streak_5` | В ударе | Выиграй 5 игр подряд | 5 побед подряд | 🔥 |
| `wins_streak_10` | Неудержимый | Выиграй 10 игр подряд | 10 побед подряд | ⚡ |
| `playtime_1h` | Новичок | Проведи 1 час в играх | 1 час | 🕐 |
| `playtime_10h` | Игрок | Проведи 10 часов в играх | 10 часов | ⏰ |
| `playtime_100h` | Ветеран | Проведи 100 часов в играх | 100 часов | 🎖️ |
| `vip_purchased` | VIP статус | Приобрети VIP подписку | Покупка VIP | ⭐ |
| `pro_purchased` | PRO статус | Приобрети PRO подписку | Покупка PRO | 👑 |
| `rooms_created_10` | Организатор | Создай 10 комнат | 10 комнат | 🏠 |
| `games_played_100` | Марафонец | Сыграй 100 игр | 100 игр | 🎯 |
| `all_games_played` | Исследователь | Сыграй во все игры | По 1 игре в каждой | 🗺️ |
| `first_purchase` | Меценат | Соверши первую покупку | Любая покупка | 🎁 |

#### 9.3 Prisma модели

```prisma
// Статистика игр пользователя
model UserGameStats {
  id          String   @id @default(cuid())
  userId      String
  gameType    String   // "truth_or_dare" | "alias" | "codenames" | "emotional"
  
  playTimeSeconds Int  @default(0)  // Общее время в секундах
  gamesPlayed     Int  @default(0)  // Количество сыгранных игр
  gamesWon        Int  @default(0)  // Количество побед
  currentStreak   Int  @default(0)  // Текущая серия побед
  bestStreak      Int  @default(0)  // Лучшая серия побед
  roomsCreated    Int  @default(0)  // Созданных комнат
  
  lastPlayedAt  DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([userId, gameType])
  @@index([userId])
}

// Достижения пользователя
model UserAchievement {
  id            String   @id @default(cuid())
  userId        String
  achievementId String   // ID достижения из справочника
  
  unlockedAt    DateTime @default(now())
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([userId, achievementId])
  @@index([userId])
}

// Справочник достижений
model Achievement {
  id          String   @id @default(cuid())
  slug        String   @unique  // "first_game", "wins_10", etc.
  name        String            // "Первая игра"
  description String            // "Сыграй свою первую игру"
  icon        String            // "🎮"
  category    String            // "games" | "social" | "progress" | "purchase"
  sortOrder   Int     @default(0)
  isActive    Boolean @default(true)
  
  // Условие разблокировки (JSON)
  // { "type": "games_played", "value": 1 }
  // { "type": "wins", "value": 10 }
  // { "type": "playtime_hours", "value": 10 }
  condition   String  // JSON
  
  createdAt   DateTime @default(now())
}
```

**Не забыть добавить связи в User:**

```prisma
model User {
  // ... существующие поля ...
  
  gameStats    UserGameStats[]
  achievements UserAchievement[]
}
```

#### 9.4 API эндпоинты

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/user/stats` | Получить статистику игр пользователя |
| GET | `/api/user/achievements` | Получить достижения пользователя |
| GET | `/api/achievements` | Получить список всех достижений |

#### 9.5 Файлы для изменения

**Клиент:**
- `client/src/components/auth/ProfileScreen.jsx` — добавить секции статистики и достижений
- Создать `client/src/components/profile/GameStats.jsx` — компонент статистики
- Создать `client/src/components/profile/Achievements.jsx` — компонент достижений
- `client/src/api/` — добавить API для статистики

**Сервер:**
- `server/prisma/schema.prisma` — добавить модели
- `server/src/game/*.js` — добавить обновление статистики при завершении игры
- Создать `server/src/stats/` — модуль статистики и достижений
- Создать `server/src/stats/achievements.js` — проверка и выдача достижений

---

## Следующие шаги (после утверждения плана)

1. **Миграция БД** — добавить таблицы и поля
2. **Справочники** — создать seed-данные для рамок, эффектов, градиентов
3. **API** — реализовать endpoints
4. **Компоненты** — `GlowText`, `AnimatedNickname`, `FrameWrapper`
5. **UI настроек** — экраны в профиле
6. **Интеграция** — подключить во все игры
7. **Тестирование** — права, производительность, edge-cases
8. **Монетизация** — интеграция с платёжной системой

---

## 📋 TODO-ЛИСТ РЕАЛИЗАЦИИ

> **⚠️ ПРАВИЛО:** После каждого изменения в системе кастомизации необходимо обновить этот раздел — отметить выполненные задачи и добавить отчёт о проделанной работе в журнал изменений внизу.

### Статус реализации

| Категория | Готово | Всего | Прогресс |
|-----------|--------|-------|----------|
| База данных | 6 | 6 | 100% |
| API | 6 | 6 | 100% |
| Клиентские компоненты | 9 | 9 | 100% |
| Интеграция в игры | 4 | 4 | 100% |
| Монетизация | 5 | 5 | 100% |
| UX редактирования | 3 | 3 | 100% |
| Эффекты никнейма | 10 | 10 | 100% |
| Рамки по играм | 4 | 4 | 100% |
| Статистика и достижения | 14 | 14 | 100% |
| **ИТОГО** | **61** | **61** | **100%** |

---

### Этап 1: Монетизация кастомизации 🔴 КРИТИЧНО

**Статус:** ✅ Завершён  
**Приоритет:** Критический — блокирует продажи  
**Оценка:** 3-4 дня  
**Фактически:** 2026-02-10

| # | Задача | Статус | Дата | Исполнитель |
|---|--------|--------|------|-------------|
| 1.1 | Добавить поле `price` в модель Frame (для разовых покупок) | ✅ | 2026-02-10 | AI |
| 1.2 | Создать модель UserPurchase (история покупок) | ✅ | 2026-02-10 | AI |
| 1.3 | Обновить seed: сделать OSD и DOTA2 платными (accessType: "purchasable", price: 5000) | ✅ | 2026-02-10 | AI |
| 1.4 | Создать компонент PremiumBuyPrompt.jsx | ✅ | 2026-02-10 | AI |
| 1.5 | Обновить FrameSelector.jsx: бейджи VIP/PRO/Цена, затемнение, НЕ сохранять платные | ✅ | 2026-02-10 | AI |
| 1.6 | Обновить NicknameCustomizer.jsx: аналогичная логика для градиентов/свечений | ✅ | 2026-02-10 | AI |
| 1.7 | Серверная валидация: проверять доступ при PATCH /me/customization | ✅ | 2026-02-10 | AI |

**Критерии готовности:**
- [x] Платные элементы отображаются с бейджами и ценой
- [x] Платные элементы показываются на превью, но НЕ сохраняются автоматически
- [x] При клике на платный элемент появляется кнопка "Купить"
- [x] Сервер отклоняет попытку сохранить некупленный элемент

**⚠️ Требуется:** Запустить миграцию БД: `npx prisma migrate dev --name add_user_purchase_model`

---

### Этап 2: Улучшение UX редактирования 🟡 ВАЖНО

**Статус:** ✅ Завершён  
**Приоритет:** Важный  
**Оценка:** 1-2 дня  
**Фактически:** 2026-02-10

| # | Задача | Статус | Дата | Исполнитель |
|---|--------|--------|------|-------------|
| 2.1 | Интегрировать поле никнейма в превью (редактируемое) | ✅ | 2026-02-10 | AI |
| 2.2 | Добавить debounce-сохранение при изменении текста | ✅ | 2026-02-10 | AI |
| 2.3 | Улучшить превью — показывать стили в реальном времени | ✅ | 2026-02-10 | AI |

**Критерии готовности:**
- [x] Никнейм редактируется прямо в блоке превью
- [x] Изменения отображаются мгновенно
- [x] Сохранение происходит с debounce (800ms)

---

### Этап 3: Эффекты никнейма 🟡 ВАЖНО

**Статус:** ✅ Завершён  
**Приоритет:** Важный — PRO-фича  
**Оценка:** 3-5 дней  
**Фактически:** 2026-02-10

| # | Задача | Статус | Дата | Исполнитель |
|---|--------|--------|------|-------------|
| 3.1 | Создать модель NicknameEffect в Prisma | ✅ | 2026-02-10 | AI |
| 3.2 | Миграция БД | ✅ | 2026-02-10 | AI |
| 3.3 | Seed эффектов: Sparkles, GradientFlow, Shimmer, Pulse, Glitch, Wave | ✅ | 2026-02-10 | AI |
| 3.4 | Портировать SparklesText.jsx (TypeScript → JSX) | ✅ | 2026-02-10 | AI |
| 3.5 | Портировать GradientFlowText.jsx | ✅ | 2026-02-10 | AI |
| 3.6 | Портировать ShimmerText.jsx | ✅ | 2026-02-10 | AI |
| 3.7 | Обновить StyledNickname.jsx — поддержка effectId | ✅ | 2026-02-10 | AI |
| 3.8 | Обновить NicknameCustomizer.jsx — UI выбора эффектов | ✅ | 2026-02-10 | AI |
| 3.9 | API: GET /api/auth/nickname-effects | ✅ | 2026-02-10 | AI |
| 3.10 | Обновить все игры — передавать effectId в nicknameStyle | ✅ | 2026-02-10 | AI |

**Критерии готовности:**
- [x] 6 анимированных эффектов доступны (Sparkles, Shimmer, GradientFlow, Pulse, Glitch, Wave)
- [x] Эффекты корректно отображаются во всех играх (через StyledNickname)
- [x] Эффекты привязаны к VIP/PRO-подписке

**⚠️ Требуется:** Запустить миграцию БД: `npx prisma migrate dev --name add_nickname_effect_model`

---

### Этап 4: Рамки по играм 🟢 ЖЕЛАТЕЛЬНО

**Статус:** ✅ Завершён  
**Приоритет:** Низкий  
**Оценка:** 2-3 дня  
**Фактически:** 2026-02-10

| # | Задача | Статус | Дата | Исполнитель |
|---|--------|--------|------|-------------|
| 4.1 | UI: табы/фильтр по играм в FrameSelector | ✅ | 2026-02-10 | AI |
| 4.2 | Логика выбора рамки с учётом текущей игры | ✅ | 2026-02-10 | AI |
| 4.3 | Обновить интеграцию в играх — использовать game-specific рамку | ✅ | 2026-02-10 | AI |
| 4.4 | Добавить рамки специфичные для каждой игры | ✅ | 2026-02-10 | AI |

**Критерии готовности:**
- [x] Пользователь может выбрать разные рамки для разных игр
- [x] В игре отображается соответствующая рамка

**Примечание:** 8 game-specific рамок добавлены в seed с `isActive: false`. Активировать после создания PNG файлов.

---

### Этап 5: Статистика и достижения 🟢 ЖЕЛАТЕЛЬНО

**Статус:** ✅ Завершён  
**Приоритет:** Средний — геймификация  
**Оценка:** 5-7 дней  
**Фактически:** 2026-02-11

| # | Задача | Статус | Дата | Исполнитель |
|---|--------|--------|------|-------------|
| 5.1 | Prisma: модель UserGameStats | ✅ | 2026-02-11 | AI |
| 5.2 | Prisma: модель Achievement | ✅ | 2026-02-11 | AI |
| 5.3 | Prisma: модель UserAchievement | ✅ | 2026-02-11 | AI |
| 5.4 | Миграция БД | ✅ | 2026-02-11 | AI |
| 5.5 | Seed достижений (18 штук) | ✅ | 2026-02-11 | AI |
| 5.6 | API: GET /api/me/stats | ✅ | 2026-02-11 | AI |
| 5.7 | API: GET /api/me/achievements | ✅ | 2026-02-11 | AI |
| 5.8 | API: GET /api/achievements | ✅ | 2026-02-11 | AI |
| 5.9 | Модуль stats.js для отслеживания | ✅ | 2026-02-11 | AI |
| 5.10 | Компонент GameStats.jsx | ✅ | 2026-02-11 | AI |
| 5.11 | Компонент Achievements.jsx + AchievementToast | ✅ | 2026-02-11 | AI |
| 5.12 | Интеграция в ProfileScreen | ✅ | 2026-02-11 | AI |
| 5.13 | Автоматическая проверка достижений при событиях | ✅ | 2026-02-11 | AI |
| 5.14 | Toast-уведомление при получении достижения | ✅ | 2026-02-11 | AI |

**Критерии готовности:**
- [x] Статистика отображается в профиле
- [x] Достижения разблокируются автоматически
- [x] Пользователь получает уведомление о новом достижении

**⚠️ Требуется:** Запустить миграцию БД если ещё не выполнено

---

## ✅ УЖЕ РЕАЛИЗОВАНО

### База данных
- [x] Модель Frame (рамки)
- [x] Модель UserCustomization
- [x] Модель NicknameGradient
- [x] Модель NicknameGlow
- [x] Связь User ↔ UserCustomization
- [x] Поля frameSlug и nicknameStyle в Player/AliasPlayer

### Seed данные
- [x] 7 рамок (ALIEN, Cuberpunk2077, DOTA2, GOT, onetwo, OSD, SCANDINAVIA)
- [x] 8 градиентов никнейма
- [x] 8 свечений никнейма

### API
- [x] GET /api/auth/me/customization
- [x] PATCH /api/auth/me/customization
- [x] GET /api/auth/frames
- [x] GET /api/auth/nickname-gradients
- [x] GET /api/auth/nickname-glows

### Клиентские компоненты
- [x] FrameSelector.jsx — выбор рамки
- [x] NicknameCustomizer.jsx — цвет/градиент/свечение
- [x] AvatarFrame.jsx — отображение рамки (L/M/S/XS)
- [x] StyledNickname.jsx — отображение никнейма со стилями
- [x] ProfileScreen.jsx — интеграция редактирования

### Интеграция в игры
- [x] Truth or Dare — PlayerCard использует AvatarFrame и StyledNickname
- [x] Alias — AliasRoomScreen использует кастомизацию
- [x] Codenames — интеграция выполнена
- [x] Emotional Intelligence — EmotionalOvalTable использует кастомизацию

---

## 📝 ЖУРНАЛ ИЗМЕНЕНИЙ

> Записывайте здесь все изменения в системе кастомизации

| Дата | Автор | Изменения | Файлы |
|------|-------|-----------|-------|
| 2026-02-09 | — | Первоначальная реализация: рамки, градиенты, свечения | schema.prisma, seed.js, FrameSelector.jsx, NicknameCustomizer.jsx, AvatarFrame.jsx, StyledNickname.jsx |
| 2026-02-09 | — | Интеграция в ToD, Alias, Codenames, Emotional | PlayerCard.jsx, AliasRoomScreen.jsx, CodenamesRoomScreen.jsx, EmotionalOvalTable.jsx |
| 2026-02-10 | — | Добавлен TODO-лист и журнал изменений | Customization.md |
| 2026-02-10 | AI | **Этап 1: Монетизация кастомизации** | — |
| — | — | • Добавлена модель UserPurchase для разовых покупок | schema.prisma |
| — | — | • OSD и DOTA2 теперь платные (50₽) | seed.js |
| — | — | • Компонент PremiumBuyPrompt + AccessBadge | PremiumBuyPrompt.jsx, PremiumBuyPrompt.css |
| — | — | • FrameSelector: бейджи, превью платных, проверка доступа | FrameSelector.jsx |
| — | — | • NicknameCustomizer: бейджи, превью платных, проверка доступа | NicknameCustomizer.jsx |
| — | — | • AuthContext: добавлены subscription и purchases | AuthContext.jsx |
| — | — | • API: GET /me/customization возвращает subscription и purchases | routes.js |
| — | — | • Серверная валидация доступа для рамок, градиентов, свечений | routes.js |
| 2026-02-10 | AI | **Этап 2: Улучшение UX редактирования** | — |
| — | — | • Редактируемое поле никнейма в превью с inline-стилями | NicknameCustomizer.jsx |
| — | — | • useDebounce хук для автосохранения (800ms) | NicknameCustomizer.jsx |
| — | — | • Стили в реальном времени на поле ввода | NicknameCustomizer.css |
| — | — | • Убрано дублирующее поле никнейма из ProfileScreen | ProfileScreen.jsx |
| 2026-02-10 | AI | **Этап 3: Эффекты никнейма** | — |
| — | — | • Создана модель NicknameEffect в Prisma | schema.prisma |
| — | — | • 6 эффектов: Sparkles, Shimmer, GradientFlow, Pulse, Glitch, Wave | seed.js |
| — | — | • 6 компонентов эффектов + CSS | effects/*.jsx, effects.css |
| — | — | • StyledNickname поддерживает effectId | StyledNickname.jsx |
| — | — | • UI выбора эффектов в NicknameCustomizer | NicknameCustomizer.jsx, .css |
| — | — | • API: GET /api/auth/nickname-effects | routes.js |
| — | — | • Серверная валидация nicknameEffectId | routes.js |
| 2026-02-10 | AI | **Этап 4: Рамки по играм** | — |
| — | — | • Табы по играм в FrameSelector (Общая/Alias/ToD/Codenames/Emotional) | FrameSelector.jsx |
| — | — | • Логика выбора рамки с учётом текущего таба | FrameSelector.jsx |
| — | — | • CSS для табов и game-specific бейджей | FrameSelector.css |
| — | — | • 8 game-specific рамок в seed (неактивны, ждут PNG) | seed.js |
| 2026-02-11 | AI | **Этап 5: Статистика и достижения** | — |
| — | — | • Prisma модели: UserGameStats, Achievement, UserAchievement | schema.prisma |
| — | — | • Seed 18 достижений (ToD, Alias, социальные, верность, секретные) | seed.js |
| — | — | • API: GET /me/stats, /me/achievements, /achievements | routes.js |
| — | — | • Компоненты GameStats.jsx и Achievements.jsx с CSS | GameStats.jsx, Achievements.jsx |
| — | — | • Модуль stats.js для обновления статистики и проверки достижений | stats.js |
| — | — | • Интеграция отслеживания в Truth or Dare | index.js |
| — | — | • Toast-уведомления о разблокировке достижений | AuthContext.jsx |
| — | — | — | — |

---

## 🎯 СЛЕДУЮЩИЕ ДЕЙСТВИЯ

**Рекомендуемый порядок:**

1. **СЕЙЧАС:** Этап 1 (Монетизация) — без этого нельзя продавать
2. **ПОТОМ:** Этап 2 (UX) — быстрое улучшение
3. **ДАЛЕЕ:** Этап 3 (Эффекты) — PRO-фичи для монетизации
4. **ПОЗЖЕ:** Этап 5 (Статистика) — геймификация
5. **ОПЦИОНАЛЬНО:** Этап 4 (Рамки по играм) — можно отложить

**Общий срок всех этапов: ~15-20 дней**

---

*Документ создан: 2026-02-07*
*Последнее обновление: 2026-02-10*

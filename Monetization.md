# Монетизация: Страница покупки VIP и PRO статусов

## Общая концепция

Страница предназначена для приобретения премиум-подписок (VIP и PRO). Дизайн должен выглядеть **премиально, дорого и современно**, соответствуя высоким маркетинговым стандартам. Основная аудитория — мобильные пользователи, поэтому адаптивность критически важна.

### Ключевые принципы
- **Mobile-first** подход: breakpoint ≤1200px считается узким экраном
- Премиальный визуальный стиль
- Плавные анимации (Framer Motion)
- Интуитивный UX с переключателем подписки

---

## Структура страницы

### 1. Фон — LampContainer

Эффектный анимированный фон с "лампой" в верхней части экрана.

```tsx
"use client";
import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function LampDemo() {
  return (
    <LampContainer>
      <motion.h1
        initial={{ opacity: 0.5, y: 100 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{
          delay: 0.3,
          duration: 0.8,
          ease: "easeInOut",
        }}
        className="mt-8 bg-gradient-to-br from-slate-300 to-slate-500 py-4 bg-clip-text text-center text-4xl font-medium tracking-tight text-transparent md:text-7xl"
      >
        Build lamps <br /> the right way
      </motion.h1>
    </LampContainer>
  );
}

export const LampContainer = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={cn(
        "relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-950 w-full rounded-md z-0",
        className
      )}
    >
      <div className="relative flex w-full flex-1 scale-y-125 items-center justify-center isolate z-0 ">
        <motion.div
          initial={{ opacity: 0.5, width: "15rem" }}
          whileInView={{ opacity: 1, width: "30rem" }}
          transition={{
            delay: 0.3,
            duration: 0.8,
            ease: "easeInOut",
          }}
          style={{
            backgroundImage: `conic-gradient(var(--conic-position), var(--tw-gradient-stops))`,
          }}
          className="absolute inset-auto right-1/2 h-56 overflow-visible w-[30rem] bg-gradient-conic from-cyan-500 via-transparent to-transparent text-white [--conic-position:from_70deg_at_center_top]"
        >
          <div className="absolute  w-[100%] left-0 bg-slate-950 h-40 bottom-0 z-20 [mask-image:linear-gradient(to_top,white,transparent)]" />
          <div className="absolute  w-40 h-[100%] left-0 bg-slate-950  bottom-0 z-20 [mask-image:linear-gradient(to_right,white,transparent)]" />
        </motion.div>
        <motion.div
          initial={{ opacity: 0.5, width: "15rem" }}
          whileInView={{ opacity: 1, width: "30rem" }}
          transition={{
            delay: 0.3,
            duration: 0.8,
            ease: "easeInOut",
          }}
          style={{
            backgroundImage: `conic-gradient(var(--conic-position), var(--tw-gradient-stops))`,
          }}
          className="absolute inset-auto left-1/2 h-56 w-[30rem] bg-gradient-conic from-transparent via-transparent to-cyan-500 text-white [--conic-position:from_290deg_at_center_top]"
        >
          <div className="absolute  w-40 h-[100%] right-0 bg-slate-950  bottom-0 z-20 [mask-image:linear-gradient(to_left,white,transparent)]" />
          <div className="absolute  w-[100%] right-0 bg-slate-950 h-40 bottom-0 z-20 [mask-image:linear-gradient(to_top,white,transparent)]" />
        </motion.div>
        <div className="absolute top-1/2 h-48 w-full translate-y-12 scale-x-150 bg-slate-950 blur-2xl"></div>
        <div className="absolute top-1/2 z-50 h-48 w-full bg-transparent opacity-10 backdrop-blur-md"></div>
        <div className="absolute inset-auto z-50 h-36 w-[28rem] -translate-y-1/2 rounded-full bg-cyan-500 opacity-50 blur-3xl"></div>
        <motion.div
          initial={{ width: "8rem" }}
          whileInView={{ width: "16rem" }}
          transition={{
            delay: 0.3,
            duration: 0.8,
            ease: "easeInOut",
          }}
          className="absolute inset-auto z-30 h-36 w-64 -translate-y-[6rem] rounded-full bg-cyan-400 blur-2xl"
        ></motion.div>
        <motion.div
          initial={{ width: "15rem" }}
          whileInView={{ width: "30rem" }}
          transition={{
            delay: 0.3,
            duration: 0.8,
            ease: "easeInOut",
          }}
          className="absolute inset-auto z-50 h-0.5 w-[30rem] -translate-y-[7rem] bg-cyan-400 "
        ></motion.div>

        <div className="absolute inset-auto z-40 h-44 w-full -translate-y-[12.5rem] bg-slate-950 "></div>
      </div>

      <div className="relative z-50 flex -translate-y-80 flex-col items-center px-5">
        {children}
      </div>
    </div>
  );
};
```

**Адаптация для проекта:**
- Убрать `"use client"` директиву
- Заменить `cn` на `classnames` или создать утилиту
- Адаптировать Tailwind классы под CSS проекта
- Цвет лампы можно менять (cyan → фирменный цвет)

---

### 2. Радужная кнопка — RainbowButton

Используется для CTA-кнопок покупки подписки.

```tsx
import React from "react";

import { cn } from "@/lib/utils";
interface RainbowButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export function RainbowButton({
  children,
  className,
  ...props
}: RainbowButtonProps) {
  return (
    <button
      className={cn(
        "group relative inline-flex h-11 animate-rainbow cursor-pointer items-center justify-center rounded-xl border-0 bg-[length:200%] px-8 py-2 font-medium text-primary-foreground transition-colors [background-clip:padding-box,border-box,border-box] [background-origin:border-box] [border:calc(0.08*1rem)_solid_transparent] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",

        // before styles
        "before:absolute before:bottom-[-20%] before:left-1/2 before:z-0 before:h-1/5 before:w-3/5 before:-translate-x-1/2 before:animate-rainbow before:bg-[linear-gradient(90deg,hsl(var(--color-1)),hsl(var(--color-5)),hsl(var(--color-3)),hsl(var(--color-4)),hsl(var(--color-2)))] before:bg-[length:200%] before:[filter:blur(calc(0.8*1rem))]",

        // light mode colors
        "bg-[linear-gradient(#121213,#121213),linear-gradient(#121213_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,hsl(var(--color-1)),hsl(var(--color-5)),hsl(var(--color-3)),hsl(var(--color-4)),hsl(var(--color-2)))]",

        // dark mode colors
        "dark:bg-[linear-gradient(#fff,#fff),linear-gradient(#fff_50%,rgba(255,255,255,0.6)_80%,rgba(0,0,0,0)),linear-gradient(90deg,hsl(var(--color-1)),hsl(var(--color-5)),hsl(var(--color-3)),hsl(var(--color-4)),hsl(var(--color-2)))]",

        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
```

**CSS-переменные для анимации:**
```css
:root {
  --color-1: 0 100% 63%;    /* красный */
  --color-2: 270 100% 63%;  /* фиолетовый */
  --color-3: 210 100% 63%;  /* синий */
  --color-4: 195 100% 63%;  /* голубой */
  --color-5: 90 100% 63%;   /* зелёный */
}

@keyframes rainbow {
  0% { background-position: 0%; }
  100% { background-position: 200%; }
}

.animate-rainbow {
  animation: rainbow 2s linear infinite;
}
```

---

### 3. Блоки тарифов — Pricing Cards

Референс структуры блоков с VIP и PRO тарифами:

```tsx
'use client';
import React from 'react';
import { PlusIcon, ShieldCheckIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { Badge } from './badge';
import { Button } from './button';
import { cn } from '@/lib/utils';
import { BorderTrail } from './border-trail';

export function Pricing() {
	return (
		<section className="relative min-h-screen overflow-hidden py-24">
			<div id="pricing" className="mx-auto w-full max-w-6xl space-y-5 px-4">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
					viewport={{ once: true }}
					className="mx-auto max-w-xl space-y-5"
				>
					<div className="flex justify-center">
						<div className="rounded-lg border px-4 py-1 font-mono">Pricing</div>
					</div>
					<h2 className="mt-5 text-center text-2xl font-bold tracking-tighter md:text-3xl lg:text-4xl">
						Pricing Based on Your Success
					</h2>
					<p className="text-muted-foreground mt-5 text-center text-sm md:text-base">
						We offer a single price for all our services. We believe that pricing is a critical component of any
						successful business.
					</p>
				</motion.div>

				<div className="relative">
					<div
						className={cn(
							'z--10 pointer-events-none absolute inset-0 size-full',
							'bg-[linear-gradient(to_right,--theme(--color-foreground/.2)_1px,transparent_1px),linear-gradient(to_bottom,--theme(--color-foreground/.2)_1px,transparent_1px)]',
							'bg-[size:32px_32px]',
							'[mask-image:radial-gradient(ellipse_at_center,var(--background)_10%,transparent)]',
						)}
					/>

					<motion.div
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
						viewport={{ once: true }}
						className="mx-auto w-full max-w-2xl space-y-2"
					>	
						<div className="grid md:grid-cols-2 bg-background relative border p-4">
							<PlusIcon className="absolute -top-3 -left-3  size-5.5" />
							<PlusIcon className="absolute -top-3 -right-3 size-5.5" />
							<PlusIcon className="absolute -bottom-3 -left-3 size-5.5" />
							<PlusIcon className="absolute -right-3 -bottom-3 size-5.5" />

							<div className="w-full px-4 pt-5 pb-4">
								<div className="space-y-1">
									<div className="flex items-center justify-between">
										<h3 className="leading-none font-semibold">Monthly</h3>
										<div className="flex items-center gap-x-1">
											<span className="text-muted-foreground text-sm line-through">$8.99</span>
											<Badge variant="secondary">11% off</Badge>
										</div>
									</div>
									<p className="text-muted-foreground text-sm">Best value for growing businesses!</p>
								</div>
								<div className="mt-10 space-y-4">
									<div className="text-muted-foreground flex items-end gap-0.5 text-xl">
										<span>$</span>
										<span className="text-foreground -mb-0.5 text-4xl font-extrabold tracking-tighter md:text-5xl">
											7.99
										</span>
										<span>/month</span>
									</div>
									<Button className="w-full" variant="outline" asChild>
										<a href="#">Start Your Journey</a>
									</Button>
								</div>
							</div>
							<div className="relative w-full rounded-lg border px-4 pt-5 pb-4">
								<BorderTrail
									style={{
										boxShadow:
											'0px 0px 60px 30px rgb(255 255 255 / 50%), 0 0 100px 60px rgb(0 0 0 / 50%), 0 0 140px 90px rgb(0 0 0 / 50%)',
									}}
									size={100}
								/>
								<div className="space-y-1">
									<div className="flex items-center justify-between">
										<h3 className="leading-none font-semibold">Yearly</h3>
										<div className="flex items-center gap-x-1">
											<span className="text-muted-foreground text-sm line-through">$8.99</span>
											<Badge>22% off</Badge>
										</div>
									</div>
									<p className="text-muted-foreground text-sm">Unlock savings with an annual commitment!</p>
								</div>
								<div className="mt-10 space-y-4">
									<div className="text-muted-foreground flex items-end text-xl">
										<span>$</span>
										<span className="text-foreground -mb-0.5 text-4xl font-extrabold tracking-tighter md:text-5xl">
											6.99
										</span>
										<span>/month</span>
									</div>
									<Button className="w-full" asChild>
										<a href="#">Get Started Now</a>
									</Button>
								</div>
							</div>
						</div>

						<div className="text-muted-foreground flex items-center justify-center gap-x-2 text-sm">
							<ShieldCheckIcon className="size-4" />
							<span>Access to all features with no hidden fees</span>
						</div>
					</motion.div>
				</div>
			</div>
		</section>
	);
}
```

---

## Функциональные требования

### Режим оплаты: Разовая покупка

> ⚠️ **Текущий режим:** Разовая покупка (без подписки)
> 
> Тумблер месяц/год **не отображается** в клиенте.
> Логика подписок подготовлена на сервере и может быть включена в будущем.

**Цены:**

| Тариф | Цена | Описание |
|-------|------|----------|
| **VIP** | 399 ₽ | Разовая покупка, бессрочный доступ |
| **PRO** | 699 ₽ | Разовая покупка, бессрочный доступ |

**Будущее расширение (отключено):**

Когда подписки будут включены (`ENABLE_SUBSCRIPTIONS: true`), появится тумблер:
```
┌─────────────────────────────────────┐
│   [Месяц]  ─────○  [Год] -25%       │
└─────────────────────────────────────┘
```

---

## Адаптивный дизайн

### Breakpoints

| Breakpoint | Описание | Особенности |
|------------|----------|-------------|
| ≤480px     | Мобильные телефоны | Один столбец, компактные отступы |
| 481-768px  | Планшеты (портрет) | Один столбец, средние отступы |
| 769-1200px | Планшеты (ландшафт) / Узкие десктопы | Два столбца |
| >1200px    | Десктоп | Два столбца, полные отступы |

### Мобильная версия (≤768px)

```
┌─────────────────────────────┐
│        🔮 PREMIUM           │
│    Разблокируй все          │
│       возможности           │
│                             │
│ ┌─────────────────────────┐ │
│ │         VIP             │ │
│ │   ⭐ Особые рамки       │ │
│ │   ⭐ Эффекты никнейма   │ │
│ │   ⭐ Без рекламы        │ │
│ │                         │ │
│ │        399 ₽            │ │
│ │   [  Купить VIP  ]      │ │
│ └─────────────────────────┘ │
│                             │
│ ┌─────────────────────────┐ │
│ │   ✨ PRO (рекомендуем)  │ │
│ │   ⭐ Всё из VIP         │ │
│ │   ⭐ Создание комнат    │ │
│ │   ⭐ Приоритет          │ │
│ │                         │ │
│ │        699 ₽            │ │
│ │   [ Купить PRO ]        │ │
│ └─────────────────────────┘ │
│                             │
│  🔒 Безопасная оплата       │
└─────────────────────────────┘
```

### Десктоп версия (>768px)

```
┌───────────────────────────────────────────────────────────────┐
│                       🔮 PREMIUM                               │
│              Разблокируй все возможности                       │
│                                                               │
│   ┌───────────────────────┐   ┌───────────────────────┐       │
│   │         VIP           │   │   ✨ PRO (Best value) │       │
│   │                       │   │   ╭─────────────────╮ │       │
│   │   ⭐ Особые рамки     │   │   │ BorderTrail     │ │       │
│   │   ⭐ Эффекты никнейма │   │   ╰─────────────────╯ │       │
│   │   ⭐ Без рекламы      │   │   ⭐ Всё из VIP       │       │
│   │                       │   │   ⭐ Создание комнат  │       │
│   │        399 ₽          │   │   ⭐ Приоритет        │       │
│   │   ┌─────────────────┐ │   │                       │       │
│   │   │  Купить VIP     │ │   │        699 ₽          │       │
│   │   └─────────────────┘ │   │   ┌─────────────────┐ │       │
│   └───────────────────────┘   │   │ 🌈 Купить PRO   │ │       │
│                               │   └─────────────────┘ │       │
│                               └───────────────────────┘       │
│                                                               │
│                    🔒 Безопасная оплата                       │
└───────────────────────────────────────────────────────────────┘
```

---

## Визуальные элементы

### Цветовая схема

| Элемент | Цвет | Назначение |
|---------|------|------------|
| Фон | `#0f172a` (slate-950) | Основной тёмный фон |
| Лампа | `#06b6d4` (cyan-500) | Акцентный свет |
| VIP карточка | Border + тень | Стандартный вид |
| PRO карточка | BorderTrail + glow | Выделенный (рекомендуемый) |
| CTA кнопка VIP | Outline | Вторичное действие |
| CTA кнопка PRO | RainbowButton | Основное действие |

### Анимации

1. **Появление страницы:**
   - Лампа разворачивается (width: 15rem → 30rem)
   - Заголовок появляется снизу (y: 100 → 0, opacity: 0.5 → 1)
   
2. **Карточки:**
   - Появляются с задержкой после лампы
   - Fade in + slide up
   
3. **Переключатель:**
   - Плавное перемещение индикатора
   - Цены меняются с анимацией (числа "перелистываются")

4. **BorderTrail на PRO карточке:**
   - Постоянная анимация "бегущей" границы
   - Создаёт эффект премиальности

5. **RainbowButton:**
   - Постоянная анимация градиента
   - Glow-эффект под кнопкой

---

## Структура компонентов

```
client/src/
├── pages/
│   └── PricingPage.jsx          # Основная страница
│
├── components/
│   └── pricing/
│       ├── LampBackground.jsx    # Анимированный фон
│       ├── PricingCard.jsx       # Карточка тарифа
│       ├── RainbowButton.jsx     # Радужная кнопка
│       ├── BorderTrail.jsx       # Анимированная граница
│       ├── PaymentState.jsx      # Состояния оплаты + модалки
│       └── PricingPage.css       # Стили страницы
│
├── utils/
│   └── cn.js                     # Утилита объединения классов
```

> **Примечание:** `PricingToggle.jsx` (переключатель месяц/год) не нужен в текущем режиме разовой покупки.
> Компонент будет добавлен когда включим подписки (`ENABLE_SUBSCRIPTIONS: true`).

---

## TODO: Этапы реализации

### Этап 1: Подготовка ✅ ВЫПОЛНЕНО
- [x] Создать структуру папок для компонентов
- [x] Адаптировать LampContainer под проект (убрать Tailwind → CSS)
- [x] Создать утилиту `cn` или использовать `classnames`

### Этап 2: Базовые компоненты ✅ ВЫПОЛНЕНО
- [x] Реализовать `LampBackground.jsx` + стили
- [x] Реализовать `RainbowButton.jsx` + CSS анимации
- [x] Реализовать `BorderTrail.jsx`
- [x] ~~Реализовать `PricingToggle.jsx`~~ — **отложено** (не нужен для разовой покупки)

### Этап 3: Серверная часть ✅ ВЫПОЛНЕНО
- [x] Добавить модели Subscription и Payment в Prisma
- [x] Создать конфигурацию платежей и цен
- [x] Создать API роуты для подписок
- [x] Добавить Socket.IO события для статуса подписки

### Этап 4: Клиентская интеграция ✅ ВЫПОЛНЕНО
- [x] Создать API клиент для подписок
- [x] Обновить PricingPage с логикой оплаты
- [x] Добавить модалки успеха/ошибки оплаты
- [x] Добавить обработку Socket событий

### Этап 5: Интеграция с Трибьют ✅ ВЫПОЛНЕНО
- [x] Добавить ENV параметры для Трибьют
- [x] Создать модуль интеграции с Трибьют API
- [x] Обновить роуты для создания платежа через Трибьют
- [x] Добавить обработку webhook от Трибьют

### Этап 6: Финализация ⏳ ОЖИДАЕТ
- [ ] Запустить Prisma миграцию: `npx prisma migrate dev --name add_subscription_models`
- [ ] Вставить реальный `TRIBUTE_API_KEY` в .env
- [ ] Настроить webhook URL в личном кабинете Трибьют
- [ ] Протестировать полный поток оплаты
- [ ] Уточнить формат API Трибьют по документации

---

## Преимущества тарифов (контент для карточек)

### VIP
- 🎨 Эксклюзивные рамки аватара
- ✨ Анимированные эффекты никнейма
- 🚫 Отключение рекламы
- 🎭 Особые цвета никнейма
- 📊 Расширенная статистика

### PRO
- ⭐ Все преимущества VIP
- 🏠 Создание приватных комнат
- 👑 Роль "Хост" в играх
- 🎯 Приоритетный подбор игроков
- 💬 Кастомные эмодзи
- 🏆 Особый значок в лидербордах
- 📞 Приоритетная поддержка

---

## Примечания

- Референсные компоненты написаны на TypeScript с Tailwind CSS
- При реализации адаптировать под JSX + CSS проекта
- Цвета и цены уточнить перед финальной реализацией
- Предусмотреть возможность A/B тестирования цен и текстов

---

## Серверная часть

### Prisma Schema

Добавить в `server/prisma/schema.prisma`:

```prisma
// Типы подписки
enum SubscriptionTier {
  VIP
  PRO
}

// Статус подписки
enum SubscriptionStatus {
  ACTIVE      // Активна
  CANCELLED   // Отменена (доступ до конца периода)
  EXPIRED     // Истекла
  PENDING     // Ожидает оплаты
}

// Статус платежа
enum PaymentStatus {
  PENDING   // Ожидает оплаты
  SUCCESS   // Успешно оплачен
  FAILED    // Ошибка оплаты
  REFUNDED  // Возврат средств
}

// Тип периода подписки
enum BillingPeriod {
  ONE_TIME  // Разовая покупка (бессрочно) — ТЕКУЩИЙ РЕЖИМ
  MONTHLY   // Месячная (для будущего)
  YEARLY    // Годовая (для будущего)
}

// Подписка пользователя
model Subscription {
  id              String             @id @default(cuid())
  userId          String             @unique
  user            User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  tier            SubscriptionTier   // VIP или PRO
  status          SubscriptionStatus @default(PENDING)
  billingPeriod   BillingPeriod      @default(ONE_TIME) // Разовая покупка по умолчанию
  
  startDate       DateTime?          // Дата начала подписки
  endDate         DateTime?          // Дата окончания (null = бессрочно для ONE_TIME)
  
  autoRenew       Boolean            @default(false) // false для разовой покупки
  cancelledAt     DateTime?          // Дата отмены (если отменена)
  
  // Данные для рекуррентных платежей (заполняет платёжка, для будущего)
  externalSubscriptionId  String?    // ID подписки в платёжной системе
  
  createdAt       DateTime           @default(now())
  updatedAt       DateTime           @updatedAt
  
  payments        Payment[]
}

// Примечание: для разовой покупки (ONE_TIME):
// - endDate = null (бессрочный доступ)
// - autoRenew = false
// - status = ACTIVE после успешной оплаты

// История платежей
model Payment {
  id              String        @id @default(cuid())
  userId          String
  user            User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  subscriptionId  String?
  subscription    Subscription? @relation(fields: [subscriptionId], references: [id])
  
  amount          Int           // Сумма в копейках (19900 = 199.00 ₽)
  currency        String        @default("RUB")
  
  status          PaymentStatus @default(PENDING)
  
  // Данные от платёжной системы (Трибьют)
  paymentProvider String        @default("tribute")
  externalId      String?       // ID платежа в Трибьюте
  paymentMethod   String?       // Способ оплаты (card, sbp, etc.)
  
  // Метаданные
  description     String?       // Описание платежа
  failureReason   String?       // Причина ошибки (если failed)
  
  paidAt          DateTime?     // Дата фактической оплаты
  refundedAt      DateTime?     // Дата возврата (если был)
  
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  
  @@index([userId])
  @@index([externalId])
}
```

**Не забудь добавить связи в модель User:**

```prisma
model User {
  // ... существующие поля ...
  
  subscription    Subscription?
  payments        Payment[]
}
```

---

## API Endpoints

### Подписки

| Метод | Путь | Описание | Авторизация |
|-------|------|----------|-------------|
| GET | `/api/subscription/status` | Получить текущий статус подписки | ✅ Требуется |
| GET | `/api/subscription/plans` | Получить список доступных тарифов и цен | ❌ Публичный |
| POST | `/api/subscription/cancel` | Отменить автопродление подписки | ✅ Требуется |

### Платежи

| Метод | Путь | Описание | Авторизация |
|-------|------|----------|-------------|
| POST | `/api/payments/create` | Создать платёж, получить ссылку на оплату | ✅ Требуется |
| POST | `/api/payments/webhook` | Webhook от платёжной системы | 🔐 Подпись |
| GET | `/api/payments/history` | История платежей пользователя | ✅ Требуется |

### Примеры запросов/ответов

#### GET `/api/subscription/status`

**Response (активная подписка — разовая покупка):**
```json
{
  "hasSubscription": true,
  "subscription": {
    "tier": "PRO",
    "status": "ACTIVE",
    "billingPeriod": "ONE_TIME",
    "startDate": "2026-02-10T00:00:00Z",
    "endDate": null,
    "autoRenew": false,
    "isPermanent": true
  }
}
```

> **Примечание:** `endDate: null` и `isPermanent: true` означают бессрочный доступ (разовая покупка).

**Response (нет подписки):**
```json
{
  "hasSubscription": false,
  "subscription": null
}
```

#### POST `/api/payments/create`

**Request:**
```json
{
  "tier": "PRO"
}
```

> **Примечание:** `billingPeriod` не передаётся — текущий режим только разовая покупка.
> Когда включим подписки, добавится опциональное поле `billingPeriod: "MONTHLY" | "YEARLY"`.

**Response:**
```json
{
  "paymentId": "pay_abc123",
  "paymentUrl": "https://tribute.tg/pay/xyz",
  "amount": 69900,
  "currency": "RUB",
  "tier": "PRO",
  "type": "one_time"
}
```

#### POST `/api/subscription/cancel`

> ⚠️ **Не используется в текущем режиме** — разовая покупка бессрочная, отменять нечего.
> Эндпоинт будет актуален когда включим подписки.

**Response (для будущего режима подписок):**
```json
{
  "success": true,
  "message": "Автопродление отменено. Подписка будет активна до 2027-02-01",
  "subscription": {
    "tier": "PRO",
    "status": "CANCELLED",
    "endDate": "2027-02-01T00:00:00Z",
    "autoRenew": false
  }
}
```

---

## Компонент BorderTrail

Добавить в `client/src/components/pricing/BorderTrail.jsx`:

```jsx
import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import './BorderTrail.css';

/**
 * BorderTrail — анимированная "бегущая" граница для выделения элемента
 * Используется для PRO карточки, чтобы визуально выделить её как рекомендуемую
 */
export function BorderTrail({ 
  size = 100, 
  style = {},
  duration = 5,
  delay = 0,
  className = ''
}) {
  return (
    <div className={`border-trail-container ${className}`}>
      <motion.div
        className="border-trail"
        style={{
          width: size,
          height: size,
          ...style
        }}
        animate={{
          offsetDistance: ['0%', '100%']
        }}
        transition={{
          duration,
          delay,
          repeat: Infinity,
          ease: 'linear'
        }}
      />
    </div>
  );
}

export default BorderTrail;
```

**Стили `BorderTrail.css`:**

```css
.border-trail-container {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: inherit;
  pointer-events: none;
}

.border-trail {
  position: absolute;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(6, 182, 212, 0.8) 0%,
    rgba(6, 182, 212, 0.4) 30%,
    transparent 70%
  );
  
  /* Анимация движения по периметру */
  offset-path: path('M 0,0 L 100%,0 L 100%,100% L 0,100% Z');
  offset-rotate: 0deg;
  
  /* Glow эффект */
  filter: blur(4px);
  mix-blend-mode: screen;
}

/* Альтернативная реализация через CSS-анимацию */
@keyframes border-trail-move {
  0% {
    top: 0;
    left: 0;
  }
  25% {
    top: 0;
    left: calc(100% - var(--trail-size, 100px));
  }
  50% {
    top: calc(100% - var(--trail-size, 100px));
    left: calc(100% - var(--trail-size, 100px));
  }
  75% {
    top: calc(100% - var(--trail-size, 100px));
    left: 0;
  }
  100% {
    top: 0;
    left: 0;
  }
}

/* Fallback для браузеров без поддержки offset-path */
@supports not (offset-path: path('M 0,0')) {
  .border-trail {
    --trail-size: 100px;
    animation: border-trail-move 5s linear infinite;
  }
}
```

---

## Утилита cn()

Создать `client/src/utils/cn.js`:

```js
/**
 * Утилита для объединения CSS классов
 * Аналог clsx/classnames с поддержкой условий
 * 
 * Примеры использования:
 * cn('base-class', isActive && 'active', disabled && 'disabled')
 * cn('btn', { 'btn-primary': isPrimary, 'btn-large': size === 'lg' })
 * cn(['class1', 'class2'], additionalClass)
 */
export function cn(...inputs) {
  const classes = [];
  
  for (const input of inputs) {
    if (!input) continue;
    
    if (typeof input === 'string') {
      classes.push(input);
    } else if (Array.isArray(input)) {
      const nested = cn(...input);
      if (nested) classes.push(nested);
    } else if (typeof input === 'object') {
      for (const [key, value] of Object.entries(input)) {
        if (value) classes.push(key);
      }
    }
  }
  
  return classes.join(' ');
}

export default cn;
```

**Использование в компонентах:**

```jsx
import { cn } from '../utils/cn';

function PricingCard({ tier, isRecommended, className }) {
  return (
    <div className={cn(
      'pricing-card',
      isRecommended && 'pricing-card--recommended',
      tier === 'PRO' && 'pricing-card--pro',
      className
    )}>
      {/* ... */}
    </div>
  );
}
```

---

## UI States (Состояния интерфейса)

### Процесс оплаты

```
┌─────────────────────────────────────────────────────────────────┐
│                         FLOW ОПЛАТЫ                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   [IDLE] ──► [LOADING] ──► [REDIRECT] ──► [PROCESSING]         │
│      │           │              │              │                │
│      │           │              │              ├──► [SUCCESS]   │
│      │           │              │              │                │
│      │           ▼              ▼              └──► [ERROR]     │
│      │      [API_ERROR]    [CANCELLED]              │           │
│      │           │              │                   │           │
│      └───────────┴──────────────┴───────────────────┘           │
│                        (retry)                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Описание состояний

| Состояние | Описание | UI |
|-----------|----------|-----|
| `IDLE` | Начальное состояние | Кнопка "Купить" активна |
| `LOADING` | Создание платежа | Спиннер, кнопка заблокирована |
| `REDIRECT` | Переход на платёжку | Сообщение "Переход к оплате..." |
| `PROCESSING` | Ожидание подтверждения | Сообщение "Обрабатываем платёж..." |
| `SUCCESS` | Оплата успешна | Модалка с конфетти "Поздравляем!" |
| `ERROR` | Ошибка оплаты | Модалка с ошибкой и кнопкой "Попробовать снова" |
| `API_ERROR` | Ошибка API при создании платежа | Toast с ошибкой |
| `CANCELLED` | Пользователь отменил на странице платёжки | Возврат к выбору тарифа |

### Компонент состояния (пример)

```jsx
// client/src/components/pricing/PaymentState.jsx

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './PaymentState.css';

const STATES = {
  IDLE: 'idle',
  LOADING: 'loading',
  REDIRECT: 'redirect',
  PROCESSING: 'processing',
  SUCCESS: 'success',
  ERROR: 'error'
};

export function PaymentButton({ state, tier, onBuy, onRetry }) {
  const isDisabled = state !== STATES.IDLE;
  
  return (
    <button
      className={cn('payment-button', `payment-button--${state}`)}
      onClick={onBuy}
      disabled={isDisabled}
    >
      <AnimatePresence mode="wait">
        {state === STATES.IDLE && (
          <motion.span
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            Купить {tier}
          </motion.span>
        )}
        
        {state === STATES.LOADING && (
          <motion.span
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="payment-button__loading"
          >
            <span className="spinner" />
            Создаём платёж...
          </motion.span>
        )}
        
        {state === STATES.REDIRECT && (
          <motion.span
            key="redirect"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            Переход к оплате...
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}

export function PaymentSuccessModal({ isOpen, onClose, tier }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="payment-modal payment-modal--success"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
        >
          <div className="payment-modal__content">
            <div className="payment-modal__icon">🎉</div>
            <h2>Поздравляем!</h2>
            <p>Подписка {tier} успешно активирована</p>
            <button onClick={onClose}>Отлично!</button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function PaymentErrorModal({ isOpen, onClose, onRetry, error }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="payment-modal payment-modal--error"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
        >
          <div className="payment-modal__content">
            <div className="payment-modal__icon">😔</div>
            <h2>Ошибка оплаты</h2>
            <p>{error || 'Произошла ошибка при обработке платежа'}</p>
            <div className="payment-modal__actions">
              <button onClick={onRetry}>Попробовать снова</button>
              <button onClick={onClose} className="secondary">Отмена</button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

### Состояния подписки в профиле

| Состояние | Описание | UI |
|-----------|----------|-----|
| `NO_SUBSCRIPTION` | Нет подписки | Кнопка "Оформить подписку" |
| `ACTIVE` | Подписка активна | Бейдж тарифа, дата окончания |
| `EXPIRING_SOON` | Истекает < 7 дней | Предупреждение, кнопка "Продлить" |
| `CANCELLED` | Отменена, но активна | Дата окончания, кнопка "Возобновить" |
| `EXPIRED` | Истекла | Предложение продлить со скидкой |

---

## Edge Cases (Особые сценарии)

### Смена тарифа

| Сценарий | Поведение | Расчёт |
|----------|-----------|--------|
| **VIP → PRO (upgrade)** | Немедленное повышение | Пропорциональный перерасчёт остатка VIP + доплата за PRO |
| **PRO → VIP (downgrade)** | Отложенное понижение | PRO действует до конца периода, затем VIP |
| **Месяц → Год** | Немедленный переход | Доплата за год с учётом остатка месяца |
| **Год → Месяц** | Отложенный переход | Год действует до конца, затем месячная |

**Пример расчёта upgrade VIP → PRO (годовая подписка):**

```
Остаток VIP: 180 дней (из 365)
Стоимость VIP год: 1788 ₽
Стоимость PRO год: 3588 ₽

Неиспользованный остаток VIP: 1788 × (180/365) = 882 ₽
Стоимость PRO на 180 дней: 3588 × (180/365) = 1770 ₽
Доплата: 1770 - 882 = 888 ₽
```

### Отмена подписки

| Сценарий | Поведение |
|----------|-----------|
| Отмена автопродления | Доступ сохраняется до конца оплаченного периода |
| Возобновление до конца периода | Автопродление включается обратно |
| Возобновление после истечения | Новая оплата по текущим ценам |

### Неудачные платежи

| Попытка | Действие | Уведомление |
|---------|----------|-------------|
| 1 | Повторное списание через 24 часа | Email + Push |
| 2 | Повторное списание через 48 часов | Email |
| 3 | Повторное списание через 72 часа | Email + SMS |
| 4 | Отмена подписки | Email с предложением обновить карту |

### Возврат средств (Refund)

| Условие | Возможность возврата |
|---------|---------------------|
| < 3 дней с момента оплаты | ✅ Полный возврат |
| 3-14 дней, не использовал премиум-функции | ✅ Полный возврат |
| 3-14 дней, использовал премиум-функции | ⚠️ Частичный возврат (на усмотрение) |
| > 14 дней | ❌ Возврат невозможен |

**Критерии "использования премиум-функций":**
- Применил премиум-рамку аватара
- Использовал анимированный никнейм
- Создал приватную комнату (PRO)
- Получил приоритет в подборе (PRO)

### Промокоды и скидки

| Тип | Применение |
|-----|------------|
| Скидка % | Применяется к базовой цене |
| Фиксированная скидка ₽ | Вычитается из итоговой суммы |
| Бесплатный период | Добавляет N дней к подписке |
| Upgrade скидка | Скидка при переходе VIP → PRO |

---

## Аналитика событий

### События для трекинга

| Событие | Параметры | Описание |
|---------|-----------|----------|
| `pricing_page_view` | `source`, `user_id` | Просмотр страницы тарифов |
| `pricing_toggle_change` | `from`, `to` | Переключение месяц/год |
| `pricing_card_click` | `tier`, `billing_period` | Клик на карточку тарифа |
| `payment_initiated` | `tier`, `billing_period`, `amount` | Начало оплаты |
| `payment_redirect` | `payment_id`, `provider` | Переход на платёжку |
| `payment_success` | `payment_id`, `tier`, `amount` | Успешная оплата |
| `payment_failed` | `payment_id`, `error_code`, `error_message` | Ошибка оплаты |
| `payment_cancelled` | `payment_id`, `step` | Отмена пользователем |
| `subscription_activated` | `tier`, `billing_period` | Активация подписки |
| `subscription_cancelled` | `tier`, `days_remaining` | Отмена автопродления |
| `subscription_expired` | `tier`, `was_cancelled` | Истечение подписки |
| `subscription_renewed` | `tier`, `billing_period`, `amount` | Автопродление |
| `upgrade_initiated` | `from_tier`, `to_tier` | Начало апгрейда |
| `downgrade_initiated` | `from_tier`, `to_tier` | Начало даунгрейда |

### Воронка конверсии

```
pricing_page_view (100%)
       │
       ▼
pricing_card_click (60%)
       │
       ▼
payment_initiated (40%)
       │
       ▼
payment_redirect (38%)
       │
       ├──► payment_cancelled (5%)
       │
       ▼
payment_success (30%)
       │
       ▼
subscription_activated (30%)
```

### Метрики для дашборда

| Метрика | Формула | Цель |
|---------|---------|------|
| **Conversion Rate** | `payment_success / pricing_page_view` | > 5% |
| **Cart Abandonment** | `(payment_initiated - payment_success) / payment_initiated` | < 30% |
| **ARPU** | `Общий доход / Активные пользователи` | Рост MoM |
| **Churn Rate** | `Отменённые / Всего подписок` | < 5% в месяц |
| **LTV** | `ARPU × Средний срок подписки` | Рост |
| **MRR** | `Сумма месячных платежей` | Рост MoM |

### Пример интеграции аналитики

```js
// client/src/utils/analytics.js

export const analytics = {
  track(event, properties = {}) {
    // Базовые свойства для всех событий
    const baseProps = {
      timestamp: new Date().toISOString(),
      user_id: getCurrentUserId(),
      session_id: getSessionId(),
      platform: getPlatform(), // web, ios, android
      version: APP_VERSION
    };
    
    const payload = { ...baseProps, ...properties };
    
    // Отправка в аналитику (Amplitude, Mixpanel, etc.)
    if (window.amplitude) {
      window.amplitude.track(event, payload);
    }
    
    // Дублирование в консоль для отладки (dev only)
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Analytics] ${event}`, payload);
    }
  },
  
  // Готовые методы для частых событий
  pricingPageView(source) {
    this.track('pricing_page_view', { source });
  },
  
  paymentInitiated(tier, billingPeriod, amount) {
    this.track('payment_initiated', { tier, billing_period: billingPeriod, amount });
  },
  
  paymentSuccess(paymentId, tier, amount) {
    this.track('payment_success', { payment_id: paymentId, tier, amount });
  },
  
  paymentFailed(paymentId, errorCode, errorMessage) {
    this.track('payment_failed', { 
      payment_id: paymentId, 
      error_code: errorCode, 
      error_message: errorMessage 
    });
  }
};
```

---

## Цены

### Текущий режим: Разовая покупка

| Тариф | Цена | Описание |
|-------|------|----------|
| **VIP** | 399 ₽ | Разовая покупка, бессрочный доступ |
| **PRO** | 699 ₽ | Разовая покупка, бессрочный доступ |

### Подготовленные цены для подписки (отключено)

> ⚠️ **Подписочная модель подготовлена на сервере, но не активирована.**
> Для включения: установить `ENABLE_SUBSCRIPTIONS: true` в конфигурации.

| Тариф | Месяц | Год (в месяц) | Год (итого) | Скидка |
|-------|-------|---------------|-------------|--------|
| **VIP** | 199 ₽ | 149 ₽ | 1 788 ₽ | 25% |
| **PRO** | 399 ₽ | 299 ₽ | 3 588 ₽ | 25% |

### Конфигурация цен

```js
// server/src/config/pricing.js

export const PRICING = {
  // Текущий режим
  mode: 'one_time', // 'one_time' | 'subscription'
  
  // Разовые покупки (активно)
  oneTime: {
    VIP: 39900,  // 399 ₽ в копейках
    PRO: 69900   // 699 ₽ в копейках
  },
  
  // Подписки (подготовлено, но отключено)
  subscription: {
    VIP: {
      monthly: 19900,   // 199 ₽
      yearly: 178800    // 1788 ₽ (149 ₽/мес)
    },
    PRO: {
      monthly: 39900,   // 399 ₽
      yearly: 358800    // 3588 ₽ (299 ₽/мес)
    }
  }
};

// Хелпер для получения цены
export function getPrice(tier) {
  const { mode, oneTime, subscription } = PRICING;
  
  if (mode === 'one_time') {
    return { amount: oneTime[tier], type: 'one_time' };
  }
  
  // Для будущей подписочной модели
  return {
    monthly: subscription[tier].monthly,
    yearly: subscription[tier].yearly,
    type: 'subscription'
  };
}
```

---

## Платёжная система: Трибьют

**Выбранный провайдер:** [Трибьют](https://tribute.tg/) (Tribute)

### Особенности интеграции

- Оплата через Telegram (удобно для целевой аудитории)
- Простое API для разовых платежей
- Поддержка рекуррентных платежей (подготовлено, но отключено)

### Конфигурация

```js
// server/src/config/payment.js

export const PAYMENT_CONFIG = {
  provider: 'tribute',
  
  // Режим работы: 'one_time' | 'subscription'
  // Подписки подготовлены, но пока отключены
  mode: 'one_time',
  
  // Флаг для включения подписок в будущем
  ENABLE_SUBSCRIPTIONS: false,
  
  // API настройки (заполнить из env)
  tribute: {
    apiUrl: process.env.TRIBUTE_API_URL || 'https://api.tribute.tg',
    apiKey: process.env.TRIBUTE_API_KEY,
    shopId: process.env.TRIBUTE_SHOP_ID,
    webhookSecret: process.env.TRIBUTE_WEBHOOK_SECRET
  }
};
```

### Переменные окружения

```env
# .env
TRIBUTE_API_KEY=your-tribute-api-key-here
TRIBUTE_WEBHOOK_URL=https://partychaos.ru/api/subscription/payments/webhook
```

---

## ✅ Реализованные файлы

### Клиент (client/src/)

| Файл | Описание |
|------|----------|
| `utils/cn.js` | Утилита объединения CSS классов |
| `api/subscription.js` | API клиент для подписок и платежей |
| `pages/PricingPage.jsx` | Страница покупки VIP/PRO с полной логикой |
| `pages/PricingPage.css` | Стили страницы |
| `components/pricing/index.js` | Экспорты компонентов |
| `components/pricing/LampBackground.jsx` | Анимированный фон с эффектом "лампы" |
| `components/pricing/LampBackground.css` | Стили LampBackground |
| `components/pricing/RainbowButton.jsx` | Кнопка с радужной анимированной границей |
| `components/pricing/RainbowButton.css` | Стили RainbowButton |
| `components/pricing/BorderTrail.jsx` | "Бегущий" свет по границе карточки |
| `components/pricing/BorderTrail.css` | Стили BorderTrail |
| `components/pricing/PaymentModals.jsx` | Модалки успеха/ошибки/загрузки/авторизации |
| `components/pricing/PaymentModals.css` | Стили модалок |

### Сервер (server/src/)

| Файл | Описание |
|------|----------|
| `config/payment.js` | Конфигурация цен и настроек платежей |
| `payment/tribute.js` | Модуль интеграции с Трибьют API |
| `subscription/index.js` | Бизнес-логика подписок |
| `subscription/routes.js` | API роуты для подписок и платежей |

### Prisma (server/prisma/)

| Изменения | Описание |
|-----------|----------|
| `schema.prisma` | Добавлены модели Subscription и Payment |

### ENV файлы

| Файл | Добавлено |
|------|-----------|
| `server/.env` | `TRIBUTE_API_KEY`, `TRIBUTE_WEBHOOK_URL` |
| `server/.env.production` | `TRIBUTE_API_KEY`, `TRIBUTE_WEBHOOK_URL` |

---

## 🚀 Запуск

### 1. Создать миграцию Prisma

```bash
cd server
npx prisma migrate dev --name add_subscription_models
```

### 2. Добавить API ключ Трибьют

Отредактируйте `server/.env` и `server/.env.production`:

```env
TRIBUTE_API_KEY=ваш_реальный_ключ_от_трибьют
```

### 3. Настроить webhook в Трибьют

В личном кабинете Трибьют укажите URL для webhook:
- **Production:** `https://partychaos.ru/api/subscription/payments/webhook`
- **Development:** `http://localhost:3001/api/subscription/payments/webhook`

### 4. Запустить проект

```bash
# Сервер
cd server && npm run dev

# Клиент
cd client && npm run dev
```

### 5. Открыть страницу

Перейти на `http://localhost:5173/pricing`

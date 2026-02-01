import { useEffect, useMemo, useRef, useState } from "react";

const CHIP_HUES = [195, 320, 128, 38, 214, 168, 286];

// Настройки эффекта казино
const CASINO_CONFIG = {
  // Общая длительность анимации
  minDuration: 3500,
  maxDuration: 5000,
  // Количество полных циклов прокрутки
  minLoops: 4,
  maxLoops: 6,
  // Скорость шагов (мс между переключениями)
  minStepDelay: 45,   // Быстрый старт
  maxStepDelay: 500,  // Медленная остановка перед финалом
  // Драматичный финал
  tensionPauseMin: 800,  // Длинная пауза перед "последним рывком"
  tensionPauseMax: 1200,
  finalJumpDelay: 350,   // Задержка последнего неожиданного перехода
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function lerp(min, max, t) {
  return min + (max - min) * t;
}

// Более драматичная кривая замедления — эффект казино
function easeOutExpo(t) {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

// Кубическая кривая для ещё более выраженного замедления в конце
function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

// Комбинированная кривая: быстрый старт, очень медленный финиш
function casinoEase(t) {
  // Первые 70% — быстро, последние 30% — очень медленно
  if (t < 0.7) {
    return easeOutCubic(t / 0.7) * 0.5;
  }
  const slowT = (t - 0.7) / 0.3;
  return 0.5 + easeOutExpo(slowT) * 0.5;
}

function createSeededRng(seed) {
  let value = seed % 2147483647;
  if (value <= 0) {
    value += 2147483646;
  }
  return () => {
    value = (value * 16807) % 2147483647;
    return value / 2147483647;
  };
}

function randomBetween(min, max, rng = Math.random) {
  return min + rng() * (max - min);
}

function randomInt(min, max, rng = Math.random) {
  return Math.floor(randomBetween(min, max + 1, rng));
}

function CategorySelector({
  categories = [],
  activeId,
  targetId,
  spinning,
  spinTick,
  spinStartedAtMs = null,
  spinDurationMs = null,
  onReveal
}) {
  const [rouletteId, setRouletteId] = useState(null);
  const [isRouletteRunning, setIsRouletteRunning] = useState(false);
  const [pulseId, setPulseId] = useState(null);
  const [justFinished, setJustFinished] = useState(false);
  const [isTensionPhase, setIsTensionPhase] = useState(false);
  const rouletteTimeoutRef = useRef(null);
  const rouletteRafRef = useRef(null);
  const rouletteSessionRef = useRef(0);
  const currentIndexRef = useRef(0);
  const lastSpinTickRef = useRef(spinTick);
  const onRevealRef = useRef(onReveal);
  const hasActive = Boolean(activeId);
  const isSpinning = spinning || isRouletteRunning;
  const displayActiveId = rouletteId ?? activeId;

  useEffect(() => {
    if (activeId) {
      setPulseId(activeId);
    }
  }, [activeId, spinTick]);

  useEffect(() => {
    if (!pulseId) {
      return;
    }
    const timeoutId = window.setTimeout(() => setPulseId(null), 240);
    return () => window.clearTimeout(timeoutId);
  }, [pulseId]);

  useEffect(() => {
    onRevealRef.current = onReveal;
  }, [onReveal]);

  useEffect(() => {
    return () => {
      if (rouletteTimeoutRef.current) {
        window.clearTimeout(rouletteTimeoutRef.current);
        rouletteTimeoutRef.current = null;
      }
      if (rouletteRafRef.current) {
        cancelAnimationFrame(rouletteRafRef.current);
        rouletteRafRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!categories.length) {
      if (rouletteTimeoutRef.current) {
        window.clearTimeout(rouletteTimeoutRef.current);
        rouletteTimeoutRef.current = null;
      }
      setRouletteId(null);
      setIsRouletteRunning(false);
      return;
    }
    if (lastSpinTickRef.current === spinTick) {
      return;
    }
    lastSpinTickRef.current = spinTick;

    if (rouletteTimeoutRef.current) {
      window.clearTimeout(rouletteTimeoutRef.current);
      rouletteTimeoutRef.current = null;
    }
    if (!targetId) {
      setRouletteId(null);
      setIsRouletteRunning(false);
      return;
    }

    const ids = categories.map((category) => category.id);
    const targetIndex = ids.indexOf(targetId);
    if (targetIndex < 0) {
      setRouletteId(null);
      setIsRouletteRunning(false);
      return;
    }

    const rng =
      typeof spinStartedAtMs === "number"
        ? createSeededRng(spinStartedAtMs + targetIndex * 97 + ids.length * 13)
        : Math.random;

    const currentIndex = ids.indexOf(displayActiveId);
    const startIndex =
      currentIndex >= 0 ? currentIndex : Math.floor(rng() * ids.length);

    currentIndexRef.current = startIndex;
    setRouletteId(ids[startIndex]);
    setIsRouletteRunning(true);

    // Эффект казино: больше циклов для драматизма (детерминированно)
    const loops = randomInt(CASINO_CONFIG.minLoops, CASINO_CONFIG.maxLoops, rng);
    const offset =
      ((targetIndex - startIndex) % ids.length + ids.length) % ids.length;
    let totalSteps = loops * ids.length + offset;
    if (totalSteps < ids.length * 2) {
      totalSteps += ids.length;
    }

    const duration =
      typeof spinDurationMs === "number" && spinDurationMs > 0
        ? Math.round(spinDurationMs)
        : Math.round(randomBetween(CASINO_CONFIG.minDuration, CASINO_CONFIG.maxDuration, rng));
    
    // Создаём задержки с эффектом казино (без последних 2 шагов — они особенные)
    const mainSteps = totalSteps - 2;
    const rawDelays = Array.from({ length: totalSteps }, (_, index) => {
      if (index >= mainSteps) {
        return 0; // Заполним позже для финала
      }
      const t = mainSteps > 1 ? index / (mainSteps - 1) : 1;
      const easedT = casinoEase(t);
      return lerp(CASINO_CONFIG.minStepDelay, CASINO_CONFIG.maxStepDelay, easedT);
    });
    
    // Драматичный финал: 
    // 1. Предпоследний шаг — длинная "напряжённая" пауза (кажется, что остановилось)
    // 2. Последний шаг — неожиданный финальный рывок
    const tensionPause = randomBetween(CASINO_CONFIG.tensionPauseMin, CASINO_CONFIG.tensionPauseMax, rng);
    rawDelays[totalSteps - 2] = tensionPause; // Длинная пауза — "неужели это?"
    rawDelays[totalSteps - 1] = CASINO_CONFIG.finalJumpDelay; // Последний рывок!
    
    const totalWeight = rawDelays.reduce((sum, value) => sum + value, 0) || 1;
    const scale = duration / totalWeight;
    const delays = rawDelays.map((value, index) => {
      // Последние 2 шага не масштабируем — они фиксированные для драматизма
      if (index >= totalSteps - 2) {
        return value;
      }
      return clamp(value * scale, 40, 600);
    });

    const sessionId = rouletteSessionRef.current + 1;
    rouletteSessionRef.current = sessionId;
    let step = 0;

    const cumulativeMs = [];
    let acc = 0;
    for (let i = 0; i < totalSteps; i += 1) {
      acc += delays[i] ?? 0;
      cumulativeMs.push(acc);
    }

    const startedAt = typeof spinStartedAtMs === "number" ? spinStartedAtMs : Date.now();

    const tickAnimation = () => {
      if (rouletteSessionRef.current !== sessionId) {
        return;
      }

      const elapsed = Date.now() - startedAt;

      // определяем текущий шаг по времени
      while (step < totalSteps && elapsed >= cumulativeMs[step]) {
        currentIndexRef.current = (currentIndexRef.current + 1) % ids.length;
        step += 1;
      }

      // обновляем отображение
      setRouletteId(ids[currentIndexRef.current]);

      if (step >= totalSteps - 1) {
        setIsTensionPhase(true);
      }

      if (step >= totalSteps) {
        setIsRouletteRunning(false);
        setIsTensionPhase(false);
        setJustFinished(true);
        window.setTimeout(() => setJustFinished(false), 800);
        if (typeof onRevealRef.current === "function") {
          onRevealRef.current(ids[targetIndex]);
        }
        rouletteRafRef.current = null;
        return;
      }

      rouletteRafRef.current = requestAnimationFrame(tickAnimation);
    };

    if (rouletteRafRef.current) {
      cancelAnimationFrame(rouletteRafRef.current);
      rouletteRafRef.current = null;
    }
    rouletteRafRef.current = requestAnimationFrame(tickAnimation);
  }, [categories, displayActiveId, spinTick, targetId, spinStartedAtMs, spinDurationMs]);

  useEffect(() => {
    if (activeId && rouletteId === activeId) {
      setRouletteId(null);
    }
  }, [activeId, rouletteId]);

  const hintText = useMemo(() => {
    if (isSpinning) {
      return "Запускаем отбор категории...";
    }
    if (hasActive) {
      return "Готовим ленту сценариев.";
    }
    return "Запусти выбор категории, чтобы открыть сценарии.";
  }, [hasActive, isSpinning]);

  return (
    <div
      className={`category-selector${isSpinning ? " is-spinning" : ""}${
        hasActive ? " has-active" : ""
      }`}
    >
      <div className="category-selector__header">
        <div className="category-selector__title">Категории</div>
        <div className="category-selector__meta">
          {hasActive ? "Категория выбрана" : "Ожидание выбора"}
        </div>
      </div>
      <div className="category-selector__list">
        {categories.map((category, index) => {
          const isActive = category.id === displayActiveId;
          const isWinner = justFinished && isActive;
          const isTension = isTensionPhase && isActive;
          return (
            <div
              key={category.id}
              className={`category-chip${isActive ? " is-active" : ""}${
                pulseId === category.id ? " is-pulsing" : ""
              }${isTension ? " is-tension" : ""}${isWinner ? " is-winner" : ""}`}
              style={{ "--chip-hue": CHIP_HUES[index % CHIP_HUES.length] }}
            >
              <div className="category-chip__icon" aria-hidden="true" />
              <div className="category-chip__body">
                <div className="category-chip__title">{category.title}</div>
                <div className="category-chip__count">
                  {category.items?.length || 0} сценариев
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="category-selector__hint">{hintText}</div>
    </div>
  );
}

export default CategorySelector;

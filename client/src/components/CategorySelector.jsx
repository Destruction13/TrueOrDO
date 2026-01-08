import { useEffect, useMemo, useRef, useState } from "react";

const CHIP_HUES = [195, 320, 128, 38, 214, 168, 286];
const ROULETTE_MIN_DURATION = 1500;
const ROULETTE_MAX_DURATION = 2500;
const ROULETTE_MIN_LOOPS = 3;
const ROULETTE_MAX_LOOPS = 5;
const ROULETTE_MIN_STEP = 40;
const ROULETTE_MAX_STEP = 220;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function lerp(min, max, t) {
  return min + (max - min) * t;
}

function easeOutQuad(t) {
  return 1 - (1 - t) * (1 - t);
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function randomInt(min, max) {
  return Math.floor(randomBetween(min, max + 1));
}

function CategorySelector({
  categories = [],
  activeId,
  targetId,
  spinning,
  spinTick,
  onReveal
}) {
  const [rouletteId, setRouletteId] = useState(null);
  const [isRouletteRunning, setIsRouletteRunning] = useState(false);
  const [pulseId, setPulseId] = useState(null);
  const rouletteTimeoutRef = useRef(null);
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

    const currentIndex = ids.indexOf(displayActiveId);
    const startIndex =
      currentIndex >= 0 ? currentIndex : Math.floor(Math.random() * ids.length);

    currentIndexRef.current = startIndex;
    setRouletteId(ids[startIndex]);
    setIsRouletteRunning(true);

    const loops = randomInt(ROULETTE_MIN_LOOPS, ROULETTE_MAX_LOOPS);
    const offset =
      ((targetIndex - startIndex) % ids.length + ids.length) % ids.length;
    let totalSteps = loops * ids.length + offset;
    if (totalSteps < ids.length) {
      totalSteps += ids.length;
    }

    const duration = Math.round(
      randomBetween(ROULETTE_MIN_DURATION, ROULETTE_MAX_DURATION)
    );
    const rawDelays = Array.from({ length: totalSteps }, (_, index) => {
      const t = totalSteps > 1 ? index / (totalSteps - 1) : 1;
      return lerp(ROULETTE_MIN_STEP, ROULETTE_MAX_STEP, easeOutQuad(t));
    });
    const totalWeight = rawDelays.reduce((sum, value) => sum + value, 0) || 1;
    const scale = duration / totalWeight;
    const delays = rawDelays.map((value) => clamp(value * scale, 24, 260));

    const sessionId = rouletteSessionRef.current + 1;
    rouletteSessionRef.current = sessionId;
    let step = 0;

    const stepForward = () => {
      if (rouletteSessionRef.current !== sessionId) {
        return;
      }
      currentIndexRef.current = (currentIndexRef.current + 1) % ids.length;
      setRouletteId(ids[currentIndexRef.current]);
      step += 1;
      if (step >= totalSteps) {
        setIsRouletteRunning(false);
        if (typeof onRevealRef.current === "function") {
          onRevealRef.current(ids[targetIndex]);
        }
        return;
      }
      const delay = delays[step] ?? 0;
      rouletteTimeoutRef.current = window.setTimeout(stepForward, delay);
    };

    rouletteTimeoutRef.current = window.setTimeout(stepForward, delays[0] ?? 0);
  }, [categories, displayActiveId, spinTick, targetId]);

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
        {categories.map((category, index) => (
          <div
            key={category.id}
            className={`category-chip${
              category.id === displayActiveId ? " is-active" : ""
            }${pulseId === category.id ? " is-pulsing" : ""}`}
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
        ))}
      </div>
      <div className="category-selector__hint">{hintText}</div>
    </div>
  );
}

export default CategorySelector;

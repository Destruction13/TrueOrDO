import { useEffect, useMemo, useRef, useState } from "react";

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

/**
 * FitTwoLineText
 * Подбирает размер шрифта так, чтобы текст помещался максимум в 2 строки.
 * Текст НЕ обрезается: если не влезает, шрифт уменьшается.
 */
export default function FitTwoLineText({
  text,
  className = "",
  maxFontSize = 20,
  minFontSize = 12,
  lineHeight = 1.15,
}) {
  const ref = useRef(null);
  const [fontSize, setFontSize] = useState(maxFontSize);

  const normalizedText = useMemo(() => (text == null ? "" : String(text)), [text]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const measureFits = (size) => {
      el.style.fontSize = `${size}px`;
      el.style.lineHeight = String(lineHeight);

      // Считаем максимум 2 строки по высоте line-height
      const computed = window.getComputedStyle(el);
      const lhPx = parseFloat(computed.lineHeight) || size * lineHeight;
      const maxHeight = lhPx * 2 + 0.5; // небольшой допуск
      return el.scrollHeight <= maxHeight;
    };

    const fit = () => {
      // Начинаем с maxFontSize и бинарным поиском уменьшаем до тех пор, пока не влезет
      let lo = minFontSize;
      let hi = maxFontSize;
      let best = minFontSize;

      // Быстрый выход
      if (measureFits(maxFontSize)) {
        setFontSize(maxFontSize);
        return;
      }

      // Бинарный поиск по целым px
      while (lo <= hi) {
        const mid = Math.floor((lo + hi) / 2);
        if (measureFits(mid)) {
          best = mid;
          lo = mid + 1;
        } else {
          hi = mid - 1;
        }
      }

      setFontSize(clamp(best, minFontSize, maxFontSize));
    };

    fit();

    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(() => fit());
      ro.observe(el);
      // также наблюдаем родителя, чтобы реагировать на изменение ширины контейнера
      if (el.parentElement) ro.observe(el.parentElement);
      return () => ro.disconnect();
    }

    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [normalizedText, maxFontSize, minFontSize, lineHeight]);

  return (
    <div
      ref={ref}
      className={className}
      style={{ fontSize: `${fontSize}px`, lineHeight }}
    >
      {normalizedText}
    </div>
  );
}

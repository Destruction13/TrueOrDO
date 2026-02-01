import { createPortal } from "react-dom";
import { useMemo } from "react";
import RadialCountdown from "./RadialCountdown";
import "./WaitingAcceptOverlay.css";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function mixColor(from, to, t) {
  const tt = clamp(t, 0, 1);
  const r = Math.round(lerp(from[0], to[0], tt));
  const g = Math.round(lerp(from[1], to[1], tt));
  const b = Math.round(lerp(from[2], to[2], tt));
  return `rgb(${r}, ${g}, ${b})`;
}

function WaitingAcceptOverlay({
  isOpen,
  targetName,
  taskText,
  secondsLeft,
  totalSeconds = 30,
}) {
  if (!isOpen || typeof document === "undefined") {
    return null;
  }

  const accent = useMemo(() => {
    const cyan = [46, 230, 255];
    const orange = [255, 170, 51];
    const red = [255, 88, 88];

    if (typeof secondsLeft !== "number" || typeof totalSeconds !== "number" || totalSeconds <= 0) {
      return "rgb(46, 230, 255)";
    }

    const progress = clamp(secondsLeft / totalSeconds, 0, 1);
    const dangerT = 1 - progress;

    if (dangerT < 0.65) {
      return mixColor(cyan, orange, dangerT / 0.65);
    }
    return mixColor(orange, red, (dangerT - 0.65) / 0.35);
  }, [secondsLeft, totalSeconds]);

  return createPortal(
    <div className="waiting-accept-overlay" role="presentation" style={{ "--wa-accent": accent }}>
      <div className="waiting-accept-overlay__backdrop" aria-hidden="true" />
      
      <div className="waiting-accept-overlay__content" role="status" aria-live="polite">
        {/* Пульсирующие круги */}
        <div className="waiting-accept-overlay__rings" aria-hidden="true">
          <div className="waiting-accept-overlay__ring waiting-accept-overlay__ring--1" />
          <div className="waiting-accept-overlay__ring waiting-accept-overlay__ring--2" />
          <div className="waiting-accept-overlay__ring waiting-accept-overlay__ring--3" />
        </div>

        {/* Имя игрока */}
        <div className="waiting-accept-overlay__player">
          <span className="waiting-accept-overlay__player-name">{targetName}</span>
          <span className="waiting-accept-overlay__player-label">решает...</span>
        </div>

        {/* Текст */}
        <div className="waiting-accept-overlay__text">
          <div className="waiting-accept-overlay__title">
            Ожидаем принятия задания
          </div>

          <div className="waiting-accept-overlay__task">
            <div className="waiting-accept-overlay__task-label">Задание</div>
            <div className="waiting-accept-overlay__task-text">
              {taskText && String(taskText).trim().length > 0
                ? taskText
                : "Задание загружается..."}
            </div>
          </div>

          <div className="waiting-accept-overlay__hint">
            Ждём, пока игрок примет задание или откажется.
          </div>
        </div>

        {/* Центрированный таймер */}
        {typeof secondsLeft === "number" ? (
          <div className="waiting-accept-overlay__countdown">
            <RadialCountdown secondsLeft={secondsLeft} totalSeconds={totalSeconds} />
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
}

export default WaitingAcceptOverlay;

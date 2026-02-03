import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import Button from "../ui/Button";
import { getEmotionColor } from "./emotionColors";
import FitTwoLineText from "./FitTwoLineText";
import "./EmotionalOvalTable.css";

export default function EmotionalOvalTable({
  players = [],
  meId,
  slots = [],
  onSlotClick,
  myVote,
  votesCountBySlotId,
  showVotes = false,
  facedown = false,
  myHand = [],
  onHandCardClick,
  selectedHandCard = null,
  centerWord = null,
  centerTimer = null,
  secretEmotion = null,
  hostId = null,
  centerAction = null,
  onEmptyHostClick = null,
  emptyHostLabel = "Начать игру",
}) {
  const [activeHandCard, setActiveHandCard] = useState(null);

  const handStripRef = useRef(null);
  const [handStripLayout, setHandStripLayout] = useState({ width: 0, padLeft: 0, padRight: 0 });

  // "Телефонная" версия по требованиям: всё что ниже 1200px.
  // Делаем реактивно (поворот экрана/resize).
  const [isPhoneLayout, setIsPhoneLayout] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth <= 1200 : false
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onResize = () => setIsPhoneLayout(window.innerWidth <= 1200);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Измеряем ширину контейнера руки на мобильных, чтобы считать дугу в px (и гарантировать, что всё влезает)
  useEffect(() => {
    if (!isPhoneLayout) return;
    const el = handStripRef.current;
    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      const styles = window.getComputedStyle(el);
      const padLeft = parseFloat(styles.paddingLeft || "0") || 0;
      const padRight = parseFloat(styles.paddingRight || "0") || 0;

      setHandStripLayout({
        width: Math.round(rect.width),
        padLeft: Math.round(padLeft),
        padRight: Math.round(padRight),
      });
    };

    update();

    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(() => update());
      ro.observe(el);
      return () => ro.disconnect();
    }

    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [isPhoneLayout]);
  // Вычисляем позиции игроков по эллипсу (текущий игрок всегда снизу)
  const playerPositions = useMemo(() => {
    if (!players || players.length === 0) return [];

    const total = players.length;
    
    // Найдем индекс текущего игрока
    const meIndex = players.findIndex((p) => p.id === meId);
    
    return players.map((player, i) => {
      const isMe = player.id === meId;
      
      if (isMe) {
        // Текущий игрок всегда внизу - строго по центру (90°)
        // Используем точное значение 50, а не вычисленное (избегаем погрешности float)
        const radiusY = 38;
        
        return {
          player,
          x: 50, // Строго по центру горизонтально
          y: 50 + radiusY, // 50 + 38 = 88
          isMe: true,
        };
      }
      
      // Остальные игроки распределяются по всему кругу, исключая позицию текущего игрока
      const othersCount = total - 1;
      const relativeIndex = i < meIndex ? i : i - 1; // Позиция среди других игроков
      
      // Распределяем по полному кругу (360°), начиная справа от текущего игрока
      // Текущий игрок на 90° (внизу), остальные распределяются равномерно по кругу
      // Начинаем с 90° и идём по часовой стрелке, пропуская позицию текущего игрока
      const totalAngle = 360;
      const angleStep = totalAngle / total; // Угловой шаг для каждого игрока
      const angle = 90 + angleStep * (relativeIndex + 1); // Начинаем со следующей позиции после текущего игрока

      const radians = (angle * Math.PI) / 180;

      // Эллипс: радиус по X больше, чем по Y (овал)
      const radiusX = 42; // % от центра
      const radiusY = 38;

      const x = 50 + radiusX * Math.cos(radians);
      const y = 50 + radiusY * Math.sin(radians);

      return {
        player,
        x,
        y,
        isMe: false,
      };
    });
  }, [players, meId]);

  // Вычисляем позиции карточек руки дугой под столом (повторяют форму овала)
  const handPositions = useMemo(() => {
    if (!myHand || myHand.length === 0) return [];

    const count = myHand.length;

    // Мобильная версия: дуга, но в px и от реальной ширины контейнера.
    // Позиционируем так, чтобы крайние карточки гарантированно помещались (учитываем ширину карточки).
    if (isPhoneLayout) {
      const gap = 4; // в px; визуально близко к тем значениям, что в CSS

      // Формула ширины карточки должна совпадать по смыслу с CSS.
      // Здесь считаем "логическую" ширину, чтобы правильно ограничить крайние позиции.
      const innerW = Math.max(0, handStripLayout.width - handStripLayout.padLeft - handStripLayout.padRight);

      const cardW = Math.max(
        30,
        Math.min(88, count > 0 ? (innerW - gap * (count - 1)) / count : 60)
      );

      const cardH = 112; // приблизительная высота для расчёта дуги (реальная управляется CSS)
      const arcDepth = Math.max(8, Math.min(16, Math.round(cardH * 0.12)));

      const usableW = Math.max(0, innerW - cardW);
      const maxX = usableW / 2;
      const radius = (maxX * maxX + arcDepth * arcDepth) / (2 * arcDepth || 1);

      // Центр по Y: размещаем чуть ниже верхней границы strip, чтобы дуга была ближе к столу
      const baseTop = cardH / 2 + 6;

      return myHand.map((emotion, i) => {
        const t = count > 1 ? i / (count - 1) : 0.5;
        const xOffset = (t - 0.5) * usableW;

        const underRoot = Math.max(0, radius * radius - xOffset * xOffset);
        const arcY = radius - Math.sqrt(underRoot);

        // left/top задаём в px внутри handStrip
        const left = handStripLayout.padLeft + (innerW / 2) + xOffset;
        const top = baseTop + arcY;

        const maxAngle = 10;
        const rotation = (t - 0.5) * 2 * maxAngle;
        const zIndex = count - Math.abs(i - (count - 1) / 2);

        return { emotion, rotation, left, top, index: i, zIndex };
      });
    }

    // Десктопная версия: дуга в процентах внутри стола.
    

    // Расстояние между центрами карточек (в % от ширины стола)
    // Подбирается под ширину карточек, чтобы рука выглядела плотной, но читабельной.
    const cardSpacing = 10.5;

    // Глубина дуги ("стрела" дуги): насколько крайние карточки ниже центральной.
    // Важно: именно дуга окружности (а не парабола), чтобы край не выглядел приподнятым.
    const arcDepth = 3;

    // Позиция игрока снизу фиксирована формулой из playerPositions:
    // centerY=50 + radiusY=38 => 88
    const baseGap = 22;
    const baseY = 88 + baseGap;

    const centerIndex = (count - 1) / 2;
    const halfSpan = count > 1 ? (count - 1) / 2 : 1;
    const maxX = halfSpan * cardSpacing;

    // Радиус окружности по хорде и стреле (sagitta):
    // R = (c^2 + s^2) / (2s), где c = maxX, s = arcDepth
    const radius = (maxX * maxX + arcDepth * arcDepth) / (2 * arcDepth);

    return myHand.map((emotion, i) => {
      const offset = i - centerIndex;
      const xOffset = offset * cardSpacing;

      // Горизонтальное положение — строгое центрирование.
      const x = 50 + xOffset;

      // Y по дуге окружности: y = R - sqrt(R^2 - x^2)
      // В центре (x=0) => 0, на краях (x=maxX) => arcDepth
      const underRoot = Math.max(0, radius * radius - xOffset * xOffset);
      const arcY = radius - Math.sqrt(underRoot);
      const y = baseY + arcY;

      // Поворот сохраняем, чтобы визуально повторять веер.
      const maxAngle = 12;
      const rotation = (offset / halfSpan) * maxAngle;

      // Z-index: центральные карточки поверх крайних.
      const zIndex = count - Math.abs(offset);

      return { emotion, rotation, x, y, index: i, zIndex };
    });
  }, [myHand, isPhoneLayout, handStripLayout]);

  return (
    <div className={`oval-table${secretEmotion ? " oval-table--leader-secret" : ""}`}>
      <div className="oval-table__surface">
        {/* Игроки по эллипсу */}
        {playerPositions.map(({ player, x, y, isMe }) => {
          const initial = player.name?.[0]?.toUpperCase() || "?";
          const isDisconnected = player.connectionStatus === "disconnected";
          const isPlayerHost = player.id === hostId;
          
          return (
            <div
              key={player.id}
              className={`oval-table__player ${isMe ? "oval-table__player--me" : ""} ${isDisconnected ? "oval-table__player--disconnected" : ""}`}
              style={{ left: `${x}%`, top: `${y}%` }}
            >
              <div className="oval-table__player-avatar-wrapper">
                <div className="oval-table__player-avatar">
                  {player.avatarUrl ? (
                    <img src={player.avatarUrl} alt="" />
                  ) : (
                    <span>{initial}</span>
                  )}
                </div>
                <div className={`oval-table__player-status-dot ${isDisconnected ? "offline" : "online"}`} />
                {isPlayerHost && <div className="oval-table__player-crown">👑</div>}
              </div>
              <div className="oval-table__player-name">{player.name}</div>
            </div>
          );
        })}

        {/* Центр стола — слово или карты */}
        <div className="oval-table__center">
          {/*
            Таймер:
            - когда показываем фразу (ход ведущего) — таймер должен быть привязан к блоку фразы сверху;
            - когда фразы нет (голосование) — таймер в центре стола поверх карточек.
          */}
          {centerTimer && !centerWord ? (
            <div className="oval-table__center-timer" aria-label="Таймер">
              {centerTimer}
            </div>
          ) : null}

          {centerWord ? (
            <div className="oval-table__phrase-stack">
              <div className="oval-table__word-display">
                {centerTimer ? (
                  <div className="oval-table__phrase-timer--overlay" aria-label="Таймер">
                    {centerTimer}
                  </div>
                ) : null}
                <FitTwoLineText
                  text={centerWord}
                  className="oval-table__word-value"
                  maxFontSize={20}
                  minFontSize={12}
                  lineHeight={1.15}
                />
              </div>

              {secretEmotion ? (
                <div className="oval-table__secret-emotion-plain" aria-label={`Ваша секретная эмоция: ${secretEmotion}`}>
                  {secretEmotion}
                </div>
              ) : null}
            </div>
          ) : centerAction ? (
            <div className="oval-table__center-action">
              {centerAction}
            </div>
          ) : slots.length === 0 && meId === hostId ? (
            onEmptyHostClick ? (
              <Button onClick={onEmptyHostClick}>{emptyHostLabel}</Button>
            ) : (
              <div className="oval-table__empty">{emptyHostLabel}</div>
            )
          ) : slots.length === 0 ? null : (
            <div className="oval-table__slots">
              {slots.map((slot, idx) => {
                const chosen = myVote === slot.slotId;
                const votes = votesCountBySlotId?.[slot.slotId] || 0;
                const slotColor = !facedown && slot.emotion ? getEmotionColor(slot.emotion) : null;

                // В reveal фазе facedown=true, но карты должны открываться по мере прихода emotion.
                // Поэтому "рубашка" определяется только наличием emotion.
                const isFaceDown = !slot.emotion;

                return (
                  <motion.button
                    key={slot.slotId}
                    type="button"
                    className={`oval-table__card ${chosen ? "oval-table__card--chosen" : ""} ${
                      isFaceDown ? "oval-table__card--facedown" : ""
                    }`}
                    style={
                      slotColor
                        ? {
                            '--emotion-rgb': slotColor.rgb,
                            '--emotion-hex': slotColor.hex,
                          }
                        : undefined
                    }
                    onClick={() => onSlotClick?.(slot.slotId)}
                    disabled={facedown || !onSlotClick}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.25, delay: idx * 0.03 }}
                    whileHover={!facedown ? { scale: 1.05, y: -4 } : {}}
                    whileTap={!facedown ? { scale: 0.97 } : {}}
                  >
                    <motion.div
                      className="oval-table__card-inner"
                      initial={false}
                      animate={{ rotateY: isFaceDown ? 0 : 180 }}
                      transition={{ type: "spring", stiffness: 260, damping: 22, mass: 0.9 }}
                    >
                      <div className="oval-table__card-face oval-table__card-face--back">
                        <div className="oval-table__card-backmark">🂠</div>
                      </div>

                      <div className="oval-table__card-face oval-table__card-face--front">
                        <div className="oval-table__card-emotion">{slot.emotion || ""}</div>
                        {showVotes && !facedown && (
                          <div className="oval-table__card-votes">
                            {votes > 0 ? `${votes} 🗳` : ""}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>

        {/* Рука под столом (десктоп: дуга внутри стола) */}
        {!isPhoneLayout && myHand && myHand.length > 0 && (
          <div className="oval-table__hand">
            {handPositions.map(({ emotion, rotation, x, y, index, zIndex }) => {
              const isSelected = selectedHandCard === emotion;
              const isActive = activeHandCard === emotion;
              const isRaised = isSelected || isActive;
              const color = emotion ? getEmotionColor(emotion) : null;

              const baseZ = isRaised ? 2000 : zIndex;

              return (
                <motion.button
                  key={index}
                  type="button"
                  className={`oval-table__hand-card ${isRaised ? "oval-table__hand-card--raised" : ""} ${
                    isSelected ? "oval-table__hand-card--selected" : ""
                  }`}
                  style={{
                    left: `${x}%`,
                    top: `${y}%`,
                    zIndex: baseZ,
                    ...(color
                      ? {
                          '--emotion-rgb': color.rgb,
                          '--emotion-hex': color.hex,
                        }
                      : {}),
                  }}
                  onClick={() => {
                    setActiveHandCard((prev) => (prev === emotion ? null : emotion));
                    onHandCardClick?.(emotion);
                  }}
                  initial={{ opacity: 0, scale: 0.9, x: "-50%", y: "-50%", rotate: rotation }}
                  animate={{
                    opacity: 1,
                    scale: isRaised ? 1.06 : 1,
                    x: "-50%",
                    y: isRaised ? "-72%" : "-50%",
                    rotate: rotation,
                  }}
                  transition={{ duration: 0.22, delay: index * 0.04 }}
                  whileHover={{ scale: isRaised ? 1.06 : 1.05 }}
                  whileTap={{ scale: isRaised ? 1.04 : 0.98 }}
                >
                  <div className="oval-table__hand-card-text">{emotion}</div>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>

      {/* Телефонная версия (<1200): рука отдельным блоком в потоке, адаптивная по размеру */}
      {isPhoneLayout && myHand && myHand.length > 0 && (
        <div
          ref={handStripRef}
          className="oval-table__hand-strip oval-table__hand-strip--arc"
          role="group"
          aria-label="Ваша рука"
          style={{ "--hand-count": myHand.length }}
        >
          {handPositions.map(({ emotion, rotation, left, top, index, zIndex }) => {
            const isSelected = selectedHandCard === emotion;
            const isActive = activeHandCard === emotion;
            const isRaised = isSelected || isActive;
            const color = emotion ? getEmotionColor(emotion) : null;

            const baseZ = isRaised ? 2000 : zIndex;

            return (
              <motion.button
                key={index}
                type="button"
                className={`oval-table__hand-card oval-table__hand-card--phone oval-table__hand-card--phone-arc ${
                  isRaised ? "oval-table__hand-card--raised" : ""
                } ${isSelected ? "oval-table__hand-card--selected" : ""}`}
                style={
                  color
                    ? {
                        left: `${left}px`,
                        top: `${top}px`,
                        zIndex: baseZ,
                        '--emotion-rgb': color.rgb,
                        '--emotion-hex': color.hex,
                      }
                    : { left: `${left}px`, top: `${top}px`, zIndex: baseZ }
                }
                onClick={() => {
                  setActiveHandCard((prev) => (prev === emotion ? null : emotion));
                  onHandCardClick?.(emotion);
                }}
                initial={{ opacity: 0, scale: 0.92, x: "-50%", y: "-50%", rotate: rotation }}
                animate={{
                  opacity: 1,
                  scale: isRaised ? 1.06 : 1,
                  x: "-50%",
                  y: isRaised ? "-68%" : "-50%",
                  rotate: rotation,
                }}
                transition={{ duration: 0.2, delay: index * 0.03 }}
                whileTap={{ scale: isRaised ? 1.04 : 0.98 }}
              >
                <div className="oval-table__hand-card-text">{emotion}</div>
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
}

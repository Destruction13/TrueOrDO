import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
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
  canVote = true,
  votesCountBySlotId,
  showVotes = false,
  facedown = false,
  revealStartedAt = null,
  myHand = [],
  onHandCardClick,
  selectedHandCard = null,
  centerWord = null,
  centerTimer = null,
  secretEmotion = null,
  surfaceRef = null, // Ref для измерения высоты поверхности стола
  hostId = null,
  centerAction = null,
  onEmptyHostClick = null,
  emptyHostLabel = "Начать игру",
  phase = null,
  isHost = false,
  tableCleared = false,
  round = 0,
}) {
  // activeHandCard — карточка, которую пользователь "выбрал" (клик/тап) и которая должна подсветиться
  const [activeHandCard, setActiveHandCard] = useState(null);
  // hoveredHandCard — карточка под курсором на desktop (поднимаем как при выборе, но без подсветки)
  const [hoveredHandCard, setHoveredHandCard] = useState(null);

  // Отслеживаем ширину экрана для адаптивного cardSpacing
  const [isSmallScreen, setIsSmallScreen] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth <= 1200 : false
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onResize = () => setIsSmallScreen(window.innerWidth <= 1200);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const isCoarsePointer =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(pointer: coarse)").matches;


  // Локальное управление reveal анимацией по таймеру
  // Тайминги: 2 сек задержка после появления карт, затем по 0.5 сек на карту
  const REVEAL_INITIAL_DELAY = 2000; // 2 секунды до начала переворота
  const REVEAL_CARD_INTERVAL = 500; // 0.5 секунды между картами

  // Храним Set раскрытых индексов карт, чтобы карта не "закрывалась" обратно
  const [revealedIndices, setRevealedIndices] = useState(new Set());
  // Локальное время начала анимации (после первого рендера)
  const [localAnimationStart, setLocalAnimationStart] = useState(null);
  // Флаг, что все карты перевернулись (для активации кликов)
  const [allCardsRevealed, setAllCardsRevealed] = useState(false);
  // Отслеживаем предыдущий раунд для сброса анимации
  const [prevRound, setPrevRound] = useState(round);
  // Флаг, что карты на столе уже появились (для анимации появления)
  const [cardsAppeared, setCardsAppeared] = useState(false);

  // Сброс состояния при смене раунда
  useEffect(() => {
    if (round !== prevRound) {
      setPrevRound(round);
      setRevealedIndices(new Set());
      setLocalAnimationStart(null);
      setAllCardsRevealed(false);
      setCardsAppeared(false);
    }
  }, [round, prevRound]);

  // При появлении карт на столе (переход submit → reveal) запускаем анимацию
  useEffect(() => {
    // Если карты появились на столе и ещё не начали анимацию
    const isCardPhase = phase === "reveal" || phase === "vote" || phase === "results";
    
    if (slots.length > 0 && !cardsAppeared && isCardPhase) {
      setCardsAppeared(true);
      
      // Если уже в фазе vote или results — карты должны быть сразу раскрыты (мы "опоздали" к анимации)
      if (phase === "vote" || phase === "results") {
        // Сразу раскрываем все карты
        const allIndices = new Set();
        for (let i = 0; i < slots.length; i++) {
          allIndices.add(i);
        }
        setRevealedIndices(allIndices);
        setAllCardsRevealed(true);
        return;
      }
      
      // Ждём 1 кадр, чтобы карточки отрендерились рубашкой вверх,
      // затем запускаем локальный таймер анимации
      const frameId = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setLocalAnimationStart(Date.now());
        });
      });

      return () => cancelAnimationFrame(frameId);
    }
    
    // Если карты уже появились, но localAnimationStart ещё не установлен — запускаем
    if (slots.length > 0 && cardsAppeared && !localAnimationStart && isCardPhase && phase === "reveal") {
      setLocalAnimationStart(Date.now());
    }
  }, [slots.length, cardsAppeared, phase, localAnimationStart]);

  // Сброс при очистке стола (следующий раунд)
  useEffect(() => {
    if (slots.length === 0 && cardsAppeared) {
      // Стол очистился — сбрасываем состояние для следующего раунда
      setCardsAppeared(false);
      setRevealedIndices(new Set());
      setLocalAnimationStart(null);
      setAllCardsRevealed(false);
    }
  }, [slots.length, cardsAppeared]);

  useEffect(() => {
    if (!localAnimationStart) return;

    const totalCards = slots.length;
    if (totalCards === 0) return;

    // Вычисляем, какие карты должны быть раскрыты к текущему моменту
    const updateRevealedIndices = () => {
      const elapsed = Date.now() - localAnimationStart;
      
      // Задержка перед началом переворота
      if (elapsed < REVEAL_INITIAL_DELAY) {
        return;
      }
      
      const timeSinceRevealStart = elapsed - REVEAL_INITIAL_DELAY;
      
      // Сколько карт должно быть раскрыто
      const targetCount = Math.min(
        totalCards,
        Math.floor(timeSinceRevealStart / REVEAL_CARD_INTERVAL) + 1
      );
      
      // Добавляем новые индексы в Set (карты не закрываются обратно)
      setRevealedIndices((prev) => {
        if (prev.size >= targetCount) return prev;
        const next = new Set(prev);
        for (let i = prev.size; i < targetCount; i++) {
          next.add(i);
        }
        return next;
      });
      
      // Проверяем, все ли карты перевернулись
      if (targetCount >= totalCards) {
        setAllCardsRevealed(true);
      }
    };

    // Запускаем сразу
    updateRevealedIndices();

    // Обновляем каждые 100ms для плавности
    const interval = setInterval(updateRevealedIndices, 100);
    return () => clearInterval(interval);
  }, [localAnimationStart, slots.length]);

  // Вычисляем позиции игроков по эллипсу (текущий игрок всегда снизу)
  const playerPositions = useMemo(() => {
    if (!players || players.length === 0) return [];

    // Фильтруем: исключаем left и kicked игроков
    const visiblePlayers = players.filter(
      (p) => p.connectionStatus !== "left" && p.connectionStatus !== "kicked"
    );

    if (visiblePlayers.length === 0) return [];

    const total = visiblePlayers.length;
    
    // Найдем индекс текущего игрока
    const meIndex = visiblePlayers.findIndex((p) => p.id === meId);
    
    return visiblePlayers.map((player, i) => {
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

    // Дуга в процентах внутри стола — единая логика для всех разрешений.

    // Расстояние между центрами карточек (в % от ширины стола)
    // На экранах ≤1200px увеличиваем spacing, чтобы уменьшить боковые отступы на 50%
    const cardSpacing = isSmallScreen ? 12.4 : 10.5;

    // Глубина дуги ("стрела" дуги): насколько крайние карточки ниже центральной.
    // Важно: именно дуга окружности (а не парабола), чтобы край не выглядел приподнятым.
    const arcDepth = 3;

    // Позиция игрока снизу фиксирована формулой из playerPositions:
    // centerY=50 + radiusY=38 => 88
    // Уменьшаем отступ, чтобы карточки были ближе к столу (допустимо касание)
    const baseGap = 12;
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
  }, [myHand, isSmallScreen]);

  return (
    <div className={`oval-table${secretEmotion ? " oval-table--leader-secret" : ""}${(!myHand || myHand.length === 0 || phase !== "submit" || selectedHandCard) ? " oval-table--no-hand" : ""}`}>
      <div className="oval-table__surface" ref={surfaceRef}>
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
          <AnimatePresence mode="wait">
            {/* Фаза lobby: кнопка "Начать игру" или ожидание */}
            {phase === "lobby" && (
              <motion.div
                key="center-lobby"
                className="oval-table__center-content"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
              >
                {centerAction ? (
                  <div className="oval-table__center-action">
                    {centerAction}
                  </div>
                ) : isHost && onEmptyHostClick ? (
                  <Button onClick={onEmptyHostClick}>{emptyHostLabel}</Button>
                ) : null}
              </motion.div>
            )}

            {/* Фаза submit: слово и таймер */}
            {phase === "submit" && centerWord && (
              <motion.div
                key="center-submit"
                className="oval-table__center-content"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
              >
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
                      minFontSize={6}
                      lineHeight={1.15}
                    />
                  </div>

                  {secretEmotion ? (
                    <div className="oval-table__secret-emotion-plain" aria-label={`Ваша секретная эмоция: ${secretEmotion}`}>
                      {secretEmotion}
                    </div>
                  ) : selectedHandCard ? (
                    <motion.div 
                      className="oval-table__selected-emotion-plain" 
                      aria-label={`Ваш выбор: ${selectedHandCard}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      {selectedHandCard}
                    </motion.div>
                  ) : null}
                </div>
              </motion.div>
            )}

            {/* Фазы reveal/vote/results: карты на столе */}
            {(phase === "reveal" || phase === "vote" || phase === "results") && slots.length > 0 && (
              <motion.div
                key="center-cards"
                className="oval-table__center-content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="oval-table__slots" style={{ '--card-count': slots.length }}>
                  <AnimatePresence>
                    {slots.map((slot, idx) => {
                      const chosen = myVote === slot.slotId;
                      const votes = votesCountBySlotId?.[slot.slotId] || 0;
                      
                      // Определяем, раскрыта ли карта на основе локальной анимации
                      // Карта facedown пока не запущена анимация переворота
                      const isRevealedByTimer = revealedIndices.has(idx);
                      const isFaceDown = !isRevealedByTimer;
                      
                      // Цвет применяем ВСЕГДА (даже для facedown), чтобы стили были готовы к моменту переворота
                      const slotColor = slot.emotion ? getEmotionColor(slot.emotion) : null;
                      
                      // Можно ли кликать: когда все карты перевернулись ИЛИ в фазе vote, 
                      // и только если игрок может голосовать (сделал submission)
                      const isClickable = (allCardsRevealed || phase === "vote") && onSlotClick && phase !== "results" && canVote;

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
                          disabled={!isClickable}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          transition={{ duration: 0.3, ease: "easeOut", delay: idx * 0.05 }}
                          whileHover={isClickable ? { scale: 1.05 } : {}}
                          whileTap={isClickable ? { scale: 0.98 } : {}}
                        >
                          <motion.div
                            className="oval-table__card-inner"
                            initial={{ rotateY: 0 }}
                            animate={{
                              rotateY: isFaceDown ? 0 : 180,
                            }}
                            transition={{
                              duration: 0.6,
                              ease: [0.4, 0, 0.2, 1],
                            }}
                          >
                            <div className="oval-table__card-face oval-table__card-face--back" />

                            <div className="oval-table__card-face oval-table__card-face--front">
                              <div className="oval-table__card-emotion">{slot.emotion || ""}</div>
                              {showVotes && !isFaceDown && (
                                <div className="oval-table__card-votes">
                                  {votes > 0 ? `${votes} 🗳` : ""}
                                </div>
                              )}
                            </div>
                          </motion.div>
                        </motion.button>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}

            {/* Фазы results/no_contest с очищенным столом: кнопка "Следующий раунд" */}
            {((phase === "results" || phase === "no_contest") && tableCleared) && (
              <motion.div
                key="center-next-round"
                className="oval-table__center-content"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
              >
                {centerAction ? (
                  <div className="oval-table__center-action">
                    {centerAction}
                  </div>
                ) : null}
              </motion.div>
            )}

            {/* Фаза ended: пустой стол */}
            {phase === "ended" && (
              <motion.div
                key="center-ended"
                className="oval-table__center-content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Рука под столом (дуга внутри стола) — только в фазе submit и пока не выбрана карточка */}
        {phase === "submit" && myHand && myHand.length > 0 && !selectedHandCard && (
          <div className="oval-table__hand">
            {handPositions.map(({ emotion, rotation, x, y, index, zIndex }) => {
              const isSelected = selectedHandCard === emotion;
              const isActive = activeHandCard === emotion;
              const isHovered = hoveredHandCard === emotion;
              const isRaised = isSelected || isActive || isHovered;
              const color = emotion ? getEmotionColor(emotion) : null;

              const baseZ = isRaised ? 2000 : zIndex;

              return (
                <motion.button
                  key={`${emotion}:${index}`}
                  type="button"
                  className={`oval-table__hand-card ${isRaised ? "oval-table__hand-card--raised" : ""} ${
                    isSelected ? "oval-table__hand-card--selected" : ""
                  } ${isActive ? "oval-table__hand-card--active" : ""}`}
                  style={{
                    left: `${x}%`,
                    top: `${y}%`,
                    rotate: `${rotation}deg`,
                    touchAction: 'none', // Важно для drag на мобильных
                    ...(color
                      ? {
                          '--emotion-rgb': color.rgb,
                          '--emotion-hex': color.hex,
                        }
                      : {}),
                  }}
                  onMouseEnter={() => setHoveredHandCard(emotion)}
                  onMouseLeave={() => setHoveredHandCard((prev) => (prev === emotion ? null : prev))}
                  onClick={() => {
                    // Клик поднимает карту (активирует для drag)
                    setActiveHandCard((prev) => (prev === emotion ? null : emotion));
                  }}
                  // Drag-механика для выбора карточки (работает на desktop и mobile)
                  drag="y"
                  dragConstraints={{ top: -150, bottom: 0 }}
                  dragElastic={0.3}
                  onDragEnd={(e, info) => {
                    // Если потянули вверх достаточно далеко — выбираем карту
                    if (info.offset.y < -60) {
                      onHandCardClick?.(emotion);
                      setActiveHandCard(null);
                    }
                  }}
                  initial={false}
                  animate={{
                    y: isRaised ? -30 : 0,
                    scale: isRaised ? 1.06 : 1,
                    zIndex: baseZ,
                  }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  whileTap={{ scale: isRaised ? 1.04 : 0.98 }}
                  whileDrag={{ scale: 1.1, zIndex: 3000 }}
                >
                  <div className="oval-table__hand-card-text">{emotion}</div>
                  
                  {/* Подсказка для drag — показываем только для активной карты */}
                  {isActive && (
                    <motion.div
                      className="oval-table__hand-card-hint"
                      initial={{ opacity: 1 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      style={{
                        position: 'absolute',
                        bottom: 'calc(100% + 5px)',
                        left: 0,
                        right: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        pointerEvents: 'none',
                        zIndex: 10,
                        height: '50px',
                        overflow: 'visible',
                      }}
                    >
                      {/* Стрелка-шеврон через CSS, поднимается снизу вверх 3 раза */}
                      <motion.div
                        style={{
                          position: 'absolute',
                          width: '75%',
                          height: '12px',
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                        initial={{ y: 12, opacity: 0 }}
                        animate={{ 
                          y: [12, 5, 5],
                          opacity: [0, 1, 0]
                        }}
                        transition={{ 
                          duration: 1.8, 
                          repeat: 2, 
                          repeatDelay: 0.8,
                          ease: "easeInOut",
                        }}
                      >
                        {/* Шеврон через псевдо-элементы (две линии под углом) — смотрит ВВЕРХ */}
                        <div
                          style={{
                            width: '100%',
                            height: '100%',
                            position: 'relative',
                          }}
                        >
                          <div
                            style={{
                              position: 'absolute',
                              left: '50%',
                              top: 0,
                              width: '50%',
                              height: '3px',
                              background: '#00d4ff',
                              transformOrigin: 'left center',
                              transform: 'rotate(35deg)',
                              boxShadow: '0 0 10px rgba(0, 212, 255, 0.9)',
                              borderRadius: '2px',
                            }}
                          />
                          <div
                            style={{
                              position: 'absolute',
                              right: '50%',
                              top: 0,
                              width: '50%',
                              height: '3px',
                              background: '#00d4ff',
                              transformOrigin: 'right center',
                              transform: 'rotate(-35deg)',
                              boxShadow: '0 0 10px rgba(0, 212, 255, 0.9)',
                              borderRadius: '2px',
                            }}
                          />
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </motion.button>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}

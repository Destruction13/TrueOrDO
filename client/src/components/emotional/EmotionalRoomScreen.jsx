import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Button from "../ui/Button";
import RadialCountdown from "../ui/RadialCountdown";
import EmotionalSettingsModal from "./EmotionalSettingsModal";
import EmotionalRulesModal from "./EmotionalRulesModal";
import EmotionalOvalTable from "./EmotionalOvalTable";
import TextShimmer from "../alias/TextShimmer";
import { PlayersPanel, RoundReport } from "./EmotionalSidePanels";
import EmotionalLeaderboardModal from "./EmotionalLeaderboardModal";
import "../codenames/CodenamesRoomScreen.css";
import "./EmotionalRoomScreen.css";

// Компонент для отладки - показывает размеры экрана и состояние
function DebugPanel({ room, gameState, meId }) {
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  const panelRef = useRef(null);
  const [panelWidth, setPanelWidth] = useState(0);

  useEffect(() => {
    const handleResize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Измеряем ширину .emotional-room__panel
  useEffect(() => {
    const measurePanel = () => {
      const panel = document.querySelector('.emotional-room__panel');
      if (panel) {
        setPanelWidth(panel.getBoundingClientRect().width);
      }
    };
    measurePanel();
    window.addEventListener('resize', measurePanel);
    return () => window.removeEventListener('resize', measurePanel);
  }, []);

  return (
    <div style={{ 
      position: 'fixed', top: 10, right: 10, 
      background: 'rgba(0,0,0,0.95)', color: 'lime', 
      padding: 12, fontSize: 13, zIndex: 999999, borderRadius: 8,
      fontFamily: 'monospace', lineHeight: 1.6,
      border: '2px solid lime',
      pointerEvents: 'none'
    }}>
      <div style={{ color: '#ff0', fontWeight: 'bold' }}>Screen: {dimensions.width} × {dimensions.height}</div>
      <div style={{ color: '#0ff' }}>Panel: {Math.round(panelWidth)}px</div>
      <div>phase: {room?.phase || 'undefined'}</div>
      <div>table: {gameState?.table?.length ?? 'n/a'}</div>
      <div>hand: {gameState?.my?.hand?.length ?? 'n/a'}</div>
      <div>meId: {meId?.slice(-6) || 'n/a'}</div>
    </div>
  );
}

export default function EmotionalRoomScreen({ connected, error, meId, gameState, actions }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();

  const room = gameState?.room;
  const players = gameState?.players || [];

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(true);
  const [nowMs, setNowMs] = useState(Date.now());
  const [deckEmptyError, setDeckEmptyError] = useState(false);
  const [reshuffledNotice, setReshuffledNotice] = useState(false);
  
  // Ref и состояние для синхронизации высоты боковых панелей с овальным столом
  const tableRef = useRef(null);
  const [tableHeight, setTableHeight] = useState(0);
  
  // Разница между серверным и клиентским временем для корректных таймеров
  // serverTimeOffset = serverNow - clientNow (положительный = сервер впереди)
  const [serverTimeOffset, setServerTimeOffset] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  // Обновляем offset при получении нового serverNow
  useEffect(() => {
    if (gameState?.serverNow) {
      const clientNow = Date.now();
      const newOffset = gameState.serverNow - clientNow;
      // Используем скользящее среднее для сглаживания колебаний сети
      setServerTimeOffset((prev) => {
        // Если разница слишком большая (> 5 сек), обновляем сразу
        if (Math.abs(newOffset - prev) > 5000) return newOffset;
        // Иначе плавно приближаемся (80% старого + 20% нового)
        return Math.round(prev * 0.8 + newOffset * 0.2);
      });
    }
  }, [gameState?.serverNow]);

  // Скорректированное "серверное" время для расчёта таймеров
  const adjustedNowMs = nowMs + serverTimeOffset;

  // Показываем лидерборд заново при переходе в фазу ended
  useEffect(() => {
    if (room?.phase === "ended") {
      setShowLeaderboard(true);
    }
  }, [room?.phase]);

  // Сбрасываем ошибку пустой колоды при смене фазы
  useEffect(() => {
    if (room?.phase === "submit") {
      setDeckEmptyError(false);
    }
  }, [room?.phase]);

  // Автоматическое скрытие уведомления о перетасовке через 5 секунд
  useEffect(() => {
    if (reshuffledNotice) {
      const timer = setTimeout(() => setReshuffledNotice(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [reshuffledNotice]);

  // Отслеживаем высоту овального стола для синхронизации боковых панелей
  useEffect(() => {
    const el = tableRef.current;
    if (!el) return;

    const updateHeight = () => {
      const rect = el.getBoundingClientRect();
      setTableHeight(rect.height);
    };

    updateHeight();

    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(updateHeight);
      ro.observe(el);
      return () => ro.disconnect();
    }

    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, []);

  const me = useMemo(() => players.find((p) => p.id === meId), [players, meId]);
  const isHost = room?.hostId && room.hostId === meId;

  const leader = useMemo(
    () => players.find((p) => p.id === room?.leaderId),
    [players, room?.leaderId]
  );

  const copyRoomLink = () => {
    if (!room?.code) return;
    navigator.clipboard.writeText(`${window.location.origin}/emotional/${room.code}`);
  };

  return (
    <div className="emotional-room">
      <header className="codenames-header-new">
        <div className="codenames-header-new__left">
          <div className="room-code-block" onClick={copyRoomLink} title="Скопировать ссылку">
            <div className="room-code-label">Код комнаты</div>
            <div className="room-code">{room?.code}</div>
          </div>

          <button className="codenames-header-btn" onClick={() => setShowRulesModal(true)} title="Правила">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </button>

          {isHost && (
            <button className="codenames-header-btn" onClick={() => setSettingsOpen(true)} title="Настройки">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          )}

          {/* Кнопка паузы - только для хоста во время игры */}
          {isHost && room?.status === "playing" && (
            <button 
              className={`codenames-header-btn ${room?.isPaused ? "codenames-header-btn--paused" : ""}`}
              onClick={() => room?.isPaused ? actions.resumeGame() : actions.pauseGame()}
              title={room?.isPaused ? "Продолжить" : "Пауза"}
            >
              {room?.isPaused ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
                </svg>
              )}
            </button>
          )}

          <button className="codenames-header-btn codenames-header-btn--exit" onClick={() => setShowLeaveConfirm(true)} title="Выйти">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>

        <div className="codenames-header-new__center">
          {room?.isPaused ? (
            <div className="codenames-header-turn__timer codenames-header-turn__timer--paused">
              Пауза
            </div>
          ) : room?.phaseEndsAt && room?.phase === "vote" ? (
            <div className="emotional-header-timer">
              <RadialCountdown
                secondsLeft={(room.phaseEndsAt - adjustedNowMs) / 1000}
                totalSeconds={30}
                size={44}
                strokeWidth={4}
                variant="full"
                showLabel={false}
              />
            </div>
          ) : null}
        </div>

        <div className="codenames-header-new__right">
          {isAuthenticated ? (
            <button className="codenames-header-profile__btn" onClick={() => navigate("/profile")} title="Профиль">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="codenames-header-profile__avatar" />
              ) : (
                <span className="codenames-header-profile__placeholder">
                  {(user?.nickname || user?.email)?.[0]?.toUpperCase() || "?"}
                </span>
              )}
            </button>
          ) : (
            <button
              className="codenames-header-btn codenames-header-btn--login"
              onClick={() => navigate("/login", { state: { backgroundLocation: location } })}
            >
              Войти
            </button>
          )}
        </div>
      </header>

      {error ? <div className="emotional-room__error">{error}</div> : null}

      {/* DEV: временный лог для отладки */}
      <DebugPanel room={room} gameState={gameState} meId={meId} />

      <AnimatePresence>
        {showLeaveConfirm && (
          <motion.div
            className="codenames-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowLeaveConfirm(false)}
          >
            <motion.div
              className="codenames-modal"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3>Покинуть комнату?</h3>
              <p>Вы уверены?</p>
              <div className="codenames-modal-buttons">
                <Button variant="ghost" onClick={() => setShowLeaveConfirm(false)}>
                  Отмена
                </Button>
                <Button variant="danger" onClick={actions.leaveRoom}>
                  Выйти
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <section className="emotional-room__panel">
        <motion.div 
          className="emotional-room__game-card emotional-room__main-container"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="emotional-main-layout">
          {/* Левая панель: игроки (desktop) */}
          <div 
            className="emotional-side-left"
            style={tableHeight > 0 ? { height: tableHeight, maxHeight: tableHeight } : undefined}
          >
            <PlayersPanel
              players={players}
              scores={gameState?.scores || {}}
              meId={meId}
              hostId={room?.hostId}
              leaderId={room?.leaderId}
            />
          </div>

          {/* Центр: игровая зона */}
          <div className="emotional-main-layout__center">

        <div className="emotional-room__game" ref={tableRef}>
          {/* Единый EmotionalOvalTable без перемонтирования между фазами */}
          <EmotionalOvalTable
            players={players}
            meId={meId}
            phase={room?.phase}
            slots={gameState?.table || []}
            revealStartedAt={gameState?.revealStartedAt}
            onSlotClick={(slotId) => actions?.castVote?.(slotId)}
            myVote={gameState?.my?.vote}
            canVote={
              // Игрок может голосовать если он не ведущий и сделал submission (не skip), и игра не на паузе
              room?.leaderId !== meId &&
              gameState?.my?.submission &&
              gameState?.my?.submission !== "skip" &&
              !room?.isPaused
            }
            votesCountBySlotId={gameState?.votesCountBySlotId}
            showVotes={room?.phase === "vote" || room?.phase === "results"}
            facedown={false}
            myHand={
              (room?.phase === "submit" && room?.leaderId !== meId)
                ? (gameState?.my?.hand || [])
                : []
            }
            onHandCardClick={
              (room?.phase === "submit" && room?.leaderId !== meId && !room?.isPaused)
                ? ((emotion) => actions?.submitEmotion?.(emotion))
                : null
            }
            selectedHandCard={
              room?.phase === "submit" && gameState?.my?.submission !== "skip"
                ? gameState?.my?.submission
                : null
            }
            centerWord={room?.phase === "submit" ? room?.currentWord : null}
            secretEmotion={
              room?.phase === "submit" && room?.leaderId === meId
                ? gameState?.my?.secretEmotion
                : null
            }
            hostId={room?.hostId}
            isHost={isHost}
            centerTimer={
              room?.phase === "submit" && room?.phaseEndsAt ? (
                room?.isPaused ? (
                  <div className="emotional-pause-indicator">Пауза</div>
                ) : (
                  <RadialCountdown
                    secondsLeft={(room.phaseEndsAt - adjustedNowMs) / 1000}
                    totalSeconds={60}
                    size={80}
                    strokeWidth={6}
                    variant="semi"
                    showLabel={false}
                  />
                )
              ) : null
            }
            isPaused={room?.isPaused}
            centerAction={
              room?.phase === "lobby" ? (
                isHost ? null : (
                  <TextShimmer as="div" className="emotional-room__wait-center" duration={2.2} spread={2}>
                    Ожидание начала игры
                  </TextShimmer>
                )
              ) : (room?.phase === "results" || room?.phase === "no_contest") && room?.tableCleared ? (
                isHost ? (
                  <div className="emotional-room__center-actions">
                    {deckEmptyError ? (
                      <>
                        <div className="emotional-room__deck-empty-notice">
                          Колода закончилась
                        </div>
                        <Button 
                          onClick={() => {
                            actions?.reshuffleDeck?.((result) => {
                              if (result?.ok) {
                                setReshuffledNotice(true);
                                setDeckEmptyError(false);
                              }
                            });
                          }} 
                          disabled={!connected}
                        >
                          Перетасовать колоду
                        </Button>
                      </>
                    ) : (
                      <Button 
                        onClick={() => {
                          actions?.nextRound?.((result) => {
                            if (result?.deckEmpty) {
                              setDeckEmptyError(true);
                            }
                          });
                        }} 
                        disabled={!connected}
                      >
                        Следующий раунд
                      </Button>
                    )}
                    {reshuffledNotice && (
                      <div className="emotional-room__reshuffled-notice">
                        Колода перетасована!
                      </div>
                    )}
                  </div>
                ) : (
                  <TextShimmer as="div" className="emotional-room__wait-center" duration={2.2} spread={2}>
                    Ожидание хоста
                  </TextShimmer>
                )
              ) : null
            }
            onEmptyHostClick={room?.phase === "lobby" ? () => actions?.startGame?.() : null}
            emptyHostLabel="Начать игру"
            tableCleared={room?.tableCleared}
            round={room?.round}
          />
        </div>

          </div>

          {/* Правая панель: отчёт игры (desktop) */}
          <div 
            className="emotional-side-right"
            style={tableHeight > 0 ? { height: tableHeight, maxHeight: tableHeight } : undefined}
          >
            <RoundReport
              roundHistory={gameState?.roundHistory || []}
              phase={room?.phase}
              isDesktop={true}
              players={players}
            />
          </div>
        </div>

          {/* Мобильные панели внизу */}
          <div className="emotional-bottom-panels">
            <PlayersPanel
              players={players}
              scores={gameState?.scores || {}}
              meId={meId}
              hostId={room?.hostId}
              leaderId={room?.leaderId}
            />
            <RoundReport
              roundHistory={gameState?.roundHistory || []}
              phase={room?.phase}
              isDesktop={false}
              players={players}
            />
          </div>
        </motion.div>
      </section>

      <EmotionalRulesModal isOpen={showRulesModal} onClose={() => setShowRulesModal(false)} />

      <EmotionalSettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={room?.settings}
        isHost={isHost}
        onSave={actions?.updateSettings}
        onNewGame={actions?.newGame}
        players={players}
        meId={meId}
        hostId={room?.hostId}
        onKickPlayer={actions?.kickPlayer}
      />

      <EmotionalLeaderboardModal
        isOpen={room?.phase === "ended" && showLeaderboard}
        players={players}
        scores={gameState?.scores || {}}
        meId={meId}
        isHost={isHost}
        onNewGame={() => actions?.newGame?.()}
        onClose={() => setShowLeaderboard(false)}
        targetScore={room?.settings?.targetScore || 15}
      />
    </div>
  );
}


import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Button from "../ui/Button";
import RadialCountdown from "../ui/RadialCountdown";
import EmotionalSettingsModal from "./EmotionalSettingsModal";
import EmotionalRulesModal from "./EmotionalRulesModal";
import EmotionalOvalTable from "./EmotionalOvalTable";
import EmotionalShaderBackground from "./EmotionalShaderBackground";
import "../codenames/CodenamesRoomScreen.css";
import "./EmotionalRoomScreen.css";

export default function EmotionalRoomScreen({ connected, error, meId, gameState, actions }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();

  const room = gameState?.room;
  const players = gameState?.players || [];

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [nowMs, setNowMs] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 250);
    return () => clearInterval(t);
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
      <EmotionalShaderBackground />
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
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-.76 1.65 1.65 0 0 0 .2-1.82l-.03-.06a2 2 0 0 1 .73-2.73 2 2 0 0 1 2.73.73l.03.06a1.65 1.65 0 0 0 1.82.2h.09a1.65 1.65 0 0 0 1-.76 1.65 1.65 0 0 0 .2-1.82l-.03-.06a2 2 0 0 1 .73-2.73 2 2 0 0 1 2.73.73l.03.06a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
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

        <div className="codenames-header-new__center" />

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
        <div className="emotional-room__game">
          <AnimatePresence mode="wait">
          {room?.phase === "lobby" ? (
            <motion.div
              key="phase-lobby"
              className="emotional-room__game-card"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22 }}
            >
              <h2 className="emotional-room__game-title">Лобби</h2>

              <EmotionalOvalTable
                players={players}
                meId={meId}
                slots={[]}
                hostId={room?.hostId}
                onEmptyHostClick={() => actions?.startGame?.()}
                emptyHostLabel="Начать игру"
              />

              {isHost ? null : (
                <div className="emotional-room__game-hint">Ждём, когда хост начнёт игру…</div>
              )}
            </motion.div>
          ) : null}

          {room?.phase === "submit" ? (
            <motion.div
              key="phase-submit"
              className="emotional-room__game-card"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22 }}
            >
              <EmotionalOvalTable
                players={players}
                meId={meId}
                slots={[]}
                myHand={room?.leaderId === meId ? [] : (gameState?.my?.hand || [])}
                onHandCardClick={room?.leaderId === meId ? null : ((emotion) => actions?.submitEmotion?.(emotion))}
                selectedHandCard={gameState?.my?.submission !== "skip" ? gameState?.my?.submission : null}
                centerWord={room?.currentWord}
                secretEmotion={room?.leaderId === meId ? gameState?.my?.secretEmotion : null}
                hostId={room?.hostId}
                centerTimer={room?.phaseEndsAt ? (
                  <RadialCountdown
                    secondsLeft={(room.phaseEndsAt - nowMs) / 1000}
                    totalSeconds={60}
                    size={80}
                    strokeWidth={6}
                    variant="semi"
                    showLabel={false}
                  />
                ) : null}
              />

              {room?.settings?.allowSkip && room?.leaderId !== meId ? (
                <div className="emotional-room__hand-actions">
                  <Button
                    variant="ghost"
                    onClick={() => actions?.skipTurn?.()}
                    disabled={!connected}
                  >
                    Пропустить
                  </Button>
                </div>
              ) : null}
            </motion.div>
          ) : null}

          {room?.phase === "reveal" ? (
            <motion.div
              key="phase-reveal"
              className="emotional-room__game-card"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22 }}
            >
              <h2 className="emotional-room__game-title">Карты на столе</h2>
              <div className="emotional-room__game-text">
                Карты выложены вслепую. Через несколько секунд они начнут открываться автоматически — по одной слева направо.
              </div>

              <EmotionalOvalTable
                players={players}
                meId={meId}
                slots={gameState?.table || []}
                facedown={true}
                myHand={gameState?.my?.hand || []}
                onHandCardClick={null}
                selectedHandCard={null}
                hostId={room?.hostId}
              />

              <div className="emotional-room__game-hint">
                Карты будут открываться автоматически последовательно…
              </div>
            </motion.div>
          ) : null}

          {room?.phase === "vote" ? (
            <motion.div
              key="phase-vote"
              className="emotional-room__game-card"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22 }}
            >
              <EmotionalOvalTable
                players={players}
                meId={meId}
                slots={gameState?.table || []}
                onSlotClick={(slotId) => actions?.castVote?.(slotId)}
                myVote={gameState?.my?.vote}
                votesCountBySlotId={gameState?.votesCountBySlotId}
                showVotes={true}
                facedown={false}
                myHand={gameState?.my?.hand || []}
                onHandCardClick={null}
                selectedHandCard={null}
                // В голосовании стол должен оставаться на экране; слово не показываем в центре.
                centerWord={null}
                hostId={room?.hostId}
                centerTimer={room?.phaseEndsAt ? (
                  <RadialCountdown
                    secondsLeft={(room.phaseEndsAt - nowMs) / 1000}
                    totalSeconds={30}
                    size={80}
                    strokeWidth={6}
                    variant="semi"
                    showLabel={false}
                  />
                ) : null}
              />

              <div className="emotional-room__game-hint">
                {gameState?.my?.vote ? "Ваш голос принят" : "Выберите эмоцию, которая была у ведущего"}
              </div>
            </motion.div>
          ) : null}

          {room?.phase === "results" ? (
            <motion.div
              key="phase-results"
              className="emotional-room__game-card"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22 }}
            >
              <EmotionalOvalTable
                players={players}
                meId={meId}
                slots={gameState?.table || []}
                myVote={gameState?.my?.vote}
                votesCountBySlotId={gameState?.votesCountBySlotId}
                showVotes={true}
                facedown={false}
                myHand={gameState?.my?.hand || []}
                onHandCardClick={null}
                selectedHandCard={null}
                hostId={room?.hostId}
              />

              {isHost ? (
                <div className="emotional-room__hand-actions">
                  <Button onClick={() => actions?.nextRound?.()} disabled={!connected}>
                    Следующий раунд
                  </Button>
                </div>
              ) : null}
            </motion.div>
          ) : null}

          {room?.phase === "ended" ? (
            <motion.div
              key="phase-ended"
              className="emotional-room__game-card"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22 }}
            >
              <h2 className="emotional-room__game-title">Игра завершена</h2>
              <p className="emotional-room__game-text">Кто-то достиг цели по очкам.</p>
              {isHost ? (
                <Button onClick={() => actions?.newGame?.()} disabled={!connected}>
                  Новая игра
                </Button>
              ) : null}
            </motion.div>
          ) : null}
          </AnimatePresence>
        </div>


        {/* Игроки теперь на овальном столе; список ниже убран */}
      </section>

      <EmotionalRulesModal isOpen={showRulesModal} onClose={() => setShowRulesModal(false)} />

      <EmotionalSettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={room?.settings}
        isHost={isHost}
        onSave={actions?.updateSettings}
        onNewGame={actions?.newGame}
      />
    </div>
  );
}


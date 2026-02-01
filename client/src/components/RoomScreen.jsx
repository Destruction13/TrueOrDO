import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import CategorySelector from "./CategorySelector";
import ScenarioReel from "./ScenarioReel";
import Button from "./ui/Button";
import LeaveButton from "./ui/LeaveButton";
import PlayerCard from "./ui/PlayerCard";
import TargetPlayerSelector from "./ui/TargetPlayerSelector";
import CurrentTurnBanner from "./ui/CurrentTurnBanner";
import ConfirmEndGameModal from "./ui/ConfirmEndGameModal";
import VotingRules from "./ui/VotingRules";
import VotingStatus from "./ui/VotingStatus";
import TaskAcceptOverlay from "./ui/TaskAcceptOverlay";
import WaitingAcceptOverlay from "./ui/WaitingAcceptOverlay";
import ActiveTaskCard from "./ui/ActiveTaskCard";
import TaskReport from "./ui/TaskReport";
import RulesModal from "./ui/RulesModal";
import CustomDecisionModal from "./ui/CustomDecisionModal";
import { useAuth } from "../context/AuthContext";

function formatTimer(seconds) {
  if (seconds == null || Number.isNaN(seconds)) {
    return "--:--";
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.max(seconds % 60, 0);
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function RoomScreen({
  connected,
  error,
  meId,
  roomState,
  timerRemaining,
  votingTimerRemaining,
  taskAcceptRemaining,
  voteCounts,
  myVote,
  wheel1Spin,
  wheel2Spin,
  forcedMode,
  reelItems,
  isPaused,
  actions,
}) {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  
  const { room, players, round, content } = roomState;
  const [categoryReady, setCategoryReady] = useState(false);
  const [showEndGameModal, setShowEndGameModal] = useState(false);
  const [customModeEnabled, setCustomModeEnabled] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [roundInlineNotice, setRoundInlineNotice] = useState(null);
  const roundInlineNoticeTimeoutRef = useRef(null);

  const pendingCategoryIdRef = useRef(null);

  useEffect(() => {
    return () => {
      if (roundInlineNoticeTimeoutRef.current) {
        clearTimeout(roundInlineNoticeTimeoutRef.current);
        roundInlineNoticeTimeoutRef.current = null;
      }
    };
  }, []);

  const showRoundInlineNotice = useCallback((message) => {
    setRoundInlineNotice(message);
    if (roundInlineNoticeTimeoutRef.current) {
      clearTimeout(roundInlineNoticeTimeoutRef.current);
    }
    roundInlineNoticeTimeoutRef.current = setTimeout(() => {
      setRoundInlineNotice(null);
    }, 2800);
  }, []);

  const isHost = room.hostId === meId;
  const disqualifiedCanPlay = room.settings?.disqualifiedCanPlay;
  
  // currentTurnPlayerId - игрок, чей сейчас ход (выбирает кому задать вопрос)
  const currentTurnPlayerId = room.currentTurnPlayerId;
  const currentTurnPlayer = players.find((player) => player.id === currentTurnPlayerId);
  const isMyTurn = currentTurnPlayerId === meId;
  
  // currentPlayer - игрок, выполняющий задание (targetPlayer)
  const currentPlayer = round
    ? players.find((player) => player.id === round.currentPlayerId)
    : null;
  const isMeCurrent = round?.currentPlayerId === meId;
  const phase = round?.phase;
  const isTruth = round?.mode === "truth";
  const isDare = round?.mode === "dare";
  const taskStatus = round?.taskStatus || "pending";
  const isCustom = Boolean(round?.customMode);
  const customAuthor = isCustom
    ? players.find((p) => p.id === round?.customAuthorPlayerId)
    : null;
  const isTaskPending = Boolean(round && phase === "task" && taskStatus === "pending");
  const isTaskAccepted = Boolean(round && taskStatus !== "pending");
  
  // Chaos mode detection
  const isCurrentPlayerChaos = currentPlayer?.status === "chaos";
  const isCurrentPlayerShamed = currentPlayer?.status === "shamed";

  // Auto-trigger mode selection for chaos players
  // Server will decide the mode (50/50) and emit round:mode_forced
  const chaosModeTriggerRef = useRef(false);
  const [chaosDeciding, setChaosDeciding] = useState(false);
  const [chaosRevealedMode, setChaosRevealedMode] = useState(null);
  const chaosTimerRef = useRef(null);

  
  useEffect(() => {
    console.log("[Chaos Debug] Effect triggered:", {
      hasRound: !!round,
      phase,
      isCurrentPlayerChaos,
      isMeCurrent,
      triggerRef: chaosModeTriggerRef.current,
      currentPlayerStatus: currentPlayer?.status
    });
    
    // Только текущий игрок (в хаосе) может запустить выбор режима, хост НЕ может делать это за него
    if (
      round &&
      phase === "mode" &&
      isCurrentPlayerChaos &&
      isMeCurrent &&
      !chaosModeTriggerRef.current
    ) {
      console.log("[Chaos] Starting chaos mode selection...");
      chaosModeTriggerRef.current = true;
      setChaosDeciding(true);
      setChaosRevealedMode(null);
      
      // Delay before sending to server (build suspense)
      chaosTimerRef.current = setTimeout(async () => {
        // Send mode - server will override for chaos player
        console.log("[Chaos] Sending setMode request...");
        try {
          const result = await actions.setMode("truth"); // Server ignores this and picks randomly
          console.log("[Chaos] setMode result:", result);
        } catch (err) {
          console.error("[Chaos] setMode error:", err);
        }
      }, 500); // 0.5 sec delay for testing
    }
    // Reset trigger when round changes
    if (!round || phase !== "mode") {
      chaosModeTriggerRef.current = false;
    }
  }, [round?.id, phase, isCurrentPlayerChaos, isMeCurrent, actions, currentPlayer?.status]);
  
  // When forcedMode arrives, show it with dramatic reveal after delay
  useEffect(() => {
    if (forcedMode && chaosDeciding && !chaosRevealedMode) {
      // Wait a bit more before revealing the result
      const revealTimer = setTimeout(() => {
        setChaosRevealedMode(forcedMode);
      }, 1500); // 1.5 sec reveal delay
      return () => clearTimeout(revealTimer);
    }
  }, [forcedMode, chaosDeciding, chaosRevealedMode]);
  
  // After reveal is shown, hide banner after a delay to let user see the result
  useEffect(() => {
    if (chaosRevealedMode) {
      const hideTimer = setTimeout(() => {
        setChaosDeciding(false);
        setChaosRevealedMode(null);
      }, 2000); // Show revealed mode for 2 sec before hiding
      return () => clearTimeout(hideTimer);
    }
  }, [chaosRevealedMode]);
  
  // Reset chaos state when round changes (cleanup)
  useEffect(() => {
    return () => {
      if (chaosTimerRef.current) {
        clearTimeout(chaosTimerRef.current);
        chaosTimerRef.current = null;
      }
    };
  }, [round?.id]);

  
  // Reset on new round start - but DON'T clear if we're starting chaos selection for new round
  const prevRoundIdRef = useRef(round?.id);
  useEffect(() => {
    if (round?.id !== prevRoundIdRef.current) {
      console.log("[Chaos] Round changed. Old:", prevRoundIdRef.current, "New:", round?.id);
      const wasDeciding = chaosDeciding;
      prevRoundIdRef.current = round?.id;
      
      // Only reset if we were in the middle of revealing (not starting fresh)
      if (wasDeciding && chaosRevealedMode) {
        console.log("[Chaos] Was in reveal phase, resetting");
        setChaosDeciding(false);
        setChaosRevealedMode(null);
      }
      // Always reset trigger ref for new round so it can trigger again
      chaosModeTriggerRef.current = false;
      // DON'T clear timer here - let it run for the new round
    }
  }, [round?.id, chaosDeciding, chaosRevealedMode]);

  useEffect(() => {
    if (!round || !isDare || !round.wheel1Id) {
      setCategoryReady(false);
      pendingCategoryIdRef.current = null;
      return;
    }
    pendingCategoryIdRef.current = round.wheel1Id;
  }, [round?.id, round?.wheel1Id, isDare]);

  useEffect(() => {
    if (wheel1Spin.spinning) {
      setCategoryReady(false);
    }
  }, [wheel1Spin.spinning]);

  useEffect(() => {
    if (
      !round ||
      !isDare ||
      !round.wheel1Id ||
      wheel1Spin.spinning ||
      categoryReady ||
      wheel1Spin.tick !== 0
    ) {
      return;
    }
    setCategoryReady(true);
  }, [
    categoryReady,
    isDare,
    round?.wheel1Id,
    wheel1Spin.spinning,
    wheel1Spin.tick
  ]);

  const categories = content?.categories || [];
  const selectedCategory = categories.find((category) => category.id === round?.wheel1Id);
  const wheel2Items = selectedCategory?.items || [];
  // Показываем ленту сценариев и категории только до принятия задания
  const showDareFlow = Boolean(
    round &&
      isDare &&
      (phase === "wheel1" ||
        phase === "wheel2" ||
        (phase === "task" && isTaskPending))
  );
  const hasScenarioItems = wheel2Items.length > 0;
  const showScenarioReel = showDareFlow && round?.wheel1Id && categoryReady && hasScenarioItems;

  // Для Dare: UI принятия/ожидания показываем только после того, как лента докрутилась.
  // Важно: лента анимируется локально и может быть пропущена (вкладка была скрыта/игрок переподключился).
  // Поэтому используем server-state fallback: если wheel2Id уже выбран и раунд в task/pending — считаем, что лента уже завершилась.
  const [reelStopped, setReelStopped] = useState(false);

  useEffect(() => {
    if (!isDare) {
      setReelStopped(true);
      return;
    }

    // Если результата ещё нет — точно не остановились
    if (!isTaskPending || !round?.wheel2Id) {
      setReelStopped(false);
      return;
    }

    const startedAtMs = round?.wheel2SpinStartedAtMs || wheel2Spin.startedAtMs;
    const durationMs = round?.wheel2SpinDurationMs || wheel2Spin.durationMs;

    // Если нет меты (старый клиент/сервер) — показываем сразу, как раньше
    if (typeof startedAtMs !== "number" || typeof durationMs !== "number") {
      setReelStopped(true);
      return;
    }

    // Ждём окончания анимации ленты + небольшие "фазы" внутри ScenarioReel
    const finishAt = startedAtMs + durationMs + 1200;

    const update = () => {
      setReelStopped(Date.now() >= finishAt);
    };

    update();
    const id = window.setInterval(update, 150);
    return () => window.clearInterval(id);
  }, [
    isDare,
    isTaskPending,
    round?.wheel2Id,
    round?.wheel2SpinStartedAtMs,
    round?.wheel2SpinDurationMs,
    wheel2Spin.startedAtMs,
    wheel2Spin.durationMs,
  ]);

  // Раунд можно начать только если: нет активного раунда И это мой ход
  const canStartRound = (!round || round.phase === "complete") && isMyTurn;

  // Показываем UI принятия задания (и ожидание для остальных) только когда лента сценариев уже остановилась.
  // Иначе оверлей перекрывает прокрутку и выглядит так, будто ожидание началось слишком рано.
  const canShowAcceptUi =
    !!round &&
    !chaosDeciding &&
    isTaskPending &&
    (!isDare || reelStopped);

  // Только текущий игрок может выполнять действия (хост НЕ может делать это за него)
  const canPickMode = round && phase === "mode" && isMeCurrent;
  const canSpinWheel1 = round && phase === "wheel1" && isMeCurrent;
  const canSpinWheel2 = round && phase === "wheel2" && isMeCurrent;
  const canMarkDone = round && phase === "task" && isMeCurrent && isTaskAccepted;
  const canVote = round && phase === "voting" && !isMeCurrent && !myVote;
  const canResetTimer = isHost && phase === "task";

  const eligibleCount = voteCounts.eligibleCount || Math.max(players.length - 1, 0);
  const majority = eligibleCount ? Math.floor(eligibleCount / 2) + 1 : 0;

  const resultLabel = useMemo(() => {
    if (!round?.result) {
      return null;
    }
    if (round.result === "approved") {
      return "Засчитано";
    }
    if (round.result === "report") {
      return "Репорт";
    }
    if (round.result === "skipped") {
      return "Пропуск";
    }
    return "Не засчитано";
  }, [round?.result]);

  // Сортировка игроков: online сверху, disconnected ниже, left внизу
  const sortedPlayers = useMemo(() => {
    const statusOrder = { online: 0, disconnected: 1, left: 2 };
    return [...players].sort((a, b) => {
      const aOrder = statusOrder[a.connectionStatus] ?? 0;
      const bOrder = statusOrder[b.connectionStatus] ?? 0;
      return aOrder - bOrder;
    });
  }, [players]);

  const handleStartTask = useCallback(() => {
    actions.acceptTask();
  }, [actions]);

  const handleCategoryReveal = useCallback((revealedId) => {
    if (!revealedId || revealedId !== pendingCategoryIdRef.current) {
      return;
    }
    setCategoryReady(true);
  }, []);

  return (
    <div className="app-shell">
      <header className="room-header">
        <div className="room-header__left">
          <div className="room-code-block" onClick={() => {
            navigator.clipboard.writeText(`${window.location.origin}/truth-or-dare/${room.code}`);
          }} title="Скопировать ссылку">
            <div className="room-code-label">Код комнаты</div>
            <div className="room-code">{room.code}</div>
          </div>
          <button 
            className="room-header-btn" 
            onClick={() => setShowRulesModal(true)}
            title="Правила игры"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </button>
          {/* Кнопка выхода с троллингом */}
          <LeaveButton onLeave={actions.leaveRoom} className="room-header-leave-btn" />
        </div>
        
        <div className="room-header__right">
          {/* Профиль или Войти */}
          {isAuthenticated ? (
            <button 
              className="room-header-profile__btn"
              onClick={() => navigate("/profile")}
              title="Профиль"
            >
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="room-header-profile__avatar" />
              ) : (
                <span className="room-header-profile__placeholder">
                  {(user?.nickname || user?.email)?.[0]?.toUpperCase() || "?"}
                </span>
              )}
            </button>
          ) : (
            <button 
              className="room-header-btn room-header-btn--login"
              onClick={() => navigate("/login")}
              title="Войти"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
              <span>Войти</span>
            </button>
          )}
        </div>
      </header>

      <main className="room-layout">
        <section className="panel players-panel">
          <div className="panel-header">
            <h2>Игроки</h2>
          </div>
          <div className="player-grid-v2">
            <AnimatePresence mode="popLayout">
              {sortedPlayers.map((player) => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  isHost={player.id === room.hostId}
                  isMe={player.id === meId}
                  isCurrent={round?.currentPlayerId === player.id}
                  showKickButton={isHost && player.id !== meId}
                  onKick={actions.kickPlayer}
                />
              ))}
            </AnimatePresence>
          </div>
        </section>

        <section className="panel round-panel">
          <div className="panel-header">
            <h2>Раунд</h2>
          </div>

          <div className="round-info">
            <div>
              <div className="label">Чей ход</div>
              <div className="value">{currentTurnPlayer?.name || "—"}</div>
            </div>
            {/* Показываем "Выполняет" только во время активного раунда (не complete) */}
            {round && phase !== "complete" && (
              <div>
                <div className="label">Выполняет</div>
                <div className="value">{currentPlayer?.name || "—"}</div>
              </div>
            )}
            {/* Показываем "Режим" только когда раунд активен и есть режим или chaos deciding */}
            {(round && phase !== "complete") && (
              <div>
                <div className="label">Режим</div>
                <div className="value">
                  {chaosDeciding
                    ? "🔥"
                    : round?.mode === "truth"
                    ? "Правда"
                    : round?.mode === "dare"
                    ? "Действие"
                    : "—"}
                 {isCustom && customAuthor ? (
                   <div style={{ marginTop: 6, fontSize: 12, color: "rgba(255,255,255,0.65)" }}>
                     Задание от игрока {customAuthor.name}
                   </div>
                 ) : null}
                </div>
              </div>
            )}
          </div>

          {/* Показываем выбор игрока только когда нет активного раунда */}
          {!round ? (
            canStartRound ? (
              <div className="round-actions">
                <TargetPlayerSelector
                  players={players}
                  currentTurnPlayerId={currentTurnPlayerId}
                  meId={meId}
                  disabled={false}
                  allowSelfSelect={false}
                  customEnabled={customModeEnabled}
                  onToggleCustom={setCustomModeEnabled}
                  onChaosBlocked={showRoundInlineNotice}
                  onSelectPlayer={(targetPlayerId) =>
                    actions.startRound(targetPlayerId, { customMode: customModeEnabled })
                  }
                />
              </div>
            ) : (
              <CurrentTurnBanner player={currentTurnPlayer} />
            )
          ) : null}

          {/* Chaos mode banner - shown during deciding phase, persists until reveal complete */}
          {/* This banner BLOCKS all other round UI until chaos selection is complete */}
          {chaosDeciding ? (
            <div className="round-stage chaos-overlay">
              <div className="stage-title">Выбор режима</div>
              <div className={`chaos-mode-banner${chaosRevealedMode ? " is-revealed" : ""}`}>
                <div className="chaos-icon">🔥</div>
                <div className="chaos-text">
                  {chaosRevealedMode ? (
                    <>Хаос выбрал: <strong>{chaosRevealedMode === "truth" ? "Правда" : "Действие"}</strong></>
                  ) : (
                    <>
                      <span className="chaos-deciding-text">Хаос решает</span>
                      <span className="chaos-dots"><span>.</span><span>.</span><span>.</span></span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : round && phase === "mode" ? (
            <div className="round-stage">
              <div className="stage-title">Выбор режима</div>
              {isCurrentPlayerChaos ? (
                // Fallback for chaos player if chaosDeciding not yet started
                <div className="chaos-mode-banner">
                  <div className="chaos-icon">🔥</div>
                  <div className="chaos-text">
                    <span className="chaos-deciding-text">Хаос решает</span>
                    <span className="chaos-dots"><span>.</span><span>.</span><span>.</span></span>
                  </div>
                </div>
              ) : canPickMode ? (
                <div className="stage-actions">
                  <Button 
                    variant="primary" 
                    size="md" 
                    onClick={() => actions.setMode("truth")}
                    disabled={currentPlayer?.truthStreak >= 2}
                    title={currentPlayer?.truthStreak >= 2 ? "Нельзя выбрать правду 3 раза подряд" : undefined}
                  >
                    Правда
                  </Button>
                  <Button 
                    variant="secondary" 
                    size="md" 
                    onClick={() => actions.setMode("dare")}
                    disabled={currentPlayer?.dareStreak >= 2}
                    title={currentPlayer?.dareStreak >= 2 ? "Нельзя выбрать действие 3 раза подряд" : undefined}
                  >
                    Действие
                  </Button>
                </div>
              ) : (
                <div className="round-hint">Ждём выбора от {currentPlayer?.name || "игрока"}.</div>
              )}
            </div>
          ) : null}

          {/* Авторское решение (после выбора Правда/Действие в кастомном режиме) */}
          {round && phase === "custom_confirm" && isCustom ? (
            <div className="round-stage">
              <div className="stage-title">Своё задание</div>
              <div className="round-hint">
                {round.turnPlayerId === meId
                  ? "Выбери: задаёшь сам(а) или берём из базы"
                  : `Ждём решения от ${customAuthor?.name || "автора"}...`}
              </div>

              <CustomDecisionModal
                isOpen={round.turnPlayerId === meId}
                modeLabel={round.mode === "truth" ? "Правда" : "Действие"}
                authorName={customAuthor?.name}
                executorName={players.find((p) => p.id === round.currentPlayerId)?.name}
                onUseCustom={() => actions.customDecision("custom")}
                onUseBase={() => actions.customDecision("base")}
              />
            </div>
          ) : null}

          {showDareFlow && !chaosDeciding ? (
            <div className="dare-stage">
              <div className="dare-block">
                <CategorySelector
                  categories={categories}
                  activeId={categoryReady ? round?.wheel1Id : null}
                  targetId={wheel1Spin.targetId || round?.wheel1Id}
                  spinning={wheel1Spin.spinning}
                  spinTick={wheel1Spin.tick}
                  spinStartedAtMs={wheel1Spin.startedAtMs}
                  spinDurationMs={wheel1Spin.durationMs}
                  onReveal={handleCategoryReveal}
                />
                {phase === "wheel1" ? (
                  canSpinWheel1 ? (
                    <Button
                      variant="primary"
                      size="md"
                      onClick={actions.spinWheel1}
                      disabled={wheel1Spin.spinning}
                    >
                      Выбрать категорию
                    </Button>
                  ) : (
                    <div className="round-hint">
                      Ждём выбора от {currentPlayer?.name || "игрока"}.
                    </div>
                  )
                ) : null}
              </div>

              {round?.wheel1Id ? (
                <div className={`dare-block${showScenarioReel ? " is-ready" : ""}`}>
                  {showScenarioReel ? (
                    <ScenarioReel
                      key={`${round?.id || "round"}-${round?.wheel1Id || "none"}`}
                      items={wheel2Items}
                      reelItems={reelItems}
                      targetId={round?.wheel2Id}
                      targetIndex={wheel2Spin.index}
                      spinTick={wheel2Spin.tick}
                      spinning={wheel2Spin.spinning}
                      spinStartedAtMs={round?.wheel2SpinStartedAtMs || wheel2Spin.startedAtMs}
                      spinDurationMs={round?.wheel2SpinDurationMs || wheel2Spin.durationMs}
                      disabled={wheel1Spin.spinning || !categoryReady}
                      canAcceptTask={isMeCurrent && isTaskPending && (!isDare || !wheel2Spin.spinning)}
                      taskStatus={taskStatus}
                      onStart={() => setReelStopped(false)}
                      onStop={() => setReelStopped(true)}
                      onStartTask={handleStartTask}
                      onRefuseTask={actions.refuseTruth}
                      categoryName={selectedCategory?.title}
                      acceptSecondsLeft={taskAcceptRemaining}
                    />
                  ) : (
                    <div className="round-hint">Готовим ленту сценариев...</div>
                  )}
                  {phase === "wheel2" && showScenarioReel ? (
                    canSpinWheel2 ? (
                      <Button
                        variant="primary"
                        size="md"
                        onClick={actions.spinWheel2}
                        disabled={wheel2Spin.spinning}
                      >
                        Запустить ленту
                      </Button>
                    ) : (
                      <div className="round-hint">
                        Ждём запуска от {currentPlayer?.name || "игрока"}.
                      </div>
                    )
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {canShowAcceptUi && isTruth && isMeCurrent ? (
            <TaskAcceptOverlay
              isOpen
              title="Принять задание"
              subtitle="Нажми «Начать», чтобы запустить раунд."
              secondsLeft={taskAcceptRemaining ?? 30}
              description={round.finalText || ""}
              onAccept={actions.acceptTask}
              onSecondary={actions.refuseTruth}
              primaryLabel="Начать задание"
              secondaryLabel="Отказаться"
            />
          ) : null}

          {canShowAcceptUi && !isMeCurrent ? (
            <WaitingAcceptOverlay
              isOpen
              targetName={currentPlayer?.name || "игрока"}
              taskText={round.finalText}
              secondsLeft={taskAcceptRemaining}
            />
          ) : null}

          {/* ═══════════════════════════════════════════════════════════════════
              НОВЫЙ УПРОЩЁННЫЙ FLOW:
              1. Во время выполнения (task): только ActiveTaskCard
              2. Во время голосования (voting): ActiveTaskCard + VotingStatus
              3. После завершения (complete): TaskReport + TargetPlayerSelector
              ═══════════════════════════════════════════════════════════════════ */}

          {/* Фаза выполнения задания — только красивая карточка задания */}
          {round &&
              !chaosDeciding &&
              !isTaskPending &&
              phase === "task" ? (
            <ActiveTaskCard
              taskText={round.finalText}
              timerRemaining={timerRemaining}
              isTruth={isTruth}
              isMeCurrent={isMeCurrent}
              executorName={currentPlayer?.name}
              canMarkDone={canMarkDone}
              onMarkDone={actions.markDone}
              onRefuse={actions.refuseTruth}
              categoryName={isDare ? selectedCategory?.title : null}
            />
          ) : null}

          {/* Фаза голосования — задание + голосование */}
          {round && phase === "voting" && !chaosDeciding ? (
            <div className="voting-flow">
              {/* Компактная карточка задания во время голосования */}
              <ActiveTaskCard
                taskText={round.finalText}
                timerRemaining={timerRemaining}
                isTruth={isTruth}
                isMeCurrent={isMeCurrent}
                executorName={currentPlayer?.name}
                canMarkDone={false}
                categoryName={isDare ? selectedCategory?.title : null}
              />
              
              {/* Блок голосования */}
              <div className="vote-panel">
                <div className="stage-title">Голосование</div>
                
                {/* Правила голосования (сворачиваемый блок) */}
                {!isMeCurrent && <VotingRules />}
                
                {/* Статус голосования с прогресс-барами */}
                <VotingStatus
                  approveCount={voteCounts.approve}
                  reportCount={voteCounts.report}
                  totalVoted={voteCounts.total}
                  eligibleCount={eligibleCount}
                  majority={majority}
                  isMeCurrent={isMeCurrent}
                  myVote={myVote}
                  votingTimeLeft={votingTimerRemaining}
                />
                
                {/* Кнопки голосования (только для тех, кто ещё не голосовал) */}
                {!isMeCurrent && !myVote ? (
                  <div className="vote-actions-block">
                    <div className="vote-actions-buttons">
                      <Button
                        variant="primary"
                        size="md"
                        disabled={!canVote}
                        onClick={() => actions.castVote("approve")}
                        iconLeft={<span>✓</span>}
                      >
                        Засчитано
                      </Button>
                      <Button
                        variant="ghost"
                        size="md"
                        disabled={!canVote}
                        onClick={() => actions.castVote("report")}
                        iconLeft={<span>✗</span>}
                      >
                        Репорт
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {/* Фаза завершения — компактный отчёт + выбор следующего игрока */}
          {round && phase === "complete" && !chaosDeciding ? (
            <div className="complete-flow">
              {/* Компактный отчёт о задании */}
              <TaskReport
                taskText={round.finalText}
                executorName={currentPlayer?.name}
                executorAvatar={currentPlayer?.avatarUrl}
                result={round.result}
                isTruth={isTruth}
                isVisible={true}
                categoryName={isDare ? selectedCategory?.title : null}
              />
              
              {/* Выбор следующего игрока */}
              {isMyTurn ? (
                <TargetPlayerSelector
                  players={players}
                  currentTurnPlayerId={currentTurnPlayerId}
                  meId={meId}
                  disabled={false}
                  allowSelfSelect={false}
                  customEnabled={customModeEnabled}
                  onToggleCustom={setCustomModeEnabled}
                  onChaosBlocked={showRoundInlineNotice}
                  onSelectPlayer={(targetPlayerId) =>
                    actions.startRound(targetPlayerId, { customMode: customModeEnabled })
                  }
                />
              ) : (
                <CurrentTurnBanner player={currentTurnPlayer} />
              )}
            </div>
          ) : null}

          {/* Индикатор паузы для всех игроков */}
          {isPaused && (
            <div className="pause-indicator">
              <span className="pause-indicator__icon">⏸</span>
              <span className="pause-indicator__text">Игра на паузе</span>
            </div>
          )}

          {isHost ? (
            <div className="admin-actions">
              {canResetTimer || isPaused ? (
                <Button 
                  variant={isPaused ? "primary" : "ghost"} 
                  size="sm" 
                  onClick={actions.togglePause}
                >
                  {isPaused ? "▶ Продолжить" : "⏸ Поставить на паузу"}
                </Button>
              ) : null}
              {canResetTimer && !isPaused ? (
                <Button variant="ghost" size="sm" onClick={actions.resetTimer}>
                  Сбросить таймер
                </Button>
              ) : null}
              <Button variant="ghost" size="sm" onClick={actions.skipRound}>
                Пропустить раунд
              </Button>
              <Button variant="danger" size="sm" onClick={actions.resetRoom}>
                Сбросить комнату
              </Button>
            </div>
          ) : null}

          {roundInlineNotice ? (
            <div className="round-inline-notice" role="status" aria-live="polite">
              {roundInlineNotice}
            </div>
          ) : null}
          {error ? <div className="status-error">{error}</div> : null}
        </section>
      </main>

      {/* Модальное окно подтверждения завершения игры */}
      <ConfirmEndGameModal
        isOpen={showEndGameModal}
        onCancel={() => setShowEndGameModal(false)}
        onConfirm={() => {
          setShowEndGameModal(false);
          actions.endGame();
        }}
      />

      {/* Модальное окно правил */}
      <RulesModal 
        isOpen={showRulesModal} 
        onClose={() => setShowRulesModal(false)} 
      />

    </div>
  );
}

export default RoomScreen;

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import CategorySelector from "./CategorySelector";
import ScenarioReel from "./ScenarioReel";
import Button from "./ui/Button";
import LeaveButton from "./ui/LeaveButton";
import PlayerCard from "./ui/PlayerCard";

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
  voteCounts,
  myVote,
  wheel1Spin,
  wheel2Spin,
  actions
}) {
  const { room, players, round, content } = roomState;
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [categoryReady, setCategoryReady] = useState(false);
  const [taskAccepted, setTaskAccepted] = useState(false);
  const pendingCategoryIdRef = useRef(null);

  useEffect(() => {
    if (selectedPlayerId && !players.some((player) => player.id === selectedPlayerId)) {
      setSelectedPlayerId("");
    }
  }, [players, selectedPlayerId]);

  const isHost = room.hostId === meId;
  const disqualifiedCanPlay = room.settings?.disqualifiedCanPlay;
  const currentPlayer = round
    ? players.find((player) => player.id === round.currentPlayerId)
    : null;
  const isMeCurrent = round?.currentPlayerId === meId;
  const phase = round?.phase;
  const isTruth = round?.mode === "truth";
  const isDare = round?.mode === "dare";

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

  useEffect(() => {
    setTaskAccepted(false);
  }, [round?.id, round?.wheel2Id]);

  const categories = content?.categories || [];
  const selectedCategory = categories.find((category) => category.id === round?.wheel1Id);
  const wheel2Items = selectedCategory?.items || [];
  const showDareFlow = Boolean(
    round &&
      isDare &&
      (phase === "wheel1" ||
        phase === "wheel2" ||
        phase === "task" ||
        phase === "voting" ||
        phase === "complete")
  );
  const hasScenarioItems = wheel2Items.length > 0;
  const showScenarioReel = showDareFlow && round?.wheel1Id && categoryReady && hasScenarioItems;

  const canStartRound = isHost && (!round || round.phase === "complete");
  const canPickMode = round && phase === "mode" && (isMeCurrent || isHost);
  const canSpinWheel1 = round && phase === "wheel1" && (isMeCurrent || isHost);
  const canSpinWheel2 = round && phase === "wheel2" && (isMeCurrent || isHost);
  const canMarkDone = round && phase === "task" && (isMeCurrent || isHost);
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

  const handleStartTask = useCallback(() => {
    setTaskAccepted(true);
    if (!canResetTimer) {
      return;
    }
    actions.resetTimer();
  }, [actions, canResetTimer]);

  const handleCategoryReveal = useCallback((revealedId) => {
    if (!revealedId || revealedId !== pendingCategoryIdRef.current) {
      return;
    }
    setCategoryReady(true);
  }, []);

  return (
    <div className="app-shell">
      <header className="room-header">
        <div>
          <div className="room-code-label">Код комнаты</div>
          <div className="room-code">{room.code}</div>
        </div>
        <div className="room-meta">
          <span className={`pill ${connected ? "online" : "offline"}`}>
            {connected ? "Онлайн" : "Оффлайн"}
          </span>
          <span className="pill">{players.length}/20 игроков</span>
          {isHost ? <span className="pill accent">Ведущий</span> : null}
        </div>
        <LeaveButton onLeave={actions.leaveRoom} />
      </header>

      <main className="room-layout">
        <section className="panel players-panel">
          <div className="panel-header">
            <h2>Игроки</h2>
          </div>
          <div className="player-grid-v2">
            <AnimatePresence mode="popLayout">
              {players.map((player) => (
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
              <div className="label">Ходит</div>
              <div className="value">{currentPlayer?.name || "—"}</div>
            </div>
            <div>
              <div className="label">Режим</div>
              <div className="value">
                {round?.mode === "truth"
                  ? "Правда"
                  : round?.mode === "dare"
                  ? "Действие"
                  : "—"}
              </div>
            </div>
          </div>

          {canStartRound ? (
            <div className="round-actions">
              <div className="field">
                <span>Выбор игрока</span>
                <select
                  value={selectedPlayerId}
                  onChange={(event) => setSelectedPlayerId(event.target.value)}
                >
                  <option value="">Авто-очередь</option>
                  {players.map((player) => (
                    <option
                      key={player.id}
                      value={player.id}
                      disabled={!disqualifiedCanPlay && player.status === "disqualified"}
                    >
                      {player.name}
                      {player.status === "disqualified" ? " (DQ)" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <Button variant="primary" size="md" onClick={() => actions.startRound(selectedPlayerId || null)}>
                Старт раунда
              </Button>
            </div>
          ) : null}

          {!round || round.phase === "complete" ? (
            <div className="round-hint">
              {isHost ? "Готово. Запускай следующий раунд." : "Ожидайте старта раунда от ведущего."}
            </div>
          ) : null}

          {round && phase === "mode" ? (
            <div className="round-stage">
              <div className="stage-title">Выбор режима</div>
              {canPickMode ? (
                <div className="stage-actions">
                  <Button variant="primary" size="md" onClick={() => actions.setMode("truth")}>
                    Правда
                  </Button>
                  <Button variant="secondary" size="md" onClick={() => actions.setMode("dare")}>
                    Действие
                  </Button>
                </div>
              ) : (
                <div className="round-hint">Ждём выбора от {currentPlayer?.name || "игрока"}.</div>
              )}
            </div>
          ) : null}

          {showDareFlow ? (
            <div className="dare-stage">
              <div className="dare-block">
                <CategorySelector
                  categories={categories}
                  activeId={categoryReady ? round?.wheel1Id : null}
                  targetId={round?.wheel1Id}
                  spinning={wheel1Spin.spinning}
                  spinTick={wheel1Spin.tick}
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
                      targetId={round?.wheel2Id}
                      targetIndex={wheel2Spin.index}
                      spinTick={wheel2Spin.tick}
                      spinning={wheel2Spin.spinning}
                      onStartTask={handleStartTask}
                    />
                  ) : (
                    <div className="round-hint">Готовим ленту сценариев...</div>
                  )}
                  {phase === "wheel2" ? (
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

          {round &&
              (phase === "task" || phase === "voting" || phase === "complete") &&
              (isTruth || taskAccepted) ? (
            <div className="task-card">
              <div className="task-header">
                <div>
                  <div className="label">{isTruth ? "Вопрос" : "Задание"}</div>
                  <div className="value">{round.finalText || "-"}</div>
                </div>
                <div className="timer">{formatTimer(timerRemaining)}</div>
              </div>
              {canMarkDone ? (
                <div className="stage-actions">
                  <Button variant="primary" size="md" onClick={actions.markDone}>
                    {isTruth ? "Ответил" : "Я сделал"}
                  </Button>
                  {isTruth ? (
                    <Button variant="ghost" size="md" onClick={actions.refuseTruth}>
                      Отказываюсь
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {round && phase === "voting" ? (
            <div className="vote-panel">
              <div className="stage-title">Голосование</div>
              <div className="vote-info">
                <span>Большинство: {majority} голосов</span>
                <span>
                  За: {voteCounts.approve} | Репорт: {voteCounts.report} | Всего: {voteCounts.total}/
                  {eligibleCount}
                </span>
              </div>
              {isMeCurrent ? (
                <div className="round-hint">Ты не голосуешь в этом раунде.</div>
              ) : null}
              {myVote ? (
                <div className="round-hint">
                  Твой голос: {myVote === "approve" ? "Засчитано" : "Репорт"}
                </div>
              ) : null}
              <div className="stage-actions">
                <Button
                  variant="primary"
                  size="md"
                  disabled={!canVote}
                  onClick={() => actions.castVote("approve")}
                >
                  Засчитано
                </Button>
                <Button
                  variant="ghost"
                  size="md"
                  disabled={!canVote}
                  onClick={() => actions.castVote("report")}
                >
                  Репорт
                </Button>
              </div>
            </div>
          ) : null}

          {round && phase === "complete" && resultLabel ? (
            <div className="result-card">
              <div className="stage-title">Итог</div>
              <div className="result-value">{resultLabel}</div>
            </div>
          ) : null}

          {isHost ? (
            <div className="admin-actions">
              {canResetTimer ? (
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

          {error ? <div className="status-error">{error}</div> : null}
        </section>
      </main>
    </div>
  );
}

export default RoomScreen;

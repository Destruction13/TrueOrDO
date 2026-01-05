import { useCallback, useEffect, useMemo, useState } from "react";
import CategorySelector from "./CategorySelector";
import ScenarioReel from "./ScenarioReel";

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
      return;
    }
    const delay = wheel1Spin.index != null ? 220 : 0;
    const timeoutId = window.setTimeout(() => setCategoryReady(true), delay);
    return () => window.clearTimeout(timeoutId);
  }, [round?.id, round?.wheel1Id, isDare, wheel1Spin.index]);

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
  const showScenarioReel = showDareFlow && round?.wheel1Id && categoryReady;

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
    if (!canResetTimer) {
      return;
    }
    actions.resetTimer();
  }, [actions, canResetTimer]);

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
      </header>

      <main className="room-layout">
        <section className="panel players-panel">
          <div className="panel-header">
            <h2>Игроки</h2>
            <p>Статусы и страйки синхронизируются в реальном времени.</p>
          </div>
          <div className="player-grid">
            {players.map((player) => (
              <div key={player.id} className={`player-card ${player.status}`}>
                <div className="player-name">
                  {player.name}
                  {player.id === room.hostId ? <span className="tag">Ведущий</span> : null}
                </div>
                <div className="player-meta">
                  <span>
                    Статус:{" "}
                    {player.status === "active"
                      ? "активен"
                      : player.status === "disqualified"
                      ? "дисквалифицирован"
                      : player.status}
                  </span>
                  <span>Страйки: {player.strikes}/2</span>
                </div>
                {player.status === "disqualified" ? (
                  <div className="player-warning">Не участвует в следующем ходе</div>
                ) : null}
                {isHost && player.id !== meId ? (
                  <button
                    className="btn tiny ghost"
                    type="button"
                    onClick={() => actions.kickPlayer(player.id)}
                  >
                    Удалить
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        <section className="panel round-panel">
          <div className="panel-header">
            <h2>Раунд</h2>
            <p>Крутите колеса, выполняйте задание и голосуйте.</p>
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
            <div>
              <div className="label">Фаза</div>
              <div className="value">{phase || "ожидание"}</div>
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
              <button className="btn primary" type="button" onClick={() => actions.startRound(selectedPlayerId || null)}>
                Старт раунда
              </button>
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
                  <button className="btn primary" type="button" onClick={() => actions.setMode("truth")}
                  >
                    Правда
                  </button>
                  <button className="btn ghost" type="button" onClick={() => actions.setMode("dare")}
                  >
                    Действие
                  </button>
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
                  activeId={round?.wheel1Id}
                  spinning={wheel1Spin.spinning}
                  spinTick={wheel1Spin.tick}
                />
                {phase === "wheel1" ? (
                  canSpinWheel1 ? (
                    <button
                      className="btn primary"
                      type="button"
                      onClick={actions.spinWheel1}
                      disabled={wheel1Spin.spinning}
                    >
                      Выбрать категорию
                    </button>
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
                      <button
                        className="btn primary"
                        type="button"
                        onClick={actions.spinWheel2}
                        disabled={wheel2Spin.spinning}
                      >
                        Запустить ленту
                      </button>
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

          {round && (phase === "task" || phase === "voting" || phase === "complete") ? (
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
                  <button className="btn ghost" type="button" onClick={actions.markDone}>
                    {isTruth ? "Ответил" : "Я сделал"}
                  </button>
                  {isTruth ? (
                    <button className="btn ghost" type="button" onClick={actions.refuseTruth}>
                      Отказываюсь
                    </button>
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
                <button
                  className="btn primary"
                  type="button"
                  disabled={!canVote}
                  onClick={() => actions.castVote("approve")}
                >
                  Засчитано
                </button>
                <button
                  className="btn ghost"
                  type="button"
                  disabled={!canVote}
                  onClick={() => actions.castVote("report")}
                >
                  Репорт
                </button>
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
                <button className="btn ghost" type="button" onClick={actions.resetTimer}>
                  Сбросить таймер
                </button>
              ) : null}
              <button className="btn ghost" type="button" onClick={actions.skipRound}>
                Пропустить раунд
              </button>
              <button className="btn ghost" type="button" onClick={actions.resetRoom}>
                Сбросить комнату
              </button>
            </div>
          ) : null}

          {error ? <div className="status-error">{error}</div> : null}
        </section>
      </main>
    </div>
  );
}

export default RoomScreen;

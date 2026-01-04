import { useEffect, useMemo, useState } from "react";
import Wheel from "./Wheel";

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

  const categories = content?.categories || [];
  const wheel1Items = categories.map((category) => category.title);
  const wheel1SelectedIndex = categories.findIndex((category) => category.id === round?.wheel1Id);
  const selectedCategory = categories.find((category) => category.id === round?.wheel1Id);
  const wheel2Items = selectedCategory?.items || [];
  const wheel2Labels = wheel2Items.map((item) => item.label);
  const wheel2SelectedIndex = wheel2Items.findIndex((item) => item.id === round?.wheel2Id);

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

          {round && (phase === "wheel1" || phase === "mode") ? (
            <div className="wheel-stage">
              <Wheel
                title="Колесо категорий"
                items={wheel1Items}
                spinning={wheel1Spin.spinning}
                spinIndex={wheel1Spin.index}
                spinTick={wheel1Spin.tick}
                selectedIndex={wheel1SelectedIndex}
              />
              {canSpinWheel1 ? (
                <button className="btn primary" type="button" onClick={actions.spinWheel1}>
                  Крутить колесо 1
                </button>
              ) : null}
            </div>
          ) : null}

          {round && phase !== "mode" && phase !== "wheel1" && round.wheel1Id ? (
            <div className="wheel-stage">
              <Wheel
                title="Колесо сценариев"
                items={wheel2Labels}
                spinning={wheel2Spin.spinning}
                spinIndex={wheel2Spin.index}
                spinTick={wheel2Spin.tick}
                selectedIndex={wheel2SelectedIndex}
              />
              {canSpinWheel2 ? (
                <button className="btn primary" type="button" onClick={actions.spinWheel2}>
                  Крутить колесо 2
                </button>
              ) : null}
            </div>
          ) : null}

          {round && (phase === "task" || phase === "voting" || phase === "complete") ? (
            <div className="task-card">
              <div className="task-header">
                <div>
                  <div className="label">Задание</div>
                  <div className="value">{round.finalText || "—"}</div>
                </div>
                <div className="timer">{formatTimer(timerRemaining)}</div>
              </div>
              {canMarkDone ? (
                <button className="btn ghost" type="button" onClick={actions.markDone}>
                  Я сделал
                </button>
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

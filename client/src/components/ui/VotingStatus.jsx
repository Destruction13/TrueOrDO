import { useEffect, useState } from "react";
import "./VotingStatus.css";

/**
 * Компонент отображения статуса голосования
 * Показывает прогресс-бары для "Засчитано" и "Репорт"
 * 
 * @param {Object} props
 * @param {number} props.approveCount - Количество голосов "За"
 * @param {number} props.reportCount - Количество голосов "Репорт"
 * @param {number} props.totalVoted - Всего проголосовало
 * @param {number} props.eligibleCount - Всего может голосовать
 * @param {number} props.majority - Нужно для победы
 * @param {boolean} props.isMeCurrent - Текущий игрок (не голосует)
 * @param {string|null} props.myVote - Мой голос (approve/report/null)
 * @param {string|null} props.result - Результат голосования (для анимации)
 * @param {number|null} props.votingTimeLeft - Оставшееся время голосования (сек)
 */
function VotingStatus({
  approveCount = 0,
  reportCount = 0,
  totalVoted = 0,
  eligibleCount = 1,
  majority = 1,
  isMeCurrent = false,
  myVote = null,
  result = null,
  votingTimeLeft = null
}) {
  const [showResult, setShowResult] = useState(false);
  
  // Процент заполнения баров
  const approvePercent = eligibleCount > 0 ? (approveCount / eligibleCount) * 100 : 0;
  const reportPercent = eligibleCount > 0 ? (reportCount / eligibleCount) * 100 : 0;
  
  // Порог для победы (визуальная линия)
  const majorityPercent = eligibleCount > 0 ? (majority / eligibleCount) * 100 : 50;

  // Анимация результата
  useEffect(() => {
    if (result) {
      const timer = setTimeout(() => setShowResult(true), 300);
      return () => clearTimeout(timer);
    }
    setShowResult(false);
  }, [result]);

  // Форматирование таймера
  const formatTime = (seconds) => {
    if (seconds == null || seconds < 0) return null;
    return seconds;
  };

  const timeLeft = formatTime(votingTimeLeft);
  const isTimeLow = timeLeft !== null && timeLeft <= 10;

  return (
    <div className={`voting-status ${result ? `voting-status--${result}` : ""}`}>
      {/* Таймер голосования */}
      {timeLeft !== null && !result && (
        <div className={`voting-status__timer ${isTimeLow ? "voting-status__timer--low" : ""}`}>
          <div className="timer-icon">⏱️</div>
          <div className="timer-bar">
            <div 
              className="timer-bar__fill" 
              style={{ width: `${(timeLeft / 30) * 100}%` }}
            />
          </div>
          <div className="timer-value">{timeLeft}с</div>
        </div>
      )}

      {/* Уведомление для текущего игрока */}
      {isMeCurrent && (
        <div className="voting-status__waiting">
          <div className="waiting-pulse" />
          <div className="waiting-content">
            <span className="waiting-icon">⏳</span>
            <span className="waiting-text">
              Остальные игроки решают, засчитать ли выполнение твоего задания
            </span>
          </div>
        </div>
      )}

      {/* Уведомление для голосующих игроков */}
      {!isMeCurrent && !myVote && !result && (
        <div className="voting-status__prompt">
          <div className="prompt-pulse" />
          <div className="prompt-content">
            <span className="prompt-icon">🗳️</span>
            <span className="prompt-text">
              Оцени, выполнил ли игрок задание честно и полностью. Твой голос важен!
            </span>
          </div>
        </div>
      )}

      {/* Прогресс-бары */}
      <div className="voting-status__bars">
        {/* Засчитано */}
        <div className="vote-bar vote-bar--approve">
          <div className="vote-bar__header">
            <span className="vote-bar__label">
              <span className="vote-bar__icon">✓</span>
              Засчитано
            </span>
            <span className="vote-bar__count">{approveCount}</span>
          </div>
          <div className="vote-bar__track">
            <div 
              className="vote-bar__fill"
              style={{ width: `${approvePercent}%` }}
            />
            <div 
              className="vote-bar__threshold"
              style={{ left: `${majorityPercent}%` }}
              title={`Нужно: ${majority}`}
            />
            {/* Точки для каждого голоса */}
            <div className="vote-bar__dots">
              {Array.from({ length: eligibleCount }).map((_, i) => (
                <div 
                  key={i}
                  className={`vote-bar__dot ${i < approveCount ? "vote-bar__dot--filled" : ""}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Репорт */}
        <div className="vote-bar vote-bar--report">
          <div className="vote-bar__header">
            <span className="vote-bar__label">
              <span className="vote-bar__icon">✗</span>
              Репорт
            </span>
            <span className="vote-bar__count">{reportCount}</span>
          </div>
          <div className="vote-bar__track">
            <div 
              className="vote-bar__fill"
              style={{ width: `${reportPercent}%` }}
            />
            <div 
              className="vote-bar__threshold"
              style={{ left: `${majorityPercent}%` }}
              title={`Нужно: ${majority}`}
            />
            {/* Точки для каждого голоса */}
            <div className="vote-bar__dots">
              {Array.from({ length: eligibleCount }).map((_, i) => (
                <div 
                  key={i}
                  className={`vote-bar__dot ${i < reportCount ? "vote-bar__dot--filled" : ""}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Статус */}
      <div className="voting-status__meta">
        <span className="meta-progress">
          Проголосовало: <strong>{totalVoted}</strong> из <strong>{eligibleCount}</strong>
        </span>
        <span className="meta-threshold">
          Нужно: <strong>{majority}</strong> голосов
        </span>
      </div>

      {/* Мой голос */}
      {myVote && !isMeCurrent && (
        <div className={`voting-status__my-vote voting-status__my-vote--${myVote}`}>
          <span className="my-vote-icon">{myVote === "approve" ? "✓" : "✗"}</span>
          <span>Твой голос: {myVote === "approve" ? "Засчитано" : "Репорт"}</span>
        </div>
      )}

      {/* Анимация результата */}
      {showResult && (
        <div className={`voting-status__result voting-status__result--${result}`}>
          <div className="result-glow" />
          <span className="result-icon">
            {result === "approved" ? "🎉" : result === "reported" ? "⚡" : "🤷"}
          </span>
          <span className="result-text">
            {result === "approved" 
              ? "Засчитано!" 
              : result === "reported" 
                ? "Репорт!" 
                : "Не решено"
            }
          </span>
        </div>
      )}
    </div>
  );
}

export default VotingStatus;

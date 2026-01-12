import { useState } from "react";
import "./VotingRules.css";

/**
 * Компонент с объяснением правил голосования
 * Сворачиваемый блок с оригинальным дизайном "микросхемы"
 */
function VotingRules() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={`voting-rules-circuit ${isExpanded ? "voting-rules-circuit--expanded" : ""}`}>
      {/* Декоративные элементы микросхемы */}
      <div className="circuit-lines" aria-hidden="true">
        <div className="circuit-line circuit-line--1" />
        <div className="circuit-line circuit-line--2" />
        <div className="circuit-line circuit-line--3" />
        <div className="circuit-dot circuit-dot--1" />
        <div className="circuit-dot circuit-dot--2" />
        <div className="circuit-dot circuit-dot--3" />
        <div className="circuit-dot circuit-dot--4" />
      </div>

      {/* Кнопка-триггер */}
      <button 
        className="voting-rules-circuit__trigger"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        <span className="trigger-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
        </span>
        <span className="trigger-text">Как это работает?</span>
        <span className={`trigger-chevron ${isExpanded ? "trigger-chevron--up" : ""}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>

      {/* Раскрывающийся контент */}
      <div className="voting-rules-circuit__content">
        <div className="voting-rules-circuit__inner">
          <p className="circuit-description">
            <span className="circuit-description__line">
              Большинство игроков фиксирует итог задания — <strong>«Засчитано»</strong> или <strong>«Репорт»</strong>.
            </span>
            <span className="circuit-description__line">
              Невыполнение заданий приводит к усложнению игры и неприятному статусу, а также может дойти до состояния <strong>"Хаос"</strong>, в котором игрок не сможет выбирать правду или действие.
            </span>
          </p>

          <div className="circuit-options">
            <div className="circuit-option circuit-option--approve">
              <div className="circuit-option__indicator">
                <div className="indicator-pulse" />
                <span>✓</span>
              </div>
              <div className="circuit-option__info">
                <span className="circuit-option__title">Засчитано</span>
                <span className="circuit-option__desc">Задание выполнено честно</span>
              </div>
            </div>
            
            <div className="circuit-option circuit-option--report">
              <div className="circuit-option__indicator">
                <div className="indicator-pulse" />
                <span>✗</span>
              </div>
              <div className="circuit-option__info">
                <span className="circuit-option__title">Репорт</span>
                <span className="circuit-option__desc">Игрок не справился или попытался схитрить</span>
              </div>
            </div>
          </div>

          <div className="circuit-rules">
            <div className="circuit-rule">
              <span className="circuit-rule__chip">⚖️</span>
              <span>Нужно <strong>строгое большинство</strong> голосов "За"</span>
            </div>
            <div className="circuit-rule circuit-rule--warning">
              <span className="circuit-rule__chip">⚡</span>
              <span>Репорт большинством = <strong>страйк</strong>, который может усложнить игру</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VotingRules;

import { createPortal } from "react-dom";
import "./WaitingAcceptOverlay.css";

function WaitingAcceptOverlay({ isOpen, targetName }) {
  if (!isOpen || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="waiting-accept-overlay" role="presentation">
      <div className="waiting-accept-overlay__backdrop" aria-hidden="true" />
      
      <div className="waiting-accept-overlay__content" role="status" aria-live="polite">
        {/* Пульсирующие круги */}
        <div className="waiting-accept-overlay__rings" aria-hidden="true">
          <div className="waiting-accept-overlay__ring waiting-accept-overlay__ring--1" />
          <div className="waiting-accept-overlay__ring waiting-accept-overlay__ring--2" />
          <div className="waiting-accept-overlay__ring waiting-accept-overlay__ring--3" />
        </div>

        {/* Имя игрока */}
        <div className="waiting-accept-overlay__player">
          <span className="waiting-accept-overlay__player-name">{targetName}</span>
          <span className="waiting-accept-overlay__player-label">решает...</span>
        </div>

        {/* Текст */}
        <div className="waiting-accept-overlay__text">
          <div className="waiting-accept-overlay__title">
            Ожидаем принятия задания
          </div>
          <div className="waiting-accept-overlay__subtitle">
            После принятия всем покажем, что именно нужно сделать
            <span className="waiting-accept-overlay__emoji">😈</span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default WaitingAcceptOverlay;

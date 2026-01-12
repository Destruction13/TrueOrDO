import { createPortal } from "react-dom";
import "./WaitingAcceptOverlay.css";

function WaitingAcceptOverlay({ isOpen, targetName }) {
  if (!isOpen || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="waiting-accept-overlay" role="presentation">
      <div className="waiting-accept-overlay__backdrop" aria-hidden="true" />
      <div className="waiting-accept-overlay__card" role="status" aria-live="polite">
        <div className="waiting-accept-overlay__glow" aria-hidden="true" />
        <div className="waiting-accept-overlay__title">
          Ждём, пока <span>{targetName}</span> примет задание…
        </div>
        <div className="waiting-accept-overlay__subtitle">
          После принятия всем покажем, что именно нужно сделать 😈
        </div>
        <div className="waiting-accept-overlay__dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>,
    document.body
  );
}

export default WaitingAcceptOverlay;

import { createPortal } from "react-dom";
import Button from "./Button";
import "./CustomDecisionModal.css";

export default function CustomDecisionModal({
  isOpen,
  modeLabel,
  authorName,
  executorName,
  onUseCustom,
  onUseBase,
}) {
  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div className="custom-decision-modal" role="presentation">
      <div className="custom-decision-modal__backdrop" aria-hidden="true" />
      <div className="custom-decision-modal__card" role="dialog" aria-modal="true">
        <div className="custom-decision-modal__glow" aria-hidden="true" />

        <div className="custom-decision-modal__header">
          <div className="custom-decision-modal__badge">Своё задание</div>
        </div>

        <div className="custom-decision-modal__pick">
          <div className="custom-decision-modal__pick-text">
            {executorName ? executorName : "Игрок"} выбрал режим:
            <span className="custom-decision-modal__pick-mode"> {modeLabel}</span>
          </div>
        </div>

        <div className="custom-decision-modal__text">Задавай своё задание</div>

        <div className="custom-decision-modal__hint">
          Если не придумал(а) — можно взять вариант из базы вопросов/действий.
        </div>

        <div className="custom-decision-modal__actions">
          <Button variant="ghost" size="md" onClick={onUseBase}>
            Взять из базы
          </Button>
          <Button variant="primary" size="md" onClick={onUseCustom}>
            Ок, задам сам(а)
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

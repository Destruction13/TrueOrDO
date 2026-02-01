import { createPortal } from "react-dom";
import Button from "./Button";
import TimerBadge from "./TimerBadge";
import "./TaskAcceptOverlay.css";

function TaskAcceptOverlay({
  isOpen,
  title,
  subtitle,
  description,
  secondsLeft,
  primaryLabel,
  secondaryLabel,
  onAccept,
  onSecondary,
  children
}) {
  if (!isOpen || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="task-accept-overlay" role="presentation">
      <div className="task-accept-overlay__backdrop" aria-hidden="true" />
      <div
        className="task-accept-overlay__card"
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="task-accept-overlay__header">
          <div className="task-accept-overlay__header-top">
            {title ? <h3 className="task-accept-overlay__title">{title}</h3> : null}
            {typeof secondsLeft === "number" ? (
              <TimerBadge
                seconds={secondsLeft}
                warningAt={10}
                criticalAt={5}
                className="task-accept-overlay__timer"
              />
            ) : null}
          </div>
          {subtitle ? (
            <p className="task-accept-overlay__subtitle">{subtitle}</p>
          ) : null}
        </div>
        {description ? (
          <div className="task-accept-overlay__description">{description}</div>
        ) : null}
        {children ? (
          <div className="task-accept-overlay__content">{children}</div>
        ) : null}
        <div className="task-accept-overlay__actions">
          {secondaryLabel ? (
            <Button variant="ghost" size="md" onClick={onSecondary}>
              {secondaryLabel}
            </Button>
          ) : null}
          {primaryLabel ? (
            <Button variant="primary" size="md" onClick={onAccept}>
              {primaryLabel}
            </Button>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default TaskAcceptOverlay;

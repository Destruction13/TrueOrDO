import { motion } from "framer-motion";
import "./ToastNotification.css";

export default function ToastNotification({ notification, onClose }) {
  const { type = "info", title, message, avatar, actions } = notification;

  const icons = {
    info: "ℹ️",
    success: "✅",
    warning: "⚠️",
    error: "❌",
    social: "👤",
  };

  return (
    <motion.div
      className={`toast-notification toast-notification--${type}`}
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.9 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
    >
      <div className="toast-notification__content">
        {avatar ? (
          <img src={avatar} alt="" className="toast-notification__avatar" />
        ) : (
          <span className="toast-notification__icon">{icons[type]}</span>
        )}
        
        <div className="toast-notification__text">
          {title && <div className="toast-notification__title">{title}</div>}
          {message && <div className="toast-notification__message">{message}</div>}
        </div>
        
        <button className="toast-notification__close" onClick={onClose}>×</button>
      </div>
      
      {actions && actions.length > 0 && (
        <div className="toast-notification__actions">
          {actions.map((action, idx) => (
            <button
              key={idx}
              className={`toast-notification__action ${action.variant === "primary" ? "toast-notification__action--primary" : ""}`}
              onClick={() => { action.onClick?.(); onClose(); }}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
}

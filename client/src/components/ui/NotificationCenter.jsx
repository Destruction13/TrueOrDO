import { useNotification } from "../../context/NotificationContext";
import "./NotificationCenter.css";

export default function NotificationCenter({ isOpen, onClose }) {
  const { history, markAsRead, clearHistory } = useNotification();

  if (!isOpen) return null;

  return (
    <div className="notification-center">
      <div className="notification-center__header">
        <h3>Уведомления</h3>
        <button onClick={clearHistory}>Очистить</button>
        <button onClick={onClose}>×</button>
      </div>
      <div className="notification-center__list">
        {history.length === 0 ? (
          <div className="notification-center__empty">Нет уведомлений</div>
        ) : (
          history.map((n) => (
            <div key={n.id} className={`notification-center__item ${n.read ? "" : "unread"}`} onClick={() => markAsRead(n.id)}>
              <div className="notification-center__item-title">{n.title}</div>
              <div className="notification-center__item-message">{n.message}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

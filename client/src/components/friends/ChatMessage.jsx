import "./ChatMessage.css";

function CheckIcon({ double = false }) {
  return (
    <svg
      className={`chat-message__status-icon ${double ? "chat-message__status-icon--double" : ""}`}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {double ? (
        <>
          <path
            d="M7 13.5L10 16.5L16.5 10"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.9"
          />
          <path
            d="M3.5 13.5L6.5 16.5L13 10"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      ) : (
        <path
          d="M4 12.5L9 17.5L20 6.5"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

export default function ChatMessage({ message, isOwn }) {
  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  };

  const isRead = Boolean(message?.readAt);

  return (
    <div className={`chat-message ${isOwn ? "chat-message--own" : ""}`}>
      <div className="chat-message__bubble">
        <div className="chat-message__content">{message.content}</div>
        <div className="chat-message__meta">
          <div className="chat-message__time">{formatTime(message.createdAt)}</div>
          {isOwn && (
            <div
              className={`chat-message__status ${isRead ? "chat-message__status--read" : ""}`}
              title={isRead ? "Прочитано" : "Отправлено"}
            >
              <CheckIcon double={isRead} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

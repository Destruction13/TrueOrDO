import GameInviteCard from "./GameInviteCard";
import "./ChatMessage.css";

function CheckIcon({ double = false }) {
  return (
    <svg
      className={`chat-message__status-icon ${double ? "chat-message__status-icon--double" : ""}`}
      width={double ? "22" : "16"}
      height="15"
      viewBox={double ? "0 0 22 15" : "0 0 16 15"}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {double ? (
        <>
          <path d="M1.5 8.5L5.5 12.5L14.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M8.5 12.5L17.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </>
      ) : (
        <path d="M2.5 8.5L6.5 12.5L15.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}

export default function ChatMessage({ message, isOwn, id, socket }) {
  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  };

  const isRead = Boolean(message?.readAt);
  const isGameInvite = message?.type === "game_invite";

  // Parse metadata (could be JSON string or object)
  let metadata = message?.metadata;
  if (typeof metadata === "string") {
    try { metadata = JSON.parse(metadata); } catch { metadata = null; }
  }

  return (
    <div
      id={id}
      className={`chat-message ${isOwn ? "chat-message--own" : "chat-message--incoming"}`}
      data-seq={message.seq}
    >
      <div className="chat-message__bubble">
        {isGameInvite && metadata ? (
          <GameInviteCard metadata={metadata} isOwn={isOwn} socket={socket} />
        ) : (
          <div className="chat-message__content">{message.content}</div>
        )}
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

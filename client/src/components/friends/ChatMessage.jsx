import "./ChatMessage.css";

export default function ChatMessage({ message, isOwn }) {
  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className={`chat-message ${isOwn ? "chat-message--own" : ""}`}>
      <div className="chat-message__bubble">
        <div className="chat-message__content">{message.content}</div>
        <div className="chat-message__time">{formatTime(message.createdAt)}</div>
      </div>
    </div>
  );
}

import "./ConversationsList.css";

export default function ConversationsList({ conversations = [], onSelect, selectedId }) {
  return (
    <div className="conversations-list">
      {conversations.length === 0 ? (
        <div className="conversations-list__empty">Нет диалогов</div>
      ) : (
        conversations.map((conv) => (
          <div
            key={conv.id}
            className={`conversations-list__item ${selectedId === conv.id ? "active" : ""}`}
            onClick={() => onSelect(conv)}
          >
            <img src={conv.partnerAvatar || "/default-avatar.png"} alt="" />
            <div className="conversations-list__item-content">
              <div className="conversations-list__item-name">{conv.partnerNickname}</div>
              <div className="conversations-list__item-preview">{conv.lastMessage?.content}</div>
            </div>
            {conv.unreadCount > 0 && (
              <span className="conversations-list__item-badge">{conv.unreadCount}</span>
            )}
          </div>
        ))
      )}
    </div>
  );
}

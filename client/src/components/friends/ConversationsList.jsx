import "./ConversationsList.css";

export default function ConversationsList({
  conversations = [],
  onSelect,
  selectedId,
  socket,
  currentUserId,
  onOpenProfile,
}) {
  return (
    <div className="conversations-list">
      {conversations.length === 0 ? (
        <div className="conversations-list__empty">Нет друзей</div>
      ) : (
        conversations.map((conv) => {
          const key = conv.id || conv.friendId || conv.partnerNickname;
          const isUnread = (conv.unreadCount || 0) > 0;
          const isActive = conv.id ? selectedId === conv.id : false;
          const badgeText = conv.unreadCount > 99 ? "99+" : String(conv.unreadCount || 0);
          const isOnline = conv.onlineStatus === "online" || conv.onlineStatus === "in_game";

          return (
            <div
              key={key}
              className={`conversations-list__item ${isActive ? "active" : ""} ${isUnread ? "conversations-list__item--unread" : ""}`}
              onClick={() => onSelect(conv)}
            >
              <div className="conversations-list__avatar-wrap">
                <img src={conv.partnerAvatar || "/default-avatar.png"} alt="" className="conversations-list__avatar-img" />
                {isOnline && <span className="conversations-list__online-dot" />}
              </div>
              <div className="conversations-list__item-content">
                <div className="conversations-list__item-name">{conv.partnerNickname}</div>
                <div className={`conversations-list__item-preview ${!conv.lastMessage ? "conversations-list__item-preview--placeholder" : ""}`}>
                  {conv.lastMessage?.content || "Начать диалог"}
                </div>
              </div>
              {isUnread && (
                <span className="conversations-list__item-badge">{badgeText}</span>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

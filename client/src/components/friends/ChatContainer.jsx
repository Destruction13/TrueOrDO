import { useState } from "react";
import ChatWindow from "./ChatWindow";
import "./ChatContainer.css";

export default function ChatContainer({ chats = [], onClose, socket, currentUserId }) {
  const [minimizedChats, setMinimizedChats] = useState(new Set());

  const toggleMinimize = (odlerId) => {
    setMinimizedChats((prev) => {
      const next = new Set(prev);
      if (next.has(odlerId)) {
        next.delete(odlerId);
      } else {
        next.add(odlerId);
      }
      return next;
    });
  };

  if (chats.length === 0) return null;

  return (
    <div className="chat-container">
      {chats.map((chat, index) => (
        <ChatWindow
          key={chat.odlerId}
          partnerId={chat.odlerId}
          partnerNickname={chat.nickname}
          partnerAvatar={chat.avatar}
          socket={socket}
          currentUserId={currentUserId}
          onClose={() => onClose(chat.odlerId)}
          isMinimized={minimizedChats.has(chat.odlerId)}
          onToggleMinimize={() => toggleMinimize(chat.odlerId)}
          style={{ right: 20 + index * 320 }}
        />
      ))}
    </div>
  );
}

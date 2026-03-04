import { useEffect, useState } from "react";
import ChatWindow from "./ChatWindow";
import "./ChatContainer.css";

export default function ChatContainer({ chats = [], onClose, socket, currentUserId, onActivePartnerChange }) {
  const [minimizedChats, setMinimizedChats] = useState(new Set());
  const [activeChatId, setActiveChatId] = useState(chats?.[0]?.odlerId || null);

  useEffect(() => {
    if (!chats?.length) {
      setActiveChatId(null);
      return;
    }
    // если активный чат закрыли — переключаемся на первый
    if (!activeChatId || !chats.some((c) => String(c.odlerId) === String(activeChatId))) {
      setActiveChatId(chats[0].odlerId);
    }
  }, [chats, activeChatId]);

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
          isActive={String(chat.odlerId) === String(activeChatId)}
          onActivate={() => {
            setActiveChatId(chat.odlerId);
            onActivePartnerChange?.(chat.odlerId);
          }}
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

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import ChatMessage from "./ChatMessage";
import "./ChatWindow.css";

export default function ChatWindow({ 
  partnerId, partnerNickname, partnerAvatar, socket, currentUserId,
  onClose, isMinimized, onToggleMinimize, style 
}) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!socket || !partnerId) return;

    socket.emit("messages:history", { odlerId: partnerId, limit: 50 }, (response) => {
      if (response?.success) {
        setMessages(response.messages || []);
      }
      setLoading(false);
    });

    const handleNewMessage = (data) => {
      if (data.senderId === partnerId || data.receiverId === partnerId) {
        setMessages((prev) => [...prev, data]);
      }
    };

    socket.on("messages:received", handleNewMessage);
    return () => socket.off("messages:received", handleNewMessage);
  }, [socket, partnerId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!newMessage.trim() || !socket) return;

    socket.emit("messages:send", { odlerId: partnerId, content: newMessage.trim() }, (response) => {
      if (response?.success) {
        setMessages((prev) => [...prev, response.message]);
        setNewMessage("");
      }
    });
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <motion.div
      className={`chat-window ${isMinimized ? "chat-window--minimized" : ""}`}
      style={style}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
    >
      <div className="chat-window__header" onClick={onToggleMinimize}>
        <img src={partnerAvatar || "/default-avatar.png"} alt="" className="chat-window__avatar" />
        <span className="chat-window__name">{partnerNickname}</span>
        <div className="chat-window__actions">
          <button onClick={(e) => { e.stopPropagation(); onToggleMinimize(); }}>
            {isMinimized ? "▲" : "▼"}
          </button>
          <button onClick={(e) => { e.stopPropagation(); onClose(); }}>×</button>
        </div>
      </div>

      {!isMinimized && (
        <>
          <div className="chat-window__messages">
            {loading ? (
              <div className="chat-window__loading">Загрузка...</div>
            ) : messages.length === 0 ? (
              <div className="chat-window__empty">Начните диалог</div>
            ) : (
              messages.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  isOwn={msg.senderId === currentUserId}
                />
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-window__input">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Сообщение..."
              rows={1}
            />
            <button onClick={handleSend} disabled={!newMessage.trim()}>
              ➤
            </button>
          </div>
        </>
      )}
    </motion.div>
  );
}

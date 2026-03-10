import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import ChatMessage from "./ChatMessage";
import "./ChatWindow.css";

export default function ChatWindow({
  partnerId, partnerNickname, partnerAvatar, socket, currentUserId,
  onClose, isMinimized, onToggleMinimize, style,
  onActivate,
  isActive = false,
}) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [conversationId, setConversationId] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // === Throttled readUpTo: отправляем частичное прочтение не чаще 300ms ===
  const lastSentSeqRef = useRef(0);
  const readUpToTimerRef = useRef(null);

  const sendReadUpTo = useCallback((convId, seq) => {
    if (!socket || !convId || typeof seq !== "number" || seq <= 0) return;
    // Не отправляем если вкладка не видна
    if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
    // Монотонность: не отправляем если seq не увеличился
    if (seq <= lastSentSeqRef.current) return;

    lastSentSeqRef.current = seq;
    socket.emit("messages:readUpTo", { conversationId: convId, seq });
  }, [socket]);

  const throttledReadUpTo = useCallback((convId, seq) => {
    if (readUpToTimerRef.current) clearTimeout(readUpToTimerRef.current);
    readUpToTimerRef.current = setTimeout(() => {
      sendReadUpTo(convId, seq);
    }, 300);
  }, [sendReadUpTo]);

  // Cleanup throttle timer
  useEffect(() => {
    return () => {
      if (readUpToTimerRef.current) clearTimeout(readUpToTimerRef.current);
    };
  }, []);

  // Вычисляем максимальный seq входящих сообщений и вызываем readUpTo
  const markVisibleAsRead = useCallback((msgs, convId) => {
    if (!convId || !msgs || msgs.length === 0) return;
    // Находим максимальный seq среди входящих сообщений
    let maxSeq = 0;
    for (const m of msgs) {
      if (String(m.senderId) !== String(currentUserId) && m.seq > maxSeq) {
        maxSeq = m.seq;
      }
    }
    if (maxSeq > 0) {
      throttledReadUpTo(convId, maxSeq);
    }
  }, [currentUserId, throttledReadUpTo]);

  useEffect(() => {
    if (!socket || !partnerId) return;

    socket.emit("messages:history", { odlerId: partnerId, limit: 50 }, (response) => {

      if (response?.success) {
        setMessages(response.messages || []);

        if (response.conversationId) {
          setConversationId(response.conversationId);
          // Отправляем readUpTo для всех загруженных сообщений (вместо messages:read)
          markVisibleAsRead(response.messages || [], response.conversationId);
        } else {
          setConversationId(null);
        }
      }
      setLoading(false);
    });

    const handleNewMessage = (payload) => {
      const msg = payload?.message;
      if (!msg) return;

      const payloadConvId = payload?.conversationId ? String(payload.conversationId) : null;
      const localConvId = conversationId ? String(conversationId) : null;

      // 1) Если conversationId уже известен — используем его
      if (payloadConvId && localConvId && payloadConvId === localConvId) {
        setMessages((prev) => [...prev, msg]);
        if (String(payload?.senderId) !== String(currentUserId)) {
          // Partial read: отправляем readUpTo для нового сообщения
          if (msg.seq) {
            throttledReadUpTo(payload.conversationId, msg.seq);
          } else {
            socket.emit("messages:read", { conversationId: payload.conversationId });
          }
        }
        return;
      }

      // 2) Если conversationId еще не известен (новый диалог) — определяем по partnerId
      const senderId = payload?.senderId;
      const isForThisChat = senderId && String(senderId) === String(partnerId);

      if (!localConvId && isForThisChat) {
        setMessages((prev) => [...prev, msg]);
        if (payload?.conversationId) {
          setConversationId(payload.conversationId);
          if (String(senderId) !== String(currentUserId)) {
            if (msg.seq) {
              throttledReadUpTo(payload.conversationId, msg.seq);
            } else {
              socket.emit("messages:read", { conversationId: payload.conversationId });
            }
          }
        }
      }
    };

    const handleReadConfirmed = (payload) => {
      // Когда партнёр прочитал — проставляем readAt для своих сообщений
      if (!payload?.conversationId) return;
      if (!conversationId) return;
      if (String(payload.conversationId) !== String(conversationId)) return;
      if (!payload?.readBy) return;
      // readBy — это тот, кто прочитал. Нам важно, что прочитал не мы.
      if (String(payload.readBy) === String(currentUserId)) return;

      setMessages((prev) => {
        const next = [...prev];
        let updated = 0;
        for (let i = next.length - 1; i >= 0 && updated < (payload.count || 0); i--) {
          const m = next[i];
          if (String(m.senderId) === String(currentUserId) && !m.readAt) {
            next[i] = { ...m, readAt: new Date().toISOString() };
            updated += 1;
          }
        }
        return next;
      });
    };

    socket.on("messages:received", handleNewMessage);
    socket.on("messages:read:confirmed", handleReadConfirmed);
    return () => {
      socket.off("messages:received", handleNewMessage);
      socket.off("messages:read:confirmed", handleReadConfirmed);
    };
  }, [socket, partnerId, currentUserId, conversationId, markVisibleAsRead, throttledReadUpTo]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!isActive || isMinimized) return;

    const onKeyDown = (e) => {
      if (!isActive || isMinimized) return;
      if (e.defaultPrevented) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const el = document.activeElement;
      const tag = el?.tagName?.toLowerCase();
      const isEditable =
        el?.isContentEditable ||
        tag === "input" ||
        tag === "textarea" ||
        tag === "select";

      // Если пользователь уже вводит в любое поле — не вмешиваемся
      if (isEditable) return;

      // Печатаемый символ
      if (typeof e.key === "string" && e.key.length === 1) {
        e.preventDefault();
        inputRef.current?.focus();
        setNewMessage((prev) => prev + e.key);
        return;
      }

      // Backspace без фокуса может утащить историю браузера
      if (e.key === "Backspace") {
        e.preventDefault();
        inputRef.current?.focus();
        setNewMessage((prev) => prev.slice(0, -1));
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isActive, isMinimized]);

  const handleSend = () => {
    if (!newMessage.trim() || !socket) return;

    socket.emit("messages:send", { odlerId: partnerId, content: newMessage.trim() }, (response) => {
      if (response?.success) {
        if (response.conversationId) setConversationId(response.conversationId);
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
      onMouseDown={() => onActivate?.()}
      onFocusCapture={() => onActivate?.()}
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
                  isOwn={String(msg.senderId) === String(currentUserId)}
                />
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-window__input">
            <textarea
              ref={inputRef}
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

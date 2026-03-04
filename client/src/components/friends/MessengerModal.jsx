import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ConversationsList from "./ConversationsList";
import ChatMessage from "./ChatMessage";
import "./MessengerModal.css";

function isOk(res) {
  return Boolean(res?.success || res?.ok);
}

export default function MessengerModal({
  isOpen,
  onClose,
  socket,
  currentUserId,
  initialPartner,
  onActivePartnerChange,
  onUnreadCount,
}) {
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [conversations, setConversations] = useState([]);

  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [selectedPartner, setSelectedPartner] = useState(null); // { odlerId, nickname, avatar }

  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState("");

  const messagesEndRef = useRef(null);

  const refreshUnread = useCallback(() => {
    if (!socket) return;
    socket.emit("messages:unread:count", {}, (res) => {
      if (isOk(res)) onUnreadCount?.(res.count ?? 0);
    });
  }, [socket, onUnreadCount]);

  const loadConversations = useCallback(() => {
    if (!socket) return;
    setLoadingConversations(true);
    socket.emit("messages:conversations", { limit: 50, offset: 0 }, (res) => {
      if (isOk(res)) {
        setConversations(res.conversations || []);
      }
      setLoadingConversations(false);
    });
  }, [socket]);

  const listItems = useMemo(() => {
    return (conversations || []).map((c) => ({
      id: c.id,
      partnerNickname: c.partner?.nickname,
      partnerAvatar: c.partner?.avatarUrl || c.partner?.avatar,
      lastMessage: c.lastMessage,
      unreadCount: c.unreadCount || 0,
      _raw: c,
    }));
  }, [conversations]);

  const openConversation = useCallback(
    (conv) => {
      if (!socket || !conv?.id) return;

      const partner = conv.partner;
      setSelectedConversationId(conv.id);
      setSelectedPartner(
        partner
          ? {
              odlerId: partner.odlerId || partner.id,
              nickname: partner.nickname,
              avatar: partner.avatarUrl || partner.avatar,
            }
          : null
      );

      setLoadingMessages(true);
      socket.emit("messages:history", { conversationId: conv.id, limit: 50 }, (res) => {
        if (isOk(res)) {
          setMessages(res.messages || []);
          if ((conv.unreadCount || 0) > 0) {
            socket.emit("messages:read", { conversationId: conv.id }, () => {
              refreshUnread();
              loadConversations();
            });
          }
        }
        setLoadingMessages(false);
      });
    },
    [socket, refreshUnread, loadConversations]
  );

  const openByPartner = useCallback(
    (partnerPayload) => {
      if (!socket || !partnerPayload?.odlerId) return;

      const odlerId = partnerPayload.odlerId;
      const nickname = partnerPayload.nickname || "Диалог";
      const avatar = partnerPayload.avatar || null;

      setSelectedPartner({ odlerId, nickname, avatar });
      setSelectedConversationId(null);
      setMessages([]);
      setLoadingMessages(true);

      socket.emit("messages:history", { odlerId, limit: 50 }, (res) => {
        if (isOk(res)) {
          setMessages(res.messages || []);
          if (res.conversationId) {
            setSelectedConversationId(res.conversationId);
            socket.emit("messages:read", { conversationId: res.conversationId }, () => {
              refreshUnread();
              loadConversations();
            });
          } else {
            refreshUnread();
            loadConversations();
          }
        }
        setLoadingMessages(false);
      });
    },
    [socket, loadConversations, refreshUnread]
  );

  const handleSend = useCallback(() => {
    if (!socket) return;
    const content = newMessage.trim();
    if (!content) return;

    const receiver = selectedPartner?.odlerId;
    if (!receiver) return;

    socket.emit("messages:send", { odlerId: receiver, content }, (res) => {
      if (!isOk(res)) return;

      if (res.message) {
        setMessages((prev) => [...prev, res.message]);
      }
      setNewMessage("");

      if (res.conversationId) setSelectedConversationId(res.conversationId);
      loadConversations();
      refreshUnread();
    });
  }, [socket, newMessage, selectedPartner?.odlerId, loadConversations, refreshUnread]);

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!isOpen) return;
    loadConversations();
  }, [isOpen, loadConversations]);

  useEffect(() => {
    if (!isOpen) return;
    onActivePartnerChange?.(selectedPartner?.odlerId || null);
    return () => onActivePartnerChange?.(null);
  }, [isOpen, selectedPartner?.odlerId, onActivePartnerChange]);

  useEffect(() => {
    if (!isOpen) return;
    if (initialPartner?.odlerId) {
      openByPartner(initialPartner);
    }
  }, [isOpen, initialPartner, openByPartner]);

  useEffect(() => {
    if (!isOpen) return;
    if (!socket) return;

    const onReceived = (data) => {
      // server: { message, conversationId, senderId }
      loadConversations();

      const senderId = data?.senderId;
      const convId = data?.conversationId;
      const activePartnerId = selectedPartner?.odlerId;

      if (senderId && activePartnerId && String(senderId) === String(activePartnerId)) {
        if (data?.message) {
          setMessages((prev) => [...prev, data.message]);
        }
        if (convId) {
          socket.emit("messages:read", { conversationId: convId }, () => {
            refreshUnread();
            loadConversations();
          });
        }
      } else {
        refreshUnread();
      }
    };

    socket.on("messages:received", onReceived);
    return () => socket.off("messages:received", onReceived);
  }, [socket, isOpen, selectedPartner?.odlerId, loadConversations, refreshUnread]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="messenger-modal__overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="messenger-modal"
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 10 }}
          transition={{ duration: 0.18 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="messenger-modal__header">
            <div className="messenger-modal__title">Мессенджер</div>
            <button className="messenger-modal__close" onClick={onClose} type="button">
              ×
            </button>
          </div>

          <div className="messenger-modal__body">
            <div className="messenger-modal__sidebar">
              {loadingConversations ? (
                <div className="messenger-modal__loading">Загрузка...</div>
              ) : (
                <ConversationsList
                  conversations={listItems}
                  selectedId={selectedConversationId}
                  onSelect={(item) => {
                    const raw = item?._raw;
                    if (raw) openConversation(raw);
                  }}
                />
              )}
            </div>

            <div className="messenger-modal__chat">
              <div className="messenger-modal__chat-header">
                <div className="messenger-modal__chat-title">
                  {selectedPartner?.nickname || "Выберите диалог"}
                </div>
              </div>

              <div className="messenger-modal__messages">
                {loadingMessages ? (
                  <div className="messenger-modal__loading">Загрузка...</div>
                ) : messages.length === 0 ? (
                  <div className="messenger-modal__empty">
                    {selectedPartner ? "Начните диалог" : "Слева список ваших диалогов"}
                  </div>
                ) : (
                  messages.map((m) => (
                    <ChatMessage
                      key={m.id || `${m.createdAt}-${m.content}`}
                      message={m}
                      isOwn={String(m.senderId) === String(currentUserId)}
                    />
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="messenger-modal__input">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={selectedPartner ? "Сообщение..." : "Выберите диалог"}
                  disabled={!selectedPartner}
                  rows={1}
                />
                <button onClick={handleSend} disabled={!selectedPartner || !newMessage.trim()} type="button">
                  ➤
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

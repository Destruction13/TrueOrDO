import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import ConversationsList from "./ConversationsList";
import ChatMessage from "./ChatMessage";
import ClickablePlayer from "./ClickablePlayer";
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
  const { user: authUser } = useAuth();
  const location = useLocation();

  // Parsing active game from URL
  const activeGame = useMemo(() => {
    try {
      const path = location.pathname;
      const searchParams = new URLSearchParams(location.search);
      const pathParts = path.split('/').filter(Boolean);

      let game = null;
      let code = null;

      if (pathParts.length >= 2) {
        game = pathParts[0];
        code = pathParts[1];
      } else if (pathParts.length === 1) {
        game = pathParts[0];
        code = searchParams.get('code') || searchParams.get('room');
      }

      if (code && ['alias', 'tod', 'codenames', 'emotional'].includes(game)) {
        return { type: game, code };
      }
    } catch (e) {
      console.error("Error parsing game from URL:", e);
    }
    return null;
  }, [location.pathname, location.search]);

  const [loadingConversations, setLoadingConversations] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [friends, setFriends] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(false);

  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [selectedPartner, setSelectedPartner] = useState(null); // { odlerId, nickname, avatar, isBlocked }
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const loadingOlderRef = useRef(false);
  const [inviteSent, setInviteSent] = useState(false);

  const messagesEndRef = useRef(null);
  const [firstUnreadId, setFirstUnreadId] = useState(null);

  const scrollPositionsRef = useRef({});
  const inputRef = useRef(null);
  const pendingScrollRef = useRef(null);
  const isRestoringScrollRef = useRef(false);

  useEffect(() => {
    if (selectedPartner && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [selectedPartner]);

  useLayoutEffect(() => {
    if (pendingScrollRef.current && messages.length > 0) {
      const { key, hasUnread } = pendingScrollRef.current;
      pendingScrollRef.current = null;
      const el = document.querySelector(".messenger-modal__messages");
      if (!el) return;

      // Блокируем onScroll от перезаписи позиции пока восстанавливаем
      isRestoringScrollRef.current = true;

      const savedScroll = scrollPositionsRef.current[key];
      if (savedScroll !== undefined) {
        el.scrollTop = savedScroll;
      } else if (hasUnread && firstUnreadId) {
        const msgEl = document.getElementById(`msg-${firstUnreadId}`);
        if (msgEl) msgEl.scrollIntoView({ behavior: "auto", block: "center" });
      } else {
        el.scrollTop = el.scrollHeight;
      }

      // Снимаем блокировку после того как браузер обработает scroll-событие
      requestAnimationFrame(() => {
        isRestoringScrollRef.current = false;
      });
    }
  }, [messages, firstUnreadId]);

  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
  }, []);

  const scrollToMessage = useCallback((msgId) => {
    const el = document.getElementById(`msg-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: "auto", block: "center" });
    } else {
      scrollToBottom(false);
    }
  }, [scrollToBottom]);

  // === Partial Read & Focus/Visibility ===
  const maxVisibleSeqMapRef = useRef({});
  const readTimeoutRef = useRef(null);
  const isDocumentVisibleAndFocusedRef = useRef(true);

  // Реф на актуальные функции, чтобы не пересоздавать безопасную версию
  const methodsRef = useRef({ refreshUnread: null, loadConversations: null });

  // Безопасная версия отправки прочитанных сообщений
  const safeFlushReadUpTo = useCallback(() => {
    if (!isDocumentVisibleAndFocusedRef.current) return;
    const cid = selectedConversationId;
    if (!cid) return;
    const seq = maxVisibleSeqMapRef.current[cid] ?? -1;
    if (seq >= 0 && socket) {
      socket.emit("messages:readUpTo", { conversationId: cid, seq }, (res) => {
        if (res?.success) {
          // НЕ сбрасываем maxVisibleSeqMapRef — это high-water mark.
          // Сброс к -1 приводил к бесконечному спаму readUpTo на сервер.
          methodsRef.current.refreshUnread?.();
          methodsRef.current.loadConversations?.();
        }
      });
    }
  }, [socket, selectedConversationId]);

  // Observer для `.chat-message--incoming[data-seq]`
  useEffect(() => {
    if (!selectedConversationId) return; // Наблюдаем только если открыт диалог

    const rootContainer = document.querySelector(".messenger-modal__messages");

    const observer = new IntersectionObserver(
      (entries) => {
        let maxSeqThisBatch = -1;

        for (const entry of entries) {
          if (entry.isIntersecting) {
            const seqStr = entry.target.getAttribute("data-seq");
            const seq = parseInt(seqStr, 10);
            if (!isNaN(seq) && seq > maxSeqThisBatch) {
              maxSeqThisBatch = seq;
            }
          }
        }

        const currentMax = maxVisibleSeqMapRef.current[selectedConversationId] ?? -1;
        if (maxSeqThisBatch > currentMax) {
          maxVisibleSeqMapRef.current[selectedConversationId] = maxSeqThisBatch;

          if (readTimeoutRef.current) clearTimeout(readTimeoutRef.current);
          readTimeoutRef.current = setTimeout(() => {
            safeFlushReadUpTo();
            readTimeoutRef.current = null;
          }, 50); // 50ms задержки
        }
      },
      { root: rootContainer, threshold: 0.1 } // 10% видимости достаточно для "прочтения"
    );

    // Находим все входящие сообщения, у которых есть data-seq
    const incomingMessages = document.querySelectorAll(".chat-message--incoming[data-seq]");
    incomingMessages.forEach((el) => observer.observe(el));

    // Cleanup
    return () => {
      observer.disconnect();
      if (readTimeoutRef.current) {
        clearTimeout(readTimeoutRef.current);
        safeFlushReadUpTo(); // Флушим накопленное при размонтировании или смене сообщений
        readTimeoutRef.current = null;
      }
    };
  }, [messages, selectedConversationId, safeFlushReadUpTo]);

  // Следим за Visibility API (убрали required focus, чтобы читалось, если вкладка просто открыта на втором мониторе)
  useEffect(() => {
    const checkState = () => {
      const isVisible = !document.hidden;
      const becameVisible = !isDocumentVisibleAndFocusedRef.current && isVisible;

      isDocumentVisibleAndFocusedRef.current = isVisible;

      // Если только что стали видимыми — пушим накопившийся seq
      if (becameVisible) {
        safeFlushReadUpTo();
      }
    };

    // При монтировании проверяем сразу
    checkState();

    window.addEventListener("visibilitychange", checkState);

    return () => {
      window.removeEventListener("visibilitychange", checkState);
    };
  }, [safeFlushReadUpTo]);
  // === /Partial Read & Focus/Visibility ===

  const refreshUnread = useCallback(() => {
    if (!socket) return;
    socket.emit("messages:unread:count", {}, (res) => {
      if (isOk(res)) onUnreadCount?.(res.count ?? 0);
    });
  }, [socket, onUnreadCount]);

  const loadConversations = useCallback((silent = false) => {
    if (!socket) return;
    if (!silent) setLoadingConversations(true);
    socket.emit("messages:conversations", { limit: 50, offset: 0 }, (res) => {
      if (isOk(res)) {
        setConversations(res.conversations || []);
      }
      if (!silent) setLoadingConversations(false);
    });
  }, [socket]);

  // Обновляем рефы актуальными функциями после их объявления (в фоне делаем обновления silent)
  methodsRef.current.refreshUnread = refreshUnread;
  methodsRef.current.loadConversations = () => loadConversations(true);

  const loadFriends = useCallback(() => {
    if (!socket) return;
    setLoadingFriends(true);
    socket.emit("friends:list", { filter: "all" }, (res) => {
      if (isOk(res)) {
        setFriends(res.friends || []);
      }
      setLoadingFriends(false);
    });
  }, [socket]);

  // ===================================================================
  // MERGE friends + conversations → единый список для левой панели
  // Сортировка: unread > 0 сверху, далее lastMessageAt desc, потом nickname asc
  // ===================================================================
  const listItems = useMemo(() => {
    // Строим карту conversationsByPartnerId
    const convByPartnerId = new Map();
    for (const c of conversations) {
      const partnerId = c.partner?.id || c.partner?.odlerId;
      if (partnerId) {
        convByPartnerId.set(String(partnerId), c);
      }
    }

    // Множество друзей, которых уже обработали (для дедупликации)
    const seen = new Set();
    const result = [];

    // Сначала проходим по друзьям — каждый друг = 1 элемент
    for (const friend of friends) {
      const friendId = String(friend.id || friend.odlerId);
      if (seen.has(friendId)) continue;
      seen.add(friendId);

      const conv = convByPartnerId.get(friendId);

      result.push({
        id: conv?.id || null,
        friendId,
        partnerNickname: friend.nickname,
        partnerAvatar: friend.avatarUrl || friend.avatar,
        onlineStatus: friend.onlineStatus,
        lastMessage: conv?.lastMessage || null,
        unreadCount: conv?.unreadCount || 0,
        lastMessageAt: conv?.lastMessageAt || null,
        hasConversation: !!conv,
        _raw: conv || null,
        _friend: friend,
      });
    }

    // Добавляем диалоги, чьих партнёров нет в friends (маловероятно, но для полноты)
    for (const c of conversations) {
      const partnerId = String(c.partner?.id || c.partner?.odlerId);
      if (seen.has(partnerId)) continue;
      seen.add(partnerId);

      result.push({
        id: c.id,
        friendId: partnerId,
        partnerNickname: c.partner?.nickname,
        partnerAvatar: c.partner?.avatarUrl || c.partner?.avatar,
        onlineStatus: c.partner?.onlineStatus,
        lastMessage: c.lastMessage || null,
        unreadCount: c.unreadCount || 0,
        lastMessageAt: c.lastMessageAt || null,
        hasConversation: true,
        _raw: c,
        _friend: null,
      });
    }

    // Сортировка: unread > 0 сверху; далее lastMessageAt desc; далее nickname asc
    result.sort((a, b) => {
      // 1) unread > 0 — вверх
      const aHasUnread = (a.unreadCount || 0) > 0 ? 0 : 1;
      const bHasUnread = (b.unreadCount || 0) > 0 ? 0 : 1;
      if (aHasUnread !== bHasUnread) return aHasUnread - bHasUnread;

      // 2) lastMessageAt desc (null → конец)
      const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      if (aTime !== bTime) return bTime - aTime;

      // 3) nickname asc
      return (a.partnerNickname || "").localeCompare(b.partnerNickname || "");
    });

    return result;
  }, [friends, conversations]);

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
            isBlocked: conv.isBlocked || false,
          }
          : null
      );

      setMessages([]);
      setHasMore(false);
      setLoadingMessages(true);
      socket.emit("messages:history", { conversationId: conv.id, limit: 50 }, (res) => {
        if (isOk(res)) {
          const fetchedMsgs = res.messages || [];
          setMessages(fetchedMsgs);
          setHasMore(!!res.hasMore);

          const unreadMsg = fetchedMsgs.find((m) => String(m.senderId) !== String(currentUserId) && m.readAt === null);
          setFirstUnreadId(unreadMsg ? unreadMsg.id : null);
          pendingScrollRef.current = { key: conv.id, hasUnread: !!unreadMsg };
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

      setSelectedPartner({ odlerId, nickname, avatar, isBlocked: false });
      setSelectedConversationId(null);
      setMessages([]);
      setHasMore(false);
      setLoadingMessages(true);

      socket.emit("messages:history", { odlerId, limit: 50 }, (res) => {
        if (isOk(res)) {
          const fetchedMsgs = res.messages || [];
          setMessages(fetchedMsgs);
          setHasMore(!!res.hasMore);
          if (res.conversationId) {
            setSelectedConversationId(res.conversationId);
            
            // Получаем статус блокировки из conversation
            if (res.isBlocked !== undefined) {
              setSelectedPartner(prev => prev ? { ...prev, isBlocked: res.isBlocked } : prev);
            }
          } else {
            refreshUnread();
            loadConversations(true);
          }

          const unreadMsg = fetchedMsgs.find((m) => String(m.senderId) !== String(currentUserId) && m.readAt === null);
          setFirstUnreadId(unreadMsg ? unreadMsg.id : null);
          pendingScrollRef.current = { key: res.conversationId || odlerId, hasUnread: !!unreadMsg };
        }
        setLoadingMessages(false);
      });
    },
    [socket, loadConversations, refreshUnread]
  );

  // Обработка клика по элементу из единого списка
  const handleSelectItem = useCallback(
    (item) => {
      if (item._raw && item.hasConversation) {
        // Есть существующий диалог — открываем по conversationId
        openConversation(item._raw);
      } else {
        // Друг без переписки — открываем по partnerId
        openByPartner({
          odlerId: item.friendId,
          nickname: item.partnerNickname,
          avatar: item.partnerAvatar,
        });
      }
      setIsSidebarOpen(false);
    },
    [openConversation, openByPartner]
  );

  const handleMessageSentFromProfile = useCallback((message, conversationId) => {
    if (message) {
      if (!selectedConversationId || String(selectedConversationId) === String(conversationId)) {
        setMessages((prev) => [...prev, message]);
        setTimeout(() => scrollToBottom(), 50);
      }
    }
    if (conversationId && selectedConversationId !== conversationId) {
      setSelectedConversationId(conversationId);
    }
    loadConversations(true);
    refreshUnread();
  }, [selectedConversationId, scrollToBottom, loadConversations, refreshUnread]);

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
        setTimeout(() => scrollToBottom(), 50);
      }
      setNewMessage("");

      if (res.conversationId) setSelectedConversationId(res.conversationId);
      loadConversations(true);
      refreshUnread();
    });
  }, [socket, newMessage, selectedPartner?.odlerId, loadConversations, refreshUnread]);

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Загрузка при открытии: friends + conversations параллельно
  useEffect(() => {
    if (!isOpen) return;
    loadConversations(false);
    loadFriends();
  }, [isOpen, loadConversations, loadFriends]);

  // При повторном открытии мессенджера: если чат уже выбран,
  // перезагружаем сообщения, потому что пока окно было закрыто,
  // onReceived не работал и новые сообщения потерялись.
  useEffect(() => {
    if (!isOpen || !socket || !selectedConversationId) return;

    socket.emit("messages:history", { conversationId: selectedConversationId, limit: 50 }, (res) => {
      if (res?.success) {
        const fetchedMsgs = res.messages || [];
        setMessages(fetchedMsgs);
        setHasMore(!!res.hasMore);

        const unreadMsg = fetchedMsgs.find(
          (m) => String(m.senderId) !== String(currentUserId) && m.readAt === null
        );
        setFirstUnreadId(unreadMsg ? unreadMsg.id : null);
        pendingScrollRef.current = { key: selectedConversationId, hasUnread: !!unreadMsg };
      }
    });
  }, [isOpen]); // Только isOpen — триггерим ТОЛЬКО при открытии/закрытии

  // Загрузка старых сообщений при скролле вверх (infinite scroll)
  const loadOlderMessages = useCallback(() => {
    if (!socket || !selectedConversationId || !hasMore || loadingOlderRef.current) return;
    if (messages.length === 0) return;

    const oldestMsgId = messages[0].id;
    loadingOlderRef.current = true;

    socket.emit("messages:history", { conversationId: selectedConversationId, limit: 50, before: oldestMsgId }, (res) => {
      loadingOlderRef.current = false;
      if (!res?.success) return;

      const olderMsgs = res.messages || [];
      setHasMore(!!res.hasMore);

      if (olderMsgs.length === 0) return;

      // Сохраняем позицию скролла после prepend
      const container = document.querySelector(".messenger-modal__messages");
      const prevScrollHeight = container ? container.scrollHeight : 0;

      setMessages((prev) => [...olderMsgs, ...prev]);

      // Восстанавливаем позицию: новый scrollHeight - старый scrollHeight + текущий scrollTop
      requestAnimationFrame(() => {
        if (container) {
          isRestoringScrollRef.current = true;
          container.scrollTop = container.scrollHeight - prevScrollHeight + container.scrollTop;
          requestAnimationFrame(() => {
            isRestoringScrollRef.current = false;
          });
        }
      });
    });
  }, [socket, selectedConversationId, hasMore, messages]);

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
      loadConversations(true);

      const convId = data?.conversationId;

      // Сравниваем по conversationId, а НЕ по senderId/odlerId.
      if (convId && selectedConversationId && String(convId) === String(selectedConversationId)) {
        if (data?.message) {
          const container = document.querySelector(".messenger-modal__messages");
          const isAtBottom = container ? (container.scrollHeight - container.scrollTop - container.clientHeight < 150) : true;

          setMessages((prev) => [...prev, data.message]);

          if (isAtBottom) {
            setTimeout(() => scrollToBottom(), 50);
          }
        }
      } else {
        refreshUnread();
      }
    };

    socket.on("messages:received", onReceived);
    return () => socket.off("messages:received", onReceived);
  }, [socket, isOpen, selectedConversationId, loadConversations, refreshUnread]);

  // Слушатели "перекраски" (мультисессии, реконнекты, прочтения другими)
  useEffect(() => {
    if (!isOpen || !socket) return;

    // Переподключение сокета
    const onConnect = () => {
      refreshUnread();
      loadConversations();
    };

    // Мультисессии (прочитал на телефоне -> обновилось здесь)
    const onUnreadSync = () => {
      refreshUnread();
      loadConversations(true);
    };

    // Когда собеседник прочитал ваши сообщения (для отображения галочек)
    const onReadConfirmed = (data) => {
      loadConversations(true);

      setMessages((prev) =>
        prev.map((m) => {
          if (
            data.conversationId === selectedConversationId &&
            String(m.senderId) === String(currentUserId) &&
            !m.readAt &&
            (data.seq === undefined || m.seq <= data.seq)
          ) {
            return { ...m, readAt: new Date().toISOString() };
          }
          return m;
        })
      );
    };

    socket.on("connect", onConnect);
    socket.on("messages:unread:sync", onUnreadSync);
    socket.on("messages:read:confirmed", onReadConfirmed);

    return () => {
      socket.off("connect", onConnect);
      socket.off("messages:unread:sync", onUnreadSync);
      socket.off("messages:read:confirmed", onReadConfirmed);
    };
  }, [isOpen, socket, refreshUnread, loadConversations, selectedConversationId, currentUserId]);

  if (!isOpen) return null;

  const isLoading = loadingConversations || loadingFriends;

  return (
    <AnimatePresence>
      <motion.div
        className="messenger-modal__overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
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
            <div className="messenger-modal__title">MAX</div>
            <button className="messenger-modal__close" onClick={onClose} type="button">
              ×
            </button>
          </div>

          <div className="messenger-modal__body">
            <div className={`messenger-modal__sidebar ${isSidebarOpen ? "expanded" : ""}`}>
              <div className="messenger-modal__sidebar-header">
                <button
                  className="messenger-modal__sidebar-toggle"
                  onClick={() => setIsSidebarOpen((prev) => !prev)}
                  title="Меню чатов"
                >
                  ☰
                </button>
              </div>
              {isLoading ? (
                <div className="messenger-modal__loading">Загрузка...</div>
              ) : (
                <ConversationsList
                  conversations={listItems}
                  selectedId={selectedConversationId}
                  onSelect={handleSelectItem}
                  socket={socket}
                  currentUserId={currentUserId}
                  onOpenProfile={onClose}
                />
              )}
            </div>

            <div className="messenger-modal__chat">
              <div className="messenger-modal__chat-header">
                <div className="messenger-modal__chat-title">
                  {selectedPartner ? (
                    <div className="messenger-modal__chat-title-content">
                      <span className="messenger-modal__chat-nickname">
                        {selectedPartner.nickname}
                      </span>
                      <ClickablePlayer
                        odlerId={selectedPartner.odlerId}
                        odlerNickname={selectedPartner.nickname}
                        avatar={selectedPartner.avatar}
                        socket={socket}
                        currentUserId={currentUserId}
                        onMessageSent={handleMessageSentFromProfile}
                        className="messenger-modal__profile-badge-trigger"
                      >
                        <div className="messenger-modal__profile-badge" title="Открыть профиль">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                          </svg>
                          <span>Профиль</span>
                        </div>
                      </ClickablePlayer>
                    </div>
                  ) : (
                    "Выберите диалог"
                  )}
                </div>
              </div>

              <div
                className="messenger-modal__messages"
                onScroll={(e) => {
                  if (isRestoringScrollRef.current) return;
                  if (loadingMessages || messages.length === 0 || e.target.scrollHeight <= e.target.clientHeight) return;
                  const key = selectedConversationId || selectedPartner?.odlerId;
                  if (key) scrollPositionsRef.current[key] = e.target.scrollTop;

                  // Infinite scroll: подгрузка при скролле близко к верху
                  if (e.target.scrollTop < 100 && hasMore && !loadingOlderRef.current) {
                    loadOlderMessages();
                  }
                }}
              >
                {loadingMessages ? (
                  <div className="messenger-modal__loading">Загрузка...</div>
                ) : messages.length === 0 ? (
                  <div className="messenger-modal__empty">
                    {selectedPartner ? "Начните диалог" : "Слева список ваших друзей"}
                  </div>
                ) : (
                  <>
                    {loadingOlderRef.current && (
                      <div className="messenger-modal__loading-older">Загрузка старых сообщений...</div>
                    )}
                    {messages.map((m) => {
                      const isUnreadDivider = m.id === firstUnreadId;
                      return (
                        <React.Fragment key={m.id || `${m.createdAt}-${m.content}`}>
                          {isUnreadDivider && (
                            <div className="messenger-modal__unread-divider">
                              <span>Новые сообщения</span>
                            </div>
                          )}
                          <ChatMessage
                            id={`msg-${m.id}`}
                            message={m}
                            isOwn={String(m.senderId) === String(currentUserId)}
                            socket={socket}
                          />
                        </React.Fragment>
                      );
                    })}
                  </>
                )}
                <div ref={messagesEndRef} />
              </div>

              {selectedPartner?.isBlocked && (
                <div className="messenger-modal__blocked-banner">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                  </svg>
                  <span>Вы не можете отправлять сообщения этому пользователю</span>
                </div>
              )}

              <div className="messenger-modal__input">
                {activeGame && selectedPartner && !selectedPartner.isBlocked && (
                  <motion.button
                    className={`messenger-modal__invite-btn ${inviteSent ? "messenger-modal__invite-btn--sent" : ""}`}
                    title={inviteSent ? "Приглашение отправлено!" : "Пригласить в текущую игру"}
                    type="button"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    disabled={inviteSent}
                    onClick={() => {
                      if (!socket || !selectedPartner?.odlerId || inviteSent) return;
                      socket.emit("messages:game:invite", {
                        odlerId: selectedPartner.odlerId,
                        gameType: activeGame.type,
                        roomCode: activeGame.code,
                      }, (res) => {
                        if (isOk(res) && res.message) {
                          setMessages((prev) => [...prev, res.message]);
                          setTimeout(() => scrollToBottom(), 50);
                          if (res.conversationId) setSelectedConversationId(res.conversationId);
                          loadConversations(true);
                          setInviteSent(true);
                          setTimeout(() => setInviteSent(false), 5000);
                        }
                      });
                    }}
                  >
                    {inviteSent ? "✓" : "🎮"}
                  </motion.button>
                )}
                <textarea
                  ref={inputRef}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={selectedPartner ? (selectedPartner.isBlocked ? "" : "Сообщение...") : "Выберите диалог"}
                  disabled={!selectedPartner || selectedPartner.isBlocked}
                  rows={1}
                />
                <button onClick={handleSend} disabled={!selectedPartner || selectedPartner.isBlocked || !newMessage.trim()} type="button">
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

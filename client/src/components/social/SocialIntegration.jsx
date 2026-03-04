import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { io } from "socket.io-client";
import { useAuth } from "../../context/AuthContext";
import { NotificationProvider, useNotification } from "../../context/NotificationContext";
import { FriendsIcon, FriendsModal, ChatContainer } from "../friends";
import "./SocialIntegration.css";

// ═══════════════════════════════════════════════════════════════════════════
// SOCIAL CONTEXT
// ═══════════════════════════════════════════════════════════════════════════

const SocialContext = createContext(null);

export function useSocial() {
  const context = useContext(SocialContext);
  if (!context) {
    throw new Error("useSocial must be used within SocialProvider");
  }
  return context;
}

// ═══════════════════════════════════════════════════════════════════════════
// SOCIAL PROVIDER
// ═══════════════════════════════════════════════════════════════════════════

export function SocialProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  
  // UI state
  const [isFriendsModalOpen, setIsFriendsModalOpen] = useState(false);
  const [friendsModalTab, setFriendsModalTab] = useState("friends");
  const [openChats, setOpenChats] = useState([]);

  // legacy compact messenger: active chat partner for unread suppression
  const [activePartnerId, setActivePartnerId] = useState(null);

  // refs, чтобы не пересоздавать сокет при изменениях UI
  const activePartnerIdRef = useRef(null);

  useEffect(() => {
    activePartnerIdRef.current = activePartnerId;
  }, [activePartnerId]);
  
  // Counters
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [onlineFriendsCount, setOnlineFriendsCount] = useState(0);

  // Initialize socket connection
  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const newSocket = io(import.meta.env.VITE_API_URL || window.location.origin, {
      auth: { userId: user.id },
      transports: ["websocket", "polling"],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
    });

    newSocket.on("connect", () => {
      setIsConnected(true);
      setConnectionError(null);
      // Presence register (сервер выставляет onlineStatus и пушит друзьям)
      newSocket.emit("friends:register", {}, (res) => {
        // ok: true/false
        if (res?.pendingCount != null) setPendingRequestsCount(res.pendingCount || 0);
      });

      // Initial counters
      newSocket.emit("messages:unread:count", {}, (res) => {
        if (res?.success) setUnreadMessagesCount(res.count || 0);
      });

      newSocket.emit("friends:list", { filter: "online" }, (res) => {
        if (res?.success) setOnlineFriendsCount(res.friends?.length || 0);
      });
    });

    newSocket.on("disconnect", () => {
      setIsConnected(false);
    });

    newSocket.on("connect_error", (error) => {
      setConnectionError(error.message);
      setIsConnected(false);
    });

    // Real-time updates
    newSocket.on("friends:request:received", () => {
      setPendingRequestsCount((c) => c + 1);
    });

    newSocket.on("friends:request:accepted", () => {
      setPendingRequestsCount((c) => Math.max(0, c - 1));
    });

    newSocket.on("messages:received", (data) => {
      // Не увеличиваем unread, если прямо сейчас открыт компактный чат с этим собеседником
      const senderId = data?.senderId;
      const isActive =
        activePartnerIdRef.current &&
        senderId &&
        String(activePartnerIdRef.current) === String(senderId);

      if (!isActive) {
        setUnreadMessagesCount((c) => c + 1);
      }
    });

    newSocket.on("friends:status:update", (data) => {
      if (data.onlineStatus === "online" || data.onlineStatus === "in_game") {
        setOnlineFriendsCount((c) => c + 1);
      } else if (data.onlineStatus === "offline") {
        setOnlineFriendsCount((c) => Math.max(0, c - 1));
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [isAuthenticated, user?.id]);

  // Открыть мессенджер и сразу выбрать диалог
  // Открыть компактный чат (окна снизу справа)
  const openChat = useCallback((odlerId, nickname, avatar) => {
    setOpenChats((prev) => {
      const exists = prev.some((c) => String(c.odlerId) === String(odlerId));
      if (exists) return prev;
      return [...prev, { odlerId, nickname, avatar }];
    });
    setActivePartnerId(odlerId);
  }, []);

  // Для совместимости (если где-то вызывается) 
  const openMessenger = useCallback(() => {
    setIsFriendsModalOpen(true);
    setFriendsModalTab("friends");
  }, []);

  const closeMessenger = useCallback(() => {
    // компактный режим: закрытие мессенджера = закрыть все чаты
    setOpenChats([]);
    setActivePartnerId(null);
  }, []);

  const toggleMessenger = useCallback(() => {
    setIsFriendsModalOpen((v) => !v);
    setFriendsModalTab("friends");
  }, []);

  // Close chat (legacy popups)
  const closeChat = useCallback((odlerId) => {
    setOpenChats((prev) => {
      const next = prev.filter((c) => String(c.odlerId) !== String(odlerId));
      // если закрыли активный чат — сбрасываем activePartnerId
      if (String(activePartnerIdRef.current) === String(odlerId)) {
        setActivePartnerId(next.length ? next[next.length - 1].odlerId : null);
      }
      return next;
    });
  }, []);

  // Open friends modal
  const openFriendsModal = useCallback((tab = "friends") => {
    setFriendsModalTab(tab);
    setIsFriendsModalOpen(true);
  }, []);

  // Invite to game
  const inviteToGame = useCallback((odlerId, gameType, roomCode) => {
    if (!socket || !isConnected) return;
    socket.emit("messages:game:invite", { odlerId, gameType, roomCode });
  }, [socket, isConnected]);

  const value = {
    socket,
    isConnected,
    connectionError,
    user,
    
    // Counters
    pendingRequestsCount,
    unreadMessagesCount,
    onlineFriendsCount,
    totalNotifications: pendingRequestsCount + unreadMessagesCount,
    
    // Actions
    openChat,
    closeChat,
    openFriendsModal,
    inviteToGame,
    openMessenger,
    closeMessenger,
    toggleMessenger,

    // UI state
    isMessengerOpen: openChats.length > 0,
    isCompactChatOpen: openChats.length > 0,

    // UI state setters
    setIsFriendsModalOpen,
    setPendingRequestsCount,
    setUnreadMessagesCount,
  };

  return (
    <SocialContext.Provider value={value}>
      <NotificationProvider
        socket={socket}
        isChatOpen={openChats.length > 0}
        activeChatPartnerId={activePartnerId}
      >
        {children}
        
        {/* Global social UI components */}
        {isAuthenticated && socket && (
          <>
            <FriendsModal
              isOpen={isFriendsModalOpen}
              onClose={() => setIsFriendsModalOpen(false)}
              socket={socket}
              initialTab={friendsModalTab}
              onOpenChat={openChat}
            />
            
            {/* Compact chat windows (bottom-right) */}
            <ChatContainer
              chats={openChats}
              onClose={closeChat}
              socket={socket}
              currentUserId={user?.id}
              onActivePartnerChange={setActivePartnerId}
            />
          </>
        )}
      </NotificationProvider>
    </SocialContext.Provider>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SOCIAL HEADER ICONS
// ═══════════════════════════════════════════════════════════════════════════

export function SocialHeaderIcons({ className = "" }) {
  const { 
    socket, 
    isConnected, 
    pendingRequestsCount, 
    unreadMessagesCount,
    onlineFriendsCount,
    openFriendsModal 
  } = useSocial();
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className={`social-header-icons ${className}`}>
      <FriendsIcon
        socket={socket}
        pendingCount={pendingRequestsCount}
        unreadCount={unreadMessagesCount}
        onlineFriendsCount={onlineFriendsCount}
        onClick={() => openFriendsModal("friends")}
        isConnected={isConnected}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CONNECTION STATUS INDICATOR
// ═══════════════════════════════════════════════════════════════════════════

export function ConnectionStatusIndicator() {
  const { isConnected, connectionError } = useSocial();

  if (isConnected) return null;

  return (
    <div className="connection-status-indicator">
      <div className="connection-status-dot" />
      <span>{connectionError || "Подключение..."}</span>
    </div>
  );
}

export default SocialProvider;

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
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
    });

    newSocket.on("connect", () => {
      setIsConnected(true);
      setConnectionError(null);
      // Initialize social data
      newSocket.emit("friends:init", {}, (response) => {
        if (response?.success) {
          setPendingRequestsCount(response.pendingCount || 0);
          setUnreadMessagesCount(response.unreadMessages || 0);
          setOnlineFriendsCount(response.onlineFriends || 0);
        }
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
      // Don't increment if chat is open
      const isChatOpen = openChats.some((c) => c.odlerId === data.senderId);
      if (!isChatOpen) {
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

  // Open chat with user
  const openChat = useCallback((odlerId, nickname, avatar) => {
    setOpenChats((prev) => {
      if (prev.some((c) => c.odlerId === odlerId)) {
        return prev; // Already open
      }
      return [...prev, { odlerId, nickname, avatar }];
    });
  }, []);

  // Close chat
  const closeChat = useCallback((odlerId) => {
    setOpenChats((prev) => prev.filter((c) => c.odlerId !== odlerId));
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
    
    // UI state setters
    setIsFriendsModalOpen,
    setPendingRequestsCount,
    setUnreadMessagesCount,
  };

  return (
    <SocialContext.Provider value={value}>
      <NotificationProvider socket={socket}>
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
            
            <ChatContainer
              chats={openChats}
              onClose={closeChat}
              socket={socket}
              currentUserId={user?.id}
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

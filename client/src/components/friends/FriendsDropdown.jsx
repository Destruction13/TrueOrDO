import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { useSocial } from "../social";
import FriendCard from "./FriendCard";
import FriendRequestCard from "./FriendRequestCard";
import "./FriendsDropdown.css";

const TABS = [
  { id: "all", label: "Все", icon: "👥" },
  { id: "online", label: "Онлайн", icon: "🟢" },
  { id: "in_game", label: "В игре", icon: "🎮" },
  { id: "requests", label: "Заявки", icon: "📩" },
];

/**
 * FriendsDropdown — выпадающее меню со списком друзей
 */

export default function FriendsDropdown({
  socket,
  onClose,
  pendingRequestsCount,
  onRequestsChange,
  onMessagesRead,
}) {
  const { openChat } = useSocial();
  const [activeTab, setActiveTab] = useState("all");
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  // Загрузка друзей
  const loadFriends = useCallback((filter = "all") => {
    if (!socket) return;

    setLoading(true);
    socket.emit("friends:list", { filter }, (response) => {
      if (response.success) {
        setFriends(response.friends || []);
      }
      setLoading(false);
    });
  }, [socket]);

  // Загрузка заявок
  const loadRequests = useCallback(() => {
    if (!socket) return;

    socket.emit("friends:requests:pending", {}, (response) => {
      if (response.success) {
        setPendingRequests(response.requests || []);
        onRequestsChange?.(response.requests?.length || 0);
      }
    });

    socket.emit("friends:requests:sent", {}, (response) => {
      if (response.success) {
        setSentRequests(response.requests || []);
      }
    });
  }, [socket, onRequestsChange]);

  // Поиск пользователей
  const searchUsers = useCallback((query) => {
    if (!socket || query.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    socket.emit("friends:search", { query, limit: 10 }, (response) => {
      if (response.success) {
        setSearchResults(response.users || []);
      }
      setIsSearching(false);
    });
  }, [socket]);

  // Загружаем данные при смене вкладки
  useEffect(() => {
    if (activeTab === "requests") {
      loadRequests();
    } else {
      loadFriends(activeTab);
    }
  }, [activeTab, loadFriends, loadRequests]);

  // Поиск с debounce
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        searchUsers(searchQuery);
      }, 300);
    } else {
      setSearchResults([]);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, searchUsers]);

  // Закрытие по клику вне
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  // Действия с друзьями
  const handleRemoveFriend = (odlerId) => {
    socket.emit("friends:remove", { odlerId }, (response) => {
      if (response.success) {
        setFriends((prev) => prev.filter((f) => f.odlerId !== odlerId));
      }
    });
  };

  const handleAcceptRequest = (requestId) => {
    socket.emit("friends:request:accept", { requestId }, (response) => {
      if (response.success) {
        loadRequests();
        loadFriends(activeTab);
      }
    });
  };

  const handleRejectRequest = (requestId) => {
    socket.emit("friends:request:reject", { requestId }, (response) => {
      if (response.success) {
        loadRequests();
      }
    });
  };

  const handleCancelRequest = (requestId) => {
    socket.emit("friends:request:cancel", { requestId }, (response) => {
      if (response.success) {
        loadRequests();
      }
    });
  };

  const handleSendRequest = (userId) => {
    socket.emit("friends:request:send", { receiverId: userId }, (response) => {
      if (response.success) {
        // Обновляем результаты поиска
        setSearchResults((prev) =>
          prev.map((u) =>
            u.id === userId
              ? { ...u, friendshipStatus: "pending_sent", requestId: response.request?.id }
              : u
          )
        );
      }
    });
  };

  // Фильтрация друзей по поиску
  const filteredFriends = searchQuery
    ? friends.filter((f) =>
      f.nickname?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : friends;

  return (
    <motion.div
      ref={dropdownRef}
      className="friends-dropdown"
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.2 }}
    >
      {/* Заголовок */}
      <div className="friends-dropdown__header">
        <h3 className="friends-dropdown__title">Друзья</h3>
        <button className="friends-dropdown__close" onClick={onClose}>
          ✕
        </button>
      </div>

      {/* Поиск */}
      <div className="friends-dropdown__search">
        <input
          type="text"
          placeholder="Поиск друзей или пользователей..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="friends-dropdown__search-input"
        />
        {searchQuery && (
          <button
            className="friends-dropdown__search-clear"
            onClick={() => setSearchQuery("")}
          >
            ✕
          </button>
        )}
      </div>

      {/* Вкладки */}
      <div className="friends-dropdown__tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`friends-dropdown__tab ${activeTab === tab.id ? "friends-dropdown__tab--active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="friends-dropdown__tab-icon">{tab.icon}</span>
            <span className="friends-dropdown__tab-label">{tab.label}</span>
            {tab.id === "requests" && pendingRequestsCount > 0 && (
              <span className="friends-dropdown__tab-badge">{pendingRequestsCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* Контент */}
      <div className="friends-dropdown__content">
        {/* Результаты поиска пользователей */}
        {searchQuery.length >= 2 && searchResults.length > 0 && (
          <div className="friends-dropdown__section">
            <h4 className="friends-dropdown__section-title">Найденные пользователи</h4>
            <div className="friends-dropdown__list">
              {searchResults.map((user) => (
                <FriendCard
                  key={user.id}
                  user={user}
                  isSearchResult
                  friendshipStatus={user.friendshipStatus}
                  onSendRequest={() => handleSendRequest(user.id)}
                />
              ))}
            </div>
          </div>
        )}

        {isSearching && (
          <div className="friends-dropdown__loading">Поиск...</div>
        )}

        {/* Список друзей */}
        {activeTab !== "requests" && (
          <>
            {loading ? (
              <div className="friends-dropdown__loading">Загрузка...</div>
            ) : filteredFriends.length === 0 ? (
              <div className="friends-dropdown__empty">
                {searchQuery ? "Друзья не найдены" : "Список пуст"}
              </div>
            ) : (
              <div className="friends-dropdown__list">
                {filteredFriends.map((friend) => (
                  <FriendCard
                    key={friend.id || friend.odlerId}
                    user={friend}
                    onRemove={() => handleRemoveFriend(friend.odlerId)}
                    onMessage={() => {
                      openChat?.(friend.id || friend.odlerId, friend.nickname, friend.avatarUrl || friend.avatar);
                      onClose?.();
                    }}
                    onInvite={() => {
                      // TODO: пригласить в игру (требует gameType/roomCode)
                    }}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Заявки */}
        {activeTab === "requests" && (
          <>
            {/* Входящие */}
            {pendingRequests.length > 0 && (
              <div className="friends-dropdown__section">
                <h4 className="friends-dropdown__section-title">
                  Входящие ({pendingRequests.length})
                </h4>
                <div className="friends-dropdown__list">
                  {pendingRequests.map((request) => (
                    <FriendRequestCard
                      key={request.id}
                      request={request}
                      type="incoming"
                      onAccept={() => handleAcceptRequest(request.id)}
                      onReject={() => handleRejectRequest(request.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Исходящие */}
            {sentRequests.length > 0 && (
              <div className="friends-dropdown__section">
                <h4 className="friends-dropdown__section-title">
                  Исходящие ({sentRequests.length})
                </h4>
                <div className="friends-dropdown__list">
                  {sentRequests.map((request) => (
                    <FriendRequestCard
                      key={request.id}
                      request={request}
                      type="outgoing"
                      onCancel={() => handleCancelRequest(request.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {pendingRequests.length === 0 && sentRequests.length === 0 && (
              <div className="friends-dropdown__empty">Нет заявок</div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}

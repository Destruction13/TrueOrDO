import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import FriendCard from "./FriendCard";
import FriendRequestCard from "./FriendRequestCard";
import "./FriendsModal.css";

export default function FriendsModal({ isOpen, onClose, socket, initialTab = "friends", onOpenChat }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && socket) {
      loadData();
    }
  }, [isOpen, socket, activeTab]);

  const loadData = () => {
    if (!socket) return;
    setLoading(true);

    if (activeTab === "friends") {
      socket.emit("friends:list", { filter }, (response) => {
        if (response?.success) setFriends(response.friends || []);
        setLoading(false);
      });
    } else if (activeTab === "requests") {
      socket.emit("friends:requests:pending", {}, (response) => {
        if (response?.success) setPendingRequests(response.requests || []);
      });
      socket.emit("friends:requests:sent", {}, (response) => {
        if (response?.success) setSentRequests(response.requests || []);
        setLoading(false);
      });
    }
  };

  const handleAcceptRequest = (requestId) => {
    socket?.emit("friends:request:accept", { requestId }, (response) => {
      if (response?.success) {
        setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
      }
    });
  };

  const handleRejectRequest = (requestId) => {
    socket?.emit("friends:request:reject", { requestId }, (response) => {
      if (response?.success) {
        setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
      }
    });
  };

  const handleRemoveFriend = (odlerId) => {
    socket?.emit("friends:remove", { odlerId }, (response) => {
      if (response?.success) {
        setFriends((prev) => prev.filter((f) => f.odlerId !== odlerId));
      }
    });
  };

  const filteredFriends = friends.filter((friend) => {
    const matchesSearch = friend.nickname?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === "all" || friend.onlineStatus === filter || 
      (filter === "online" && (friend.onlineStatus === "online" || friend.onlineStatus === "in_game"));
    return matchesSearch && matchesFilter;
  });

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="friends-modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="friends-modal"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="friends-modal__header">
            <h2>Друзья</h2>
            <button className="friends-modal__close" onClick={onClose}>×</button>
          </div>

          <div className="friends-modal__tabs">
            <button
              className={`friends-modal__tab ${activeTab === "friends" ? "active" : ""}`}
              onClick={() => setActiveTab("friends")}
            >
              Друзья ({friends.length})
            </button>
            <button
              className={`friends-modal__tab ${activeTab === "requests" ? "active" : ""}`}
              onClick={() => setActiveTab("requests")}
            >
              Заявки ({pendingRequests.length})
            </button>
          </div>

          {activeTab === "friends" && (
            <>
              <div className="friends-modal__filters">
                <input
                  type="text"
                  placeholder="Поиск друзей..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="friends-modal__search"
                />
                <select value={filter} onChange={(e) => setFilter(e.target.value)} className="friends-modal__filter">
                  <option value="all">Все</option>
                  <option value="online">Онлайн</option>
                  <option value="in_game">В игре</option>
                  <option value="offline">Оффлайн</option>
                </select>
              </div>

              <div className="friends-modal__list">
                {loading ? (
                  <div className="friends-modal__loading">Загрузка...</div>
                ) : filteredFriends.length === 0 ? (
                  <div className="friends-modal__empty">Нет друзей</div>
                ) : (
                  filteredFriends.map((friend) => (
                    <FriendCard
                      key={friend.id || friend.odlerId}
                      user={friend}
                      onMessage={() => {
                        onOpenChat?.(friend.id, friend.nickname, friend.avatar);
                        onClose?.();
                      }}
                      onRemove={() => handleRemoveFriend(friend.odlerId)}
                    />
                  ))
                )}
              </div>
            </>
          )}

          {activeTab === "requests" && (
            <div className="friends-modal__list">
              {pendingRequests.length > 0 && (
                <>
                  <h3 className="friends-modal__section-title">Входящие</h3>
                  {pendingRequests.map((request) => (
                    <FriendRequestCard
                      key={request.id}
                      request={request}
                      type="incoming"
                      onAccept={() => handleAcceptRequest(request.id)}
                      onReject={() => handleRejectRequest(request.id)}
                    />
                  ))}
                </>
              )}
              {sentRequests.length > 0 && (
                <>
                  <h3 className="friends-modal__section-title">Исходящие</h3>
                  {sentRequests.map((request) => (
                    <FriendRequestCard
                      key={request.id}
                      request={request}
                      type="outgoing"
                    />
                  ))}
                </>
              )}
              {pendingRequests.length === 0 && sentRequests.length === 0 && (
                <div className="friends-modal__empty">Нет заявок</div>
              )}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

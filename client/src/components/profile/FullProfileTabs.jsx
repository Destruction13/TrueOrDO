import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import BoardTab from "./BoardTab";
import ActivityTab from "./ActivityTab";
import WishlistTab from "./WishlistTab";
import "./FullProfileTabs.css";

// Конфигурация вкладок
const TABS_CONFIG = [
  { id: "board", label: "Доска", icon: "📋" },
  { id: "activity", label: "Активность", icon: "⚡" },
  { id: "wishlist", label: "Вишлист", icon: "🎁" },
];

/**
 * FullProfileTabs — система вкладок правой колонки
 * Референс: image/README/fullprofdoska.png, image/README/active.png
 */
function FullProfileTabs({ profileData, isSelf, initialTab = "board", onProfileUpdate, socket }) {
  const [activeTab, setActiveTab] = useState(initialTab);

  const handleTabChange = useCallback((tabId) => {
    setActiveTab(tabId);
  }, []);

  const renderTabContent = () => {
    switch (activeTab) {
      case "board":
        return (
          <BoardTab 
            profileData={profileData} 
            isSelf={isSelf} 
            onProfileUpdate={onProfileUpdate}
            socket={socket}
          />
        );
      case "activity":
        return (
          <ActivityTab 
            profileData={profileData} 
            isSelf={isSelf}
            socket={socket}
            userId={profileData?.userId || profileData?.id}
          />
        );
      case "wishlist":
        return (
          <WishlistTab 
            profileData={profileData} 
            isSelf={isSelf}
            onProfileUpdate={onProfileUpdate}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="full-profile-tabs">
      {/* Заголовок с вкладками */}
      <div className="full-profile-tabs__header">
        <div className="full-profile-tabs__nav">
          {TABS_CONFIG.map((tab) => (
            <button
              key={tab.id}
              className={`full-profile-tabs__tab ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => handleTabChange(tab.id)}
            >
              <span className="full-profile-tabs__tab-label">{tab.label}</span>
              {activeTab === tab.id && (
                <motion.div
                  className="full-profile-tabs__tab-indicator"
                  layoutId="tabIndicator"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Контент вкладки */}
      <div className="full-profile-tabs__content">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="full-profile-tabs__content-inner"
          >
            {renderTabContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

export default FullProfileTabs;

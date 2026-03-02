import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import PremiumBuyPrompt, { AccessBadge } from "./PremiumBuyPrompt";
import "./FrameSelector.css";

// Конфигурация игр для табов
const GAME_TABS = [
  { id: "all", label: "🎮 Общая", description: "Рамка для всех игр" },
  { id: "alias", label: "📝 Alias", description: "Только для Alias" },
  { id: "tod", label: "🎭 Truth or Dare", description: "Только для ToD" },
  { id: "codenames", label: "🕵️ Codenames", description: "Только для Codenames" },
  { id: "emotional", label: "😊 Emotional", description: "Только для Emotional" },
];

// Маппинг id таба на поле в customization
const FRAME_FIELD_MAP = {
  all: "frameAll",
  alias: "frameAlias",
  tod: "frameTod",
  codenames: "frameCodenames",
  emotional: "frameEmotional",
};

/**
 * Компонент выбора рамки для аватара
 * Отображает сетку доступных рамок с превью
 * Поддерживает проверку доступа (free/vip/pro/purchasable)
 * Поддерживает выбор рамок для разных игр (табы)
 */
export default function FrameSelector() {
  const { user, customization, getFrames, updateCustomization, subscription, purchases } = useAuth();
  
  const [frames, setFrames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState(null);
  
  // Текущий выбранный таб (игра)
  const [activeTab, setActiveTab] = useState("all");
  
  // Превью-состояние (для показа платных элементов без сохранения)
  const [previewFrame, setPreviewFrame] = useState(null);
  const [showBuyPrompt, setShowBuyPrompt] = useState(false);
  const [selectedPaidFrame, setSelectedPaidFrame] = useState(null);

  // Загружаем список рамок при монтировании
  useEffect(() => {
    loadFrames();
  }, []);

  const loadFrames = async () => {
    try {
      setLoading(true);
      setError(null);
      const framesData = await getFrames();
      setFrames(framesData || []);
    } catch (err) {
      console.error("Failed to load frames:", err);
      setError("Не удалось загрузить рамки");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Проверяет, имеет ли пользователь доступ к элементу
   */
  const hasAccess = (frame) => {
    if (frame.accessType === "free") return true;
    
    // Проверяем подписку
    const userTier = subscription?.tier?.toLowerCase();
    if (frame.accessType === "vip" && (userTier === "vip" || userTier === "pro")) return true;
    if (frame.accessType === "pro" && userTier === "pro") return true;
    
    // Проверяем разовые покупки
    if (frame.accessType === "purchasable") {
      const purchased = purchases?.some(
        p => p.itemType === "frame" && p.itemId === frame.slug
      );
      if (purchased) return true;
    }
    
    return false;
  };

  // Получаем текущую рамку для активного таба
  const getCurrentFrameForTab = () => {
    const fieldName = FRAME_FIELD_MAP[activeTab];
    return customization?.[fieldName] || null;
  };

  // Фильтруем рамки для текущего таба
  const getFilteredFrames = () => {
    return frames.filter(frame => 
      frame.game === "all" || frame.game === activeTab
    );
  };

  const handleSelectFrame = async (frame) => {
    if (updating) return;
    
    const slug = frame?.slug || null;
    const currentFrame = getCurrentFrameForTab();
    const fieldName = FRAME_FIELD_MAP[activeTab];
    
    // Если уже выбрана — не делаем ничего
    if (currentFrame === slug || (!currentFrame && !slug)) {
      setPreviewFrame(null);
      setShowBuyPrompt(false);
      return;
    }

    // Проверяем доступ
    if (frame && !hasAccess(frame)) {
      // Показываем превью, но НЕ сохраняем
      setPreviewFrame(slug);
      setSelectedPaidFrame(frame);
      setShowBuyPrompt(true);
      return;
    }

    // Имеем доступ — сохраняем
    setPreviewFrame(null);
    setShowBuyPrompt(false);
    setSelectedPaidFrame(null);

    try {
      setUpdating(true);
      setError(null);
      // Сохраняем в соответствующее поле для текущего таба
      await updateCustomization({ [fieldName]: slug });
    } catch (err) {
      console.error("Failed to update frame:", err);
      setError("Не удалось сохранить выбор");
    } finally {
      setUpdating(false);
    }
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    // Сбрасываем превью при смене таба
    setPreviewFrame(null);
    setShowBuyPrompt(false);
    setSelectedPaidFrame(null);
  };

  const handleBuyFrame = () => {
    // TODO: Интеграция с платёжной системой для разовой покупки
    console.log("Buy frame:", selectedPaidFrame);
    // Пока редиректим на pricing
    window.location.href = "/pricing";
  };

  // Формируем URL превью рамки (один файл на рамку)
  const getFramePreviewUrl = (slug) => `/frames/${slug}.png`;

  if (loading) {
    return (
      <div className="frame-selector">
        <div className="frame-selector__title">🖼️ Рамка профиля</div>
        <div className="frame-selector__loading">Загрузка...</div>
      </div>
    );
  }

  // Активная рамка для текущего таба: превью (если смотрим платную) или сохранённая
  const savedFrame = getCurrentFrameForTab();
  const displayFrame = previewFrame || savedFrame;
  
  // Рамки для текущего таба
  const filteredFrames = getFilteredFrames();
  
  // Текущий таб
  const currentTab = GAME_TABS.find(t => t.id === activeTab);

  return (
    <div className="frame-selector">
      <div className="frame-selector__title">
        🖼️ Рамка профиля
        {updating && <span style={{ fontSize: "0.75rem" }}> Сохранение...</span>}
      </div>

      {/* Табы по играм */}
      <div className="frame-selector__tabs">
        {GAME_TABS.map((tab) => {
          const fieldName = FRAME_FIELD_MAP[tab.id];
          const hasCustomFrame = customization?.[fieldName] && customization[fieldName] !== customization?.frameAll;
          
          return (
            <button
              key={tab.id}
              type="button"
              className={`frame-selector__tab ${activeTab === tab.id ? "frame-selector__tab--active" : ""}`}
              onClick={() => handleTabChange(tab.id)}
              title={tab.description}
            >
              {tab.label}
              {hasCustomFrame && <span className="frame-selector__tab-dot" />}
            </button>
          );
        })}
      </div>
      
      {/* Описание текущего таба */}
      <div className="frame-selector__tab-description">
        {currentTab?.description}
        {activeTab !== "all" && savedFrame === null && (
          <span className="frame-selector__tab-fallback">
            {" "}(используется общая: {customization?.frameAll || "нет"})
          </span>
        )}
      </div>

      {error && <div className="frame-selector__error">{error}</div>}

      <div className="frame-selector__grid">
        {/* Вариант "Без рамки" / "Использовать общую" */}
        <button
          type="button"
          className={`frame-selector__item frame-selector__item--none ${
            !displayFrame ? "frame-selector__item--selected" : ""
          }`}
          onClick={() => handleSelectFrame(null)}
          disabled={updating}
          title={activeTab === "all" ? "Без рамки" : "Использовать общую рамку"}
        >
          <span>{activeTab === "all" ? "🚫" : "🔄"}</span>
          <span>{activeTab === "all" ? "Без рамки" : "Общая"}</span>
        </button>

        {/* Доступные рамки для текущего таба */}
        {filteredFrames.map((frame) => {
          const isSelected = displayFrame === frame.slug;
          const isLocked = !hasAccess(frame);
          const isPreview = previewFrame === frame.slug;
          const isGameSpecific = frame.game !== "all";
          
          return (
            <button
              key={frame.id}
              type="button"
              className={`frame-selector__item ${
                isSelected ? "frame-selector__item--selected" : ""
              } ${isLocked ? "frame-selector__item--locked" : ""} ${
                isPreview ? "frame-selector__item--preview" : ""
              } ${isGameSpecific ? "frame-selector__item--game-specific" : ""}`}
              onClick={() => handleSelectFrame(frame)}
              disabled={updating}
              title={frame.name}
            >
              {/* Бейдж доступа */}
              <AccessBadge accessType={frame.accessType} price={frame.price} />
              
              {/* Бейдж игры для специфичных рамок */}
              {isGameSpecific && (
                <span className="frame-selector__game-badge">{frame.game}</span>
              )}
              
              <img
                src={getFramePreviewUrl(frame.slug)}
                alt={frame.name}
                className="frame-selector__preview"
              />
              <span className="frame-selector__name">{frame.name}</span>
            </button>
          );
        })}
      </div>

      {/* Промпт покупки для платных элементов */}
      <AnimatePresence>
        {showBuyPrompt && selectedPaidFrame && (
          <PremiumBuyPrompt
            requiredAccess={selectedPaidFrame.accessType}
            price={selectedPaidFrame.price}
            itemName={selectedPaidFrame.name}
            onBuy={handleBuyFrame}
            onClose={() => {
              setShowBuyPrompt(false);
              setPreviewFrame(null);
              setSelectedPaidFrame(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

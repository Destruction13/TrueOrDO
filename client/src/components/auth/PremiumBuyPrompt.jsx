import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { RainbowButton } from "../pricing";
import "./PremiumBuyPrompt.css";

/**
 * Компонент для отображения промпта покупки премиум-элемента
 * Показывается когда пользователь выбирает платный элемент без подписки
 * 
 * @param {Object} props
 * @param {"VIP"|"PRO"|"purchasable"} props.requiredAccess - Требуемый уровень доступа
 * @param {number} [props.price] - Цена в копейках (для purchasable)
 * @param {string} [props.itemName] - Название элемента
 * @param {function} [props.onBuy] - Callback при нажатии "Купить" (для разовых покупок)
 * @param {function} [props.onClose] - Callback для закрытия
 */
export default function PremiumBuyPrompt({ 
  requiredAccess, 
  price, 
  itemName,
  onBuy,
  onClose 
}) {
  const navigate = useNavigate();
  
  // Цены подписок
  const subscriptionPrices = {
    VIP: "399 ₽",
    PRO: "699 ₽"
  };
  
  // Форматирование цены из копеек
  const formatPrice = (priceInKopecks) => {
    const rubles = priceInKopecks / 100;
    return `${rubles} ₽`;
  };
  
  const handleSubscriptionBuy = () => {
    navigate("/pricing");
    onClose?.();
  };
  
  const handleItemBuy = () => {
    onBuy?.();
  };
  
  // Для разовой покупки
  if (requiredAccess === "purchasable" && price) {
    return (
      <motion.div 
        className="premium-buy-prompt"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.2 }}
      >
        <p className="premium-buy-prompt__text">
          🔒 {itemName || "Этот элемент"} доступен для покупки
        </p>
        <RainbowButton onClick={handleItemBuy}>
          Купить — {formatPrice(price)}
        </RainbowButton>
      </motion.div>
    );
  }
  
  // Для подписки VIP/PRO
  return (
    <motion.div 
      className="premium-buy-prompt"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.2 }}
    >
      <p className="premium-buy-prompt__text">
        🔒 Требуется подписка {requiredAccess}
      </p>
      <RainbowButton onClick={handleSubscriptionBuy}>
        Купить {requiredAccess} — {subscriptionPrices[requiredAccess]}
      </RainbowButton>
    </motion.div>
  );
}

/**
 * Бейдж для отображения на элементе (VIP/PRO/Цена)
 */
export function AccessBadge({ accessType, price }) {
  if (accessType === "free") return null;
  
  const formatPrice = (priceInKopecks) => {
    const rubles = priceInKopecks / 100;
    return `${rubles}₽`;
  };
  
  const badgeConfig = {
    vip: { label: "VIP", className: "access-badge--vip" },
    pro: { label: "PRO", className: "access-badge--pro" },
    purchasable: { 
      label: price ? formatPrice(price) : "💰", 
      className: "access-badge--purchasable" 
    }
  };
  
  const config = badgeConfig[accessType] || badgeConfig.purchasable;
  
  return (
    <span className={`access-badge ${config.className}`}>
      {config.label}
    </span>
  );
}

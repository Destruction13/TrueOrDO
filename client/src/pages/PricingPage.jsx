import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LampBackground, RainbowButton } from '../components/pricing';
import { 
  PaymentSuccessModal, 
  PaymentErrorModal, 
  PaymentLoadingModal,
  AuthRequiredModal 
} from '../components/pricing/PaymentModals';
import { createPayment, getSubscriptionStatus } from '../api/subscription';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';
import './PricingPage.css';

/**
 * PricingPage — страница покупки VIP и PRO статусов
 * 
 * Текущий режим: разовая покупка (без подписки)
 * Платёжная система: Трибьют
 * 
 * Цены:
 * - VIP: 399 ₽ (бессрочный доступ)
 * - PRO: 699 ₽ (бессрочный доступ)
 */
function PricingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Состояние подписки
  const [subscription, setSubscription] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  
  // Состояние оплаты
  const [paymentState, setPaymentState] = useState('idle'); // idle | loading | success | error
  const [selectedTier, setSelectedTier] = useState(null);
  const [error, setError] = useState(null);
  
  // Модалки
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Загрузить статус подписки
  useEffect(() => {
    async function loadSubscription() {
      if (!user) {
        setLoadingStatus(false);
        return;
      }
      
      try {
        const data = await getSubscriptionStatus();
        if (data.hasSubscription) {
          setSubscription(data.subscription);
        }
      } catch (err) {
        console.error('Ошибка загрузки подписки:', err);
      } finally {
        setLoadingStatus(false);
      }
    }
    
    loadSubscription();
  }, [user]);

  // Socket.IO — слушаем событие активации подписки
  useEffect(() => {
    if (!user) return;
    
    const socket = io({
      withCredentials: true
    });
    
    socket.on('subscription:activated', (data) => {
      console.log('Подписка активирована:', data);
      setSubscription(data);
      setPaymentState('success');
      setSelectedTier(data.tier);
    });
    
    return () => {
      socket.off('subscription:activated');
      socket.disconnect();
    };
  }, [user]);

  // Обработка покупки
  const handleBuy = async (tier) => {
    // Проверить авторизацию
    if (!user) {
      setSelectedTier(tier);
      setShowAuthModal(true);
      return;
    }
    
    // Проверить существующую подписку
    if (subscription) {
      if (subscription.tier === tier) {
        setError(`У вас уже есть подписка ${tier}`);
        setPaymentState('error');
        return;
      }
      if (subscription.tier === 'PRO' && tier === 'VIP') {
        setError('У вас уже есть PRO, которая включает все преимущества VIP');
        setPaymentState('error');
        return;
      }
    }
    
    setSelectedTier(tier);
    setPaymentState('loading');
    setError(null);
    
    try {
      const result = await createPayment(tier);
      
      if (result.paymentUrl) {
        // Переход на страницу оплаты Трибьют
        window.location.href = result.paymentUrl;
      } else {
        // Пока интеграция не завершена — показываем сообщение
        console.log('Платёж создан:', result);
        setError('Интеграция с платёжной системой в процессе. Платёж создан, но ссылка на оплату пока недоступна.');
        setPaymentState('error');
      }
    } catch (err) {
      console.error('Ошибка создания платежа:', err);
      setError(err.message || 'Произошла ошибка при создании платежа');
      setPaymentState('error');
    }
  };

  const handleRetry = () => {
    setPaymentState('idle');
    setError(null);
    if (selectedTier) {
      handleBuy(selectedTier);
    }
  };

  const handleCloseModals = () => {
    setPaymentState('idle');
    setError(null);
    setSelectedTier(null);
  };

  const handleLogin = () => {
    setShowAuthModal(false);
    navigate('/login', { state: { from: '/pricing' } });
  };

  // Проверить, есть ли у пользователя уже эта подписка
  const hasTier = (tier) => {
    if (!subscription) return false;
    if (tier === 'VIP') return subscription.tier === 'VIP' || subscription.tier === 'PRO';
    if (tier === 'PRO') return subscription.tier === 'PRO';
    return false;
  };

  // Кнопка "Назад"
  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <LampBackground>
      <div className="pricing-page__container">
        {/* Кнопка Назад */}
        <motion.button
          className="pricing-page__back-btn"
          onClick={handleGoBack}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          ← Назад
        </motion.button>

        <header className="pricing-page__header">
          <motion.h1 
            className="pricing-page__title"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            🔮 Premium
          </motion.h1>
          <motion.p 
            className="pricing-page__subtitle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            Разблокируй все возможности
          </motion.p>
          
          {/* Показать текущую подписку */}
          {subscription && (
            <motion.div
              className="pricing-page__current-plan"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              ✅ Ваш текущий план: <strong>{subscription.tier}</strong>
            </motion.div>
          )}
        </header>

        <div className="pricing-page__cards">
          {/* VIP Card */}
          <motion.div 
            className={`pricing-card pricing-card--vip ${hasTier('VIP') ? 'pricing-card--owned' : ''}`}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            whileHover={{ y: hasTier('VIP') ? 0 : -16, transition: { duration: 0.2, ease: 'easeOut' } }}
          >
            {hasTier('VIP') && <div className="pricing-card__owned-badge">✓ Активно</div>}
            <h2 className="pricing-card__title">VIP</h2>
            <ul className="pricing-card__features">
              <li>⭐ Эксклюзивные рамки аватара</li>
              <li>✨ Анимированные эффекты никнейма</li>
              <li>🚫 Отключение рекламы</li>
              <li>🎭 Особые цвета никнейма</li>
              <li>📊 Расширенная статистика</li>
            </ul>
            <div className="pricing-card__price">
              <span className="pricing-card__amount">399 ₽</span>
            </div>
            {hasTier('VIP') ? (
              <button 
                className="pricing-card__button pricing-card__button--outline"
                disabled
              >
                Уже куплено
              </button>
            ) : (
              <RainbowButton 
                onClick={() => handleBuy('VIP')}
                disabled={paymentState === 'loading'}
                loading={paymentState === 'loading' && selectedTier === 'VIP'}
              >
                ⭐ Купить VIP
              </RainbowButton>
            )}
          </motion.div>

          {/* PRO Card */}
          <motion.div 
            className={`pricing-card pricing-card--pro pricing-card--recommended ${hasTier('PRO') ? 'pricing-card--owned' : ''}`}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            whileHover={{ y: hasTier('PRO') ? 0 : -16, transition: { duration: 0.2, ease: 'easeOut' } }}
          >
            {hasTier('PRO') ? (
              <div className="pricing-card__owned-badge">✓ Активно</div>
            ) : (
              <div className="pricing-card__badge">Рекомендуем</div>
            )}
            <h2 className="pricing-card__title">PRO</h2>
            <ul className="pricing-card__features">
              <li>⭐ Все преимущества VIP</li>
              <li>🏠 Создание приватных комнат</li>
              <li>👑 Роль "Хост" в играх</li>
              <li>🎯 Приоритетный подбор игроков</li>
              <li>💬 Кастомные эмодзи</li>
              <li>🏆 Особый значок в лидербордах</li>
              <li>📞 Приоритетная поддержка</li>
            </ul>
            <div className="pricing-card__price">
              <span className="pricing-card__amount">699 ₽</span>
            </div>
            {hasTier('PRO') ? (
              <button 
                className="pricing-card__button pricing-card__button--outline"
                disabled
              >
                Уже куплено
              </button>
            ) : (
              <RainbowButton 
                onClick={() => handleBuy('PRO')}
                disabled={paymentState === 'loading'}
                loading={paymentState === 'loading' && selectedTier === 'PRO'}
              >
                🌟 Купить PRO
              </RainbowButton>
            )}
          </motion.div>
        </div>

        <motion.footer 
          className="pricing-page__footer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          <p>🔒 Безопасная оплата через Трибьют</p>
        </motion.footer>
      </div>

      {/* Модалки */}
      <PaymentLoadingModal 
        isOpen={paymentState === 'loading'} 
        message="Создаём платёж..." 
      />
      
      <PaymentSuccessModal 
        isOpen={paymentState === 'success'} 
        onClose={handleCloseModals}
        tier={selectedTier}
      />
      
      <PaymentErrorModal 
        isOpen={paymentState === 'error'} 
        onClose={handleCloseModals}
        onRetry={handleRetry}
        error={error}
      />
      
      <AuthRequiredModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)}
        onLogin={handleLogin}
      />
    </LampBackground>
  );
}

export default PricingPage;

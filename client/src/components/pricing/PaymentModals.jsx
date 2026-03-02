import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './PaymentModals.css';

/**
 * Модалка успешной оплаты
 */
export function PaymentSuccessModal({ isOpen, onClose, tier }) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="payment-modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="payment-modal payment-modal--success"
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="payment-modal__icon">🎉</div>
          <h2 className="payment-modal__title">Поздравляем!</h2>
          <p className="payment-modal__text">
            Подписка <strong>{tier}</strong> успешно активирована!
          </p>
          <p className="payment-modal__subtext">
            Все премиум-функции теперь доступны
          </p>
          <button 
            className="payment-modal__button payment-modal__button--primary"
            onClick={onClose}
          >
            Отлично!
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Модалка ошибки оплаты
 */
export function PaymentErrorModal({ isOpen, onClose, onRetry, error }) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="payment-modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="payment-modal payment-modal--error"
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="payment-modal__icon">😔</div>
          <h2 className="payment-modal__title">Ошибка оплаты</h2>
          <p className="payment-modal__text">
            {error || 'Произошла ошибка при обработке платежа'}
          </p>
          <div className="payment-modal__actions">
            <button 
              className="payment-modal__button payment-modal__button--primary"
              onClick={onRetry}
            >
              Попробовать снова
            </button>
            <button 
              className="payment-modal__button payment-modal__button--secondary"
              onClick={onClose}
            >
              Отмена
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Модалка загрузки/ожидания
 */
export function PaymentLoadingModal({ isOpen, message }) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="payment-modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="payment-modal payment-modal--loading"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
        >
          <div className="payment-modal__spinner" />
          <p className="payment-modal__text">
            {message || 'Обрабатываем платёж...'}
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Модалка требования авторизации
 */
export function AuthRequiredModal({ isOpen, onClose, onLogin }) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="payment-modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="payment-modal payment-modal--auth"
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="payment-modal__icon">🔐</div>
          <h2 className="payment-modal__title">Требуется авторизация</h2>
          <p className="payment-modal__text">
            Войдите в аккаунт, чтобы оформить подписку
          </p>
          <div className="payment-modal__actions">
            <button 
              className="payment-modal__button payment-modal__button--primary"
              onClick={onLogin}
            >
              Войти
            </button>
            <button 
              className="payment-modal__button payment-modal__button--secondary"
              onClick={onClose}
            >
              Отмена
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default {
  PaymentSuccessModal,
  PaymentErrorModal,
  PaymentLoadingModal,
  AuthRequiredModal
};

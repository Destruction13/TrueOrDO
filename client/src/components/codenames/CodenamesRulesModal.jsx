import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";
import "../ui/RulesModal.css";

/**
 * CodenamesRulesModal — модальное окно с правилами игры Codenames
 * Использует стили от RulesModal для консистентности
 */
export default function CodenamesRulesModal({ isOpen, onClose }) {
  // Блокируем скролл body когда модалка открыта
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="rules-modal__backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal container - центрирует контент */}
          <motion.div
            className="rules-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          >
            {/* Modal box - сама карточка */}
            <motion.div
              className="rules-modal__box"
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="rules-modal__header">
                <div className="rules-modal__title-wrapper">
                  <span className="rules-modal__icon">🕵️</span>
                  <h2 className="rules-modal__title">Правила Codenames</h2>
                </div>
                <button className="rules-modal__close" onClick={onClose}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div className="rules-modal__content">
                {/* Section 1: Цель игры */}
                <section className="rules-section">
                  <div className="rules-section__header">
                    <span className="rules-section__number">1</span>
                    <h3 className="rules-section__title">Цель игры</h3>
                  </div>
                  <div className="rules-section__body">
                    <p>Две команды соревнуются в разгадывании кодовых имён своих агентов.</p>
                    <p>Команда, первой <strong>открывшая все свои карточки</strong>, побеждает!</p>
                  </div>
                </section>

                {/* Section 2: Как играть */}
                <section className="rules-section">
                  <div className="rules-section__header">
                    <span className="rules-section__number">2</span>
                    <h3 className="rules-section__title">Как играть</h3>
                  </div>
                  <div className="rules-section__body">
                    <p>На поле <strong>25 карточек</strong> со словами. Капитан видит цвета всех карточек.</p>
                    <p>Капитан даёт подсказку: <strong>СЛОВО — ЧИСЛО</strong>. Команда угадывает карточки.</p>
                  </div>
                </section>

                {/* Section 3: Подсказки */}
                <section className="rules-section">
                  <div className="rules-section__header">
                    <span className="rules-section__number">3</span>
                    <h3 className="rules-section__title">Подсказки капитана</h3>
                  </div>
                  <div className="rules-section__body">
                    <ul className="rules-list">
                      <li className="rules-list__item rules-list__item--accept">
                        <span className="rules-list__icon">✓</span>
                        <span>Слово связано <strong>по смыслу</strong> с карточками</span>
                      </li>
                      <li className="rules-list__item rules-list__item--accept">
                        <span className="rules-list__icon">✓</span>
                        <span>Число — сколько карточек связано с подсказкой</span>
                      </li>
                      <li className="rules-list__item rules-list__item--accept">
                        <span className="rules-list__icon">✓</span>
                        <span>Команда может угадать на <strong>1 больше</strong> числа</span>
                      </li>
                    </ul>
                  </div>
                </section>

                {/* Section 4: Запреты */}
                <section className="rules-section">
                  <div className="rules-section__header">
                    <span className="rules-section__number">4</span>
                    <h3 className="rules-section__title">Запрещено</h3>
                  </div>
                  <div className="rules-section__body">
                    <ul className="rules-list">
                      <li className="rules-list__item rules-list__item--decline">
                        <span className="rules-list__icon">✗</span>
                        <span><strong>Однокоренные</strong> со словами на поле</span>
                      </li>
                      <li className="rules-list__item rules-list__item--decline">
                        <span className="rules-list__icon">✗</span>
                        <span><strong>Созвучия</strong> без смысловой связи</span>
                      </li>
                      <li className="rules-list__item rules-list__item--decline">
                        <span className="rules-list__icon">✗</span>
                        <span>Указание на <strong>расположение</strong> карточек</span>
                      </li>
                      <li className="rules-list__item rules-list__item--decline">
                        <span className="rules-list__icon">✗</span>
                        <span>Использование <strong>числа как подсказки</strong></span>
                      </li>
                    </ul>
                  </div>
                </section>

                {/* Section 5: Таймер */}
                <section className="rules-section">
                  <div className="rules-section__header">
                    <span className="rules-section__number">5</span>
                    <h3 className="rules-section__title">Таймер</h3>
                  </div>
                  <div className="rules-section__body">
                    <div className="rules-votes">
                      <span className="rules-vote rules-vote--approve">Первый ход: 2 мин</span>
                      <span className="rules-vote rules-vote--report">Далее: 1+1 мин</span>
                    </div>
                    <p className="rules-note">1 минута на подсказку + 1 минута на угадывание.</p>
                  </div>
                </section>

                {/* Section 6: Карточка убийцы */}
                <section className="rules-section rules-section--chaos">
                  <div className="rules-section__header">
                    <span className="rules-section__number rules-section__number--chaos">💀</span>
                    <h3 className="rules-section__title">Карточка убийцы</h3>
                  </div>
                  <div className="rules-section__body">
                    <p>На поле есть <strong>одна чёрная карточка</strong> — убийца.</p>
                    <p className="rules-warning">
                      ⚠️ Команда, открывшая её, немедленно проигрывает!
                    </p>
                  </div>
                </section>
              </div>

              {/* Footer */}
              <div className="rules-modal__footer">
                <button className="rules-modal__button" onClick={onClose}>
                  Понятно!
                </button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

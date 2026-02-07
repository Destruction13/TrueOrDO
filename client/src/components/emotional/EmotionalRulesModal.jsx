import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import "../ui/RulesModal.css";

/**
 * EmotionalRulesModal — модальное окно с правилами игры «Эмоциональный интеллект»
 * Использует общие стили RulesModal.css для консистентности.
 */
export default function EmotionalRulesModal({ isOpen, onClose }) {
  // Блокируем скролл body когда модалка открыта
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="rules-modal__backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            className="rules-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          >
            <motion.div
              className="rules-modal__box"
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="rules-modal__header">
                <div className="rules-modal__title-wrapper">
                  <span className="rules-modal__icon">🧠</span>
                  <h2 className="rules-modal__title">Правила «Эмоциональный интеллект»</h2>
                </div>
                <button className="rules-modal__close" onClick={onClose}>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <div className="rules-modal__content">
                <section className="rules-section">
                  <div className="rules-section__header">
                    <span className="rules-section__number">🎯</span>
                    <h3 className="rules-section__title">Цель игры</h3>
                  </div>
                  <div className="rules-section__body">
                    <p>
                      <strong>Эмоциональный интеллект</strong> — это игра на эмпатию и понимание других. 
                      Ведущий получает секретную эмоцию и должен «отыграть» её через фразу. 
                      Остальные игроки пытаются угадать, какую эмоцию он загадал.
                    </p>
                    <p>
                      Набирайте очки за победу в голосовании и за угадывание эмоции ведущего!
                    </p>
                  </div>
                </section>

                <section className="rules-section">
                  <div className="rules-section__header">
                    <span className="rules-section__number">🃏</span>
                    <h3 className="rules-section__title">Подготовка</h3>
                  </div>
                  <div className="rules-section__body">
                    <ul className="rules-list">
                      <li className="rules-list__item rules-list__item--accept">
                        <span className="rules-list__icon">🎴</span>
                        <span>Каждый игрок получает <strong>8 карт эмоций</strong> на руку</span>
                      </li>
                      <li className="rules-list__item rules-list__item--accept">
                        <span className="rules-list__icon">👑</span>
                        <span>Ведущий меняется каждый раунд по очереди</span>
                      </li>
                      <li className="rules-list__item rules-list__item--accept">
                        <span className="rules-list__icon">⚙️</span>
                        <span>Хост настраивает лимит очков для победы (по умолчанию 15)</span>
                      </li>
                    </ul>
                  </div>
                </section>

                <section className="rules-section">
                  <div className="rules-section__header">
                    <span className="rules-section__number">📖</span>
                    <h3 className="rules-section__title">Ход раунда</h3>
                  </div>
                  <div className="rules-section__body">
                    <ul className="rules-list">
                      <li className="rules-list__item rules-list__item--accept">
                        <span className="rules-list__icon">1️⃣</span>
                        <span><strong>Ведущий получает секретную эмоцию</strong> — она отображается автоматически, только он её видит</span>
                      </li>
                      <li className="rules-list__item rules-list__item--accept">
                        <span className="rules-list__icon">2️⃣</span>
                        <span><strong>Появляется фраза</strong> — её видят все, но ведущий должен «зачитать» её с эмоцией</span>
                      </li>
                      <li className="rules-list__item rules-list__item--accept">
                        <span className="rules-list__icon">3️⃣</span>
                        <span><strong>Все выкладывают карты</strong> — выберите эмоцию из руки и потяните вверх</span>
                      </li>
                      <li className="rules-list__item rules-list__item--accept">
                        <span className="rules-list__icon">4️⃣</span>
                        <span><strong>Голосование</strong> — проголосуйте за эмоцию, которую, по вашему мнению, отыграл ведущий</span>
                      </li>
                      <li className="rules-list__item rules-list__item--accept">
                        <span className="rules-list__icon">5️⃣</span>
                        <span><strong>Подсчёт очков</strong> — раскрываются результаты и начисляются баллы</span>
                      </li>
                    </ul>
                  </div>
                </section>

                <section className="rules-section">
                  <div className="rules-section__header">
                    <span className="rules-section__number">⭐</span>
                    <h3 className="rules-section__title">Система очков</h3>
                  </div>
                  <div className="rules-section__body">
                    <ul className="rules-list">
                      <li className="rules-list__item rules-list__item--accept">
                        <span className="rules-list__icon">👑</span>
                        <span><strong>+2 очка ведущему</strong> — если его карта побеждает в голосовании</span>
                      </li>
                      <li className="rules-list__item rules-list__item--accept">
                        <span className="rules-list__icon">🎯</span>
                        <span><strong>+1 очко игроку</strong> — за голос в пользу карты ведущего (даже если она не победила)</span>
                      </li>
                      <li className="rules-list__item rules-list__item--accept">
                        <span className="rules-list__icon">🏅</span>
                        <span><strong>+1 очко игроку</strong> — если его карта (не ведущего) победила в голосовании</span>
                      </li>
                    </ul>
                    <p className="rules-note">
                      💡 <strong>При ничьей</strong> очки получают все победители! Например: карта ведущего и карта игрока 
                      набрали одинаково голосов — ведущий получает 2 очка, игрок 1 очко. Если вы проголосовали 
                      за карту ведущего и ваша карта тоже победила — вы получите 2 очка (1+1).
                    </p>
                  </div>
                </section>

                <section className="rules-section rules-section--featured">
                  <div className="rules-section__header">
                    <span className="rules-section__number">👥</span>
                    <h3 className="rules-section__title">Игра вдвоём или втроём</h3>
                  </div>
                  <div className="rules-section__body">
                    <p>
                      При малом количестве игроков на стол автоматически добавляются 
                      <strong> дополнительные карты из колоды</strong>, чтобы голосование было интереснее:
                    </p>
                    <ul className="rules-list">
                      <li className="rules-list__item rules-list__item--accept">
                        <span className="rules-list__icon">2️⃣</span>
                        <span><strong>2 игрока</strong> — +2 карты из колоды</span>
                      </li>
                      <li className="rules-list__item rules-list__item--accept">
                        <span className="rules-list__icon">3️⃣</span>
                        <span><strong>3 игрока</strong> — +1 карта из колоды</span>
                      </li>
                    </ul>
                    <div className="rules-highlight">
                      <span className="rules-highlight__icon">✨</span>
                      <span className="rules-highlight__text">
                        <strong>Уникальная механика:</strong> дополнительные карты подбираются по «вайбу» 
                        эмоции ведущего — похожие по настроению, чтобы угадать было не так просто!
                      </span>
                    </div>
                  </div>
                </section>

                <section className="rules-section">
                  <div className="rules-section__header">
                    <span className="rules-section__number">⏸️</span>
                    <h3 className="rules-section__title">Управление игрой</h3>
                  </div>
                  <div className="rules-section__body">
                    <ul className="rules-list">
                      <li className="rules-list__item rules-list__item--accept">
                        <span className="rules-list__icon">⏸️</span>
                        <span><strong>Пауза</strong> — хост может приостановить игру в любой момент</span>
                      </li>
                      <li className="rules-list__item rules-list__item--accept">
                        <span className="rules-list__icon">🔌</span>
                        <span><strong>Отключение</strong> — если игрок потерял связь, его карты сохраняются до переподключения</span>
                      </li>
                      <li className="rules-list__item rules-list__item--accept">
                        <span className="rules-list__icon">🚪</span>
                        <span><strong>Выход</strong> — при явном выходе карты игрока возвращаются в колоду</span>
                      </li>
                    </ul>
                  </div>
                </section>

                <section className="rules-section rules-section--victory">
                  <div className="rules-section__header">
                    <span className="rules-section__number rules-section__number--victory">🏆</span>
                    <h3 className="rules-section__title">Победа</h3>
                  </div>
                  <div className="rules-section__body rules-section__body--victory">
                    <p className="rules-victory-text">
                      Игра продолжается до тех пор, пока один из игроков не наберёт 
                      <strong> необходимое количество очков</strong>
                    </p>
                    <div className="rules-victory-crown">
                      <span className="rules-victory-crown__icon">👑</span>
                      <span className="rules-victory-crown__text">
                        Побеждает тот, кто лучше всех понимает эмоции других!
                      </span>
                    </div>
                  </div>
                </section>
              </div>

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

import { forwardRef, useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./LeaveButton.css";

/**
 * LeaveButton — кнопка выхода с нарастающим троллингом
 * 8 нажатий до реального выхода, каждое с новым текстом
 */

const TROLL_MESSAGES = [
  "Выйти",                                    // 0 - начальное состояние
  "Ты уверен, что хочешь выйти?",            // 1
  "Ты точно уверен?",                         // 2
  "Ты совершенно уверен?",                    // 3
  "Ты точно хочешь кинуть своих друзей?",    // 4
  "Серьёзно? Вот так просто взять и свалить?", // 5
  "Знаешь, кто так делает?",                  // 6
  "Только крысы кидают своих друзей 🐀",      // 7
];

const FINAL_STEP = 7;
const RESET_TIMEOUT_MS = 5000; // Сброс через 5 секунд без кликов

const LeaveButton = forwardRef(function LeaveButton(
  {
    onLeave,
    className = "",
    ...rest
  },
  ref
) {
  const [step, setStep] = useState(0);
  const [isLeaving, setIsLeaving] = useState(false);
  const timeoutRef = useRef(null);

  // Сброс состояния
  const resetState = useCallback(() => {
    setStep(0);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Запуск таймера автосброса
  const startResetTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setStep(0);
    }, RESET_TIMEOUT_MS);
  }, []);

  // Очистка таймера при размонтировании
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleClick = async () => {
    console.log("[LeaveButton] handleClick, step:", step, "isLeaving:", isLeaving, "FINAL_STEP:", FINAL_STEP);
    
    if (isLeaving) {
      console.log("[LeaveButton] Already leaving, ignoring click");
      return;
    }

    // Если на последнем шаге — выполняем выход
    if (step === FINAL_STEP) {
      console.log("[LeaveButton] FINAL STEP reached! Executing leave...");
      setIsLeaving(true);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      try {
        if (onLeave) {
          console.log("[LeaveButton] Calling onLeave()...");
          // Добавляем таймаут на случай если сервер не отвечает
          const leavePromise = onLeave();
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Timeout")), 5000)
          );
          
          const result = await Promise.race([leavePromise, timeoutPromise]);
          console.log("[LeaveButton] onLeave() completed, result:", result);
        } else {
          console.log("[LeaveButton] onLeave is not defined!");
        }
        // Если дошли сюда — выход успешен, компонент размонтируется
        console.log("[LeaveButton] Leave successful, component should unmount");
      } catch (error) {
        console.error("[LeaveButton] Leave error:", error);
        // При таймауте — всё равно пробуем принудительно выйти
        if (error.message === "Timeout" && onLeave) {
          console.log("[LeaveButton] Timeout - forcing leave anyway");
          // onLeave уже был вызван, но Promise завис. 
          // Нужно напрямую сбросить состояние.
        }
        setIsLeaving(false);
        resetState();
      }
      return;
    }

    // Иначе — переходим к следующему шагу
    console.log("[LeaveButton] Moving to next step:", step + 1);
    setStep((prev) => prev + 1);
    startResetTimer();
  };

  const isActive = step > 0;
  const intensity = Math.min(step / FINAL_STEP, 1); // 0 to 1 для градации эффектов

  return (
    <div className={`leave-btn-wrapper ${className}`} ref={ref} {...rest}>
      <motion.button
        type="button"
        className={`leave-btn ${isActive ? "leave-btn--active" : ""} ${isLeaving ? "leave-btn--leaving" : ""}`}
        onClick={handleClick}
        disabled={isLeaving}
        whileTap={{ scale: 0.96 }}
        style={{
          "--intensity": intensity,
        }}
      >
        {/* Фоновый портал-эффект — усиливается с каждым шагом */}
        <span className="leave-btn__portal" aria-hidden="true">
          <span className="leave-btn__ring leave-btn__ring--1" />
          <span className="leave-btn__ring leave-btn__ring--2" />
          <span className="leave-btn__ring leave-btn__ring--3" />
        </span>

        {/* Прогресс-индикатор */}
        {isActive && !isLeaving && (
          <span className="leave-btn__progress" aria-hidden="true">
            {Array.from({ length: FINAL_STEP }, (_, i) => (
              <span
                key={i}
                className={`leave-btn__dot ${i < step ? "leave-btn__dot--filled" : ""}`}
              />
            ))}
          </span>
        )}

        {/* Иконка двери */}
        <span className="leave-btn__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Дверной проём */}
            <path
              d="M5 21V3h14v18"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Дверь — открывается с каждым шагом */}
            <motion.path
              d="M15 3v18l-6-2V5l6-2z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
              fill={isActive ? `rgba(255, 107, 107, ${0.1 + intensity * 0.2})` : "none"}
              animate={{ 
                rotate: -intensity * 45,
              }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              style={{ transformOrigin: "right center" }}
            />
            {/* Ручка */}
            <motion.circle
              cx="11"
              cy="12"
              r="1"
              fill="currentColor"
              animate={{ 
                cx: 11 - intensity * 2,
                opacity: 1 - intensity * 0.5 
              }}
            />
            {/* Стрелка выхода — появляется на поздних шагах */}
            <AnimatePresence>
              {step >= 3 && (
                <motion.g
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -5 }}
                  transition={{ duration: 0.2 }}
                >
                  <path
                    d="M1 12h6M4 9l-3 3 3 3"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </motion.g>
              )}
            </AnimatePresence>
          </svg>
        </span>

        {/* Текст — меняется с анимацией */}
        <span className="leave-btn__text">
          <AnimatePresence mode="wait">
            {isLeaving ? (
              <motion.span
                key="leaving"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.15 }}
              >
                Пока-пока! 👋
              </motion.span>
            ) : (
              <motion.span
                key={step}
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className={step > 0 ? "leave-btn__troll-text" : ""}
              >
                {TROLL_MESSAGES[step]}
              </motion.span>
            )}
          </AnimatePresence>
        </span>

        {/* Loading spinner */}
        {isLeaving && (
          <span className="leave-btn__spinner" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <circle 
                cx="12" cy="12" r="10" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeDasharray="31.4 31.4" 
              />
            </svg>
          </span>
        )}
      </motion.button>

      {/* Кнопка "Остаться" — появляется после нескольких кликов */}
      <AnimatePresence>
        {step >= 2 && !isLeaving && (
          <motion.button
            type="button"
            className="leave-btn__stay"
            onClick={resetState}
            initial={{ opacity: 0, scale: 0.8, x: -10 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: -10 }}
            transition={{ duration: 0.15 }}
          >
            Остаться ❤️
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
});

export default LeaveButton;

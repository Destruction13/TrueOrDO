import { useState, useEffect } from "react";

/**
 * Хук для определения мобильного устройства
 * Использует User-Agent и размер экрана для надёжного определения
 */
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return checkIsMobile();
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(checkIsMobile());
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return isMobile;
}

/**
 * Проверка на мобильное устройство
 * Комбинирует User-Agent анализ и проверку размера экрана
 */
function checkIsMobile() {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }

  const userAgent = navigator.userAgent || navigator.vendor || window.opera || "";
  
  // Проверка User-Agent на мобильные устройства
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i;
  const isMobileUA = mobileRegex.test(userAgent);

  // Проверка на планшет (iPad, Android tablet)
  const isTablet = /iPad|Android(?!.*Mobile)/i.test(userAgent);

  // Проверка размера экрана (мобильные обычно < 768px ширина)
  const isSmallScreen = window.innerWidth <= 768;

  // Проверка touch-устройства
  const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;

  // Считаем мобильным если:
  // 1. User-Agent указывает на мобильное устройство (включая планшеты)
  // 2. ИЛИ маленький экран + touch-устройство
  return isMobileUA || isTablet || (isSmallScreen && isTouchDevice);
}

export default useIsMobile;
export { checkIsMobile };

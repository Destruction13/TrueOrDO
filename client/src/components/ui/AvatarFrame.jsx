/**
 * AvatarFrame — Компонент-обёртка для аватара с декоративной рамкой
 * 
 * Размеры:
 * - "l" (large): 120px — для ProfileScreen (аватар 100px)
 * - "mp" (mini profile): 84px — для MiniProfile popup (аватар 70px)
 * - "m" (medium): 64px — для PlayerCard, TaskReport (аватар 48px)
 * - "s" (small): 40px — для Header, Codenames, Alias (аватар 28-36px)
 * - "xs" (extra small): 32px — для очень компактных мест (аватар 22-26px)
 * 
 * Поддерживаемые форматы рамок: PNG (рекомендуется 1024x1024)
 * 
 * УПРОЩЁННЫЙ ПАЙПЛАЙН:
 * - Один файл на рамку (1024x1024 PNG без фона)
 * - CSS автоматически масштабирует под нужный размер
 * - Качество сохраняется благодаря высокому разрешению исходника
 * 
 * @param {React.ReactNode} children — аватар (img или placeholder)
 * @param {"l" | "mp" | "m" | "s" | "xs"} size — размер рамки
 * @param {string} frameUrl — URL к рамке (опционально, приоритет над frameSlug)
 * @param {string} frameSlug — slug рамки из БД (witcher, cyberpunk, etc.)
 * @param {string} className — дополнительные классы
 * @param {boolean} animated — true если рамка анимированная (GIF), отключает оптимизации
 */

import "./AvatarFrame.css";

// Рамка по умолчанию (если frameSlug не указан)
// null = без рамки по умолчанию (пользователь должен выбрать сам)
const DEFAULT_FRAME_SLUG = null;

/**
 * Получить URL рамки по slug
 * Файлы рамок хранятся как: /frames/{slug}.png (один файл 1024x1024)
 */
function getFrameUrl(slug) {
  if (!slug) return null;
  return `/frames/${slug}.png`;
}

export default function AvatarFrame({
  children,
  size = "m",
  frameUrl,
  frameSlug,
  className = "",
  style = {},
  animated = false,
}) {
  // Приоритет: frameUrl > frameSlug > default (null = без рамки)
  let frame = null;
  
  if (frameUrl) {
    frame = frameUrl;
  } else if (frameSlug) {
    frame = getFrameUrl(frameSlug);
  } else if (DEFAULT_FRAME_SLUG && frameSlug === undefined) {
    // Если есть дефолтная рамка и frameSlug не передан — используем дефолт
    frame = getFrameUrl(DEFAULT_FRAME_SLUG);
  }
  // В остальных случаях (frameSlug === null или DEFAULT_FRAME_SLUG === null) — без рамки

  return (
    <div
      className={`avatar-frame avatar-frame--${size} ${className}`}
      style={style}
    >
      <div className="avatar-frame__content">
        {children}
      </div>
      {frame && (
        <img
          src={frame}
          alt=""
          className={`avatar-frame__border ${animated ? "avatar-frame__border--animated" : ""}`}
          aria-hidden="true"
          draggable="false"
          onContextMenu={(e) => e.preventDefault()}
          onError={(e) => {
            // Скрываем рамку если файл не найден
            e.target.style.display = "none";
          }}
        />
      )}
    </div>
  );
}

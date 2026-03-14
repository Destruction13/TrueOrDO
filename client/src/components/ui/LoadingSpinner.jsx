import "./LoadingSpinner.css";

/**
 * LoadingSpinner — универсальный компонент загрузки
 * Используется для lazy loading и асинхронных операций
 */
function LoadingSpinner({ text = "Загрузка...", size = "md" }) {
  return (
    <div className={`loading-spinner loading-spinner--${size}`}>
      <svg 
        className="loading-spinner__icon" 
        viewBox="0 0 24 24" 
        fill="none"
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="31.4 31.4"
        />
      </svg>
      {text && <span className="loading-spinner__text">{text}</span>}
    </div>
  );
}

export default LoadingSpinner;

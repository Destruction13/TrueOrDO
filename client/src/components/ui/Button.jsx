import { forwardRef } from "react";
import "./Button.css";

/**
 * Универсальный Button компонент дизайн-системы
 * 
 * @param {Object} props
 * @param {'primary' | 'secondary' | 'ghost' | 'danger'} [props.variant='primary'] - Вариант кнопки
 * @param {'sm' | 'md' | 'lg'} [props.size='md'] - Размер кнопки
 * @param {boolean} [props.loading=false] - Состояние загрузки
 * @param {boolean} [props.disabled=false] - Отключена ли кнопка
 * @param {boolean} [props.fullWidth=false] - Растянуть на всю ширину
 * @param {React.ReactNode} [props.iconLeft] - Иконка слева
 * @param {React.ReactNode} [props.iconRight] - Иконка справа
 * @param {React.ReactNode} props.children - Содержимое кнопки
 */
const Button = forwardRef(function Button(
  {
    variant = "primary",
    size = "md",
    loading = false,
    disabled = false,
    fullWidth = false,
    iconLeft,
    iconRight,
    className = "",
    children,
    type = "button",
    ...rest
  },
  ref
) {
  const classNames = [
    "btn-ds",
    `btn-ds--${variant}`,
    `btn-ds--${size}`,
    fullWidth && "btn-ds--full",
    loading && "btn-ds--loading",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      ref={ref}
      type={type}
      className={classNames}
      disabled={disabled || loading}
      {...rest}
    >
      {/* Glow overlay для фирменного эффекта */}
      <span className="btn-ds__glow" aria-hidden="true" />
      
      {/* Контент кнопки */}
      <span className="btn-ds__content">
        {iconLeft && <span className="btn-ds__icon btn-ds__icon--left">{iconLeft}</span>}
        <span className="btn-ds__text">{children}</span>
        {iconRight && <span className="btn-ds__icon btn-ds__icon--right">{iconRight}</span>}
      </span>
      
      {/* Spinner для loading состояния */}
      {loading && (
        <span className="btn-ds__spinner" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="31.4 31.4" />
          </svg>
        </span>
      )}
    </button>
  );
});

export default Button;

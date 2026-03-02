/**
 * Утилита для объединения CSS классов
 * Аналог clsx/classnames с поддержкой условий
 * 
 * Примеры использования:
 * cn('base-class', isActive && 'active', disabled && 'disabled')
 * cn('btn', { 'btn-primary': isPrimary, 'btn-large': size === 'lg' })
 * cn(['class1', 'class2'], additionalClass)
 */
export function cn(...inputs) {
  const classes = [];
  
  for (const input of inputs) {
    if (!input) continue;
    
    if (typeof input === 'string') {
      classes.push(input);
    } else if (Array.isArray(input)) {
      const nested = cn(...input);
      if (nested) classes.push(nested);
    } else if (typeof input === 'object') {
      for (const [key, value] of Object.entries(input)) {
        if (value) classes.push(key);
      }
    }
  }
  
  return classes.join(' ');
}

export default cn;

import { useEffect, useMemo, useState } from "react";

const CHIP_HUES = [195, 320, 128, 38, 214, 168, 286];

function CategorySelector({ categories = [], activeId, spinning, spinTick }) {
  const [pulseId, setPulseId] = useState(null);
  const hasActive = Boolean(activeId);

  useEffect(() => {
    if (activeId) {
      setPulseId(activeId);
    }
  }, [activeId, spinTick]);

  useEffect(() => {
    if (!pulseId) {
      return;
    }
    const timeoutId = window.setTimeout(() => setPulseId(null), 240);
    return () => window.clearTimeout(timeoutId);
  }, [pulseId]);

  const hintText = useMemo(() => {
    if (spinning) {
      return "Запускаем отбор категории...";
    }
    if (hasActive) {
      return "Готовим ленту сценариев.";
    }
    return "Запусти выбор категории, чтобы открыть сценарии.";
  }, [hasActive, spinning]);

  return (
    <div
      className={`category-selector${spinning ? " is-spinning" : ""}${
        hasActive ? " has-active" : ""
      }`}
    >
      <div className="category-selector__header">
        <div className="category-selector__title">Категории</div>
        <div className="category-selector__meta">
          {hasActive ? "Категория выбрана" : "Ожидание выбора"}
        </div>
      </div>
      <div className="category-selector__list">
        {categories.map((category, index) => (
          <div
            key={category.id}
            className={`category-chip${
              category.id === activeId ? " is-active" : ""
            }${pulseId === category.id ? " is-pulsing" : ""}`}
            style={{ "--chip-hue": CHIP_HUES[index % CHIP_HUES.length] }}
          >
            <div className="category-chip__icon" aria-hidden="true" />
            <div className="category-chip__body">
              <div className="category-chip__title">{category.title}</div>
              <div className="category-chip__count">
                {category.items?.length || 0} сценариев
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="category-selector__hint">{hintText}</div>
    </div>
  );
}

export default CategorySelector;

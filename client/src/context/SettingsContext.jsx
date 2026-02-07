import { createContext, useContext, useState, useEffect } from "react";

const SettingsContext = createContext(null);

const STORAGE_KEY = "app_settings";

// Идентификаторы игр
export const GAME_IDS = {
  TRUTH_OR_DARE: "truthOrDare",
  ALIAS: "alias",
  CODENAMES: "codenames",
  EMOTIONAL: "emotional",
};

// Настройки шейдеров по умолчанию для каждой игры
const defaultSettings = {
  disabledShaders: {
    [GAME_IDS.TRUTH_OR_DARE]: false,
    [GAME_IDS.ALIAS]: false,
    [GAME_IDS.CODENAMES]: false,
    [GAME_IDS.EMOTIONAL]: false,
  },
};

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => {
    if (typeof window === "undefined") return defaultSettings;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Мигрируем старый формат (если был глобальный disableShaders)
        if (typeof parsed.disableShaders === "boolean") {
          return {
            ...defaultSettings,
            disabledShaders: {
              ...defaultSettings.disabledShaders,
            },
          };
        }
        return { 
          ...defaultSettings, 
          ...parsed,
          disabledShaders: { ...defaultSettings.disabledShaders, ...parsed.disabledShaders }
        };
      }
      return defaultSettings;
    } catch {
      return defaultSettings;
    }
  });

  // Сохраняем настройки в localStorage при изменении
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      console.warn("Не удалось сохранить настройки:", e);
    }
  }, [settings]);

  const updateSettings = (updates) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  };

  // Проверка, отключены ли шейдеры для конкретной игры
  const isShadersDisabled = (gameId) => {
    return settings.disabledShaders?.[gameId] ?? false;
  };

  // Переключение шейдеров для конкретной игры
  const toggleShaders = (gameId) => {
    if (!gameId) {
      console.warn("toggleShaders requires gameId");
      return;
    }
    setSettings((prev) => ({
      ...prev,
      disabledShaders: {
        ...prev.disabledShaders,
        [gameId]: !prev.disabledShaders?.[gameId],
      },
    }));
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, toggleShaders, isShadersDisabled }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}

export default SettingsContext;

import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";

const LofiPlayerContext = createContext(null);

const STORAGE_KEY = "lofi_player_settings";

// Доступные Lo-Fi станции
export const LOFI_STATIONS = [
  {
    id: "chillhop",
    name: "Chillhop Radio",
    url: "https://streams.fluxfm.de/Chillhop/mp3-320/",
    icon: "🎵",
  },
  {
    id: "dronezone",
    name: "SomaFM Drone Zone",
    url: "https://ice1.somafm.com/dronezone-128-mp3",
    icon: "🌌",
  },
  {
    id: "spacestation",
    name: "SomaFM Space Station",
    url: "https://ice1.somafm.com/spacestation-128-mp3",
    icon: "🚀",
  },
  {
    id: "nightride",
    name: "Nightride FM Chillsynth",
    url: "https://stream.nightride.fm/chillsynth.mp3",
    icon: "🌃",
  },
];

// Настройки по умолчанию
const defaultSettings = {
  volume: 0.5,
  stationId: "chillhop",
  isPlaying: false,
};

export function LofiPlayerProvider({ children }) {
  // Загружаем настройки из localStorage
  const [settings, setSettings] = useState(() => {
    if (typeof window === "undefined") return defaultSettings;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...defaultSettings, ...parsed, isPlaying: false }; // Не автозапускаем
      }
      return defaultSettings;
    } catch {
      return defaultSettings;
    }
  });

  const audioRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Текущая станция
  const currentStation = LOFI_STATIONS.find((s) => s.id === settings.stationId) || LOFI_STATIONS[0];

  // Сохраняем настройки в localStorage (кроме isPlaying)
  useEffect(() => {
    try {
      const toSave = {
        volume: settings.volume,
        stationId: settings.stationId,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch (e) {
      console.warn("Не удалось сохранить настройки плеера:", e);
    }
  }, [settings.volume, settings.stationId]);

  // Инициализация Audio элемента
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = "none";
    }

    const audio = audioRef.current;

    const handleCanPlay = () => {
      setIsLoading(false);
      setError(null);
    };

    const handleError = () => {
      setIsLoading(false);
      setError("Не удалось загрузить станцию");
      setSettings((prev) => ({ ...prev, isPlaying: false }));
    };

    const handleWaiting = () => {
      setIsLoading(true);
    };

    const handlePlaying = () => {
      setIsLoading(false);
      setError(null);
    };

    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("error", handleError);
    audio.addEventListener("waiting", handleWaiting);
    audio.addEventListener("playing", handlePlaying);

    return () => {
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("error", handleError);
      audio.removeEventListener("waiting", handleWaiting);
      audio.removeEventListener("playing", handlePlaying);
    };
  }, []);

  // Управление воспроизведением
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (settings.isPlaying) {
      // Устанавливаем источник только если он изменился
      if (audio.src !== currentStation.url) {
        audio.src = currentStation.url;
      }
      setIsLoading(true);
      audio.play().catch((err) => {
        console.error("Ошибка воспроизведения:", err);
        setError("Не удалось запустить воспроизведение");
        setSettings((prev) => ({ ...prev, isPlaying: false }));
        setIsLoading(false);
      });
    } else {
      audio.pause();
      setIsLoading(false);
    }
  }, [settings.isPlaying, currentStation.url]);

  // Управление громкостью
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = settings.volume;
    }
  }, [settings.volume]);

  // Функции управления
  const play = useCallback(() => {
    setSettings((prev) => ({ ...prev, isPlaying: true }));
  }, []);

  const pause = useCallback(() => {
    setSettings((prev) => ({ ...prev, isPlaying: false }));
  }, []);

  const toggle = useCallback(() => {
    setSettings((prev) => ({ ...prev, isPlaying: !prev.isPlaying }));
  }, []);

  const setVolume = useCallback((volume) => {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    setSettings((prev) => ({ ...prev, volume: clampedVolume }));
  }, []);

  const setStation = useCallback((stationId) => {
    const station = LOFI_STATIONS.find((s) => s.id === stationId);
    if (station) {
      // Останавливаем текущее воспроизведение, меняем станцию
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
      setSettings((prev) => ({ ...prev, stationId, isPlaying: false }));
      // Небольшая задержка перед запуском новой станции
      setTimeout(() => {
        setSettings((prev) => ({ ...prev, isPlaying: true }));
      }, 100);
    }
  }, []);

  const value = {
    isPlaying: settings.isPlaying,
    isLoading,
    error,
    volume: settings.volume,
    currentStation,
    stations: LOFI_STATIONS,
    play,
    pause,
    toggle,
    setVolume,
    setStation,
  };

  return (
    <LofiPlayerContext.Provider value={value}>
      {children}
    </LofiPlayerContext.Provider>
  );
}

export function useLofiPlayer() {
  const context = useContext(LofiPlayerContext);
  if (!context) {
    throw new Error("useLofiPlayer must be used within a LofiPlayerProvider");
  }
  return context;
}

export default LofiPlayerContext;

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLofiPlayer } from "../../context/LofiPlayerContext";
import "./LofiPlayer.css";

// Иконки как компоненты
function PlayIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
  );
}

function MusicIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
    </svg>
  );
}

function VolumeIcon({ volume }) {
  if (volume === 0) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
      </svg>
    );
  }
  if (volume < 0.5) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
    </svg>
  );
}

function LoadingSpinner() {
  return (
    <svg className="lofi-spinner" width="20" height="20" viewBox="0 0 24 24">
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        strokeDasharray="31.4 31.4"
      />
    </svg>
  );
}

export default function LofiPlayer() {
  const {
    isPlaying,
    isLoading,
    error,
    volume,
    currentStation,
    stations,
    toggle,
    setVolume,
    setStation,
  } = useLofiPlayer();

  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isStationDropdownOpen, setIsStationDropdownOpen] = useState(false);
  const panelRef = useRef(null);
  const buttonRef = useRef(null);

  // Закрытие панели при клике вне её
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setIsPanelOpen(false);
        setIsStationDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Закрытие dropdown станций при клике вне
  useEffect(() => {
    function handleClickOutside(event) {
      if (isStationDropdownOpen && panelRef.current) {
        const dropdown = panelRef.current.querySelector(".lofi-station-dropdown");
        const trigger = panelRef.current.querySelector(".lofi-station-selector");
        if (
          dropdown &&
          !dropdown.contains(event.target) &&
          trigger &&
          !trigger.contains(event.target)
        ) {
          setIsStationDropdownOpen(false);
        }
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isStationDropdownOpen]);

  const handleVolumeChange = (e) => {
    setVolume(parseFloat(e.target.value));
  };

  const handleStationSelect = (stationId) => {
    setStation(stationId);
    setIsStationDropdownOpen(false);
  };

  return (
    <div className="lofi-player-container">
      {/* Основная кнопка плеера */}
      <motion.button
        ref={buttonRef}
        className={`lofi-fab ${isPlaying ? "lofi-fab--playing" : ""} ${isLoading ? "lofi-fab--loading" : ""}`}
        onClick={() => setIsPanelOpen(!isPanelOpen)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Lo-Fi Radio"
      >
        {isLoading ? <LoadingSpinner /> : <MusicIcon />}
        {isPlaying && !isLoading && <span className="lofi-fab__pulse" />}
      </motion.button>

      {/* Панель управления */}
      <AnimatePresence>
        {isPanelOpen && (
          <motion.div
            ref={panelRef}
            className="lofi-panel"
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ duration: 0.2 }}
          >
            <div className="lofi-panel__header">
              <span className="lofi-panel__title">🎵 Lo-Fi Radio</span>
            </div>

            {/* Ошибка */}
            {error && (
              <div className="lofi-panel__error">
                {error}
              </div>
            )}

            {/* Выбор станции */}
            <div className="lofi-station-wrapper">
              <button
                className="lofi-station-selector"
                onClick={() => setIsStationDropdownOpen(!isStationDropdownOpen)}
              >
                <span className="lofi-station-icon">{currentStation.icon}</span>
                <span className="lofi-station-name">{currentStation.name}</span>
                <ChevronDownIcon />
              </button>

              <AnimatePresence>
                {isStationDropdownOpen && (
                  <motion.div
                    className="lofi-station-dropdown"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.15 }}
                  >
                    {stations.map((station) => (
                      <button
                        key={station.id}
                        className={`lofi-station-option ${station.id === currentStation.id ? "lofi-station-option--active" : ""}`}
                        onClick={() => handleStationSelect(station.id)}
                      >
                        <span className="lofi-station-icon">{station.icon}</span>
                        <span className="lofi-station-name">{station.name}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Громкость */}
            <div className="lofi-volume">
              <VolumeIcon volume={volume} />
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={handleVolumeChange}
                className="lofi-volume__slider"
              />
              <span className="lofi-volume__value">{Math.round(volume * 100)}%</span>
            </div>

            {/* Кнопка Play/Pause */}
            <button
              className={`lofi-play-btn ${isPlaying ? "lofi-play-btn--playing" : ""}`}
              onClick={toggle}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <LoadingSpinner />
                  <span>Загрузка...</span>
                </>
              ) : isPlaying ? (
                <>
                  <PauseIcon />
                  <span>Пауза</span>
                </>
              ) : (
                <>
                  <PlayIcon />
                  <span>Воспроизвести</span>
                </>
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

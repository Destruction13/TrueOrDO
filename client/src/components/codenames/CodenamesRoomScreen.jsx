import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import Button from "../ui/Button";
import PulseButton from "../ui/PulseButton";
import CodenamesRulesModal from "./CodenamesRulesModal";
import { useAuth } from "../../context/AuthContext";
import "./CodenamesRoomScreen.css";

const TEAM_COLORS = {
  red: { name: "Красные", color: "#f7786b" },
  blue: { name: "Синие", color: "#6aaae3" }
};

const CARD_CONFIRM_TIME = 2000; // Синхронизировано с сервером (2 сек)
const CAPTAIN_HIGHLIGHT_DURATION = 7000; // Длительность glow-подсветки капитана (7 сек)

function formatTimer(seconds) {
  if (seconds == null || seconds < 0) return "--:--";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function parseHintInput(input) {
  const trimmed = input.trim();
  const match = trimmed.match(/^(.+?)\s+(\d)$/);
  if (match) {
    return { word: match[1].trim(), count: parseInt(match[2], 10) };
  }
  return { word: trimmed, count: null };
}

export default function CodenamesRoomScreen({
  connected,
  error,
  meId,
  gameState,
  actions,
  isPaused
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [hintInput, setHintInput] = useState("");
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [localTimer, setLocalTimer] = useState(null);
  const [isOvertime, setIsOvertime] = useState(false);
  const [pendingProgress, setPendingProgress] = useState(0);
  const [captainHighlightActive, setCaptainHighlightActive] = useState(false);
  const timerIntervalRef = useRef(null);
  const pendingIntervalRef = useRef(null);
  const captainHighlightTimeoutRef = useRef(null);
  const hintInputRef = useRef(null);
  
  // Team name editing
  const [editingTeam, setEditingTeam] = useState(null); // "red" | "blue" | null
  const [editingTeamName, setEditingTeamName] = useState("");
  const teamNameInputRef = useRef(null);
  const prevRoleRef = useRef(null);

  const { room, board, players, hintHistory, cardVotes, endTurnVotes } = gameState || {};
  
  const me = useMemo(() => players?.find(p => p.id === meId), [players, meId]);
  const isHost = room?.hostId === meId;
  const isCaptain = me?.role === "captain";
  const isSpectator = me?.role === "spectator" || !me?.team;
  const isOperative = me?.team && !isCaptain && !isSpectator;
  const isMyTeamTurn = me?.team === room?.currentTeam;
  const isLobby = room?.status === "lobby";
  const isPlaying = room?.status === "playing";
  const isFinished = room?.status === "finished";
  const canSelectCard = isPlaying && isOperative && isMyTeamTurn && room?.currentHint;

  const redTeam = useMemo(() => {
    const team = players?.filter(p => p.team === "red") || [];
    // Капитан всегда сверху
    return team.sort((a, b) => {
      if (a.role === "captain" && b.role !== "captain") return -1;
      if (a.role !== "captain" && b.role === "captain") return 1;
      return 0;
    });
  }, [players]);
  const blueTeam = useMemo(() => {
    const team = players?.filter(p => p.team === "blue") || [];
    // Капитан всегда сверху
    return team.sort((a, b) => {
      if (a.role === "captain" && b.role !== "captain") return -1;
      if (a.role !== "captain" && b.role === "captain") return 1;
      return 0;
    });
  }, [players]);
  const spectators = useMemo(() => players?.filter(p => !p.team || p.role === "spectator") || [], [players]);

  const redRemaining = (room?.redTotal || 0) - (room?.redScore || 0);
  const blueRemaining = (room?.blueTotal || 0) - (room?.blueScore || 0);

  // Подсказки: текущая + история
  const currentHintForHistory = room?.currentHint ? { word: room.currentHint.word, count: room.currentHint.count, current: true } : null;
  
  const redHints = useMemo(() => {
    const history = (hintHistory || []).filter(h => h.team === "red").map(h => ({ word: h.word, count: h.count }));
    // Старые подсказки сверху, новые внизу (хронологический порядок)
    if (currentHintForHistory && room?.currentTeam === "red") {
      return [...history, currentHintForHistory];
    }
    return history;
  }, [hintHistory, currentHintForHistory, room?.currentTeam]);
  
  const blueHints = useMemo(() => {
    const history = (hintHistory || []).filter(h => h.team === "blue").map(h => ({ word: h.word, count: h.count }));
    // Старые подсказки сверху, новые внизу (хронологический порядок)
    if (currentHintForHistory && room?.currentTeam === "blue") {
      return [...history, currentHintForHistory];
    }
    return history;
  }, [hintHistory, currentHintForHistory, room?.currentTeam]);

  const canStartGame = useMemo(() => {
    if (!isHost || !isLobby) return false;
    const redCaptain = redTeam.find(p => p.role === "captain");
    const blueCaptain = blueTeam.find(p => p.role === "captain");
    return redTeam.length > 0 && blueTeam.length > 0 && redCaptain && blueCaptain;
  }, [isHost, isLobby, redTeam, blueTeam]);

  // Можно ли сменить команду/роль (в лобби или при открытой комнате)
  const canChangeTeam = isLobby || room?.isRoomOpen;
  
  const canBecomeCaptain = useCallback((team) => {
    if (!canChangeTeam) return false;
    return !players?.find(p => p.team === team && p.role === "captain");
  }, [canChangeTeam, players]);

  // Синхронизированный таймер с раздельным отображением hint/guess/overtime
  useEffect(() => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    
    if (isPlaying && (room?.hintTimerEndsAt || room?.guessTimerEndsAt)) {
      const updateTimer = () => {
        const now = Date.now();
        
        // Определяем какой таймер показывать
        if (room.timerPhase === "hint" && room.hintTimerEndsAt && now < room.hintTimerEndsAt) {
          // Фаза подсказки - показываем таймер подсказки (ещё не истёк)
          const remaining = Math.max(0, Math.ceil((room.hintTimerEndsAt - now) / 1000));
          setLocalTimer(remaining);
          setIsOvertime(false);
        } else if (room.timerPhase === "overtime" || room.isOvertime || 
                   (room.timerPhase === "hint" && !room.currentHint && room.guessTimerEndsAt)) {
          // OVERTIME - таймер подсказки истёк (или фаза overtime), но подсказки нет
          // Показываем оставшееся время до guessTimerEndsAt
          if (room.guessTimerEndsAt) {
            const remaining = Math.max(0, Math.ceil((room.guessTimerEndsAt - now) / 1000));
            setLocalTimer(remaining);
            setIsOvertime(true);
          } else {
            setLocalTimer(null);
            setIsOvertime(true);
          }
        } else if (room.timerPhase === "guess" || room.currentHint) {
          // Фаза угадывания - подсказка дана
          const endTime = room.guessTimerEndsAt || room.timerEndsAt;
          if (endTime) {
            const remaining = Math.max(0, Math.ceil((endTime - now) / 1000));
            setLocalTimer(remaining);
          } else {
            setLocalTimer(null);
          }
          setIsOvertime(false);
        } else {
          setLocalTimer(null);
          setIsOvertime(false);
        }
      };
      
      updateTimer();
      timerIntervalRef.current = setInterval(updateTimer, 100);
    } else {
      setLocalTimer(null);
      setIsOvertime(false);
    }
    
    return () => { if (timerIntervalRef.current) clearInterval(timerIntervalRef.current); };
  }, [room?.timerEndsAt, room?.hintTimerEndsAt, room?.guessTimerEndsAt, room?.timerPhase, room?.turnNumber, room?.currentHint, room?.isOvertime, isPlaying]);

  // Сброс pending при смене хода
  useEffect(() => {
    setPendingProgress(0);
    if (pendingIntervalRef.current) clearInterval(pendingIntervalRef.current);
  }, [room?.currentTeam, room?.turnNumber]);

  // Glow-подсветка карточек капитана при старте игры
  useEffect(() => {
    // Очистка при размонтировании
    return () => {
      if (captainHighlightTimeoutRef.current) {
        clearTimeout(captainHighlightTimeoutRef.current);
      }
    };
  }, []);

  // Запуск glow-подсветки когда капитан видит поле в начале игры
  useEffect(() => {
    if (isCaptain && isPlaying && room?.turnNumber === 1) {
      // Включаем подсветку
      setCaptainHighlightActive(true);
      
      // Запускаем таймер для отключения подсветки
      if (captainHighlightTimeoutRef.current) {
        clearTimeout(captainHighlightTimeoutRef.current);
      }
      captainHighlightTimeoutRef.current = setTimeout(() => {
        setCaptainHighlightActive(false);
      }, CAPTAIN_HIGHLIGHT_DURATION);
    } else {
      // Если не капитан или не играем - сбрасываем
      setCaptainHighlightActive(false);
    }
  }, [isCaptain, isPlaying, room?.turnNumber]);

  // Автофокус на поле ввода для капитана при его ходе
  useEffect(() => {
    if (isCaptain && isMyTeamTurn && isPlaying && !room?.currentHint && hintInputRef.current) {
      hintInputRef.current.focus();
    }
  }, [isCaptain, isMyTeamTurn, isPlaying, room?.currentHint, room?.turnNumber]);

  // Глобальный обработчик клавиатуры для автофокуса при вводе текста (капитан)
  useEffect(() => {
    if (!isCaptain || !isMyTeamTurn || !isPlaying || room?.currentHint) return;
    
    const handleKeyDown = (e) => {
      // Игнорируем спецклавиши и если уже в фокусе
      if (document.activeElement === hintInputRef.current) return;
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (e.key.length !== 1) return; // Только печатные символы
      
      // Фокус на поле и вставляем символ
      if (hintInputRef.current) {
        hintInputRef.current.focus();
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCaptain, isMyTeamTurn, isPlaying, room?.currentHint]);

  // Обновление прогресса pending card (синхронизировано с сервером)
  useEffect(() => {
    if (pendingIntervalRef.current) {
      clearInterval(pendingIntervalRef.current);
      pendingIntervalRef.current = null;
    }

    const pendingCard = room?.pendingCard;
    if (pendingCard && pendingCard.startedAt && pendingCard.endsAt) {
      const updateProgress = () => {
        const now = Date.now();
        const total = pendingCard.endsAt - pendingCard.startedAt;
        const elapsed = now - pendingCard.startedAt;
        const progress = Math.min(100, Math.max(0, (elapsed / total) * 100));
        setPendingProgress(progress);
        
        if (progress >= 100) {
          if (pendingIntervalRef.current) clearInterval(pendingIntervalRef.current);
        }
      };

      updateProgress();
      // Обновляем каждые 16ms (~60fps) для плавной анимации
      pendingIntervalRef.current = setInterval(updateProgress, 16);

      return () => {
        if (pendingIntervalRef.current) clearInterval(pendingIntervalRef.current);
      };
    } else {
      setPendingProgress(0);
    }
  }, [room?.pendingCard?.cardId, room?.pendingCard?.startedAt]);

  const handleGiveHint = async () => {
    const parsed = parseHintInput(hintInput);
    if (!parsed.word || parsed.count === null) return;
    const result = await actions.giveHint(parsed.word, parsed.count);
    if (result?.ok) setHintInput("");
  };

  // Team name editing handlers
  const canEditTeamName = (team) => {
    if (team === "red") return room?.redTeamCaptainId === meId;
    if (team === "blue") return room?.blueTeamCaptainId === meId;
    return false;
  };

  const handleStartEditTeamName = (team) => {
    if (!canEditTeamName(team)) return;
    setEditingTeam(team);
    setEditingTeamName(team === "red" ? room?.redTeamName : room?.blueTeamName);
    setTimeout(() => teamNameInputRef.current?.focus(), 0);
  };

  const handleSaveTeamName = async () => {
    if (editingTeam && editingTeamName.trim()) {
      await actions.renameTeam(editingTeam, editingTeamName.trim());
    }
    setEditingTeam(null);
    setEditingTeamName("");
  };

  // Автоматически открыть редактирование названия команды при становлении капитаном
  useEffect(() => {
    const wasNotCaptain = prevRoleRef.current !== "captain";
    const isNowCaptain = me?.role === "captain";
    const myTeam = me?.team;
    
    if (wasNotCaptain && isNowCaptain && myTeam && isLobby) {
      // Стали капитаном - предлагаем назвать команду
      const currentName = myTeam === "red" ? room?.redTeamName : room?.blueTeamName;
      const isDefaultName = currentName === "Красные" || currentName === "Синие";
      
      if (isDefaultName) {
        // Только если название по умолчанию - открываем редактирование
        setEditingTeam(myTeam);
        setEditingTeamName("");
        setTimeout(() => teamNameInputRef.current?.focus(), 100);
      }
    }
    
    prevRoleRef.current = me?.role;
  }, [me?.role, me?.team, isLobby, room?.redTeamName, room?.blueTeamName]);

  // Проверка, голосовал ли текущий игрок за карточку
  const myVotedCardId = useMemo(() => {
    if (!cardVotes) return null;
    for (const [cardId, voters] of Object.entries(cardVotes)) {
      if (voters?.some(v => v.id === meId)) return parseInt(cardId);
    }
    return null;
  }, [cardVotes, meId]);

  const handleCardClick = useCallback(async (cardId) => {
    if (!canSelectCard) return;
    const card = board?.find(c => c.id === cardId);
    if (card?.revealed) return;

    // Если уже голосовал за эту карточку - отменяем голос
    if (myVotedCardId === cardId) {
      await actions.cancelVote();
    } else {
      // Голосуем за карточку (сервер автоматически уберёт предыдущий голос)
      await actions.voteForCard(cardId);
    }
  }, [canSelectCard, board, actions, myVotedCardId]);

  const copyRoomCode = () => {
    navigator.clipboard.writeText(`${window.location.origin}/codenames/${room?.code}`);
  };

  if (!gameState) return <div className="codenames-loading">Загрузка...</div>;

  return (
    <div className={`codenames-room ${isFinished ? `codenames-room--winner-${room?.winner}` : ""} ${isPlaying && room?.currentTeam ? `codenames-room--turn-${room.currentTeam}` : ""}`}>
      {/* Header */}
      <header className="codenames-header-new">
        <div className="codenames-header-new__left">
          <div className="room-code-block" onClick={copyRoomCode} title="Скопировать ссылку">
            <div className="room-code-label">Код комнаты</div>
            <div className="room-code">{room?.code}</div>
          </div>
          <button className="codenames-header-btn" onClick={() => setShowRulesModal(true)} title="Правила">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </button>
          {isHost && (
            <button className="codenames-header-btn" onClick={() => setShowSettingsModal(true)} title="Настройки">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          )}
          {isHost && isPlaying && (
            <button 
              className={`codenames-header-btn ${isPaused ? "codenames-header-btn--paused" : ""}`} 
              onClick={() => isPaused ? actions.resumeGame() : actions.pauseGame()} 
              title={isPaused ? "Продолжить" : "Пауза"}
            >
              {isPaused ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
                </svg>
              )}
            </button>
          )}
          <button className="codenames-header-btn codenames-header-btn--exit" onClick={() => setShowLeaveConfirm(true)} title="Выйти">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
        
        {/* Центральная часть хедера - информация о ходе или победа */}
        <div className="codenames-header-new__center">
          {isFinished && room?.winner ? (
            <div className={`codenames-header-winner codenames-header-winner--${room.winner}`}>
              <span className="codenames-header-winner__icon">🏆</span>
              <span className="codenames-header-winner__text">
                Победа «{room.winner === "red" ? (room.redTeamName || "Красные") : (room.blueTeamName || "Синие")}»
              </span>
            </div>
          ) : isPlaying && board ? (
            <div className={`codenames-header-turn codenames-header-turn--${room?.currentTeam} ${isOvertime ? `codenames-header-turn--overtime` : ""}`}>
              <div className="codenames-header-turn__team" style={{ color: TEAM_COLORS[room?.currentTeam]?.color }}>
                {room?.currentTeam === "red" ? (room?.redTeamName || "Красные") : (room?.blueTeamName || "Синие")}
              </div>
              {isPaused ? (
                <div className="codenames-header-turn__timer codenames-header-turn__timer--paused">
                  Пауза
                </div>
              ) : (
                <div className={`codenames-header-turn__timer ${localTimer != null && localTimer <= 10 ? "codenames-header-turn__timer--warning" : ""}`}>
                  {isOvertime && <span className="codenames-header-turn__overtime">OVERTIME</span>}
                  {formatTimer(localTimer)}
                </div>
              )}
              {room?.currentHint && (
                <div className="codenames-header-turn__hint">
                  <span className="codenames-header-turn__hint-word">{room.currentHint.word}</span>
                  <span className="codenames-header-turn__hint-count">{room.currentHint.count}</span>
                </div>
              )}
            </div>
          ) : null}
        </div>
        
        <div className="codenames-header-new__right">
          {/* Список наблюдателей во время игры */}
          {isPlaying && spectators.length > 0 && (
            <div className="codenames-header-spectators">
              <span className="codenames-header-spectators__icon">👁</span>
              <span className="codenames-header-spectators__list">
                {spectators.map((s, i) => (
                  <span key={s.id} className={`codenames-header-spectators__name ${s.id === meId ? "codenames-header-spectators__name--me" : ""}`}>
                    {s.name}{i < spectators.length - 1 ? ", " : ""}
                  </span>
                ))}
              </span>
            </div>
          )}
          {isAuthenticated ? (
            <button className="codenames-header-profile__btn" onClick={() => navigate("/profile")} title="Профиль">
              {user?.avatarUrl ? <img src={user.avatarUrl} alt="" className="codenames-header-profile__avatar" /> : <span className="codenames-header-profile__placeholder">{(user?.nickname || user?.email)?.[0]?.toUpperCase() || "?"}</span>}
            </button>
          ) : (
            <button className="codenames-header-btn codenames-header-btn--login" onClick={() => navigate("/login", { state: { backgroundLocation: location } })}>Войти</button>
          )}
        </div>
      </header>

      {/* Мобильная информация о ходе - под хедером (только на узких экранах) */}
      {isPlaying && board && (
        <div className={`codenames-mobile-turn codenames-mobile-turn--${room?.currentTeam}`}>
          <span className="codenames-mobile-turn__team" style={{ color: TEAM_COLORS[room?.currentTeam]?.color }}>
            {room?.currentTeam === "red" ? (room?.redTeamName || "Красные") : (room?.blueTeamName || "Синие")}
          </span>
          {isPaused ? (
            <span className="codenames-mobile-turn__timer codenames-mobile-turn__timer--paused">Пауза</span>
          ) : (
            <span className={`codenames-mobile-turn__timer ${localTimer != null && localTimer <= 10 ? "codenames-mobile-turn__timer--warning" : ""}`}>
              {isOvertime && <span className="codenames-mobile-turn__overtime">OVERTIME</span>}
              {formatTimer(localTimer)}
            </span>
          )}
          {room?.currentHint && (
            <span className="codenames-mobile-turn__hint">
              {room.currentHint.word} <strong>{room.currentHint.count}</strong>
            </span>
          )}
        </div>
      )}

      {/* Мобильная надпись победы - под хедером */}
      {isFinished && room?.winner && (
        <div className={`codenames-winner-banner codenames-winner-banner--${room.winner}`}>
          <span className="codenames-winner-banner__icon">🏆</span>
          <span className="codenames-winner-banner__text">
            Победа «{room.winner === "red" ? (room.redTeamName || "Красные") : (room.blueTeamName || "Синие")}»
          </span>
        </div>
      )}

      <div className="codenames-content">
        {/* Red sidebar */}
        <aside className="codenames-sidebar codenames-sidebar--red">
          <div className="codenames-team-header">
            {editingTeam === "red" ? (
              <div className="codenames-team-edit-wrapper">
                <input
                  ref={teamNameInputRef}
                  type="text"
                  value={editingTeamName}
                  onChange={(e) => setEditingTeamName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveTeamName();
                    if (e.key === "Escape") { setEditingTeam(null); setEditingTeamName(""); }
                  }}
                  onBlur={handleSaveTeamName}
                  maxLength={20}
                  placeholder="Название команды..."
                  className="codenames-team-edit-input codenames-team-edit-input--red"
                />
                <div className="codenames-team-edit-hint">Enter для сохранения</div>
              </div>
            ) : (
              <>
                <span 
                  className={`codenames-team-name codenames-team-name--red ${canEditTeamName("red") ? "codenames-team-name--editable" : ""}`}
                  onClick={() => canEditTeamName("red") && handleStartEditTeamName("red")}
                  style={{ textTransform: 'uppercase' }}
                >
                  {room?.redTeamName || "Красные"}
                </span>
                {canEditTeamName("red") && (
                  <button 
                    className="codenames-team-edit-icon" 
                    onClick={() => handleStartEditTeamName("red")}
                    title="Редактировать название"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                )}
                {isPlaying && (
                  <div className="codenames-team-score-inline">
                    <span className="codenames-team-score-inline__number codenames-team-score-inline__number--red">{redRemaining}</span>
                  </div>
                )}
              </>
            )}
          </div>
          {/* Цифра неотгаданных слов - центрированная для десктопа */}
          {isPlaying && (
            <div className="codenames-team-score-block">
              <span className="codenames-team-score-number codenames-team-score-number--red">{redRemaining}</span>
            </div>
          )}
          <div className={`codenames-team-players ${redTeam.length >= 8 ? "codenames-team-players--very-compact" : redTeam.length >= 5 ? "codenames-team-players--compact" : ""}`}>
            {redTeam.map((player, idx) => {
              const isPlayerHost = player.id === room?.hostId;
              const isDisconnected = player.connectionStatus === "disconnected";
              const isCaptain = player.role === "captain";
              const hasAgentsAfter = isCaptain && redTeam.length > 1;
              return (
                <React.Fragment key={player.id}>
                  <div className={`codenames-player ${isCaptain ? "codenames-player--captain" : ""} ${player.id === meId ? "codenames-player--me" : ""} ${isDisconnected ? "codenames-player--disconnected" : ""}`}>
                    <div className="codenames-player__avatar-wrapper">
                      {player.avatarUrl ? <img src={player.avatarUrl} alt="" className="codenames-player__avatar" /> : <span className="codenames-player__avatar-placeholder">{player.name[0].toUpperCase()}</span>}
                      <div className={`codenames-player__status-dot ${isDisconnected ? "offline" : "online"}`} />
                      {isPlayerHost && <div className="codenames-player__crown">👑</div>}
                    </div>
                    <span className="codenames-player__name">{player.name}</span>
                    {isCaptain && <span className="codenames-player__badge">К</span>}
                  </div>
                  {/* Разделитель после капитана, если есть агенты */}
                  {hasAgentsAfter && <div className="codenames-captain-divider codenames-captain-divider--red" />}
                </React.Fragment>
              );
            })}
            {redTeam.length === 0 && <div className="codenames-team-empty">Нет игроков</div>}
          </div>
          
          {/* Блок внизу сайдбара - кнопки + подсказки + ввод */}
          <div className="codenames-sidebar-bottom">
            {canChangeTeam && !me?.team && <Button variant="secondary" size="sm" onClick={() => actions.joinTeam("red")} fullWidth>Присоединиться</Button>}
            {canChangeTeam && me?.team === "blue" && <Button variant="secondary" size="sm" onClick={() => actions.joinTeam("red")} fullWidth>Перейти</Button>}
            {canChangeTeam && me?.team === "red" && (
              <div className="codenames-role-buttons">
                {canBecomeCaptain("red") && me?.role !== "captain" && <Button variant="primary" size="sm" onClick={() => actions.setRole("captain")} fullWidth>👑 Капитан</Button>}
                {me?.role === "captain" && <Button variant="ghost" size="sm" onClick={() => actions.setRole("operative")} fullWidth>Агент</Button>}
                <Button variant="ghost" size="sm" onClick={() => actions.setRole("spectator")} fullWidth>Наблюдатели</Button>
              </div>
            )}
            {redHints.length > 0 && (
              <div className="codenames-hint-history">
                <div className="codenames-hint-history__title">Подсказки</div>
                <div className="codenames-hint-history__list">
                  {redHints.map((hint, idx) => (
                    <div key={idx} className={`codenames-hint-history__item ${hint.current ? "codenames-hint-history__item--current" : ""}`}>
                      <span className="codenames-hint-history__word">{hint.word}</span>
                      <span className="codenames-hint-history__count">{hint.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Ввод подсказки для капитана красных */}
            {isCaptain && me?.team === "red" && isMyTeamTurn && !room?.currentHint && isPlaying && (
              <div className="codenames-sidebar-hint-input">
                <input 
                  ref={hintInputRef}
                  type="text" 
                  value={hintInput} 
                  onChange={(e) => setHintInput(e.target.value)} 
                  placeholder="Подсказка" 
                  className="codenames-sidebar-hint-input__field" 
                  onKeyDown={(e) => e.key === "Enter" && handleGiveHint()} 
                />
                <button 
                  className="codenames-sidebar-hint-input__btn"
                  onClick={handleGiveHint} 
                  disabled={!parseHintInput(hintInput).word || parseHintInput(hintInput).count === null}
                >
                  +
                </button>
              </div>
            )}
            {/* Кнопка завершить ход для агентов красных */}
            {isOperative && me?.team === "red" && isMyTeamTurn && room?.currentHint && isPlaying && (
              <button 
                className={`codenames-sidebar-end-turn codenames-sidebar-end-turn--red ${endTurnVotes?.some(v => v.id === meId) ? "codenames-sidebar-end-turn--voted" : ""}`}
                onClick={actions.voteEndTurn}
              >
                {endTurnVotes?.length > 0 ? `Завершить (${endTurnVotes.length}/${room?.teamOperativesCount || 1})` : "Завершить ход"}
              </button>
            )}
          </div>
        </aside>

        {/* Main */}
        <main className="codenames-main">
          {isLobby && (
            <div className="codenames-lobby">
              <h2>Ожидание игроков</h2>
              <p>Выберите команду и роль</p>
              {spectators.length > 0 && (
                <div className="codenames-spectators">
                  <h4>Наблюдатели:</h4>
                  <div className="codenames-spectators-list">
                    {spectators.map(p => <span key={p.id} className={`codenames-spectator ${p.id === meId ? "codenames-spectator--me" : ""}`}>{p.name}</span>)}
                  </div>
                </div>
              )}
              {isHost && (
                <div className="codenames-start-section">
                  <PulseButton size="lg" onClick={actions.startGame} disabled={!canStartGame}>Начать игру</PulseButton>
                  {!canStartGame && <p className="codenames-start-hint">Нужен капитан в каждой команде</p>}
                </div>
              )}
            </div>
          )}

          {isPlaying && board && (
            <div className="codenames-game-content">
              <div className="codenames-board">
                {board.map((card) => {
                  const isClickable = canSelectCard && !card.revealed;
                  const isPending = room?.pendingCard?.cardId === card.id;
                  const voters = cardVotes?.[card.id] || [];
                  const hasVotes = voters.length > 0;
                  const isMyVote = myVotedCardId === card.id;
                  const shouldHighlight = captainHighlightActive && isCaptain && !card.revealed && card.type === me?.team;
                  const allVoted = hasVotes && voters.length >= (room?.teamOperativesCount || 1);
                  
                  return (
                    <motion.div 
                      key={card.id} 
                      className={`codenames-card ${card.revealed ? "codenames-card--revealed" : ""} ${card.type && (card.revealed || isCaptain) ? `codenames-card--${card.type}` : ""} ${isClickable ? "codenames-card--clickable" : ""} ${isCaptain && !card.revealed ? `codenames-card--captain-${card.type}` : ""} ${isPending ? "codenames-card--pending" : ""} ${hasVotes && !card.revealed && !isPending ? "codenames-card--has-votes" : ""} ${allVoted && !card.revealed && !isPending ? "codenames-card--all-voted" : ""} ${card.revealed && isCaptain ? "codenames-card--captain-revealed" : ""} ${shouldHighlight ? `codenames-card--captain-highlight-${me?.team}` : ""} ${isMyVote && !card.revealed ? "codenames-card--my-vote" : ""}`}
                      onClick={() => isClickable && handleCardClick(card.id)} 
                      whileHover={isClickable ? { scale: 1.02 } : {}} 
                      whileTap={isClickable ? { scale: 0.98 } : {}}
                    >
                      <span className="codenames-card__word">{card.word}</span>
                      {/* Аватары игроков, проголосовавших за карточку */}
                      {hasVotes && !card.revealed && !isPending && (
                        <div className="codenames-card__voters">
                          {voters.map((voter, idx) => (
                            <div key={voter.id} className="codenames-card__voter" style={{ zIndex: voters.length - idx }} title={voter.name}>
                              {voter.avatarUrl ? (
                                <img src={voter.avatarUrl} alt="" className="codenames-card__voter-avatar" />
                              ) : (
                                <span className="codenames-card__voter-placeholder">{voter.name[0].toUpperCase()}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      {/* Жёлтая полоса подтверждения */}
                      {isPending && !card.revealed && (
                        <div className="codenames-card__confirm-bar">
                          <div className="codenames-card__confirm-progress" style={{ width: `${pendingProgress}%` }} />
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>

            </div>
          )}

          {isFinished && board && (
            <div className="codenames-game-content">
              <div className="codenames-board codenames-board--finished">
                {board.map((card) => (
                  <div 
                    key={card.id} 
                    className={`codenames-card codenames-card--captain-${card.type} ${card.revealed ? "codenames-card--captain-revealed" : ""}`}
                  >
                    <span className="codenames-card__word">{card.word}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>

        {/* Blue sidebar */}
        <aside className="codenames-sidebar codenames-sidebar--blue">
          <div className="codenames-team-header">
            {editingTeam === "blue" ? (
              <div className="codenames-team-edit-wrapper">
                <input
                  ref={teamNameInputRef}
                  type="text"
                  value={editingTeamName}
                  onChange={(e) => setEditingTeamName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveTeamName();
                    if (e.key === "Escape") { setEditingTeam(null); setEditingTeamName(""); }
                  }}
                  onBlur={handleSaveTeamName}
                  maxLength={20}
                  placeholder="Название команды..."
                  className="codenames-team-edit-input codenames-team-edit-input--blue"
                />
                <div className="codenames-team-edit-hint">Enter для сохранения</div>
              </div>
            ) : (
              <>
                <span 
                  className={`codenames-team-name codenames-team-name--blue ${canEditTeamName("blue") ? "codenames-team-name--editable" : ""}`}
                  onClick={() => canEditTeamName("blue") && handleStartEditTeamName("blue")}
                  style={{ textTransform: 'uppercase' }}
                >
                  {room?.blueTeamName || "Синие"}
                </span>
                {canEditTeamName("blue") && (
                  <button 
                    className="codenames-team-edit-icon" 
                    onClick={() => handleStartEditTeamName("blue")}
                    title="Редактировать название"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                )}
                {isPlaying && (
                  <div className="codenames-team-score-inline">
                    <span className="codenames-team-score-inline__number codenames-team-score-inline__number--blue">{blueRemaining}</span>
                  </div>
                )}
              </>
            )}
          </div>
          {/* Цифра неотгаданных слов - центрированная для десктопа */}
          {isPlaying && (
            <div className="codenames-team-score-block">
              <span className="codenames-team-score-number codenames-team-score-number--blue">{blueRemaining}</span>
            </div>
          )}
          <div className={`codenames-team-players ${blueTeam.length >= 8 ? "codenames-team-players--very-compact" : blueTeam.length >= 5 ? "codenames-team-players--compact" : ""}`}>
            {blueTeam.map((player, idx) => {
              const isPlayerHost = player.id === room?.hostId;
              const isDisconnected = player.connectionStatus === "disconnected";
              const isCaptain = player.role === "captain";
              const hasAgentsAfter = isCaptain && blueTeam.length > 1;
              return (
                <React.Fragment key={player.id}>
                  <div className={`codenames-player ${isCaptain ? "codenames-player--captain" : ""} ${player.id === meId ? "codenames-player--me" : ""} ${isDisconnected ? "codenames-player--disconnected" : ""}`}>
                    <div className="codenames-player__avatar-wrapper">
                      {player.avatarUrl ? <img src={player.avatarUrl} alt="" className="codenames-player__avatar" /> : <span className="codenames-player__avatar-placeholder">{player.name[0].toUpperCase()}</span>}
                      <div className={`codenames-player__status-dot ${isDisconnected ? "offline" : "online"}`} />
                      {isPlayerHost && <div className="codenames-player__crown">👑</div>}
                    </div>
                    <span className="codenames-player__name">{player.name}</span>
                    {isCaptain && <span className="codenames-player__badge">К</span>}
                  </div>
                  {/* Разделитель после капитана, если есть агенты */}
                  {hasAgentsAfter && <div className="codenames-captain-divider codenames-captain-divider--blue" />}
                </React.Fragment>
              );
            })}
            {blueTeam.length === 0 && <div className="codenames-team-empty">Нет игроков</div>}
          </div>
          
          {/* Блок внизу сайдбара - кнопки + подсказки + ввод */}
          <div className="codenames-sidebar-bottom">
            {canChangeTeam && !me?.team && <Button variant="secondary" size="sm" onClick={() => actions.joinTeam("blue")} fullWidth>Присоединиться</Button>}
            {canChangeTeam && me?.team === "red" && <Button variant="secondary" size="sm" onClick={() => actions.joinTeam("blue")} fullWidth>Перейти</Button>}
            {canChangeTeam && me?.team === "blue" && (
              <div className="codenames-role-buttons">
                {canBecomeCaptain("blue") && me?.role !== "captain" && <Button variant="primary" size="sm" onClick={() => actions.setRole("captain")} fullWidth>👑 Капитан</Button>}
                {me?.role === "captain" && <Button variant="ghost" size="sm" onClick={() => actions.setRole("operative")} fullWidth>Агент</Button>}
                <Button variant="ghost" size="sm" onClick={() => actions.setRole("spectator")} fullWidth>Наблюдатели</Button>
              </div>
            )}
            {blueHints.length > 0 && (
              <div className="codenames-hint-history">
                <div className="codenames-hint-history__title">Подсказки</div>
                <div className="codenames-hint-history__list">
                  {blueHints.map((hint, idx) => (
                    <div key={idx} className={`codenames-hint-history__item ${hint.current ? "codenames-hint-history__item--current" : ""}`}>
                      <span className="codenames-hint-history__word">{hint.word}</span>
                      <span className="codenames-hint-history__count">{hint.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Ввод подсказки для капитана синих */}
            {isCaptain && me?.team === "blue" && isMyTeamTurn && !room?.currentHint && isPlaying && (
              <div className="codenames-sidebar-hint-input">
                <input 
                  ref={hintInputRef}
                  type="text" 
                  value={hintInput} 
                  onChange={(e) => setHintInput(e.target.value)} 
                  placeholder="Подсказка" 
                  className="codenames-sidebar-hint-input__field" 
                  onKeyDown={(e) => e.key === "Enter" && handleGiveHint()} 
                />
                <button 
                  className="codenames-sidebar-hint-input__btn"
                  onClick={handleGiveHint} 
                  disabled={!parseHintInput(hintInput).word || parseHintInput(hintInput).count === null}
                >
                  +
                </button>
              </div>
            )}
            {/* Кнопка завершить ход для агентов синих */}
            {isOperative && me?.team === "blue" && isMyTeamTurn && room?.currentHint && isPlaying && (
              <button 
                className={`codenames-sidebar-end-turn codenames-sidebar-end-turn--blue ${endTurnVotes?.some(v => v.id === meId) ? "codenames-sidebar-end-turn--voted" : ""}`}
                onClick={actions.voteEndTurn}
              >
                {endTurnVotes?.length > 0 ? `Завершить (${endTurnVotes.length}/${room?.teamOperativesCount || 1})` : "Завершить ход"}
              </button>
            )}
          </div>
        </aside>
      </div>

      {error && <div className="codenames-error">{error}</div>}

      <AnimatePresence>
        {showLeaveConfirm && (
          <motion.div className="codenames-modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowLeaveConfirm(false)}>
            <motion.div className="codenames-modal" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={(e) => e.stopPropagation()}>
              <h3>Покинуть комнату?</h3>
              <p>Вы уверены?</p>
              <div className="codenames-modal-buttons">
                <Button variant="ghost" onClick={() => setShowLeaveConfirm(false)}>Отмена</Button>
                <Button variant="danger" onClick={actions.leaveRoom}>Выйти</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <CodenamesRulesModal isOpen={showRulesModal} onClose={() => setShowRulesModal(false)} />
      
      {/* Settings Modal - только для хоста */}
      <AnimatePresence>
        {showSettingsModal && isHost && (
          <motion.div 
            className="codenames-modal-overlay" 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            onClick={() => setShowSettingsModal(false)}
          >
            <motion.div 
              className="codenames-settings-modal" 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }} 
              onClick={(e) => e.stopPropagation()}
            >
              <h3>Настройки комнаты</h3>
              
              <div className="codenames-settings-modal__actions">
                {/* Открытие/закрытие комнаты для смены команд */}
                <button 
                  className={`codenames-settings-modal__btn ${room?.isRoomOpen ? "codenames-settings-modal__btn--active" : ""}`}
                  onClick={() => {
                    actions.toggleRoomOpen();
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {room?.isRoomOpen ? (
                      <>
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                      </>
                    ) : (
                      <>
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </>
                    )}
                  </svg>
                  <span>{room?.isRoomOpen ? "Закрыть комнату" : "Открыть комнату"}</span>
                  <span className="codenames-settings-modal__hint">
                    {room?.isRoomOpen ? "Запретить смену команд" : "Разрешить смену команд и ролей"}
                  </span>
                </button>

                {/* Пропуск хода - только во время игры */}
                {isPlaying && (
                  <button 
                    className="codenames-settings-modal__btn"
                    onClick={() => {
                      actions.skipTurn();
                      setShowSettingsModal(false);
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="5 4 15 12 5 20 5 4" />
                      <line x1="19" y1="5" x2="19" y2="19" />
                    </svg>
                    <span>Пропустить ход</span>
                    <span className="codenames-settings-modal__hint">Передать ход другой команде</span>
                  </button>
                )}

                {/* Новая игра */}
                <button 
                  className="codenames-settings-modal__btn"
                  onClick={() => {
                    actions.resetGame();
                    setShowSettingsModal(false);
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
                  </svg>
                  <span>Новая игра</span>
                  <span className="codenames-settings-modal__hint">Сбросить поле и начать заново</span>
                </button>
              </div>

              {/* Список игроков для удаления */}
              <div className="codenames-settings-modal__players">
                <h4>Участники</h4>
                <div className="codenames-settings-modal__players-list">
                  {players?.filter(p => p.id !== meId && p.connectionStatus !== "kicked" && p.connectionStatus !== "left").map(player => (
                    <div key={player.id} className="codenames-settings-modal__player">
                      <div className="codenames-settings-modal__player-info">
                        {player.avatarUrl ? (
                          <img src={player.avatarUrl} alt="" className="codenames-settings-modal__player-avatar" />
                        ) : (
                          <span className="codenames-settings-modal__player-avatar-placeholder">
                            {player.name[0].toUpperCase()}
                          </span>
                        )}
                        <span className="codenames-settings-modal__player-name">{player.name}</span>
                        {player.team && (
                          <span className={`codenames-settings-modal__player-team codenames-settings-modal__player-team--${player.team}`}>
                            {player.team === "red" ? "🔴" : "🔵"}
                          </span>
                        )}
                      </div>
                      <button 
                        className="codenames-settings-modal__kick-btn"
                        onClick={() => actions.kickPlayer(player.id)}
                        title="Удалить из комнаты"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  {players?.filter(p => p.id !== meId && p.connectionStatus !== "kicked" && p.connectionStatus !== "left").length === 0 && (
                    <div className="codenames-settings-modal__no-players">Нет других участников</div>
                  )}
                </div>
              </div>

              <button className="codenames-settings-modal__close" onClick={() => setShowSettingsModal(false)}>
                Закрыть
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Winner confetti effect on team card */}
      {isFinished && (
        <div className={`codenames-confetti codenames-confetti--${room?.winner}`}>
          {[...Array(20)].map((_, i) => (
            <div key={i} className="codenames-confetti__piece" style={{ '--delay': `${i * 0.1}s`, '--x': `${Math.random() * 100}%` }} />
          ))}
        </div>
      )}
    </div>
  );
}

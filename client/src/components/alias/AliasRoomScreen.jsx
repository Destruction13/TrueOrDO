import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import Button from "../ui/Button";
import AliasSettingsModal from "./AliasSettingsModal";
import AliasRulesModal from "./AliasRulesModal";
import CyberRunner from "./CyberRunner";
import CyberRunnerLeaderboard from "./CyberRunnerLeaderboard";
import { useAuth } from "../../context/AuthContext";
import useIsMobile from "../../hooks/useIsMobile";
import "./AliasRoomScreen.css";

function formatTimer(seconds) {
  if (seconds == null) return "--";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}:${String(secs).padStart(2, "0")}` : `${secs}`;
}

function pluralize(count, one, few, many) {
  const n = Math.abs(count) % 100;
  const n1 = n % 10;
  if (n > 10 && n < 20) return many;
  if (n1 > 1 && n1 < 5) return few;
  if (n1 === 1) return one;
  return many;
}

function formatPlayers(count) {
  return `${count} ${pluralize(count, "игрок", "игрока", "игроков")}`;
}

export default function AliasRoomScreen({
  connected,
  error,
  meId,
  aliasState,
  timerRemaining,
  currentWord,
  isPaused,
  gameFinished,
  roundHistory,
  showHistoryAfterTurn,
  onCloseHistoryAfterTurn,
  reviewTimeRemaining,
  actions
}) {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const isMobile = useIsMobile();
  
  const [showSettings, setShowSettings] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showIncompleteTeamsModal, setShowIncompleteTeamsModal] = useState(false);
  const [mobileSettingsExpanded, setMobileSettingsExpanded] = useState(false);
  
  const [newTeamName, setNewTeamName] = useState("");
  const [editingTeamId, setEditingTeamId] = useState(null);
  const [editingTeamName, setEditingTeamName] = useState("");
  const editInputRef = useRef(null);
  const historyListRef = useRef(null);

  // Лидерборд для CyberRunner (привязан к комнате)
  const [cyberLeaderboard, setCyberLeaderboard] = useState(() => {
    // Пытаемся загрузить сохранённый лидерборд для этой комнаты
    const roomCode = aliasState?.room?.code;
    if (roomCode) {
      const saved = localStorage.getItem(`cyberrunner_leaderboard_${roomCode}`);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return [];
        }
      }
    }
    return [];
  });

  // Обновление лидерборда при новом результате
  const handleCyberScoreUpdate = useCallback((score, playerName) => {
    if (!playerName || score <= 0) return;
    
    setCyberLeaderboard(prev => {
      // Добавляем новый результат
      const newEntry = {
        playerName,
        score,
        date: Date.now()
      };
      
      // Проверяем, есть ли уже результат этого игрока с таким же или лучшим счётом
      const existingBetterOrEqual = prev.find(
        e => e.playerName === playerName && e.score >= score
      );
      
      if (existingBetterOrEqual) {
        return prev; // Не добавляем если уже есть лучший результат
      }
      
      // Удаляем предыдущие худшие результаты этого игрока
      const filtered = prev.filter(
        e => e.playerName !== playerName || e.score > score
      );
      
      const updated = [...filtered, newEntry]
        .sort((a, b) => b.score - a.score)
        .slice(0, 20); // Храним топ-20
      
      // Сохраняем в localStorage
      const roomCode = aliasState?.room?.code;
      if (roomCode) {
        localStorage.setItem(
          `cyberrunner_leaderboard_${roomCode}`,
          JSON.stringify(updated)
        );
      }
      
      return updated;
    });
  }, [aliasState?.room?.code]);

  // Автоскролл к новым словам (наверх списка)
  useEffect(() => {
    if (historyListRef.current && roundHistory.length > 0) {
      historyListRef.current.scrollTop = 0;
    }
  }, [roundHistory.length]);

  const { room, teams, players } = aliasState;
  const isHost = room.hostId === meId;
  const me = players.find(p => p.id === meId);
  const myTeam = teams.find(t => t.id === me?.teamId);
  const isPlaying = room.status === "playing";
  const isGameActive = room.status === "playing" || room.status === "reviewing";
  const isExplainer = room.currentExplainerId === meId;
  const currentTeam = teams.find(t => t.id === room.currentTeamId);
  const currentExplainer = players.find(p => p.id === room.currentExplainerId);
  const host = players.find(p => p.id === room.hostId);
  const onlinePlayersCount = players.filter(p => p.connectionStatus === "online").length;

  const nonSpectatorPlayers = players.filter(p => !p.isSpectator && p.teamId && p.connectionStatus === "online");
  
  // Определяем активную команду (текущую или первую с минимум 2 игроками)
  let activeTeamId = room.currentTeamId;
  if (!activeTeamId) {
    const firstValidTeam = teams.find(t => {
      const teamPlayers = players.filter(p => p.teamId === t.id && p.connectionStatus === "online" && !p.isSpectator);
      return teamPlayers.length >= 2;
    });
    activeTeamId = firstValidTeam?.id;
  }
  
  // Игроки активной команды (только они должны быть готовы для старта)
  const activeTeamPlayers = activeTeamId 
    ? players.filter(p => p.teamId === activeTeamId && p.connectionStatus === "online" && !p.isSpectator)
    : [];
  
  // Готовность проверяем только по активной команде
  const allReady = activeTeamPlayers.length >= 2 && activeTeamPlayers.every(p => p.isReady);
  const canStart = allReady && teams.length >= 1 && !isPlaying && !isPaused && room.status !== "finished";

  // Команды с недостаточным количеством игроков (< 2)
  const incompleteTeams = teams.filter(t => {
    const teamPlayers = players.filter(p => p.teamId === t.id && p.connectionStatus === "online" && !p.isSpectator);
    return teamPlayers.length > 0 && teamPlayers.length < 2;
  });

  // Команды с достаточным количеством игроков (>= 2)
  const completeTeams = teams.filter(t => {
    const teamPlayers = players.filter(p => p.teamId === t.id && p.connectionStatus === "online" && !p.isSpectator);
    return teamPlayers.length >= 2;
  });

  // Проверяем, находится ли текущий игрок в неполной команде
  const meInIncompleteTeam = me?.teamId && incompleteTeams.some(t => t.id === me.teamId);

  // Потенциальные победители — команды, достигшие цели (score >= targetScore)
  const targetScore = room.settings?.targetScore || 30;
  const potentialWinners = teams.filter(t => t.score >= targetScore).map(t => t.id);

  const handleCreateTeam = async () => {
    const teamName = newTeamName.trim() || `Команда ${teams.length + 1}`;
    await actions.createTeam(teamName);
    setNewTeamName("");
  };

  const handleStartEditTeamName = (team) => {
    // Только создатель команды может редактировать
    if (team.creatorId !== meId) return;
    setEditingTeamId(team.id);
    setEditingTeamName(team.name);
    // Фокус на input после рендера
    setTimeout(() => editInputRef.current?.focus(), 0);
  };

  const handleSaveTeamName = async () => {
    if (editingTeamId && editingTeamName.trim()) {
      await actions.renameTeam(editingTeamId, editingTeamName.trim());
    }
    setEditingTeamId(null);
    setEditingTeamName("");
  };

  const handleCreateTeamByEnter = (e) => {
    if (e.key === "Enter") {
      handleCreateTeam();
    }
  };

  // Game finished overlay
  if (gameFinished) {
    return (
      <div className="alias-room">
        <div className="alias-finished">
          <motion.div
            className="alias-finished__card"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <div className="alias-finished__trophy">🏆</div>
            <h2 className="alias-finished__title">Игра окончена!</h2>
            <div className="alias-finished__winner">
              Победитель: <strong>{gameFinished.winnerName}</strong>
            </div>
            <div className="alias-finished__scores">
              {gameFinished.finalScores.map(t => (
                <div key={t.id} className={`alias-finished__score ${t.id === gameFinished.winnerId ? "winner" : ""}`}>
                  <span>{t.name}</span>
                  <span>{t.score}</span>
                </div>
              ))}
            </div>
            <div className="alias-finished__actions">
              {isHost && (
                <Button variant="primary" onClick={actions.resetRoom}>
                  Новая игра
                </Button>
              )}
              <Button variant="ghost" onClick={actions.leaveRoom}>
                Выйти
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className={`alias-room ${isMobile ? "alias-room--mobile" : ""}`}>
      {/* Header - новый дизайн */}
      <header className="alias-header-new">
        <div className="alias-header-new__left">
          <div className="room-code-block">
            <div className="room-code-label">Код комнаты</div>
            <div className="room-code">{room.code}</div>
          </div>
          <button 
            className="alias-header-btn" 
            onClick={() => setShowRulesModal(true)}
            title="Правила игры"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </button>
          {/* Кнопка выхода - только иконка, рядом с правилами */}
          <button 
            className="alias-header-btn alias-header-btn--exit"
            onClick={() => setShowLeaveConfirm(true)}
            title="Выйти из комнаты"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
        
        <div className="alias-header-new__right">
          {/* Профиль или Войти */}
          {isAuthenticated ? (
            <button 
              className="alias-header-profile__btn"
              onClick={() => navigate("/profile")}
              title="Профиль"
            >
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="alias-header-profile__avatar" />
              ) : (
                <span className="alias-header-profile__placeholder">
                  {(user?.nickname || user?.email)?.[0]?.toUpperCase() || "?"}
                </span>
              )}
            </button>
          ) : (
            <button 
              className="alias-header-btn alias-header-btn--login"
              onClick={() => navigate("/login")}
              title="Войти"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
              <span>Войти</span>
            </button>
          )}
        </div>
      </header>

      {/* Модальное окно подтверждения выхода */}
      {showLeaveConfirm && (
        <div className="alias-modal-overlay" onClick={() => setShowLeaveConfirm(false)}>
          <motion.div
            className="alias-leave-modal"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Выйти из комнаты?</h3>
            <p>Вы уверены, что хотите выйти?</p>
            <div className="alias-leave-modal__actions">
              <Button variant="ghost" onClick={() => setShowLeaveConfirm(false)}>
                Отмена
              </Button>
              <Button variant="danger" onClick={() => { setShowLeaveConfirm(false); actions.leaveRoom(); }}>
                Выйти
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Модальное окно подтверждения старта с неполными командами */}
      {showIncompleteTeamsModal && (
        <div className="alias-modal-overlay" onClick={() => setShowIncompleteTeamsModal(false)}>
          <motion.div
            className="alias-incomplete-modal"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="alias-incomplete-modal__icon">⚠️</div>
            <h3>Не все команды готовы</h3>
            <p>
              {incompleteTeams.length === 1 
                ? `Команда "${incompleteTeams[0].name}" состоит из одного игрока и не сможет участвовать в игре.`
                : `Команды ${incompleteTeams.map(t => `"${t.name}"`).join(", ")} состоят из одного игрока и не смогут участвовать в игре.`
              }
            </p>
            <p className="alias-incomplete-modal__hint">
              Игра будет проходить только между командами с 2+ игроками.
            </p>
            <div className="alias-incomplete-modal__actions">
              <Button variant="ghost" onClick={() => setShowIncompleteTeamsModal(false)}>
                Отмена
              </Button>
              <Button 
                variant="primary" 
                onClick={() => { 
                  setShowIncompleteTeamsModal(false); 
                  actions.startTurn(); 
                }}
              >
                Начать без них
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      <main className={`alias-main ${isPlaying ? "alias-main--playing" : ""}`}>
        {/* Left panel - Teams */}
        <section className="alias-panel alias-teams-panel">
          <div className="alias-panel__header">
            <h2>Команды</h2>
          </div>
          
          <div className="alias-teams">
            {teams.map(team => {
              const members = players.filter(p => p.teamId === team.id);
              const onlineMembers = members.filter(p => p.connectionStatus === "online" && !p.isSpectator);
              const isCurrentTeam = room.currentTeamId === team.id;
              const canEditName = team.creatorId === meId;
              const isEditing = editingTeamId === team.id;
              const isIncomplete = onlineMembers.length > 0 && onlineMembers.length < 2;
              const isPotentialWinner = potentialWinners.includes(team.id);
              
              return (
                <motion.div
                  key={team.id}
                  className={`alias-team ${isCurrentTeam ? "alias-team--current" : ""} ${isIncomplete ? "alias-team--incomplete" : ""} ${isPotentialWinner ? "alias-team--winning" : ""}`}
                  layout
                >
                  <div className="alias-team__header">
                    <div className="alias-team__name-wrapper">
                      {isEditing ? (
                        <input
                          ref={editInputRef}
                          type="text"
                          value={editingTeamName}
                          onChange={(e) => setEditingTeamName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveTeamName();
                            if (e.key === "Escape") handleSaveTeamName();
                          }}
                          onBlur={handleSaveTeamName}
                          maxLength={20}
                          className="alias-team__edit-input"
                        />
                      ) : (
                        <span 
                          className={`alias-team__name ${canEditName ? "alias-team__name--editable" : ""}`}
                          onClick={() => canEditName && handleStartEditTeamName(team)}
                        >
                          {team.name}
                        </span>
                      )}
                      {canEditName && !isEditing && (
                        <button 
                          className="alias-team__edit-icon" 
                          onClick={() => handleStartEditTeamName(team)}
                          title="Редактировать название"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                      )}
                    </div>
                    <div className="alias-team__score-wrapper">
                      {isIncomplete && !isGameActive && (
                        <span className="alias-team__badge alias-team__badge--incomplete" title="Нужно минимум 2 игрока">
                          ⚠️ Нужен напарник
                        </span>
                      )}
                      <span className="alias-team__score">{team.score}</span>
                    </div>
                  </div>
                  <div className="alias-team__members">
                    {members.map(m => {
                      const isPlayerHost = m.id === room.hostId;
                      const isDisconnected = m.connectionStatus === "disconnected";
                      const isLeft = m.connectionStatus === "left";
                      
                      return (
                        <div
                          key={m.id}
                          className={`alias-member ${m.id === meId ? "alias-member--me" : ""} ${m.isReady ? "alias-member--ready" : ""} ${m.id === room.currentExplainerId ? "alias-member--explainer" : ""} ${isDisconnected ? "alias-member--disconnected" : ""} ${isLeft ? "alias-member--left" : ""}`}
                        >
                          <div className="alias-member__avatar-wrapper">
                            {m.avatarUrl ? (
                              <img src={m.avatarUrl} alt="" className="alias-member__avatar" />
                            ) : (
                              <span className="alias-member__avatar-placeholder">
                                {m.name[0]?.toUpperCase() || "?"}
                              </span>
                            )}
                            {/* Статус-точка: зелёная = онлайн, красная = отключён */}
                            <div className={`alias-member__status-dot ${isDisconnected ? "offline" : "online"}`} />
                            {/* Плавающая корона для ведущего */}
                            {isPlayerHost && <div className="alias-member__crown">👑</div>}
                          </div>
                          <div className="alias-member__info">
                            <span className="alias-member__name">
                              {m.name}
                              {m.id === meId && <span className="alias-member__you">(вы)</span>}
                            </span>
                            {isDisconnected && (
                              <span className="alias-member__status-tag">Нет связи</span>
                            )}
                          </div>
                          <div className="alias-member__badges">
                            {m.id === room.currentExplainerId && isPlaying && (
                              <span className="alias-member__role" title="Объясняет">💬</span>
                            )}
                            {!isPlaying && m.isReady && !isDisconnected && (
                              <span className="alias-member__ready-badge" title="Готов">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {!isGameActive && me?.teamId !== team.id && (
                    <Button variant="ghost" size="sm" fullWidth onClick={() => actions.joinTeam(team.id)}>
                      Вступить
                    </Button>
                  )}
                </motion.div>
              );
            })}

            {/* Create team - скрыто во время активной игры */}
            {!isGameActive && (
              <div className="alias-create-team">
                <input
                  type="text"
                  placeholder="Название команды"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  onKeyDown={handleCreateTeamByEnter}
                  maxLength={20}
                  className="alias-create-team__input"
                />
                <Button variant="secondary" size="sm" onClick={handleCreateTeam}>
                  + Создать
                </Button>
              </div>
            )}

            {/* Leave team */}
            {!isPlaying && me?.teamId && (
              <Button variant="ghost" size="sm" onClick={actions.leaveTeam}>
                Покинуть команду
              </Button>
            )}
          </div>

          {/* Spectators / Наблюдатели */}
          <div className="alias-spectators">
            <div className="alias-spectators__title">👀 Наблюдатели</div>
            {players.filter(p => !p.teamId).map(p => (
              <div key={p.id} className="alias-spectator">
                {p.avatarUrl ? (
                  <img src={p.avatarUrl} alt="" className="alias-spectator__avatar" />
                ) : (
                  <span className="alias-spectator__avatar-placeholder">
                    {p.name[0]?.toUpperCase() || "?"}
                  </span>
                )}
                <span>{p.name}</span>
                {p.id === meId && <span className="alias-spectator__tag">(Вы)</span>}
              </div>
            ))}
          </div>

          {/* МОБИЛКА: Блок объясняющего/готовности - под командами */}
          {isMobile && !isPlaying && me?.teamId && room.status !== "reviewing" && (
            <div className="alias-mobile-status-section">
              {me.teamId === activeTeamId ? (
                /* Я в активной команде */
                canStart && room.currentExplainerId ? (
                  /* Все готовы - показываем инфо об объясняющем и кнопку старта */
                  room.currentExplainerId === meId ? (
                    <div className="alias-your-turn">
                      <span className="alias-your-turn__label">Вы объясняете</span>
                      <Button 
                        variant="primary" 
                        size="lg"
                        fullWidth
                        onClick={() => {
                          if (incompleteTeams.length > 0) {
                            setShowIncompleteTeamsModal(true);
                          } else {
                            actions.startTurn();
                          }
                        }}
                      >
                        Начать раунд
                      </Button>
                    </div>
                  ) : (
                    <div className="alias-next-explainer-card">
                      <div className="alias-next-explainer-card__label">Сейчас объясняет</div>
                      <div className="alias-next-explainer-card__player">
                        {(() => {
                          const explainer = players.find(p => p.id === room.currentExplainerId);
                          return explainer ? (
                            <>
                              {explainer.avatarUrl ? (
                                <img src={explainer.avatarUrl} alt="" className="alias-next-explainer-card__avatar" />
                              ) : (
                                <span className="alias-next-explainer-card__avatar-placeholder">
                                  {explainer.name[0]?.toUpperCase() || "?"}
                                </span>
                              )}
                              <span className="alias-next-explainer-card__name">{explainer.name}</span>
                            </>
                          ) : "...";
                        })()}
                      </div>
                      <div className="alias-next-explainer-card__team">
                        Команда: {teams.find(t => t.id === room.currentTeamId)?.name || "..."}
                      </div>
                      <div className="alias-waiting-start">
                        Ожидание старта...
                      </div>
                    </div>
                  )
                ) : (
                  /* Не все готовы - кнопка готовности с инфо об объясняющем */
                  <div className="alias-mobile-ready-block">
                    {room.currentExplainerId && (
                      <div className="alias-mobile-ready-block__explainer">
                        {room.currentExplainerId === meId ? (
                          <span className="alias-mobile-ready-block__you">Вы объясняете</span>
                        ) : (
                          <>
                            <span className="alias-mobile-ready-block__label">Объясняет:</span>
                            <span className="alias-mobile-ready-block__name">
                              {players.find(p => p.id === room.currentExplainerId)?.name || "..."}
                            </span>
                          </>
                        )}
                      </div>
                    )}
                    <Button
                      variant={me.isReady ? "secondary" : "primary"}
                      size="lg"
                      fullWidth
                      onClick={() => actions.setReady(!me.isReady)}
                    >
                      {me.isReady ? "✓ Готов" : "Готов!"}
                    </Button>
                    <div className="alias-mobile-ready-block__status">
                      Готовы: {activeTeamPlayers.filter(p => p.isReady).length} / {activeTeamPlayers.length}
                    </div>
                  </div>
                )
              ) : activeTeamId ? (
                /* Я в неактивной команде */
                <div className="alias-waiting-team">
                  <div className="alias-waiting-team__icon">⏳</div>
                  <div className="alias-waiting-team__text">
                    Сейчас ход команды <strong>{teams.find(t => t.id === activeTeamId)?.name}</strong>
                  </div>
                </div>
              ) : null}
            </div>
          )}
          
        </section>

        {/* Right panel - Game */}
        <section className="alias-panel alias-game-panel">
          {/* Playing state */}
          {isPlaying && (
            <div className="alias-playing">
              <div className="alias-turn-info">
                <div className="alias-turn-team">
                  Ход: <strong>{currentTeam?.name}</strong>
                </div>
                <div className="alias-turn-explainer">
                  Объясняет: <strong>{currentExplainer?.name}</strong>
                </div>
              </div>

              <div className={`alias-timer ${timerRemaining <= 10 ? "alias-timer--warning" : ""}`}>
                {formatTimer(timerRemaining)}
              </div>

              {isPaused && (
                <div className="alias-paused-banner">
                  ⏸ Игра на паузе
                </div>
              )}

              {/* Контент для активной команды */}
              {me?.teamId === room.currentTeamId && (
                <>
                  {/* Word display */}
                  <div className="alias-word-area">
                    {isExplainer ? (
                      <motion.div
                        className="alias-word"
                        key={currentWord}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        {currentWord || "..."}
                      </motion.div>
                    ) : (
                      <div className="alias-word alias-word--hidden">
                        Слушайте и угадывайте!
                      </div>
                    )}
                  </div>

                  {/* Explainer controls */}
                  {isExplainer && !isPaused && (
                    <div className="alias-controls">
                      <Button
                        variant="primary"
                        size="lg"
                        onClick={actions.nextWord}
                        className="alias-btn-correct"
                      >
                        <span className="alias-btn-icon alias-btn-icon--correct">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </span>
                        Угадали
                      </Button>
                      <Button
                        variant="ghost"
                        size="lg"
                        onClick={actions.skipWord}
                        className="alias-btn-skip"
                      >
                        <span className="alias-btn-icon alias-btn-icon--skip">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </span>
                        Пропустить
                      </Button>
                    </div>
                  )}

                  {/* Встроенный отчёт для мобилок — для объясняющего (с кнопками редактирования) */}
                  {isMobile && isExplainer && roundHistory.length > 0 && (
                    <div className="alias-mobile-inline-report alias-mobile-inline-report--explainer">
                      <div className="alias-mobile-inline-report__list">
                        {[...roundHistory].reverse().map((item, revIndex) => {
                          const index = roundHistory.length - 1 - revIndex;
                          return (
                            <motion.div
                              key={index}
                              className={`alias-history-item ${item.correct ? "alias-history-item--correct" : "alias-history-item--skipped"} ${revIndex === 0 ? "alias-history-item--new" : ""}`}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: revIndex * 0.03 }}
                            >
                              <span className="alias-history-item__indicator">
                                {item.correct ? (
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                ) : (
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                  </svg>
                                )}
                              </span>
                              <span className="alias-history-item__word">{item.word}</span>
                              <button
                                className={`alias-history-item__toggle ${item.correct ? "alias-history-item__toggle--minus" : "alias-history-item__toggle--plus"}`}
                                onClick={() => actions.updateHistory(index, !item.correct)}
                                title={item.correct ? "Снять очко" : "Добавить очко"}
                              >
                                {item.correct ? "−" : "+"}
                              </button>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Встроенный отчёт для мобилок (для угадывающих - полноценный отчёт с кнопками) */}
                  {isMobile && !isExplainer && roundHistory.length > 0 && (
                    <div className="alias-mobile-inline-report">
                      <div className="alias-mobile-inline-report__list">
                        {[...roundHistory].reverse().map((item, revIndex) => {
                          const index = roundHistory.length - 1 - revIndex;
                          return (
                            <motion.div
                              key={index}
                              className={`alias-history-item ${item.correct ? "alias-history-item--correct" : "alias-history-item--skipped"} ${revIndex === 0 ? "alias-history-item--new" : ""}`}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: revIndex * 0.03 }}
                            >
                              <span className="alias-history-item__indicator">
                                {item.correct ? (
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                ) : (
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                  </svg>
                                )}
                              </span>
                              <span className="alias-history-item__word">{item.word}</span>
                              <button
                                className={`alias-history-item__toggle ${item.correct ? "alias-history-item__toggle--minus" : "alias-history-item__toggle--plus"}`}
                                onClick={() => actions.updateHistory(index, !item.correct)}
                                title={item.correct ? "Снять очко" : "Добавить очко"}
                              >
                                {item.correct ? "−" : "+"}
                              </button>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Контент для ожидающей команды — мини-игра */}
              {me?.teamId && me.teamId !== room.currentTeamId && (
                <div className="alias-waiting-playing">
                  <div className="alias-waiting-playing__label">
                    Ожидание хода вашей команды
                  </div>
                  <div className="cyber-runner-container">
                    <CyberRunner 
                      roomCode={room.code}
                      playerName={me?.name}
                      onScoreUpdate={handleCyberScoreUpdate}
                    />
                    <CyberRunnerLeaderboard leaderboard={cyberLeaderboard} />
                  </div>
                </div>
              )}

              {/* Для зрителей без команды */}
              {!me?.teamId && (
                <div className="alias-word-area">
                  <div className="alias-word alias-word--hidden">
                    Наблюдайте за игрой
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Lobby state */}
          {!isPlaying && (
            <div className="alias-lobby">
              {/* Параметры игры */}
              <div className={`alias-lobby__settings ${isMobile ? "alias-lobby__settings--mobile" : ""}`}>
                <div className="alias-lobby__settings-header">
                  <h3>Параметры игры</h3>
                  <button 
                    className="alias-settings-gear"
                    onClick={(e) => { e.stopPropagation(); setShowSettings(true); }}
                    title="Изменить настройки"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                    </svg>
                  </button>
                </div>
                {/* Полоска с кликабельной стрелкой для мобильного ката */}
                {isMobile && (
                  <div 
                    className={`alias-settings-divider ${mobileSettingsExpanded ? "alias-settings-divider--open" : ""}`}
                    onClick={() => setMobileSettingsExpanded(!mobileSettingsExpanded)}
                  >
                    <span className="alias-settings-divider__line" />
                    <span className="alias-settings-divider__arrow">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </span>
                    <span className="alias-settings-divider__line" />
                  </div>
                )}
                <AnimatePresence>
                  {(!isMobile || mobileSettingsExpanded) && (
                    <motion.div 
                      className="alias-settings-grid"
                      initial={isMobile ? { height: 0, opacity: 0 } : false}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={isMobile ? { height: 0, opacity: 0 } : undefined}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                    >
                  <div className="alias-setting-item">
                    <span className="alias-setting-item__icon">🎯</span>
                    <span className="alias-setting-item__label">Цель</span>
                    <span className="alias-setting-item__value">{room.settings.targetScore} очков</span>
                  </div>
                  <div className="alias-setting-item">
                    <span className="alias-setting-item__icon">⏱️</span>
                    <span className="alias-setting-item__label">Раунд</span>
                    <span className="alias-setting-item__value">{room.settings.turnSeconds} сек</span>
                  </div>
                  <div className="alias-setting-item">
                    <span className="alias-setting-item__icon">⏭️</span>
                    <span className="alias-setting-item__label">Пропуск</span>
                    <span className="alias-setting-item__value">{room.settings.skipPenalty === -1 ? "−1 очко" : "Бесплатно"}</span>
                  </div>
                  <div className="alias-setting-item">
                    <span className="alias-setting-item__icon">📚</span>
                    <span className="alias-setting-item__label">Словарь</span>
                    <span className="alias-setting-item__value">{room.settings.difficulty === "easy" ? "Лёгкий" : room.settings.difficulty === "hard" ? "Сложный" : "Обычный"}</span>
                  </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Десктоп: Ready button - только для игроков активной команды и не во время reviewing */}
              {!isMobile && me?.teamId && me.teamId === activeTeamId && room.status !== "reviewing" && !canStart && (
                <div className="alias-ready-section">
                  <Button
                    variant={me.isReady ? "secondary" : "primary"}
                    size="lg"
                    onClick={() => actions.setReady(!me.isReady)}
                  >
                    {me.isReady ? "✓ Готов" : "Готов!"}
                  </Button>
                  <div className="alias-ready-status">
                    Готовы: {activeTeamPlayers.filter(p => p.isReady).length} / {activeTeamPlayers.length}
                  </div>
                </div>
              )}

              {/* Статус для игроков неактивной команды */}
              {me?.teamId && activeTeamId && me.teamId !== activeTeamId && !isPlaying && room.status !== "reviewing" && (
                <div className="alias-waiting-team">
                  <div className="alias-waiting-team__icon">⏳</div>
                  <div className="alias-waiting-team__text">
                    Сейчас ход команды <strong>{teams.find(t => t.id === activeTeamId)?.name}</strong>
                  </div>
                </div>
              )}

              {/* Start section - показываем кто будет объяснять (не во время reviewing) - ДЕСКТОП */}
              {!isMobile && canStart && room.currentExplainerId && room.status !== "reviewing" && (
                <div className="alias-start-section">
                  {room.currentExplainerId === meId ? (
                    /* Компактный блок для объясняющего */
                    <div className="alias-your-turn">
                      <span className="alias-your-turn__label">Вы объясняете</span>
                      <Button 
                        variant="primary" 
                        size="lg"
                        onClick={() => {
                          if (incompleteTeams.length > 0) {
                            setShowIncompleteTeamsModal(true);
                          } else {
                            actions.startTurn();
                          }
                        }}
                      >
                        Начать раунд
                      </Button>
                    </div>
                  ) : (
                    /* Карточка для остальных игроков команды */
                    <div className="alias-next-explainer-card">
                      <div className="alias-next-explainer-card__label">Сейчас объясняет</div>
                      <div className="alias-next-explainer-card__player">
                        {(() => {
                          const explainer = players.find(p => p.id === room.currentExplainerId);
                          return explainer ? (
                            <>
                              {explainer.avatarUrl ? (
                                <img src={explainer.avatarUrl} alt="" className="alias-next-explainer-card__avatar" />
                              ) : (
                                <span className="alias-next-explainer-card__avatar-placeholder">
                                  {explainer.name[0]?.toUpperCase() || "?"}
                                </span>
                              )}
                              <span className="alias-next-explainer-card__name">{explainer.name}</span>
                            </>
                          ) : "...";
                        })()}
                      </div>
                      <div className="alias-next-explainer-card__team">
                        Команда: {teams.find(t => t.id === room.currentTeamId)?.name || "..."}
                      </div>
                      <div className="alias-waiting-start">
                        Ожидание старта...
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Сообщение во время просмотра отчёта */}
              {room.status === "reviewing" && (
                <div className="alias-reviewing-notice">
                  <div className="alias-reviewing-notice__icon">📋</div>
                  <div className="alias-reviewing-notice__text">
                    Подтвердите отчёт раунда, чтобы продолжить игру
                  </div>
                </div>
              )}

              {!me?.teamId && (
                <div className="alias-lobby__hint">
                  Вступите в команду, чтобы играть
                </div>
              )}

              {/* Уведомление для игрока в неполной команде */}
              {meInIncompleteTeam && !isGameActive && (
                <motion.div 
                  className="alias-incomplete-warning"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <span className="alias-incomplete-warning__icon">👤</span>
                  <span className="alias-incomplete-warning__text">
                    Вы один в команде — нужен напарник
                  </span>
                  {completeTeams.length > 0 && (
                    <div className="alias-incomplete-warning__actions">
                      {completeTeams.slice(0, 2).map(team => (
                        <Button 
                          key={team.id}
                          variant="secondary" 
                          size="sm" 
                          onClick={() => actions.joinTeam(team.id)}
                        >
                          → {team.name}
                        </Button>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          )}

          {/* Host controls */}
          {isHost && (
            <div className="alias-host-controls">
              {isPlaying && (
                <>
                  <Button variant={isPaused ? "primary" : "ghost"} size="sm" onClick={actions.togglePause}>
                    {isPaused ? "▶ Продолжить" : "⏸ Пауза"}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={actions.skipTurn}>
                    ⏭ Пропустить ход
                  </Button>
                </>
              )}
              <Button variant="danger" size="sm" onClick={actions.resetRoom}>
                🔄 Сбросить игру
              </Button>
            </div>
          )}

          {error && <div className="alias-error">{error}</div>}
        </section>

        {/* Report Panel - постоянно справа во время игры (25%), скрыта на мобилках */}
        {isPlaying && !isMobile && (
          <section className="alias-report-panel">
            <div className="alias-report-panel__header">
              <h3>📋 Отчёт раунда</h3>
            </div>
            <div className="alias-report-panel__content">
              {roundHistory.length === 0 ? (
                <div className="alias-report-panel__empty">Слова появятся здесь</div>
              ) : (
                <div className="alias-history-list" ref={historyListRef}>
                  {[...roundHistory].reverse().map((item, revIndex) => {
                    const index = roundHistory.length - 1 - revIndex;
                    return (
                      <div 
                        key={index} 
                        className={`alias-history-item ${item.correct ? "alias-history-item--correct" : "alias-history-item--skipped"} ${revIndex === 0 ? "alias-history-item--new" : ""}`}
                      >
                        <span className="alias-history-item__indicator">
                          {item.correct ? (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          ) : (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          )}
                        </span>
                        <span className="alias-history-item__word">{item.word}</span>
                        <button
                          className={`alias-history-item__toggle ${item.correct ? "alias-history-item__toggle--minus" : "alias-history-item__toggle--plus"}`}
                          onClick={() => actions.updateHistory(index, !item.correct)}
                          title={item.correct ? "Снять очко" : "Добавить очко"}
                        >
                          {item.correct ? "−" : "+"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="alias-report-panel__footer">
              <span className="alias-report-panel__stat alias-report-panel__stat--correct">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {roundHistory.filter(h => h.correct).length}
              </span>
              <span className="alias-report-panel__stat alias-report-panel__stat--skipped">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
                {roundHistory.filter(h => !h.correct).length}
              </span>
            </div>
          </section>
        )}

        {/* History Panel - снизу в лобби после завершения хода */}
        {!isPlaying && showHistoryAfterTurn && roundHistory.length > 0 && (
          <motion.div
            className="alias-history-panel alias-history-panel--lobby"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
          >
            <div className="alias-history-panel__header">
              <h3>📋 Отчёт раунда</h3>
              <button 
                className="alias-history-panel__close" 
                onClick={onCloseHistoryAfterTurn}
              >×</button>
            </div>
            <div className="alias-history-panel__alert" id="report-alert">
              <div className="alias-history-panel__alert-icon">⚠️</div>
              <div className="alias-history-panel__alert-text">
                <strong>Проверьте результаты!</strong>
                <span>Нажмите <span className="alias-history-panel__alert-btn">−</span> чтобы снять очко за слово с нарушением правил</span>
              </div>
              <button 
                className="alias-history-panel__alert-close"
                onClick={() => document.getElementById('report-alert')?.remove()}
                title="Закрыть"
              >
                ×
              </button>
            </div>
            <div className="alias-history-panel__content">
              <div className="alias-history-list alias-history-list--horizontal">
                {roundHistory.map((item, index) => (
                  <div 
                    key={index} 
                    className={`alias-history-item ${item.correct ? "alias-history-item--correct" : "alias-history-item--skipped"}`}
                  >
                    <span className="alias-history-item__indicator">
                      {item.correct ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      )}
                    </span>
                    <span className="alias-history-item__word">{item.word}</span>
                    <button
                      className={`alias-history-item__toggle ${item.correct ? "alias-history-item__toggle--minus" : "alias-history-item__toggle--plus"}`}
                      onClick={() => actions.updateHistory(index, !item.correct)}
                      title={item.correct ? "Снять очко" : "Добавить очко"}
                    >
                      {item.correct ? "−" : "+"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="alias-history-panel__footer">
              <div className="alias-history-panel__stats">
                <span className="alias-history-panel__stat alias-history-panel__stat--correct">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {roundHistory.filter(h => h.correct).length}
                </span>
                <span className="alias-history-panel__stat alias-history-panel__stat--skipped">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                  {roundHistory.filter(h => !h.correct).length}
                </span>
              </div>
              {room.status === "reviewing" ? (
                <Button variant="primary" size="sm" onClick={actions.confirmReport}>
                  Подтвердить
                </Button>
              ) : (
                <Button variant="ghost" size="sm" onClick={onCloseHistoryAfterTurn}>
                  Закрыть отчёт
                </Button>
              )}
            </div>
            {room.status === "reviewing" && reviewTimeRemaining != null && (
              <div className="alias-history-panel__timer">
                <div className="alias-history-panel__timer-line" />
                <div className="alias-history-panel__timer-content">
                  <span className="alias-history-panel__timer-label">Автоподтверждение через</span>
                  <span className="alias-history-panel__timer-value">{reviewTimeRemaining}</span>
                  <span className="alias-history-panel__timer-unit">сек</span>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </main>

      {/* Settings Modal */}
      <AliasSettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={room.settings}
        onSave={actions.updateSettings}
        isHost={isHost}
      />

      {/* Rules Modal */}
      <AliasRulesModal
        isOpen={showRulesModal}
        onClose={() => setShowRulesModal(false)}
      />

    </div>
  );
}

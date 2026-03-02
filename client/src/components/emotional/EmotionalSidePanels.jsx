import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import StyledNickname from "../ui/StyledNickname";
import "./EmotionalSidePanels.css";

// Преобразование nicknameStyle в формат для StyledNickname
function toNicknameCustomization(style) {
  if (!style) return null;
  return {
    nicknameColorType: style.colorType,
    nicknameCustomColor: style.customColor,
    nicknameGradient: style.gradient,
    nicknameGlow: style.glow
  };
}

/**
 * Панель игроков с очками (слева на desktop, сверху на mobile)
 */
export function PlayersPanel({ players = [], scores = {}, meId, hostId, leaderId }) {
  // Сортируем: сначала онлайн игроки по очкам, потом disconnected по очкам
  // Исключаем left и kicked
  const sortedPlayers = useMemo(() => {
    const activePlayers = players.filter(
      (p) => p.connectionStatus === "online" || p.connectionStatus === "disconnected"
    );
    return activePlayers.sort((a, b) => {
      // Онлайн игроки выше disconnected
      if (a.connectionStatus === "online" && b.connectionStatus !== "online") return -1;
      if (a.connectionStatus !== "online" && b.connectionStatus === "online") return 1;
      // Внутри группы сортируем по очкам
      return (scores[b.id] || 0) - (scores[a.id] || 0);
    });
  }, [players, scores]);

  const getMedal = (index) => {
    switch (index) {
      case 0: return "🥇";
      case 1: return "🥈";
      case 2: return "🥉";
      default: return null;
    }
  };

  return (
    <div className="emotional-players-panel">
      <AnimatePresence mode="popLayout">
        {sortedPlayers.map((player, index) => {
          const isMe = player.id === meId;
          const isHost = player.id === hostId;
          const isLeader = player.id === leaderId;
          const isDisconnected = player.connectionStatus === "disconnected";
          const score = scores[player.id] || 0;

          return (
            <motion.div
              key={player.id}
              className={`emotional-players-panel__item ${isMe ? "emotional-players-panel__item--me" : ""} ${isDisconnected ? "emotional-players-panel__item--disconnected" : ""}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: isDisconnected ? 0.5 : 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ delay: index * 0.03 }}
              layout
            >
              <div className="emotional-players-panel__rank">
                {getMedal(index) || (
                  <span className="emotional-players-panel__rank-number">{index + 1}</span>
                )}
              </div>
              <div className="emotional-players-panel__player">
                <span className="emotional-players-panel__player-name">
                  <StyledNickname 
                    name={player.name} 
                    customization={toNicknameCustomization(player.nicknameStyle)}
                  />
                  {isLeader && <span className="emotional-players-panel__badge emotional-players-panel__badge--leader">ведёт</span>}
                  {isDisconnected && <span className="emotional-players-panel__badge emotional-players-panel__badge--offline">⚡</span>}
                </span>
              </div>
              <div className="emotional-players-panel__score">{score}</div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

/**
 * Отчёт игры — показывает историю всех раундов (новые раунды сверху)
 * с детальной информацией о голосовании и очках
 */
export function RoundReport({ roundHistory = [], phase = null, isDesktop = true, players = [] }) {
  const [expandedRounds, setExpandedRounds] = useState({});
  const [expandedVotes, setExpandedVotes] = useState({}); // Раскрытые эмоции внутри раундов
  const [lastKnownLength, setLastKnownLength] = useState(0);
  const [prevPhase, setPrevPhase] = useState(null);

  // Переворачиваем массив, чтобы новые раунды были сверху
  const reversedHistory = useMemo(() => {
    return [...roundHistory].reverse();
  }, [roundHistory]);

  // Отслеживаем появление нового раунда — открываем только его, закрываем остальные
  useMemo(() => {
    if (roundHistory.length > lastKnownLength && roundHistory.length > 0) {
      const newestRound = roundHistory[roundHistory.length - 1];
      // Открываем только самый новый раунд, остальные закрываем
      const newExpanded = {};
      newExpanded[newestRound.roundNumber] = true;
      setExpandedRounds(newExpanded);
      setLastKnownLength(roundHistory.length);
    } else if (roundHistory.length === 0 && lastKnownLength > 0) {
      // Сброс при новой игре
      setExpandedRounds({});
      setLastKnownLength(0);
    }
  }, [roundHistory.length, lastKnownLength]);

  // Закрываем все каты при переходе к новому раунду (results/no_contest -> submit)
  useMemo(() => {
    if (prevPhase && (prevPhase === "results" || prevPhase === "no_contest") && phase === "submit") {
      setExpandedRounds({});
    }
    setPrevPhase(phase);
  }, [phase, prevPhase]);

  const toggleRound = (roundNumber) => {
    setExpandedRounds((prev) => ({
      ...prev,
      [roundNumber]: !prev[roundNumber],
    }));
  };

  // Переключение раскрытия списка голосовавших для эмоции
  const toggleVote = (roundNumber, emotionIdx) => {
    const key = `${roundNumber}-${emotionIdx}`;
    setExpandedVotes((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const getVoteResultInfo = (voteResult) => {
    switch (voteResult) {
      case "correct":
        return { icon: "✅", text: "Угадали", className: "emotional-round-report__item--correct" };
      case "incorrect":
        return { icon: "❌", text: "Не угадали", className: "emotional-round-report__item--incorrect" };
      case "draw_correct":
        return { icon: "🤝", text: "Ничья (угадали)", className: "emotional-round-report__item--draw-correct" };
      case "draw_incorrect":
        return { icon: "🤝", text: "Ничья", className: "emotional-round-report__item--draw" };
      case "no_contest":
        return { icon: "⏭️", text: "Пропущен", className: "emotional-round-report__item--skipped" };
      case "no_votes":
        return { icon: "🤷", text: "Без голосов", className: "emotional-round-report__item--no-votes" };
      default:
        return { icon: "❓", text: "Неизвестно", className: "" };
    }
  };

  // Сортируем голоса: сначала победившие, потом по количеству голосов
  const getSortedVotes = (votersByEmotion) => {
    if (!votersByEmotion) return [];
    return Object.values(votersByEmotion).sort((a, b) => {
      if (a.isWinner && !b.isWinner) return -1;
      if (!a.isWinner && b.isWinner) return 1;
      return b.voteCount - a.voteCount;
    });
  };


  return (
    <div className={`emotional-round-report ${isDesktop ? "emotional-round-report--desktop" : "emotional-round-report--mobile"}`}>
      <div className="emotional-round-report__header">
        <span className="emotional-round-report__icon">📊</span>
        <span className="emotional-round-report__title">Отчёт игры</span>
      </div>

      {reversedHistory.length === 0 ? (
        <div className="emotional-round-report__empty">
          Раунды ещё не сыграны
        </div>
      ) : (
        <div className="emotional-round-report__list">
          {reversedHistory.map((round) => {
            const isExpanded = !!expandedRounds[round.roundNumber];
            const resultInfo = getVoteResultInfo(round.voteResult);
            const sortedVotes = getSortedVotes(round.votersByEmotion);

            return (
              <div
                key={round.roundNumber}
                className={`emotional-round-report__item ${resultInfo.className}`}
              >
                <button
                  className="emotional-round-report__item-header"
                  onClick={() => toggleRound(round.roundNumber)}
                >
                  <span className="emotional-round-report__round-number">
                    Раунд {round.roundNumber}
                  </span>
                  <span className="emotional-round-report__result-badge">
                    <span className="emotional-round-report__result-icon">{resultInfo.icon}</span>
                    <span className="emotional-round-report__result-text">{resultInfo.text}</span>
                  </span>
                  <span className={`emotional-round-report__chevron ${isExpanded ? "emotional-round-report__chevron--open" : ""}`}>
                    ▼
                  </span>
                </button>

                <AnimatePresence initial={false} mode="wait">
                  {isExpanded && (
                    <motion.div
                      className="emotional-round-report__details-wrapper"
                      initial="collapsed"
                      animate="expanded"
                      exit="collapsed"
                      variants={{
                        expanded: { 
                          height: "auto",
                          transition: { 
                            height: { duration: 0.45, ease: [0.33, 1, 0.68, 1] }
                          }
                        },
                        collapsed: { 
                          height: 0,
                          transition: { 
                            height: { duration: 0.35, ease: [0.33, 1, 0.68, 1] }
                          }
                        }
                      }}
                    >
                      <motion.div
                        className="emotional-round-report__details"
                        variants={{
                          expanded: { 
                            opacity: 1, 
                            y: 0,
                            transition: { duration: 0.3, delay: 0.1, ease: "easeOut" }
                          },
                          collapsed: { 
                            opacity: 0, 
                            y: -8,
                            transition: { duration: 0.2, ease: "easeIn" }
                          }
                        }}
                      >
                        {/* Ведущий и загаданная эмоция */}
                        <div className="emotional-round-report__leader-row">
                          <span className="emotional-round-report__leader-info">
                            <span className="emotional-round-report__leader-badge">👑 {round.leaderName}</span>
                            <span className="emotional-round-report__secret-emotion">{round.secretEmotion}</span>
                          </span>
                          <span className={`emotional-round-report__leader-points ${(round.roundScores?.[round.leaderId] || 0) > 0 ? "emotional-round-report__leader-points--positive" : ""}`}>
                            {(round.roundScores?.[round.leaderId] || 0) > 0 ? `+${round.roundScores[round.leaderId]}` : "0"}
                          </span>
                        </div>

                        {/* Голосование */}
                        {sortedVotes.length > 0 && (
                          <div className="emotional-round-report__votes-section">
                            {sortedVotes.map((vote, idx) => {
                              const voteKey = `${round.roundNumber}-${idx}`;
                              const isVoteExpanded = !!expandedVotes[voteKey];
                              
                              return (
                                <div key={idx} className="emotional-round-report__vote-item">
                                  <button
                                    type="button"
                                    className={`emotional-round-report__vote-header ${vote.isWinner ? "emotional-round-report__vote-header--winner" : ""} ${vote.isLeaderCard ? "emotional-round-report__vote-header--leader" : ""}`}
                                    onClick={() => toggleVote(round.roundNumber, idx)}
                                  >
                                    <div className="emotional-round-report__vote-emotion">
                                      {vote.isWinner && <span className="emotional-round-report__winner-icon">🏆</span>}
                                      <span className="emotional-round-report__emotion-text">{vote.emotion}</span>
                                      {vote.isLeaderCard && <span className="emotional-round-report__leader-star">★</span>}
                                    </div>
                                    <div className="emotional-round-report__vote-count-badge">
                                      {vote.voteCount}
                                    </div>
                                    <span className={`emotional-round-report__vote-chevron ${isVoteExpanded ? "emotional-round-report__vote-chevron--open" : ""}`}>
                                      ▼
                                    </span>
                                  </button>
                                  
                                  <AnimatePresence initial={false} mode="wait">
                                    {isVoteExpanded && (
                                      <motion.div
                                        className="emotional-round-report__voters-wrapper"
                                        initial="collapsed"
                                        animate="expanded"
                                        exit="collapsed"
                                        variants={{
                                          expanded: { 
                                            height: "auto",
                                            transition: { 
                                              height: { duration: 0.3, ease: [0.33, 1, 0.68, 1] }
                                            }
                                          },
                                          collapsed: { 
                                            height: 0,
                                            transition: { 
                                              height: { duration: 0.25, ease: [0.33, 1, 0.68, 1] }
                                            }
                                          }
                                        }}
                                      >
                                        <motion.div
                                          className="emotional-round-report__voters-content"
                                          variants={{
                                            expanded: { 
                                              opacity: 1,
                                              transition: { duration: 0.2, delay: 0.05, ease: "easeOut" }
                                            },
                                            collapsed: { 
                                              opacity: 0,
                                              transition: { duration: 0.15, ease: "easeIn" }
                                            }
                                          }}
                                        >
                                          {vote.voters.map((voter, vIdx) => {
                                            // voter может быть объектом {id, name} или строкой (для обратной совместимости)
                                            const voterName = typeof voter === "string" ? voter : voter.name;
                                            const voterId = typeof voter === "object" ? voter.id : null;
                                            const voterPoints = voterId ? (round.roundScores?.[voterId] || 0) : 0;
                                            
                                            return (
                                              <div key={vIdx} className="emotional-round-report__voter-row">
                                                <span className="emotional-round-report__voter-name">{voterName}</span>
                                                <span className={`emotional-round-report__voter-points ${voterPoints > 0 ? "emotional-round-report__voter-points--positive" : ""}`}>
                                                  {voterPoints > 0 ? `+${voterPoints}` : "0"}
                                                </span>
                                              </div>
                                            );
                                          })}
                                        </motion.div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              );
                            })}
                          </div>
                        )}

                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

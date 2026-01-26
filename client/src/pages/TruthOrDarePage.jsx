import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { io } from "socket.io-client";
import JoinScreen from "../components/JoinScreen";
import RoomScreen from "../components/RoomScreen";
import ShaderBackground from "../components/ShaderBackground";
import EmailVerifyBanner from "../components/auth/EmailVerifyBanner";
import BannedModal from "../components/ui/BannedModal";
import GameEndedModal from "../components/ui/GameEndedModal";
import { useAuth } from "../context/AuthContext";
import "./TruthOrDarePage.css";

const socket = io(import.meta.env.VITE_SERVER_URL || "/", {
  autoConnect: false
});

// Флаг для предотвращения обновления состояния после выхода
let isLeavingRoom = false;

// DEBUG: Логирование
const DEBUG = false;
const log = (...args) => DEBUG && console.log("[TruthOrDare]", ...args);

// ═══════════════════════════════════════════════════════════════════════════
// Session Storage — для восстановления сессии после F5
// ═══════════════════════════════════════════════════════════════════════════
const SESSION_KEYS = {
  PLAYER_ID: "tod:playerId",
  ROOM_CODE: "tod:roomCode",
  PLAYER_NAME: "tod:playerName",
  VISITOR_ID: "tod:visitorId"
};

function getOrCreateVisitorId() {
  try {
    let visitorId = localStorage.getItem(SESSION_KEYS.VISITOR_ID);
    if (!visitorId) {
      visitorId = "v_" + Math.random().toString(36).substring(2) + Date.now().toString(36);
      localStorage.setItem(SESSION_KEYS.VISITOR_ID, visitorId);
    }
    return visitorId;
  } catch (e) {
    return "v_" + Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
}

function saveSession(playerId, roomCode, playerName) {
  try {
    localStorage.setItem(SESSION_KEYS.PLAYER_ID, playerId);
    localStorage.setItem(SESSION_KEYS.ROOM_CODE, roomCode);
    if (playerName) {
      localStorage.setItem(SESSION_KEYS.PLAYER_NAME, playerName);
    }
    log("Session saved:", { playerId, roomCode, playerName });
  } catch (e) {
    console.error("Failed to save session:", e);
  }
}

function loadSession() {
  try {
    const playerId = localStorage.getItem(SESSION_KEYS.PLAYER_ID);
    const roomCode = localStorage.getItem(SESSION_KEYS.ROOM_CODE);
    const playerName = localStorage.getItem(SESSION_KEYS.PLAYER_NAME);
    if (playerId && roomCode) {
      log("Session loaded:", { playerId, roomCode, playerName });
      return { playerId, roomCode, playerName };
    }
  } catch (e) {
    console.error("Failed to load session:", e);
  }
  return null;
}

function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEYS.PLAYER_ID);
    localStorage.removeItem(SESSION_KEYS.ROOM_CODE);
    localStorage.removeItem(SESSION_KEYS.PLAYER_NAME);
    log("Session cleared");
  } catch (e) {
    console.error("Failed to clear session:", e);
  }
}

// Выход из других игр при входе в Truth or Dare
function leaveOtherGames() {
  // Выход из Alias
  const aliasPlayerId = localStorage.getItem("alias:playerId");
  if (aliasPlayerId) {
    socket.emit("alias:room:leave", { playerId: aliasPlayerId });
    localStorage.removeItem("alias:playerId");
    localStorage.removeItem("alias:roomCode");
    localStorage.removeItem("alias:playerName");
  }
  
  // Выход из Codenames
  const codenamesPlayerId = localStorage.getItem("codenames:playerId");
  if (codenamesPlayerId) {
    socket.emit("codenames:room:leave", { playerId: codenamesPlayerId });
    localStorage.removeItem("codenames:playerId");
    localStorage.removeItem("codenames:roomCode");
    localStorage.removeItem("codenames:playerName");
  }
}

export default function TruthOrDarePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { roomCode: urlRoomCode } = useParams();
  const { user } = useAuth();
  const [connected, setConnected] = useState(false);
  const [roomState, setRoomState] = useState(null);
  const [meId, setMeId] = useState(null);
  const [error, setError] = useState("");
  const [timerRemaining, setTimerRemaining] = useState(null);
  const [votingTimerRemaining, setVotingTimerRemaining] = useState(null);
  const [wheel1Spin, setWheel1Spin] = useState({ index: null, spinning: false, tick: 0 });
  const [wheel2Spin, setWheel2Spin] = useState({ index: null, spinning: false, tick: 0 });
  const [voteCounts, setVoteCounts] = useState({ approve: 0, report: 0, total: 0, eligibleCount: 0 });
  const [myVote, setMyVote] = useState(null);
  const [forcedMode, setForcedMode] = useState(null);
  const [reelItems, setReelItems] = useState(null);
  const [isRestoring, setIsRestoring] = useState(true);
  const [bannedModal, setBannedModal] = useState({ isOpen: false, roomCode: null });
  const [gameEndedModal, setGameEndedModal] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [pendingJoinCode, setPendingJoinCode] = useState(null);

  // Установка заголовка страницы
  useEffect(() => {
    document.title = "Правда или действие";
  }, []);

  useEffect(() => {
    socket.connect();
    return () => {
      socket.disconnect();
    };
  }, []);

  // Bootstrap — попытка восстановить сессию при загрузке или вход по URL
  useEffect(() => {
    const tryRestoreSession = async () => {
      const session = loadSession();

      const waitForConnection = () => {
        return new Promise((resolve) => {
          if (socket.connected) {
            resolve();
          } else {
            socket.once("connect", resolve);
          }
        });
      };

      await waitForConnection();
      
      // Выходим из других игр при входе в Truth or Dare
      leaveOtherGames();

      // Если в URL есть код комнаты, отличный от сохранённой сессии — 
      // сначала выходим из старой комнаты, затем присоединяемся к новой
      if (urlRoomCode && session && session.roomCode !== urlRoomCode) {
        // Отправляем серверу команду выхода из старой комнаты
        socket.emit("room:leave", { playerId: session.playerId }, () => {
          clearSession(); // Очищаем старую сессию
          handleUrlJoin(); // Присоединяемся к комнате из URL
        });
        return;
      }

      // Если есть сохранённая сессия — пробуем восстановить
      if (session) {
        log("Attempting to restore session:", session);

        socket.emit("room:rejoin", {
          playerId: session.playerId,
          roomCode: session.roomCode
        }, (response) => {
          log("Rejoin response:", response);
          
          if (response?.ok) {
            setRoomState(response.state);
            setMeId(response.playerId);
            saveSession(response.playerId, response.state.room.code, response.playerName);
            log("Session restored successfully");
            // Обновляем URL если он не соответствует комнате
            if (!urlRoomCode) {
              navigate(`/truth-or-dare/${response.state.room.code}`, { replace: true });
            }
            setIsRestoring(false);
          } else {
            log("Failed to restore session:", response?.error);
            clearSession();
            // После неудачного восстановления — проверяем URL
            handleUrlJoin();
          }
        });
      } else {
        // Нет сессии — проверяем URL
        handleUrlJoin();
      }
    };

    const handleUrlJoin = () => {
      // Если есть код в URL — запоминаем для автовхода
      if (urlRoomCode) {
        // Если пользователь авторизован — сразу входим
        if (user?.nickname) {
          joinRoomDirect(urlRoomCode, user.nickname, user.avatarUrl);
        } else {
          // Иначе запоминаем код — JoinScreen покажет форму для ввода ника
          setPendingJoinCode(urlRoomCode);
          setIsRestoring(false);
        }
      } else {
        setIsRestoring(false);
      }
    };

    const joinRoomDirect = (code, name, avatarUrl) => {
      const visitorId = getOrCreateVisitorId();
      socket.emit("room:join", { 
        code, 
        name, 
        visitorId,
        avatarUrl 
      }, (res) => {
        if (res?.ok) {
          setRoomState(res.state);
          setMeId(res.playerId);
          saveSession(res.playerId, res.state.room.code, name);
          setError("");
        } else {
          setError(res?.error || "Не удалось войти в комнату");
        }
        setIsRestoring(false);
      });
    };

    tryRestoreSession();
  }, [urlRoomCode, user, navigate]);

  // Обработка события session:replaced
  useEffect(() => {
    const handleSessionReplaced = (payload) => {
      log("Session replaced:", payload);
      clearSession();
      setRoomState(null);
      setMeId(null);
      setError("Сессия перехвачена другой вкладкой");
    };

    socket.on("session:replaced", handleSessionReplaced);
    return () => {
      socket.off("session:replaced", handleSessionReplaced);
    };
  }, []);

  // Синхронизация профиля с игрой при изменении user
  // Сравниваем данные user с данными игрока в состоянии комнаты
  useEffect(() => {
    if (!roomState || !meId || !user) return;
    
    // Находим текущего игрока в состоянии
    const currentPlayer = roomState.players?.find(p => p.id === meId);
    if (!currentPlayer) return;
    
    // Проверяем, отличаются ли данные профиля от данных в игре
    const needsUpdate = currentPlayer.avatarUrl !== user.avatarUrl;
    
    if (needsUpdate) {
      socket.emit("player:update_profile", {
        nickname: user.nickname,
        avatarUrl: user.avatarUrl
      });
    }
  }, [user?.nickname, user?.avatarUrl, roomState, meId]);

  useEffect(() => {
    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    socket.on("room:state", (state) => {
      log("room:state received, isLeavingRoom:", isLeavingRoom);
      if (isLeavingRoom) {
        log("room:state IGNORED (isLeavingRoom=true)");
        return;
      }
      
      setRoomState(state);
      if (state?.round?.voteCounts) {
        const eligibleCount = state.players?.length
          ? Math.max(state.players.length - 1, 0)
          : 0;
        setVoteCounts({ ...state.round.voteCounts, eligibleCount });
      }
    });

    socket.on("player:list", (players) => {
      setRoomState((prev) => (prev ? { ...prev, players } : prev));
    });

    socket.on("round:timer_tick", (payload) => {
      setTimerRemaining(payload.remaining);
    });

    socket.on("voting:timer_tick", (payload) => {
      setVotingTimerRemaining(payload.remaining);
    });

    socket.on("round:timer_end", () => {
      setRoomState((prev) =>
        prev && prev.round
          ? { ...prev, round: { ...prev.round, phase: "voting" } }
          : prev
      );
    });

    socket.on("round:task_accepted", (payload) => {
      setRoomState((prev) =>
        prev && prev.round && (!payload?.roundId || prev.round.id === payload.roundId)
          ? {
              ...prev,
              round: {
                ...prev.round,
                taskStatus: "accepted",
                taskAcceptedAt: payload?.taskAcceptedAt || new Date().toISOString()
              }
            }
          : prev
      );
    });

    socket.on("spin:wheel1_start", () => {
      setWheel1Spin((prev) => ({ ...prev, spinning: true }));
    });

    socket.on("spin:wheel1_result", (payload) => {
      setWheel1Spin((prev) => ({
        index: payload.index,
        spinning: false,
        tick: prev.tick + 1
      }));
      setRoomState((prev) =>
        prev && prev.round
          ? {
              ...prev,
              round: {
                ...prev.round,
                phase: "wheel2",
                wheel1Id: payload.categoryId,
                wheel1Result: payload.categoryTitle
              }
            }
          : prev
      );
    });

    socket.on("spin:wheel2_start", () => {
      setWheel2Spin((prev) => ({ ...prev, spinning: true }));
    });

    socket.on("spin:wheel2_result", (payload) => {
      setWheel2Spin((prev) => ({
        index: payload.index,
        spinning: false,
        tick: prev.tick + 1
      }));
      if (payload.reelItems) {
        setReelItems(payload.reelItems);
      }
      setRoomState((prev) =>
        prev && prev.round
          ? {
              ...prev,
              round: {
                ...prev.round,
                phase: "task",
                wheel2Id: payload.itemId,
                wheel2Result: payload.itemLabel,
                finalText: prev.round.finalText || payload.itemText
              }
            }
          : prev
      );
    });

    socket.on("game:paused", (payload) => {
      setIsPaused(payload.isPaused);
    });

    socket.on("spin:final", (payload) => {
      if (payload.forcedMode) {
        setForcedMode(payload.forcedMode);
      }
      setRoomState((prev) =>
        prev && prev.round
          ? { ...prev, round: { ...prev.round, finalText: payload.finalText } }
          : prev
      );
    });

    socket.on("round:mode_forced", (payload) => {
      setForcedMode(payload.mode);
    });

    socket.on("vote:update", (payload) => {
      setVoteCounts({ ...payload.counts, eligibleCount: payload.eligibleCount });
    });

    socket.on("vote:result", (payload) => {
      setVotingTimerRemaining(null);
      setRoomState((prev) =>
        prev && prev.round
          ? {
              ...prev,
              round: {
                ...prev.round,
                phase: "complete",
                result: payload.result
              }
            }
          : prev
      );
    });

    socket.on("admin:kick", () => {
      clearSession();
      setRoomState(null);
      setMeId(null);
      setError("Вы были удалены ведущим.");
    });

    socket.on("room:ended", () => {
      clearSession();
      setRoomState(null);
      setMeId(null);
      setGameEndedModal(true);
    });

    socket.on("player:left", (payload) => {
      setRoomState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          players: prev.players.filter((p) => p.id !== payload.playerId)
        };
      });
    });

    socket.on("room:host_changed", (payload) => {
      setRoomState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          hostId: payload.newHostId
        };
      });
    });

    socket.on("player:update_streak", (payload) => {
      setRoomState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          players: prev.players.map((p) =>
            p.id === payload.playerId
              ? { ...p, truthStreak: payload.truthStreak, dareStreak: payload.dareStreak }
              : p
          )
        };
      });
    });

    socket.on("player:connection_status", (payload) => {
      setRoomState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          players: prev.players.map((p) =>
            p.id === payload.playerId
              ? { ...p, connectionStatus: payload.connectionStatus }
              : p
          )
        };
      });
    });

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("room:state");
      socket.off("player:list");
      socket.off("round:timer_tick");
      socket.off("voting:timer_tick");
      socket.off("round:timer_end");
      socket.off("round:task_accepted");
      socket.off("spin:wheel1_start");
      socket.off("spin:wheel1_result");
      socket.off("spin:wheel2_start");
      socket.off("spin:wheel2_result");
      socket.off("spin:final");
      socket.off("vote:update");
      socket.off("vote:result");
      socket.off("admin:kick");
      socket.off("player:left");
      socket.off("room:host_changed");
      socket.off("round:mode_forced");
      socket.off("player:update_streak");
      socket.off("player:connection_status");
      socket.off("room:ended");
    };
  }, []);

  useEffect(() => {
    setTimerRemaining(null);
    setVotingTimerRemaining(null);
    setMyVote(null);
    setVoteCounts({ approve: 0, report: 0, total: 0, eligibleCount: 0 });
    setWheel1Spin({ index: null, spinning: false, tick: 0 });
    setWheel2Spin({ index: null, spinning: false, tick: 0 });
    setForcedMode(null);
    setReelItems(null);
  }, [roomState?.round?.id]);

  const emitWithAck = (event, payload) =>
    new Promise((resolve) => socket.emit(event, payload, resolve));

  const handleAck = (response) => {
    if (!response?.ok) {
      setError(response?.error || "Ошибка");
    } else {
      setError("");
    }
    return response;
  };

  const actions = useMemo(
    () => ({
      createRoom: async (name, avatarUrl) => {
        const visitorId = getOrCreateVisitorId();
        const response = await emitWithAck("room:create", { name, visitorId, avatarUrl });
        const result = handleAck(response);
        if (result.ok) {
          setRoomState(result.state);
          setMeId(result.playerId);
          saveSession(result.playerId, result.state.room.code, name);
          // Обновляем URL с кодом комнаты
          navigate(`/truth-or-dare/${result.state.room.code}`, { replace: true });
        }
        return result;
      },
      joinRoom: async (name, code, avatarUrl) => {
        const visitorId = getOrCreateVisitorId();
        const response = await emitWithAck("room:join", { name, code, visitorId, avatarUrl });
        
        if (response?.error === "banned") {
          setBannedModal({ isOpen: true, roomCode: code.toUpperCase() });
          return { ok: false, error: "banned" };
        }
        
        const result = handleAck(response);
        if (result.ok) {
          setRoomState(result.state);
          setMeId(result.playerId);
          saveSession(result.playerId, result.state.room.code, name);
          // Обновляем URL с кодом комнаты
          navigate(`/truth-or-dare/${result.state.room.code}`, { replace: true });
        }
        return result;
      },
      startRound: async (targetPlayerId) => {
        const response = await emitWithAck("round:start", { targetPlayerId });
        return handleAck(response);
      },
      setMode: async (mode) => {
        const response = await emitWithAck("round:mode", { mode });
        return handleAck(response);
      },
      spinWheel1: async () => {
        const response = await emitWithAck("spin:wheel1_start", {});
        return handleAck(response);
      },
      spinWheel2: async () => {
        const response = await emitWithAck("spin:wheel2_start", {});
        return handleAck(response);
      },
      markDone: async () => {
        const response = await emitWithAck("round:done", {});
        return handleAck(response);
      },
      refuseTruth: async () => {
        const response = await emitWithAck("round:refuse", {});
        return handleAck(response);
      },
      castVote: async (vote) => {
        const response = await emitWithAck("vote:cast", { vote });
        const result = handleAck(response);
        if (result.ok) {
          setMyVote(vote);
        }
        return result;
      },
      kickPlayer: async (playerId) => {
        const response = await emitWithAck("admin:kick", { playerId });
        return handleAck(response);
      },
      resetRoom: async () => {
        const response = await emitWithAck("admin:reset_room", {});
        return handleAck(response);
      },
      skipRound: async () => {
        const response = await emitWithAck("admin:skip_round", {});
        return handleAck(response);
      },
      resetTimer: async () => {
        const response = await emitWithAck("admin:reset_timer", {});
        return handleAck(response);
      },
      togglePause: async () => {
        const response = await emitWithAck("admin:toggle_pause", {});
        return handleAck(response);
      },
      acceptTask: async () => {
        const response = await emitWithAck("round:task_accept", {});
        return handleAck(response);
      },
      leaveRoom: async () => {
        log("leaveRoom() called");
        isLeavingRoom = true;
        log("isLeavingRoom set to TRUE");
        clearSession();
        log("Setting roomState to null IMMEDIATELY...");
        setRoomState(null);
        setMeId(null);
        setError("");
        setPendingJoinCode(null);
        // Убираем код из URL
        navigate("/truth-or-dare", { replace: true });
        log("State reset complete");
        
        try {
          log("Emitting room:leave (fire and forget)...");
          socket.emit("room:leave", {}, (response) => {
            log("room:leave callback response:", response);
          });
        } catch (error) {
          console.error("leaveRoom emit error:", error);
          log("leaveRoom emit error:", error);
        }
        
        setTimeout(() => {
          isLeavingRoom = false;
          log("isLeavingRoom set to FALSE");
        }, 500);
        
        return { ok: true };
      },
      endGame: async () => {
        log("endGame() called");
        clearSession();
        setRoomState(null);
        setMeId(null);
        setError("");
        
        try {
          const response = await emitWithAck("room:end", {});
          log("room:end response:", response);
          return response;
        } catch (error) {
          console.error("endGame emit error:", error);
          return { ok: false, error: "Failed to end game" };
        }
      },
      navigateToGames: () => {
        navigate("/games");
      }
    }),
    [navigate]
  );

  if (isRestoring) {
    return (
      <div className="app-loading">
        <div className="app-loading__spinner" />
        <p>Восстановление сессии...</p>
      </div>
    );
  }

  if (!roomState) {
    return (
      <div className="truth-or-dare-page">
        <ShaderBackground />
        <EmailVerifyBanner />
        <JoinScreen
          connected={connected}
          error={error}
          onCreate={actions.createRoom}
          onJoin={actions.joinRoom}
          user={user}
          onProfile={() => navigate("/profile")}
          onLogin={() => navigate("/login", { state: { backgroundLocation: location } })}
          onClearError={() => setError("")}
          initialCode={pendingJoinCode}
          onBackToGames={() => navigate("/games")}
        />
        <BannedModal 
          isOpen={bannedModal.isOpen}
          roomCode={bannedModal.roomCode}
          onClose={() => setBannedModal({ isOpen: false, roomCode: null })}
        />
        <GameEndedModal 
          isOpen={gameEndedModal}
          onClose={() => setGameEndedModal(false)}
        />
      </div>
    );
  }

  return (
    <div className="truth-or-dare-page">
      <ShaderBackground />
      <EmailVerifyBanner />
      <RoomScreen
        connected={connected}
        error={error}
        meId={meId}
        roomState={roomState}
        timerRemaining={timerRemaining}
        votingTimerRemaining={votingTimerRemaining}
        voteCounts={voteCounts}
        myVote={myVote}
        wheel1Spin={wheel1Spin}
        wheel2Spin={wheel2Spin}
        forcedMode={forcedMode}
        reelItems={reelItems}
        isPaused={isPaused}
        actions={actions}
      />
    </div>
  );
}

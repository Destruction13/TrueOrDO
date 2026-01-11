import { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import JoinScreen from "./components/JoinScreen";
import RoomScreen from "./components/RoomScreen";
import AuthScreen from "./components/auth/AuthScreen";
import ProfileScreen from "./components/auth/ProfileScreen";
import VerifyEmail from "./components/auth/VerifyEmail";
import ResetPassword from "./components/auth/ResetPassword";
import EmailVerifyBanner from "./components/auth/EmailVerifyBanner";
import BannedModal from "./components/ui/BannedModal";
import GameEndedModal from "./components/ui/GameEndedModal";
import { useAuth } from "./context/AuthContext";

const socket = io(import.meta.env.VITE_SERVER_URL || "/", {
  autoConnect: false
});

// Флаг для предотвращения обновления состояния после выхода
let isLeavingRoom = false;

// DEBUG: Логирование
const DEBUG = false; // Отключаем для продакшена
const log = (...args) => DEBUG && console.log("[App]", ...args);

// ═══════════════════════════════════════════════════════════════════════════
// Session Storage — для восстановления сессии после F5
// ═══════════════════════════════════════════════════════════════════════════
const SESSION_KEYS = {
  PLAYER_ID: "tod:playerId",
  ROOM_CODE: "tod:roomCode",
  PLAYER_NAME: "tod:playerName",
  VISITOR_ID: "tod:visitorId"
};

// Генерация уникального visitorId для идентификации устройства/браузера
function getOrCreateVisitorId() {
  try {
    let visitorId = localStorage.getItem(SESSION_KEYS.VISITOR_ID);
    if (!visitorId) {
      visitorId = "v_" + Math.random().toString(36).substring(2) + Date.now().toString(36);
      localStorage.setItem(SESSION_KEYS.VISITOR_ID, visitorId);
    }
    return visitorId;
  } catch (e) {
    // Fallback если localStorage недоступен
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

// Простой роутинг по URL
function getRoute() {
  const path = window.location.pathname;
  const params = new URLSearchParams(window.location.search);
  
  if (path === "/verify-email" || params.has("verify")) {
    return { page: "verify-email", token: params.get("token") || params.get("verify") };
  }
  if (path === "/reset-password" || params.has("reset")) {
    return { page: "reset-password", token: params.get("token") || params.get("reset") };
  }
  if (path === "/profile") {
    return { page: "profile" };
  }
  if (path === "/login" || path === "/register") {
    return { page: "auth" };
  }
  return { page: "game" };
}

function navigate(path) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function App() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [route, setRoute] = useState(getRoute);
  const [connected, setConnected] = useState(false);
  const [roomState, setRoomState] = useState(null);
  const [meId, setMeId] = useState(null);
  const [error, setError] = useState("");
  const [timerRemaining, setTimerRemaining] = useState(null);
  const [wheel1Spin, setWheel1Spin] = useState({ index: null, spinning: false, tick: 0 });
  const [wheel2Spin, setWheel2Spin] = useState({ index: null, spinning: false, tick: 0 });
  const [voteCounts, setVoteCounts] = useState({ approve: 0, report: 0, total: 0, eligibleCount: 0 });
  const [myVote, setMyVote] = useState(null);
  const [forcedMode, setForcedMode] = useState(null);
  const [reelItems, setReelItems] = useState(null);
  const [isRestoring, setIsRestoring] = useState(true); // Флаг восстановления сессии
  const [bannedModal, setBannedModal] = useState({ isOpen: false, roomCode: null }); // Модальное окно бана
  const [gameEndedModal, setGameEndedModal] = useState(false); // Модальное окно завершения игры

  // Обработка изменения URL
  useEffect(() => {
    const handlePopState = () => setRoute(getRoute());
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    socket.connect();
    return () => {
      socket.disconnect();
    };
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // Bootstrap — попытка восстановить сессию при загрузке
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const tryRestoreSession = async () => {
      const session = loadSession();
      
      if (!session) {
        log("No saved session found");
        setIsRestoring(false);
        return;
      }

      log("Attempting to restore session:", session);

      // Ждём подключения сокета
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

      // Пытаемся восстановить сессию
      socket.emit("room:rejoin", {
        playerId: session.playerId,
        roomCode: session.roomCode
      }, (response) => {
        log("Rejoin response:", response);
        
        if (response?.ok) {
          // Успешное восстановление
          setRoomState(response.state);
          setMeId(response.playerId);
          // Обновляем сессию на случай если имя изменилось
          saveSession(response.playerId, response.state.room.code, response.playerName);
          log("Session restored successfully");
        } else {
          // Не удалось восстановить — очищаем сессию
          log("Failed to restore session:", response?.error);
          clearSession();
        }
        
        setIsRestoring(false);
      });
    };

    tryRestoreSession();
  }, []);

  // Обработка события session:replaced (две вкладки)
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

  useEffect(() => {
    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    socket.on("room:state", (state) => {
      log("room:state received, isLeavingRoom:", isLeavingRoom, "state:", state?.room?.code);
      // Игнорируем обновления если мы в процессе выхода
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

    socket.on("round:timer_end", () => {
      setRoomState((prev) =>
        prev && prev.round
          ? { ...prev, round: { ...prev.round, phase: "voting" } }
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
      // Store reelItems for chaos mode
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

    socket.on("spin:final", (payload) => {
      // Track forced mode for chaos players
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
      // Chaos player's mode was forced by server
      setForcedMode(payload.mode);
    });

    socket.on("vote:update", (payload) => {
      setVoteCounts({ ...payload.counts, eligibleCount: payload.eligibleCount });
    });

    socket.on("vote:result", (payload) => {
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
      clearSession(); // Очищаем сессию при кике
      setRoomState(null);
      setMeId(null);
      setError("Вы были удалены ведущим.");
    });

    socket.on("room:ended", () => {
      clearSession(); // Очищаем сессию при завершении игры
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
      socket.off("round:timer_end");
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
      createRoom: async (name) => {
        const visitorId = getOrCreateVisitorId();
        const response = await emitWithAck("room:create", { name, visitorId });
        const result = handleAck(response);
        if (result.ok) {
          setRoomState(result.state);
          setMeId(result.playerId);
          // Сохраняем сессию для восстановления после F5
          saveSession(result.playerId, result.state.room.code, name);
        }
        return result;
      },
      joinRoom: async (name, code) => {
        const visitorId = getOrCreateVisitorId();
        const response = await emitWithAck("room:join", { name, code, visitorId });
        
        // Специальная обработка бана
        if (response?.error === "banned") {
          setBannedModal({ isOpen: true, roomCode: code.toUpperCase() });
          return { ok: false, error: "banned" };
        }
        
        const result = handleAck(response);
        if (result.ok) {
          setRoomState(result.state);
          setMeId(result.playerId);
          // Сохраняем сессию для восстановления после F5
          saveSession(result.playerId, result.state.room.code, name);
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
      leaveRoom: async () => {
        log("leaveRoom() called");
        
        // Устанавливаем флаг ДО отправки запроса
        isLeavingRoom = true;
        log("isLeavingRoom set to TRUE");
        
        // Очищаем сессию — игрок явно вышел, не восстанавливать при F5
        clearSession();
        
        // Сбрасываем состояние СРАЗУ, не дожидаясь ответа сервера
        // Это гарантирует выход на клиенте независимо от сервера
        log("Setting roomState to null IMMEDIATELY...");
        setRoomState(null);
        setMeId(null);
        setError("");
        log("State reset complete");
        
        // Отправляем запрос на сервер в фоне (fire and forget)
        try {
          log("Emitting room:leave (fire and forget)...");
          // Не ждём ответа, просто отправляем
          socket.emit("room:leave", {}, (response) => {
            log("room:leave callback response:", response);
          });
        } catch (error) {
          console.error("leaveRoom emit error:", error);
          log("leaveRoom emit error:", error);
        }
        
        // Сбрасываем флаг после небольшой задержки
        setTimeout(() => {
          isLeavingRoom = false;
          log("isLeavingRoom set to FALSE");
        }, 500);
        
        return { ok: true };
      },
      endGame: async () => {
        log("endGame() called");
        
        // Очищаем сессию
        clearSession();
        
        // Сбрасываем состояние
        setRoomState(null);
        setMeId(null);
        setError("");
        
        // Отправляем запрос на сервер
        try {
          const response = await emitWithAck("room:end", {});
          log("room:end response:", response);
          return response;
        } catch (error) {
          console.error("endGame emit error:", error);
          return { ok: false, error: "Failed to end game" };
        }
      }
    }),
    []
  );

  // Показываем загрузку пока проверяем авторизацию или восстанавливаем сессию
  if (authLoading || isRestoring) {
    return (
      <div className="app-loading">
        <div className="app-loading__spinner" />
        <p>{isRestoring ? "Восстановление сессии..." : "Загрузка..."}</p>
      </div>
    );
  }

  // Роутинг для auth страниц (доступны всем)
  if (route.page === "verify-email") {
    return (
      <VerifyEmail
        token={route.token}
        onSuccess={() => navigate("/")}
        onBack={() => navigate("/")}
      />
    );
  }

  if (route.page === "reset-password") {
    return (
      <ResetPassword
        token={route.token}
        onSuccess={() => navigate("/login")}
        onBack={() => navigate("/login")}
      />
    );
  }

  if (route.page === "auth") {
    // Если уже авторизован — редирект на главную
    if (isAuthenticated) {
      navigate("/");
      return null;
    }
    return (
      <AuthScreen onSuccess={() => navigate("/")} />
    );
  }

  if (route.page === "profile") {
    // Профиль требует авторизации
    if (!isAuthenticated) {
      navigate("/login");
      return null;
    }
    return (
      <ProfileScreen onBack={() => navigate("/")} />
    );
  }

  // Основная игра
  if (!roomState) {
    return (
      <>
        {/* Баннер верификации email */}
        <EmailVerifyBanner />
        <JoinScreen
          connected={connected}
          error={error}
          onCreate={actions.createRoom}
          onJoin={actions.joinRoom}
          user={user}
          onProfile={() => navigate("/profile")}
          onLogin={() => navigate("/login")}
          onClearError={() => setError("")}
        />
        {/* Модальное окно бана */}
        <BannedModal 
          isOpen={bannedModal.isOpen}
          roomCode={bannedModal.roomCode}
          onClose={() => setBannedModal({ isOpen: false, roomCode: null })}
        />
        {/* Модальное окно завершения игры */}
        <GameEndedModal 
          isOpen={gameEndedModal}
          onClose={() => setGameEndedModal(false)}
        />
      </>
    );
  }

  return (
    <>
      {/* Баннер верификации email */}
      <EmailVerifyBanner />
      <RoomScreen
        connected={connected}
        error={error}
        meId={meId}
        roomState={roomState}
        timerRemaining={timerRemaining}
        voteCounts={voteCounts}
        myVote={myVote}
        wheel1Spin={wheel1Spin}
        wheel2Spin={wheel2Spin}
        forcedMode={forcedMode}
        reelItems={reelItems}
        actions={actions}
      />
    </>
  );
}

export default App;

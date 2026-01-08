import { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import JoinScreen from "./components/JoinScreen";
import RoomScreen from "./components/RoomScreen";
import AuthScreen from "./components/auth/AuthScreen";
import ProfileScreen from "./components/auth/ProfileScreen";
import VerifyEmail from "./components/auth/VerifyEmail";
import ResetPassword from "./components/auth/ResetPassword";
import EmailVerifyBanner from "./components/auth/EmailVerifyBanner";
import { useAuth } from "./context/AuthContext";

const socket = io(import.meta.env.VITE_SERVER_URL || "/", {
  autoConnect: false
});

// Флаг для предотвращения обновления состояния после выхода
let isLeavingRoom = false;

// DEBUG: Логирование
const DEBUG = false; // Отключаем для продакшена
const log = (...args) => DEBUG && console.log("[App]", ...args);

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
      setRoomState((prev) =>
        prev && prev.round
          ? { ...prev, round: { ...prev.round, finalText: payload.finalText } }
          : prev
      );
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
      setRoomState(null);
      setMeId(null);
      setError("Вы были удалены ведущим.");
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
    };
  }, []);

  useEffect(() => {
    setTimerRemaining(null);
    setMyVote(null);
    setVoteCounts({ approve: 0, report: 0, total: 0, eligibleCount: 0 });
    setWheel1Spin({ index: null, spinning: false, tick: 0 });
    setWheel2Spin({ index: null, spinning: false, tick: 0 });
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
        const response = await emitWithAck("room:create", { name });
        const result = handleAck(response);
        if (result.ok) {
          setRoomState(result.state);
          setMeId(result.playerId);
        }
        return result;
      },
      joinRoom: async (name, code) => {
        const response = await emitWithAck("room:join", { name, code });
        const result = handleAck(response);
        if (result.ok) {
          setRoomState(result.state);
          setMeId(result.playerId);
        }
        return result;
      },
      startRound: async (playerId) => {
        const response = await emitWithAck("round:start", { playerId });
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
      }
    }),
    []
  );

  // Показываем загрузку пока проверяем авторизацию
  if (authLoading) {
    return (
      <div className="app-loading">
        <div className="app-loading__spinner" />
        <p>Загрузка...</p>
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
        actions={actions}
      />
    </>
  );
}

export default App;

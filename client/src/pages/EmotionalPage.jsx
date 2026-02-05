import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { io } from "socket.io-client";
import { useAuth } from "../context/AuthContext";
import EmotionalJoinScreen from "../components/emotional/EmotionalJoinScreen";
import EmotionalRoomScreen from "../components/emotional/EmotionalRoomScreen";
import EmailVerifyBanner from "../components/auth/EmailVerifyBanner";
import "./EmotionalPage.css";

const socket = io(import.meta.env.VITE_SERVER_URL || "/", { autoConnect: false });

const SESSION_KEYS = {
  PLAYER_ID: "emotional:playerId",
  ROOM_CODE: "emotional:roomCode",
  PLAYER_NAME: "emotional:playerName",
  VISITOR_ID: "emotional:visitorId",
};

function getOrCreateVisitorId() {
  try {
    let visitorId = localStorage.getItem(SESSION_KEYS.VISITOR_ID);
    if (!visitorId) {
      visitorId =
        "ev_" + Math.random().toString(36).substring(2) + Date.now().toString(36);
      localStorage.setItem(SESSION_KEYS.VISITOR_ID, visitorId);
    }
    return visitorId;
  } catch {
    return "ev_" + Math.random().toString(36).substring(2);
  }
}

function saveSession(playerId, roomCode, playerName) {
  try {
    localStorage.setItem(SESSION_KEYS.PLAYER_ID, playerId);
    localStorage.setItem(SESSION_KEYS.ROOM_CODE, roomCode);
    if (playerName) localStorage.setItem(SESSION_KEYS.PLAYER_NAME, playerName);
  } catch {}
}

function loadSession() {
  try {
    const playerId = localStorage.getItem(SESSION_KEYS.PLAYER_ID);
    const roomCode = localStorage.getItem(SESSION_KEYS.ROOM_CODE);
    const playerName = localStorage.getItem(SESSION_KEYS.PLAYER_NAME);
    if (playerId && roomCode) return { playerId, roomCode, playerName };
  } catch {}
  return null;
}

function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEYS.PLAYER_ID);
    localStorage.removeItem(SESSION_KEYS.ROOM_CODE);
    localStorage.removeItem(SESSION_KEYS.PLAYER_NAME);
  } catch {}
}

// Выход из других игр при входе в Emotional
function leaveOtherGames() {
  const todPlayerId = localStorage.getItem("tod:playerId");
  if (todPlayerId) {
    socket.emit("room:leave", { playerId: todPlayerId });
    localStorage.removeItem("tod:playerId");
    localStorage.removeItem("tod:roomCode");
    localStorage.removeItem("tod:playerName");
  }

  const aliasPlayerId = localStorage.getItem("alias:playerId");
  if (aliasPlayerId) {
    socket.emit("alias:room:leave", { playerId: aliasPlayerId });
    localStorage.removeItem("alias:playerId");
    localStorage.removeItem("alias:roomCode");
    localStorage.removeItem("alias:playerName");
  }

  const codenamesPlayerId = localStorage.getItem("codenames:playerId");
  if (codenamesPlayerId) {
    socket.emit("codenames:room:leave", { playerId: codenamesPlayerId });
    localStorage.removeItem("codenames:playerId");
    localStorage.removeItem("codenames:roomCode");
    localStorage.removeItem("codenames:playerName");
  }
}

export default function EmotionalPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { roomCode: urlRoomCode } = useParams();
  const { user } = useAuth();

  const [connected, setConnected] = useState(false);
  const [gameState, setGameState] = useState(null);
  const [meId, setMeId] = useState(null);
  const [error, setError] = useState("");
  const [isRestoring, setIsRestoring] = useState(true);
  const [pendingJoinCode, setPendingJoinCode] = useState(null);

  // Нужен, чтобы не делать повторный join сразу после успешного create/join и навигации
  const skipRestoreRef = useRef(false);

  useEffect(() => {
    document.title = "Эмоциональный интеллект";
  }, []);

  // Автоматическая очистка ошибки через 5 секунд
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    socket.connect();
    return () => socket.disconnect();
  }, []);

  const emitWithAck = (event, payload) =>
    new Promise((resolve) => socket.emit(event, payload, resolve));

  const handleAck = (res) => {
    if (!res?.ok) {
      setError(res?.error || "Ошибка");
    } else {
      setError("");
    }
    return res;
  };

  // Restore session или вход по URL
  useEffect(() => {
    const tryRestore = async () => {
      // Если мы уже в комнате и URL соответствует — ничего не восстанавливаем повторно
      if (gameState?.room?.code && (!urlRoomCode || gameState.room.code === urlRoomCode)) {
        setIsRestoring(false);
        return;
      }

      if (skipRestoreRef.current) {
        skipRestoreRef.current = false;
        setIsRestoring(false);
        return;
      }
      const session = loadSession();

      const waitForConnection = () =>
        new Promise((resolve) => {
          if (socket.connected) resolve();
          else socket.once("connect", resolve);
        });

      await waitForConnection();
      leaveOtherGames();

      if (urlRoomCode && session && session.roomCode !== urlRoomCode) {
        socket.emit("emotional:room:leave", { playerId: session.playerId }, () => {
          clearSession();
          handleUrlJoin();
        });
        return;
      }

      if (session) {
        // Для Iteration 1 нет отдельного rejoin event.
        // Используем join с visitorId для реконнекта.
        if (urlRoomCode || session.roomCode) {
          const targetCode = urlRoomCode || session.roomCode;
          const name = user?.nickname || session.playerName || "Игрок";
          const visitorId = getOrCreateVisitorId();
          socket.emit(
            "emotional:room:join",
            { code: targetCode, name, visitorId, avatarUrl: user?.avatarUrl },
            (res) => {
              if (res?.ok) {
                setGameState(res.state);
                setMeId(res.playerId);
                saveSession(res.playerId, res.state.room.code, name);
                if (!urlRoomCode) {
                  navigate(`/emotional/${res.state.room.code}`, { replace: true });
                }
              } else {
                clearSession();
              }
              setIsRestoring(false);
            }
          );
        } else {
          setIsRestoring(false);
        }
      } else {
        handleUrlJoin();
      }
    };

    const handleUrlJoin = () => {
      if (urlRoomCode) {
        if (user?.nickname) {
          joinRoomDirect(urlRoomCode, user.nickname, user.avatarUrl);
        } else {
          setPendingJoinCode(urlRoomCode);
          setIsRestoring(false);
        }
      } else {
        setIsRestoring(false);
      }
    };

    const joinRoomDirect = (code, name, avatarUrl) => {
      const visitorId = getOrCreateVisitorId();
      socket.emit(
        "emotional:room:join",
        { code, name, visitorId, avatarUrl },
        (res) => {
          if (res?.ok) {
            setGameState(res.state);
            setMeId(res.playerId);
            saveSession(res.playerId, res.state.room.code, name);
            setError("");
          } else {
            setError(res?.error || "Не удалось войти в комнату");
          }
          setIsRestoring(false);
        }
      );
    };

    tryRestore();
  }, [urlRoomCode, user, navigate]);

  // Socket events
  useEffect(() => {
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onStateSync = (state) => {
      console.log("[Emotional] state:sync received - phase:", state?.room?.phase, "table:", state?.table?.length);
      setGameState(state);
      // На всякий случай подхватываем meId из payload
      if (state?.meId) setMeId(state.meId);
    };

    const onKicked = (payload) => {
      clearSession();
      setGameState(null);
      setMeId(null);
      setPendingJoinCode(null);
      setError(payload?.message || "Вы были удалены из комнаты");
      navigate("/emotional", { replace: true });
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("emotional:state:sync", onStateSync);
    socket.on("emotional:player:kicked", onKicked);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("emotional:state:sync", onStateSync);
      socket.off("emotional:player:kicked", onKicked);
    };
  }, []);

  const actions = useMemo(
    () => ({
      createRoom: async (name, avatarUrl) => {
        const visitorId = getOrCreateVisitorId();
        const res = await emitWithAck("emotional:room:create", {
          name,
          visitorId,
          avatarUrl,
        });
        const result = handleAck(res);
        if (result.ok) {
          setGameState(result.state);
          setMeId(result.playerId);
          saveSession(result.playerId, result.state.room.code, name);
          skipRestoreRef.current = true;
          navigate(`/emotional/${result.state.room.code}`, { replace: true });
        }
        return result;
      },
      joinRoom: async (name, code, avatarUrl) => {
        const visitorId = getOrCreateVisitorId();
        const res = await emitWithAck("emotional:room:join", {
          name,
          code,
          visitorId,
          avatarUrl,
        });
        const result = handleAck(res);
        if (result.ok) {
          setGameState(result.state);
          setMeId(result.playerId);
          saveSession(result.playerId, result.state.room.code, name);
          skipRestoreRef.current = true;
          navigate(`/emotional/${result.state.room.code}`, { replace: true });
        }
        return result;
      },
      updateSettings: async (settings) => {
        const res = await emitWithAck("emotional:settings:update", { settings });
        return handleAck(res);
      },
      newGame: async () => {
        const res = await emitWithAck("emotional:game:new", {});
        return handleAck(res);
      },
      kickPlayer: async (targetPlayerId) => {
        const res = await emitWithAck("emotional:room:kick", { targetPlayerId });
        return handleAck(res);
      },

      // Iteration 3
      startGame: async () => {
        const res = await emitWithAck("emotional:game:start", {});
        return handleAck(res);
      },
      submitEmotion: async (emotion) => {
        const res = await emitWithAck("emotional:turn:submit", { emotion });
        return handleAck(res);
      },
      skipTurn: async () => {
        const res = await emitWithAck("emotional:turn:skip", {});
        return handleAck(res);
      },
      castVote: async (slotId) => {
        const res = await emitWithAck("emotional:vote:cast", { slotId });
        return handleAck(res);
      },

      nextRound: async (callback) => {
        const res = await emitWithAck("emotional:round:next", {});
        const result = handleAck(res);
        if (callback) callback(result);
        return result;
      },
      reshuffleDeck: async (callback) => {
        const res = await emitWithAck("emotional:deck:reshuffle", {});
        const result = handleAck(res);
        if (callback) callback(result);
        return result;
      },
      leaveRoom: async () => {
        socket.emit("emotional:room:leave", {});
        clearSession();
        setGameState(null);
        setMeId(null);
        setPendingJoinCode(null);
        navigate("/emotional", { replace: true });
        return { ok: true };
      },

    }),
    [navigate]
  );

  if (isRestoring) {
    return (
      <div className="emotional-page">
        <div className="emotional-loading">
          <div className="emotional-loading__spinner" />
          <p>Восстановление сессии...</p>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="emotional-page">
        <EmailVerifyBanner />

        <EmotionalJoinScreen
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
      </div>
    );
  }

  return (
    <div className="emotional-page emotional-page--in-room">
      <EmailVerifyBanner />

      <EmotionalRoomScreen
        connected={connected}
        error={error}
        meId={meId}
        gameState={gameState}
        actions={actions}
      />
    </div>
  );
}

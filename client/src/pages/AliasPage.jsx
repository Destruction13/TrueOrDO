import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { io } from "socket.io-client";
import { motion, AnimatePresence } from "framer-motion";
import AliasShaderBackground from "../components/alias/AliasShaderBackground";
import { useAuth } from "../context/AuthContext";
import Button from "../components/ui/Button";
import AliasJoinScreen from "../components/alias/AliasJoinScreen";
import AliasRoomScreen from "../components/alias/AliasRoomScreen";
import EmailVerifyBanner from "../components/auth/EmailVerifyBanner";
import "./AliasPage.css";

const socket = io(import.meta.env.VITE_SERVER_URL || "/", { autoConnect: false });

const SESSION_KEYS = {
  PLAYER_ID: "alias:playerId",
  ROOM_CODE: "alias:roomCode",
  PLAYER_NAME: "alias:playerName",
  VISITOR_ID: "alias:visitorId"
};

function getOrCreateVisitorId() {
  try {
    let visitorId = localStorage.getItem(SESSION_KEYS.VISITOR_ID);
    if (!visitorId) {
      visitorId = "av_" + Math.random().toString(36).substring(2) + Date.now().toString(36);
      localStorage.setItem(SESSION_KEYS.VISITOR_ID, visitorId);
    }
    return visitorId;
  } catch {
    return "av_" + Math.random().toString(36).substring(2);
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

export default function AliasPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { roomCode: urlRoomCode } = useParams();
  const { user } = useAuth();
  
  const [connected, setConnected] = useState(false);
  const [aliasState, setAliasState] = useState(null);
  const [meId, setMeId] = useState(null);
  const [error, setError] = useState("");
  const [timerRemaining, setTimerRemaining] = useState(null);
  const [currentWord, setCurrentWord] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isRestoring, setIsRestoring] = useState(true);
  const [gameFinished, setGameFinished] = useState(null);
  const [roundHistory, setRoundHistory] = useState([]);
  const [showHistoryAfterTurn, setShowHistoryAfterTurn] = useState(false);
  const [reviewTimeRemaining, setReviewTimeRemaining] = useState(null);
  const [pendingJoinCode, setPendingJoinCode] = useState(null);

  // Установка заголовка страницы
  useEffect(() => {
    document.title = "Alias";
  }, []);

  useEffect(() => {
    socket.connect();
    return () => socket.disconnect();
  }, []);

  // Restore session или вход по URL
  useEffect(() => {
    const tryRestore = async () => {
      const session = loadSession();
      
      const waitForConnection = () => new Promise(resolve => {
        if (socket.connected) resolve();
        else socket.once("connect", resolve);
      });

      await waitForConnection();

      // Если есть сохранённая сессия — пробуем восстановить
      if (session) {
        socket.emit("alias:room:rejoin", {
          playerId: session.playerId,
          roomCode: session.roomCode
        }, (res) => {
          if (res?.ok) {
            setAliasState(res.state);
            setMeId(res.playerId);
            saveSession(res.playerId, res.state.room.code, session.playerName);
            // Обновляем URL если он не соответствует комнате
            if (urlRoomCode && urlRoomCode !== res.state.room.code) {
              navigate(`/alias/${res.state.room.code}`, { replace: true });
            } else if (!urlRoomCode) {
              navigate(`/alias/${res.state.room.code}`, { replace: true });
            }
            setIsRestoring(false);
          } else {
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
      socket.emit("alias:room:join", { 
        code, 
        name, 
        visitorId,
        avatarUrl 
      }, (res) => {
        if (res?.ok) {
          setAliasState(res.state);
          setMeId(res.playerId);
          saveSession(res.playerId, res.state.room.code, name);
          setError("");
        } else {
          setError(res?.error || "Не удалось войти в комнату");
        }
        setIsRestoring(false);
      });
    };

    tryRestore();
  }, [urlRoomCode, user, navigate]);

  // Socket events
  useEffect(() => {
    const onConnect = () => {
      setConnected(true);
      // При переподключении отправляем rejoin чтобы восстановить статус online
      const session = getSession();
      if (session && meId) {
        socket.emit("alias:room:rejoin", {
          playerId: session.playerId,
          roomCode: session.roomCode
        }, (res) => {
          if (res?.ok) {
            setAliasState(res.state);
          }
        });
      }
    };
    const onDisconnect = () => setConnected(false);
    
    const onStateSync = (state) => setAliasState(state);
    const onTimerTick = ({ remaining }) => setTimerRemaining(remaining);
    const onWordCurrent = ({ word }) => setCurrentWord(word);
    const onPaused = ({ isPaused: p }) => setIsPaused(p);
    const onTurnEnded = (data) => {
      setCurrentWord(null);
      setTimerRemaining(null);
      // Сохраняем историю раунда для возможности редактирования после окончания хода
      if (data?.roundHistory && data.roundHistory.length > 0) {
        setRoundHistory(data.roundHistory);
        // Автоматически показываем панель отчёта после окончания хода
        setShowHistoryAfterTurn(true);
      }
    };
    const onGameFinished = (data) => setGameFinished(data);
    const onReset = () => {
      setGameFinished(null);
      setCurrentWord(null);
      setTimerRemaining(null);
      setIsPaused(false);
      setRoundHistory([]);
      setShowHistoryAfterTurn(false);
    };
    const onHistoryUpdated = ({ history }) => setRoundHistory(history);
    const onReviewTick = ({ remaining }) => setReviewTimeRemaining(remaining);
    const onReportConfirmed = () => {
      setShowHistoryAfterTurn(false);
      setRoundHistory([]);
      setReviewTimeRemaining(null);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("alias:state:sync", onStateSync);
    socket.on("alias:timer:tick", onTimerTick);
    socket.on("alias:word:current", onWordCurrent);
    socket.on("alias:paused", onPaused);
    socket.on("alias:turn:ended", onTurnEnded);
    socket.on("alias:game:finished", onGameFinished);
    socket.on("alias:reset", onReset);
    socket.on("alias:history:updated", onHistoryUpdated);
    socket.on("alias:review:tick", onReviewTick);
    socket.on("alias:report:confirmed", onReportConfirmed);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("alias:state:sync", onStateSync);
      socket.off("alias:timer:tick", onTimerTick);
      socket.off("alias:word:current", onWordCurrent);
      socket.off("alias:paused", onPaused);
      socket.off("alias:turn:ended", onTurnEnded);
      socket.off("alias:game:finished", onGameFinished);
      socket.off("alias:reset", onReset);
      socket.off("alias:history:updated", onHistoryUpdated);
      socket.off("alias:review:tick", onReviewTick);
      socket.off("alias:report:confirmed", onReportConfirmed);
    };
  }, [meId]);

  const emitWithAck = (event, payload) => new Promise(resolve => socket.emit(event, payload, resolve));

  const handleAck = (res) => {
    if (!res?.ok) setError(res?.error || "Ошибка");
    else setError("");
    return res;
  };

  const actions = useMemo(() => ({
    createRoom: async (name) => {
      const visitorId = getOrCreateVisitorId();
      const res = await emitWithAck("alias:room:create", { name, visitorId });
      const result = handleAck(res);
      if (result.ok) {
        setAliasState(result.state);
        setMeId(result.playerId);
        saveSession(result.playerId, result.state.room.code, name);
        // Обновляем URL с кодом комнаты
        navigate(`/alias/${result.state.room.code}`, { replace: true });
      }
      return result;
    },
    joinRoom: async (name, code) => {
      const visitorId = getOrCreateVisitorId();
      const res = await emitWithAck("alias:room:join", { name, code, visitorId });
      const result = handleAck(res);
      if (result.ok) {
        setAliasState(result.state);
        setMeId(result.playerId);
        saveSession(result.playerId, result.state.room.code, name);
        // Обновляем URL с кодом комнаты
        navigate(`/alias/${result.state.room.code}`, { replace: true });
      }
      return result;
    },
    leaveRoom: async () => {
      socket.emit("alias:room:leave", {});
      clearSession();
      setAliasState(null);
      setMeId(null);
      setCurrentWord(null);
      setGameFinished(null);
      setRoundHistory([]);
      setTimerRemaining(null);
      setIsPaused(false);
      setPendingJoinCode(null);
      // Убираем код из URL
      navigate("/alias", { replace: true });
      return { ok: true };
    },
    createTeam: async (name) => handleAck(await emitWithAck("alias:teams:create", { name })),
    joinTeam: async (teamId) => handleAck(await emitWithAck("alias:teams:join", { teamId })),
    leaveTeam: async () => handleAck(await emitWithAck("alias:teams:leave", {})),
    renameTeam: async (teamId, name) => handleAck(await emitWithAck("alias:teams:rename", { teamId, name })),
    setReady: async (isReady) => handleAck(await emitWithAck("alias:ready:set", { isReady })),
    updateSettings: async (settings) => handleAck(await emitWithAck("alias:settings:update", settings)),
    startTurn: async () => handleAck(await emitWithAck("alias:turn:start", {})),
    nextWord: async () => handleAck(await emitWithAck("alias:turn:next", {})),
    skipWord: async () => handleAck(await emitWithAck("alias:turn:skip", {})),
    skipTurn: async () => handleAck(await emitWithAck("alias:turn:skipTurn", {})),
    togglePause: async () => handleAck(await emitWithAck("alias:pause", {})),
    resetRoom: async () => handleAck(await emitWithAck("alias:reset", {})),
    getHistory: async () => {
      const res = await emitWithAck("alias:history:get", {});
      return res?.history || [];
    },
    updateHistory: async (index, correct) => handleAck(await emitWithAck("alias:history:update", { index, correct })),
    confirmReport: async () => handleAck(await emitWithAck("alias:report:confirm", {})),
    navigateToGames: () => navigate("/games")
  }), [navigate]);

  if (isRestoring) {
    return (
      <div className="alias-page">
        <AliasShaderBackground />
        <div className="alias-loading">
          <div className="alias-loading__spinner" />
          <p>Восстановление сессии...</p>
        </div>
      </div>
    );
  }

  if (!aliasState) {
    return (
      <div className="alias-page">
        <AliasShaderBackground />
        <EmailVerifyBanner />
        <AliasJoinScreen
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
    <div className="alias-page alias-page--in-room">
      <AliasShaderBackground />
      <EmailVerifyBanner />
      <div className="alias-shader-overlay" />
      <AliasRoomScreen
        connected={connected}
        error={error}
        meId={meId}
        aliasState={aliasState}
        timerRemaining={timerRemaining}
        currentWord={currentWord}
        isPaused={isPaused}
        gameFinished={gameFinished}
        roundHistory={roundHistory}
        showHistoryAfterTurn={showHistoryAfterTurn}
        onCloseHistoryAfterTurn={() => setShowHistoryAfterTurn(false)}
        reviewTimeRemaining={reviewTimeRemaining}
        actions={actions}
      />
    </div>
  );
}

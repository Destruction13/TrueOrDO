import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { io } from "socket.io-client";
import { motion, AnimatePresence } from "framer-motion";
import AliasShaderBackground from "../components/alias/AliasShaderBackground";
import { useAuth, getOrCreateGlobalVisitorId } from "../context/AuthContext";
import { useSettings, GAME_IDS } from "../context/SettingsContext";
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
  // Используем глобальный visitorId (с префиксом u_) для всех пользователей
  // Это позволяет привязывать статистику к аккаунту
  return getOrCreateGlobalVisitorId();
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

// Выход из других игр при входе в Alias
function leaveOtherGames() {
  // Выход из Truth or Dare
  const todPlayerId = localStorage.getItem("tod:playerId");
  if (todPlayerId) {
    socket.emit("room:leave", { playerId: todPlayerId });
    localStorage.removeItem("tod:playerId");
    localStorage.removeItem("tod:roomCode");
    localStorage.removeItem("tod:playerName");
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

export default function AliasPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { roomCode: urlRoomCode } = useParams();
  const { user, customization } = useAuth();
  const { isShadersDisabled } = useSettings();
  
  const [connected, setConnected] = useState(false);
  const [aliasState, setAliasState] = useState(null);
  const [meId, setMeId] = useState(null);
  const [error, setError] = useState("");
  const [timerRemaining, setTimerRemaining] = useState(null);
  const [currentWord, setCurrentWord] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isRestoring, setIsRestoring] = useState(true);
  const [gameFinishedData, setGameFinishedData] = useState(null);
  const [showGameFinishedModal, setShowGameFinishedModal] = useState(false);
  const [roundHistory, setRoundHistory] = useState([]);
  const [showHistoryAfterTurn, setShowHistoryAfterTurn] = useState(false);
  const [reviewTimeRemaining, setReviewTimeRemaining] = useState(null);
  const [pendingJoinCode, setPendingJoinCode] = useState(null);
  const [cyberLeaderboard, setCyberLeaderboard] = useState([]);

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
      
      // Выходим из других игр при входе в Alias
      leaveOtherGames();

      // Если в URL есть код комнаты, отличный от сохранённой сессии — 
      // сначала выходим из старой комнаты, затем присоединяемся к новой
      if (urlRoomCode && session && session.roomCode !== urlRoomCode) {
        // Отправляем серверу команду выхода из старой комнаты
        socket.emit("alias:room:leave", { playerId: session.playerId }, () => {
          clearSession(); // Очищаем старую сессию
          handleUrlJoin(); // Присоединяемся к комнате из URL
        });
        return;
      }

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
            if (!urlRoomCode) {
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
          joinRoomDirect(urlRoomCode, user.nickname, user.avatarUrl, customization?.frameAll);
        } else {
          // Иначе запоминаем код — JoinScreen покажет форму для ввода ника
          setPendingJoinCode(urlRoomCode);
          setIsRestoring(false);
        }
      } else {
        setIsRestoring(false);
      }
    };

    const joinRoomDirect = (code, name, avatarUrl, frameSlug) => {
      const visitorId = getOrCreateVisitorId();
      socket.emit("alias:room:join", { 
        code, 
        name, 
        visitorId,
        avatarUrl,
        frameSlug 
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
    const onGameFinished = (data) => {
      // Игра завершилась: сохраняем данные результатов и открываем модалку.
      setGameFinishedData(data);
      setShowGameFinishedModal(true);

      // Очищаем состояние отчёта/хода, чтобы не оставались "Закрыть отчёт", готовность и т.п.
      setShowHistoryAfterTurn(false);
      setRoundHistory([]);
      setReviewTimeRemaining(null);
      setCurrentWord(null);
      setTimerRemaining(null);
      setIsPaused(false);
    };
    const onReset = () => {
      setGameFinishedData(null);
      setShowGameFinishedModal(false);
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
    const onCyberLeaderboard = ({ leaderboard }) => {
      // Обновляем лидерборд при получении обновлений от сервера
      setCyberLeaderboard(leaderboard);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("alias:cyber:leaderboard", onCyberLeaderboard);
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
      socket.off("alias:cyber:leaderboard", onCyberLeaderboard);
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

  // Синхронизация профиля с игрой при изменении user или customization
  useEffect(() => {
    if (!aliasState || !meId || !user) return;
    
    // Находим текущего игрока в состоянии
    const currentPlayer = aliasState.players?.find(p => p.id === meId);
    if (!currentPlayer) return;
    
    // Формируем nicknameStyle из customization
    const nicknameStyle = customization ? {
      colorType: customization.nicknameColorType,
      customColor: customization.nicknameCustomColor,
      gradient: customization.nicknameGradient,
      glow: customization.nicknameGlow
    } : null;
    
    // Проверяем, отличаются ли данные профиля от данных в игре
    const needsUpdate = 
      currentPlayer.name !== user.nickname ||
      currentPlayer.avatarUrl !== user.avatarUrl ||
      JSON.stringify(currentPlayer.nicknameStyle) !== JSON.stringify(nicknameStyle);
    
    if (needsUpdate) {
      socket.emit("alias:player:update_profile", {
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
        nicknameStyle
      });
    }
  }, [user?.nickname, user?.avatarUrl, customization, aliasState, meId]);

  const emitWithAck = (event, payload) => new Promise(resolve => socket.emit(event, payload, resolve));

  const handleAck = (res) => {
    if (!res?.ok) setError(res?.error || "Ошибка");
    else setError("");
    return res;
  };

  const actions = useMemo(() => ({
    createRoom: async (name, avatarUrl, frameSlug) => {
      const visitorId = getOrCreateVisitorId();
      const res = await emitWithAck("alias:room:create", { name, visitorId, avatarUrl, frameSlug });
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
    joinRoom: async (name, code, avatarUrl, frameSlug) => {
      const visitorId = getOrCreateVisitorId();
      const res = await emitWithAck("alias:room:join", { name, code, visitorId, avatarUrl, frameSlug });
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
      setGameFinishedData(null);
      setShowGameFinishedModal(false);
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
    shuffleTeams: async () => handleAck(await emitWithAck("alias:teams:shuffle", {})),
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
    updateCyberScore: async (score) => handleAck(await emitWithAck("alias:cyber:score", { score })),
    confirmReport: async () => handleAck(await emitWithAck("alias:report:confirm", {})),
    navigateToGames: () => navigate("/games")
  }), [navigate]);

  if (isRestoring) {
    return (
      <div className="alias-page">
        {!isShadersDisabled(GAME_IDS.ALIAS) && <AliasShaderBackground />}
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
        {!isShadersDisabled(GAME_IDS.ALIAS) && <AliasShaderBackground />}
        <EmailVerifyBanner />
        <AliasJoinScreen
          connected={connected}
          error={error}
          onCreate={actions.createRoom}
          onJoin={actions.joinRoom}
          user={user}
          customization={customization}
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
      {!isShadersDisabled(GAME_IDS.ALIAS) && <AliasShaderBackground />}
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
        gameFinishedData={gameFinishedData}
        showGameFinishedModal={showGameFinishedModal}
        onCloseGameFinished={() => setShowGameFinishedModal(false)}
        onOpenGameFinished={() => setShowGameFinishedModal(true)}
        roundHistory={roundHistory}
        showHistoryAfterTurn={showHistoryAfterTurn}
        onCloseHistoryAfterTurn={() => setShowHistoryAfterTurn(false)}
        reviewTimeRemaining={reviewTimeRemaining}
        actions={actions}
        cyberLeaderboard={cyberLeaderboard}
        setCyberLeaderboard={setCyberLeaderboard}
        socket={socket}
      />
    </div>
  );
}

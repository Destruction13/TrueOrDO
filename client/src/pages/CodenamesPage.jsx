import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { io } from "socket.io-client";
import CodenamesShaderBackground from "../components/codenames/CodenamesShaderBackground";
import { useAuth, getOrCreateGlobalVisitorId } from "../context/AuthContext";
import { useSettings, GAME_IDS } from "../context/SettingsContext";
import CodenamesJoinScreen from "../components/codenames/CodenamesJoinScreen";
import CodenamesRoomScreen from "../components/codenames/CodenamesRoomScreen";
import EmailVerifyBanner from "../components/auth/EmailVerifyBanner";
import "./CodenamesPage.css";

const socket = io(import.meta.env.VITE_SERVER_URL || "/", { autoConnect: false });

const SESSION_KEYS = {
  PLAYER_ID: "codenames:playerId",
  ROOM_CODE: "codenames:roomCode",
  PLAYER_NAME: "codenames:playerName",
  VISITOR_ID: "codenames:visitorId"
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

// Выход из других игр при входе в Codenames
function leaveOtherGames() {
  // Выход из Truth or Dare
  const todPlayerId = localStorage.getItem("tod:playerId");
  if (todPlayerId) {
    socket.emit("room:leave", { playerId: todPlayerId });
    localStorage.removeItem("tod:playerId");
    localStorage.removeItem("tod:roomCode");
    localStorage.removeItem("tod:playerName");
  }
  
  // Выход из Alias
  const aliasPlayerId = localStorage.getItem("alias:playerId");
  if (aliasPlayerId) {
    socket.emit("alias:room:leave", { playerId: aliasPlayerId });
    localStorage.removeItem("alias:playerId");
    localStorage.removeItem("alias:roomCode");
    localStorage.removeItem("alias:playerName");
  }
}

export default function CodenamesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { roomCode: urlRoomCode } = useParams();
  const { user, customization } = useAuth();
  const { isShadersDisabled } = useSettings();
  
  const [connected, setConnected] = useState(false);
  const [gameState, setGameState] = useState(null);
  // Эфемерные "поклики" по карточкам (не влияют на механику игры)
  const [cardPokes, setCardPokes] = useState({}); // { [cardId]: { player, ts, nonce } }
  const pokeTimersRef = useRef(new Map());
  const pokeNonceRef = useRef(0);

  // SFX
  const sfxRef = useRef({
    hintBell: null,
    countdownStopTimeoutId: null
  });
  const lastHintKeyRef = useRef(null);
  const lastCountdownKeyRef = useRef(null);
  const lastStateRef = useRef(null);

  const [meId, setMeId] = useState(null);
  const [error, setError] = useState("");
  const [isRestoring, setIsRestoring] = useState(true);
  const [gameFinished, setGameFinished] = useState(null);
  const [pendingJoinCode, setPendingJoinCode] = useState(null);
  const [isPaused, setIsPaused] = useState(false);

  // Установка заголовка страницы
  useEffect(() => {
    document.title = "Codenames";

    // Предзагрузка SFX
    const hintBell = new Audio("/sfx/timer-bell_m1tycbno.mp3");
    hintBell.preload = "auto";

    sfxRef.current.hintBell = hintBell;

    return () => {
      try {
        hintBell.pause();
      } catch {}
      sfxRef.current = {
        hintBell: null,
        countdownStopTimeoutId: null
      };
    };
  }, []);

  // Синхронизация профиля при изменении user или customization
  useEffect(() => {
    if (user && gameState && meId) {
      const me = gameState.players?.find(p => p.id === meId);
      if (!me) return;
      
      // Формируем nicknameStyle из customization
      const nicknameStyle = customization ? {
        colorType: customization.nicknameColorType,
        customColor: customization.nicknameCustomColor,
        gradient: customization.nicknameGradient,
        glow: customization.nicknameGlow
      } : null;
      
      const needsUpdate = 
        me.name !== user.nickname || 
        me.avatarUrl !== user.avatarUrl ||
        JSON.stringify(me.nicknameStyle) !== JSON.stringify(nicknameStyle);
      
      if (needsUpdate) {
        socket.emit("codenames:player:update_profile", {
          nickname: user.nickname,
          avatarUrl: user.avatarUrl,
          nicknameStyle
        });
      }
    }
  }, [user?.nickname, user?.avatarUrl, customization, gameState, meId]);

  useEffect(() => {
    socket.connect();
    return () => socket.disconnect();
  }, []);

  const playSfx = (audio, { durationMs } = {}) => {
    if (!audio) return;
    try {
      // Останавливаем предыдущее проигрывание
      audio.pause();
      audio.currentTime = 0;

      const p = audio.play();
      if (p?.catch) p.catch(() => {});

      if (durationMs) {
        setTimeout(() => {
          try {
            audio.pause();
            audio.currentTime = 0;
          } catch {}
        }, durationMs);
      }
    } catch {
      // ignore
    }
  };


  // Restore session или вход по URL
  useEffect(() => {
    const tryRestore = async () => {
      const session = loadSession();
      
      const waitForConnection = () => new Promise(resolve => {
        if (socket.connected) resolve();
        else socket.once("connect", resolve);
      });

      await waitForConnection();
      
      // Выходим из других игр при входе в Codenames
      leaveOtherGames();

      // Если в URL есть код комнаты, отличный от сохранённой сессии — 
      // сначала выходим из старой комнаты, затем присоединяемся к новой
      if (urlRoomCode && session && session.roomCode !== urlRoomCode) {
        // Отправляем серверу команду выхода из старой комнаты
        socket.emit("codenames:room:leave", { playerId: session.playerId }, () => {
          clearSession(); // Очищаем старую сессию
          handleUrlJoin(); // Присоединяемся к комнате из URL
        });
        return;
      }

      if (session) {
        socket.emit("codenames:room:rejoin", {
          playerId: session.playerId,
          roomCode: session.roomCode
        }, (res) => {
          if (res?.ok) {
            setGameState(res.state);
            setMeId(res.playerId);
            saveSession(res.playerId, res.state.room.code, session.playerName);
            if (!urlRoomCode) {
              navigate(`/codenames/${res.state.room.code}`, { replace: true });
            }
            setIsRestoring(false);
          } else {
            clearSession();
            handleUrlJoin();
          }
        });
      } else {
        handleUrlJoin();
      }
    };

    const handleUrlJoin = () => {
      if (urlRoomCode) {
        if (user?.nickname) {
          joinRoomDirect(urlRoomCode, user.nickname, user.avatarUrl, customization?.frameAll);
        } else {
          setPendingJoinCode(urlRoomCode);
          setIsRestoring(false);
        }
      } else {
        setIsRestoring(false);
      }
    };

    const joinRoomDirect = (code, name, avatarUrl, frameSlug) => {
      const visitorId = getOrCreateVisitorId();
      socket.emit("codenames:room:join", { 
        code, 
        name, 
        visitorId,
        avatarUrl,
        frameSlug 
      }, (res) => {
        if (res?.ok) {
          setGameState(res.state);
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
      const session = loadSession();
      if (session && meId) {
        socket.emit("codenames:room:rejoin", {
          playerId: session.playerId,
          roomCode: session.roomCode
        }, (res) => {
          if (res?.ok) {
            setGameState(res.state);
          }
        });
      }
    };
    const onDisconnect = () => setConnected(false);
    
    const onStateSync = (state) => {
      // SFX: подсказка дана
      try {
        const prev = lastStateRef.current;
        const prevHint = prev?.room?.currentHint;
        const nextHint = state?.room?.currentHint;

        const hintJustAppeared = !prevHint && !!nextHint;
        if (hintJustAppeared) {
          const hintKey = `${state?.room?.turnNumber || 0}:${state?.room?.currentTeam || ""}:${nextHint?.word || ""}:${nextHint?.count || ""}`;
          if (lastHintKeyRef.current !== hintKey) {
            lastHintKeyRef.current = hintKey;
            playSfx(sfxRef.current.hintBell);
          }
        }

      } catch {
        // ignore
      }

      lastStateRef.current = state;
      setGameState(state);
    };
    const onGameFinished = (data) => setGameFinished(data);
    const onGameReset = () => {
      setGameFinished(null);
      setIsPaused(false);

      // очищаем эфемерные "поклики" и таймеры
      setCardPokes({});
      pokeTimersRef.current.forEach(t => clearTimeout(t));
      pokeTimersRef.current.clear();

      // SFX
      lastHintKeyRef.current = null;
      lastCountdownKeyRef.current = null;
    };
    const onGamePaused = (data) => {
      setIsPaused(data.isPaused);
    };
    
    // Обработчик кика игрока
    const onPlayerKicked = (data) => {
      clearSession();
      setGameState(null);
      setMeId(null);
      setGameFinished(null);
      setPendingJoinCode(null);
      setError(data?.message || "Вы были удалены из комнаты");
      navigate("/codenames", { replace: true });
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    const onCardPoked = ({ cardId, player, ts }) => {
      const nonce = ++pokeNonceRef.current;

      // Ставим/обновляем поклик
      setCardPokes(prev => ({
        ...prev,
        [cardId]: { player, ts: ts || Date.now(), nonce }
      }));

      // Перезапускаем таймер очистки на карточке
      const existing = pokeTimersRef.current.get(cardId);
      if (existing) clearTimeout(existing);
      const timeoutId = setTimeout(() => {
        setCardPokes(prev => {
          const current = prev[cardId];
          if (!current || current.nonce !== nonce) return prev;
          const next = { ...prev };
          delete next[cardId];
          return next;
        });
        pokeTimersRef.current.delete(cardId);
      }, 1000);
      pokeTimersRef.current.set(cardId, timeoutId);
    };

    socket.on("codenames:state:sync", onStateSync);
    socket.on("codenames:game:finished", onGameFinished);
    socket.on("codenames:game:reset", onGameReset);
    socket.on("codenames:game:paused", onGamePaused);
    socket.on("codenames:player:kicked", onPlayerKicked);
    socket.on("codenames:card:poked", onCardPoked);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("codenames:state:sync", onStateSync);
      socket.off("codenames:game:finished", onGameFinished);
      socket.off("codenames:game:reset", onGameReset);
      socket.off("codenames:game:paused", onGamePaused);
      socket.off("codenames:player:kicked", onPlayerKicked);
      socket.off("codenames:card:poked", onCardPoked);

      pokeTimersRef.current.forEach(t => clearTimeout(t));
      pokeTimersRef.current.clear();

    };
  }, [meId, navigate]);

  const emitWithAck = (event, payload) => new Promise(resolve => socket.emit(event, payload, resolve));

  const handleAck = (res) => {
    if (!res?.ok) {
      setError(res?.error || "Ошибка");
      // Автоматически очищаем ошибку через 3 секунды
      setTimeout(() => setError(""), 3000);
    } else {
      setError("");
    }
    return res;
  };

  const actions = useMemo(() => ({
    createRoom: async (name, avatarUrl, frameSlug) => {
      const visitorId = getOrCreateVisitorId();
      const res = await emitWithAck("codenames:room:create", { name, visitorId, avatarUrl, frameSlug });
      const result = handleAck(res);
      if (result.ok) {
        setGameState(result.state);
        setMeId(result.playerId);
        saveSession(result.playerId, result.state.room.code, name);
        navigate(`/codenames/${result.state.room.code}`, { replace: true });
      }
      return result;
    },
    joinRoom: async (name, code, avatarUrl, frameSlug) => {
      const visitorId = getOrCreateVisitorId();
      const res = await emitWithAck("codenames:room:join", { name, code, visitorId, avatarUrl, frameSlug });
      const result = handleAck(res);
      if (result.ok) {
        setGameState(result.state);
        setMeId(result.playerId);
        saveSession(result.playerId, result.state.room.code, name);
        navigate(`/codenames/${result.state.room.code}`, { replace: true });
      }
      return result;
    },
    leaveRoom: async () => {
      socket.emit("codenames:room:leave", {});
      clearSession();
      setGameState(null);
      setMeId(null);
      setGameFinished(null);
      setPendingJoinCode(null);
      navigate("/codenames", { replace: true });
      return { ok: true };
    },
    joinTeam: async (team) => handleAck(await emitWithAck("codenames:team:join", { team })),
    setRole: async (role) => handleAck(await emitWithAck("codenames:role:set", { role })),
    startGame: async () => handleAck(await emitWithAck("codenames:game:start", {})),
    giveHint: async (word, count) => handleAck(await emitWithAck("codenames:hint:give", { word, count })),
    editHint: async (word, count) => handleAck(await emitWithAck("codenames:hint:edit", { word, count })),
    voteForCard: async (cardId) => handleAck(await emitWithAck("codenames:card:vote", { cardId })),
    pokeCard: async (cardId) => handleAck(await emitWithAck("codenames:card:poke", { cardId })),

    cancelVote: async () => handleAck(await emitWithAck("codenames:card:cancelVote", {})),
    selectCard: async (cardId) => handleAck(await emitWithAck("codenames:card:select", { cardId })),
    cancelSelectCard: async () => handleAck(await emitWithAck("codenames:card:cancel", {})),
    revealCard: async (cardId) => handleAck(await emitWithAck("codenames:card:reveal", { cardId })),
    endTurn: async () => handleAck(await emitWithAck("codenames:turn:end", {})),
    voteEndTurn: async () => handleAck(await emitWithAck("codenames:turn:voteEnd", {})),
    resetGame: async () => handleAck(await emitWithAck("codenames:game:reset", {})),
    toggleRoomOpen: async () => handleAck(await emitWithAck("codenames:room:toggle", {})),
    shuffleTeams: async () => handleAck(await emitWithAck("codenames:room:shuffle", {})),
    skipTurn: async () => handleAck(await emitWithAck("codenames:turn:skip", {})),
    kickPlayer: async (targetPlayerId) => handleAck(await emitWithAck("codenames:player:kick", { targetPlayerId })),
    updateSettings: async (settings) => handleAck(await emitWithAck("codenames:settings:update", { settings })),
    updateProfile: async (nickname, avatarUrl) => handleAck(await emitWithAck("codenames:player:update_profile", { nickname, avatarUrl })),
    pauseGame: async () => handleAck(await emitWithAck("codenames:game:pause", {})),
    resumeGame: async () => handleAck(await emitWithAck("codenames:game:resume", {})),
    renameTeam: async (team, name) => handleAck(await emitWithAck("codenames:team:rename", { team, name })),
    navigateToGames: () => navigate("/games")
  }), [navigate]);

  // Определяем цвет шейдера на основе состояния игры
  const shaderColorMode = useMemo(() => {
    // При завершении игры - цвет победителя
    if (gameState?.room?.status === "finished" && gameState?.room?.winner) {
      return gameState.room.winner; // "red" или "blue"
    }
    // Во время игры - цвет команды, чей ход
    if (gameState?.room?.status === "playing" && gameState?.room?.currentTeam) {
      return gameState.room.currentTeam; // "red" или "blue"
    }
    return "neutral";
  }, [gameState?.room?.status, gameState?.room?.winner, gameState?.room?.currentTeam]);

  if (isRestoring) {
    return (
      <div className="codenames-page">
        {!isShadersDisabled(GAME_IDS.CODENAMES) && <CodenamesShaderBackground colorMode="neutral" />}
        <div className="codenames-loading-screen">
          <div className="codenames-loading-screen__spinner" />
          <p>Восстановление сессии...</p>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="codenames-page">
        {!isShadersDisabled(GAME_IDS.CODENAMES) && <CodenamesShaderBackground colorMode="neutral" />}
        <EmailVerifyBanner />
        <CodenamesJoinScreen
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
    <div className="codenames-page codenames-page--in-room">
      {!isShadersDisabled(GAME_IDS.CODENAMES) && <CodenamesShaderBackground colorMode={shaderColorMode} />}
      <EmailVerifyBanner />
      <div className="codenames-shader-overlay" />
      <CodenamesRoomScreen
        connected={connected}
        error={error}
        meId={meId}
        gameState={gameState}
        actions={actions}
        isPaused={isPaused}
        cardPokes={cardPokes}
        socket={socket}
      />
    </div>
  );
}

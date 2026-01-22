import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./CyberRunner.css";

/**
 * CyberRunner — мини-игра для ожидающих игроков
 * Кибер-бегун прыгает через неоновые препятствия
 * 
 * @param {string} roomCode - код комнаты для привязки лидерборда
 * @param {string} playerName - имя текущего игрока
 * @param {function} onScoreUpdate - колбэк при обновлении очков (score, playerName)
 * @param {function} onClose - колбэк при закрытии
 */
export default function CyberRunner({ roomCode, playerName, onScoreUpdate, onClose }) {
  const canvasRef = useRef(null);
  const gameLoopRef = useRef(null);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    // Персональный рекорд сохраняем в localStorage по комнате
    const key = roomCode ? `cyberrunner_highscore_${roomCode}` : "cyberrunner_highscore";
    const saved = localStorage.getItem(key);
    return saved ? parseInt(saved, 10) : 0;
  });
  const [gameState, setGameState] = useState("idle"); // idle, playing, gameover
  const [isMobile, setIsMobile] = useState(false);

  // Проверка мобильного устройства
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 640);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Целевой FPS для фиксированной скорости (независимо от герцовки монитора)
  const TARGET_FPS = 240;
  const TARGET_FRAME_TIME = 1000 / TARGET_FPS; // ~4.17ms на кадр
  const lastFrameTimeRef = useRef(0);

  // Игровые константы
  const GAME = useRef({
    // Размеры
    width: 0,
    height: 0,
    groundY: 0,
    
    // Игрок
    player: {
      x: 60,
      y: 0,
      width: 36,
      height: 48,
      velocityY: 0,
      isJumping: false,
    },
    
    // Физика (настроено для TARGET_FPS=240)
    gravity: 0.5,
    jumpForce: -12,
    
    // Препятствия
    obstacles: [],
    obstacleSpeed: 3.0, // Базовая скорость для 240 FPS (уменьшена для комфортной игры)
    obstacleTimer: 0,
    obstacleInterval: 180, // Интервал в мс
    minObstacleGap: 180,
    
    // Счёт
    score: 0,
    gameTime: 0, // Время игры в мс
    
    // Цвета (кибер-тема)
    colors: {
      bg: "#0a0f1a",
      ground: "#1a2744",
      groundLine: "#2ee6ff",
      player: "#f97316",
      playerGlow: "rgba(249, 115, 22, 0.5)",
      obstacle: "#2ee6ff",
      obstacleGlow: "rgba(46, 230, 255, 0.6)",
      text: "#ffffff",
      accent: "#f97316",
    }
  });

  // Инициализация canvas
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const container = canvas.parentElement;
    const rect = container.getBoundingClientRect();
    
    // Устанавливаем размеры canvas — увеличенный размер
    canvas.width = rect.width;
    canvas.height = Math.min(rect.width * 0.5, 280); // Увеличенная высота
    
    const g = GAME.current;
    g.width = canvas.width;
    g.height = canvas.height;
    g.groundY = canvas.height - 40;
    g.player.y = g.groundY - g.player.height;
    
    // Адаптивные размеры для мобильных
    if (isMobile) {
      g.player.width = 30;
      g.player.height = 40;
      g.jumpForce = -11;
    } else {
      g.player.width = 36;
      g.player.height = 48;
      g.jumpForce = -12;
    }
  }, [isMobile]);

  // Сброс игры
  const resetGame = useCallback(() => {
    const g = GAME.current;
    g.player.y = g.groundY - g.player.height;
    g.player.velocityY = 0;
    g.player.isJumping = false;
    g.obstacles = [];
    g.score = 0;
    g.gameTime = 0;
    g.obstacleTimer = 0;
    g.obstacleSpeed = isMobile ? 2.5 : 3.0; // Базовая скорость для 240 FPS (уменьшена для комфортной игры)
    g.obstacleInterval = 180;
    g.minObstacleGap = 180;
    lastFrameTimeRef.current = 0;
    setScore(0);
  }, [isMobile]);

  // Прыжок
  const jump = useCallback(() => {
    const g = GAME.current;
    if (!g.player.isJumping && gameState === "playing") {
      g.player.velocityY = g.jumpForce;
      g.player.isJumping = true;
    }
  }, [gameState]);

  // Старт игры
  const startGame = useCallback(() => {
    resetGame();
    setGameState("playing");
  }, [resetGame]);

  // Обработка столкновений — щедрый hitbox для комфортной игры
  const checkCollision = useCallback((player, obstacle) => {
    const paddingX = 12; // Большой запас по горизонтали
    const paddingY = 8;  // Запас по вертикали
    return (
      player.x + paddingX < obstacle.x + obstacle.width - 4 &&
      player.x + player.width - paddingX > obstacle.x + 4 &&
      player.y + paddingY < obstacle.y + obstacle.height &&
      player.y + player.height - paddingY > obstacle.y
    );
  }, []);

  // Отрисовка игрока (кибер-силуэт с рюкзаком как в Among Us)
  const drawPlayer = useCallback((ctx, player, colors) => {
    const { x, y, width, height } = player;
    
    // Свечение
    ctx.shadowColor = colors.playerGlow;
    ctx.shadowBlur = 15;
    
    // Тело (упрощённый робот)
    ctx.fillStyle = colors.player;
    
    // Голова
    ctx.fillRect(x + width * 0.2, y, width * 0.6, height * 0.3);
    
    // Туловище
    ctx.fillRect(x + width * 0.1, y + height * 0.3, width * 0.8, height * 0.4);
    
    // Рюкзак (на спине, слева от персонажа — т.к. бежит вправо)
    const backpackWidth = width * 0.35;
    const backpackHeight = height * 0.35;
    const backpackX = x - backpackWidth * 0.6;
    const backpackY = y + height * 0.32;
    
    // Основа рюкзака
    ctx.fillStyle = "#8b5cf6"; // Фиолетовый цвет рюкзака
    ctx.shadowColor = "rgba(139, 92, 246, 0.6)";
    ctx.shadowBlur = 10;
    
    // Скруглённый рюкзак (рисуем как прямоугольник с закруглёнными углами)
    ctx.beginPath();
    const bpRadius = 4;
    ctx.moveTo(backpackX + bpRadius, backpackY);
    ctx.lineTo(backpackX + backpackWidth - bpRadius, backpackY);
    ctx.quadraticCurveTo(backpackX + backpackWidth, backpackY, backpackX + backpackWidth, backpackY + bpRadius);
    ctx.lineTo(backpackX + backpackWidth, backpackY + backpackHeight - bpRadius);
    ctx.quadraticCurveTo(backpackX + backpackWidth, backpackY + backpackHeight, backpackX + backpackWidth - bpRadius, backpackY + backpackHeight);
    ctx.lineTo(backpackX + bpRadius, backpackY + backpackHeight);
    ctx.quadraticCurveTo(backpackX, backpackY + backpackHeight, backpackX, backpackY + backpackHeight - bpRadius);
    ctx.lineTo(backpackX, backpackY + bpRadius);
    ctx.quadraticCurveTo(backpackX, backpackY, backpackX + bpRadius, backpackY);
    ctx.fill();
    
    // Деталь рюкзака — горизонтальная полоска
    ctx.fillStyle = "#7c3aed";
    ctx.fillRect(backpackX + 2, backpackY + backpackHeight * 0.4, backpackWidth - 4, 3);
    
    // Лямка рюкзака (соединяет с телом)
    ctx.fillStyle = "#6d28d9";
    ctx.fillRect(backpackX + backpackWidth - 2, backpackY + 4, 4, backpackHeight * 0.3);
    ctx.fillRect(backpackX + backpackWidth - 2, backpackY + backpackHeight * 0.55, 4, backpackHeight * 0.3);
    
    // Возвращаем свечение игрока для остальных частей
    ctx.shadowColor = colors.playerGlow;
    ctx.shadowBlur = 15;
    ctx.fillStyle = colors.player;
    
    // Ноги (анимация бега)
    const legOffset = Math.sin(Date.now() / 50) * 3;
    ctx.fillRect(x + width * 0.15, y + height * 0.7, width * 0.25, height * 0.3 + legOffset);
    ctx.fillRect(x + width * 0.6, y + height * 0.7, width * 0.25, height * 0.3 - legOffset);
    
    // Глаз (визор)
    ctx.fillStyle = "#2ee6ff";
    ctx.fillRect(x + width * 0.35, y + height * 0.1, width * 0.3, height * 0.1);
    
    ctx.shadowBlur = 0;
  }, []);

  // Отрисовка препятствия (кибер-барьер)
  const drawObstacle = useCallback((ctx, obstacle, colors) => {
    const { x, y, width, height } = obstacle;
    
    // Свечение
    ctx.shadowColor = colors.obstacleGlow;
    ctx.shadowBlur = 12;
    
    // Основа барьера
    ctx.fillStyle = colors.obstacle;
    ctx.fillRect(x, y, width, height);
    
    // Полоски для стиля
    ctx.fillStyle = colors.bg;
    const stripeCount = 3;
    const stripeHeight = height / (stripeCount * 2 + 1);
    for (let i = 0; i < stripeCount; i++) {
      ctx.fillRect(x + 2, y + stripeHeight * (i * 2 + 1), width - 4, stripeHeight);
    }
    
    ctx.shadowBlur = 0;
  }, []);

  // Отрисовка земли
  const drawGround = useCallback((ctx, width, groundY, colors, gameTime) => {
    // Основа земли
    ctx.fillStyle = colors.ground;
    ctx.fillRect(0, groundY, width, 40);
    
    // Неоновая линия
    ctx.strokeStyle = colors.groundLine;
    ctx.lineWidth = 2;
    ctx.shadowColor = colors.groundLine;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(width, groundY);
    ctx.stroke();
    
    // Бегущие точки на земле (скорость привязана к времени)
    ctx.fillStyle = colors.groundLine;
    const dotSpacing = 50;
    const speed = 0.15; // пикселей в мс
    const offset = (gameTime * speed) % dotSpacing;
    for (let x = -offset; x < width; x += dotSpacing) {
      ctx.beginPath();
      ctx.arc(x, groundY + 20, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.shadowBlur = 0;
  }, []);

  // Игровой цикл с delta-time для фиксированной скорости
  useEffect(() => {
    if (gameState !== "playing") return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    const g = GAME.current;

    const gameLoop = (currentTime) => {
      // Расчёт delta-time
      if (lastFrameTimeRef.current === 0) {
        lastFrameTimeRef.current = currentTime;
      }
      const deltaTime = currentTime - lastFrameTimeRef.current;
      lastFrameTimeRef.current = currentTime;
      
      // Коэффициент для нормализации скорости (относительно TARGET_FPS=240)
      const timeScale = deltaTime / TARGET_FRAME_TIME;
      
      // Обновляем игровое время
      g.gameTime += deltaTime;
      
      // Очистка
      ctx.fillStyle = g.colors.bg;
      ctx.fillRect(0, 0, g.width, g.height);
      
      // Земля (используем gameTime для анимации)
      drawGround(ctx, g.width, g.groundY, g.colors, g.gameTime);
      
      // Физика игрока с учётом delta-time
      g.player.velocityY += g.gravity * timeScale;
      g.player.y += g.player.velocityY * timeScale;
      
      // Ограничение земли
      if (g.player.y >= g.groundY - g.player.height) {
        g.player.y = g.groundY - g.player.height;
        g.player.velocityY = 0;
        g.player.isJumping = false;
      }
      
      // Отрисовка игрока
      drawPlayer(ctx, g.player, g.colors);
      
      // Генерация препятствий (таймер в мс)
      g.obstacleTimer += deltaTime;
      if (g.obstacleTimer >= g.obstacleInterval) {
        const lastObstacle = g.obstacles[g.obstacles.length - 1];
        const canSpawn = !lastObstacle || lastObstacle.x < g.width - g.minObstacleGap;
        
        if (canSpawn) {
          const obstacleHeight = 24 + Math.random() * 16; // Увеличенные препятствия
          g.obstacles.push({
            x: g.width,
            y: g.groundY - obstacleHeight,
            width: 16 + Math.random() * 10,
            height: obstacleHeight,
            passed: false,
          });
          g.obstacleTimer = 0;
          // Рандомный интервал между препятствиями (800-1400мс в начале)
          g.obstacleInterval = Math.max(600 + Math.random() * 600, g.minObstacleGap * 3);
        }
      }
      
      // Обновление и отрисовка препятствий
      g.obstacles = g.obstacles.filter(obs => {
        // Движение с учётом delta-time
        obs.x -= g.obstacleSpeed * timeScale;
        
        // Проверка столкновения
        if (checkCollision(g.player, obs)) {
          // Game Over
          if (g.score > highScore) {
            setHighScore(g.score);
            const key = roomCode ? `cyberrunner_highscore_${roomCode}` : "cyberrunner_highscore";
            localStorage.setItem(key, g.score.toString());
          }
          // Отправляем результат в лидерборд
          if (onScoreUpdate && g.score > 0) {
            onScoreUpdate(g.score, playerName);
          }
          setGameState("gameover");
          return false;
        }
        
        // Подсчёт очков
        if (!obs.passed && obs.x + obs.width < g.player.x) {
          obs.passed = true;
          g.score++;
          setScore(g.score);
        }
        
        drawObstacle(ctx, obs, g.colors);
        
        return obs.x > -obs.width;
      });
      
      // Увеличение сложности каждые 5 секунд игрового времени
      const difficultyStep = Math.floor(g.gameTime / 5000);
      const baseSpeed = isMobile ? 2.5 : 3.0;
      g.obstacleSpeed = Math.min(baseSpeed + difficultyStep * 0.5, 8);
      g.minObstacleGap = Math.max(180 - difficultyStep * 8, 130);
      
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameState, checkCollision, drawGround, drawPlayer, drawObstacle, highScore, isMobile, TARGET_FRAME_TIME, roomCode, playerName, onScoreUpdate]);

  // Отрисовка idle/gameover экрана
  useEffect(() => {
    if (gameState === "playing") return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    const g = GAME.current;
    
    // Фон
    ctx.fillStyle = g.colors.bg;
    ctx.fillRect(0, 0, g.width, g.height);
    
    // Земля
    drawGround(ctx, g.width, g.groundY, g.colors, 0);
    
    // Игрок в покое
    drawPlayer(ctx, g.player, g.colors);
    
  }, [gameState, drawGround, drawPlayer]);

  // Инициализация при монтировании
  useEffect(() => {
    initCanvas();
    window.addEventListener("resize", initCanvas);
    return () => window.removeEventListener("resize", initCanvas);
  }, [initCanvas]);

  // Обработка клавиш
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        if (gameState === "idle" || gameState === "gameover") {
          startGame();
        } else {
          jump();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameState, jump, startGame]);

  // Обработка тапа
  const handleTap = () => {
    if (gameState === "idle" || gameState === "gameover") {
      startGame();
    } else {
      jump();
    }
  };

  return (
    <div className="cyber-runner">
      <div className="cyber-runner__header">
        <div className="cyber-runner__title">
          <span className="cyber-runner__icon">🤖</span>
          <span>CYBER RUN</span>
        </div>
        <div className="cyber-runner__scores">
          <div className="cyber-runner__score">
            <span className="cyber-runner__score-label">Счёт</span>
            <span className="cyber-runner__score-value">{score}</span>
          </div>
          <div className="cyber-runner__score cyber-runner__score--best">
            <span className="cyber-runner__score-label">Рекорд</span>
            <span className="cyber-runner__score-value">{highScore}</span>
          </div>
        </div>
        {onClose && (
          <button className="cyber-runner__close" onClick={onClose} title="Закрыть">
            ×
          </button>
        )}
      </div>

      <div 
        className="cyber-runner__canvas-wrapper"
        onClick={handleTap}
        onTouchStart={(e) => { e.preventDefault(); handleTap(); }}
      >
        <canvas ref={canvasRef} className="cyber-runner__canvas" />
        
        <AnimatePresence>
          {gameState === "idle" && (
            <motion.div 
              className="cyber-runner__overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="cyber-runner__start-text">
                {isMobile ? "Тапните для старта" : "Нажмите Space или тапните"}
              </div>
            </motion.div>
          )}
          
          {gameState === "gameover" && (
            <motion.div 
              className="cyber-runner__overlay cyber-runner__overlay--gameover"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="cyber-runner__gameover-text">GAME OVER</div>
              <div className="cyber-runner__final-score">Счёт: {score}</div>
              {score >= highScore && score > 0 && (
                <div className="cyber-runner__new-record">🏆 Новый рекорд!</div>
              )}
              <div className="cyber-runner__restart-hint">
                {isMobile ? "Тапните для рестарта" : "Space — рестарт"}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="cyber-runner__hint">
        {isMobile ? "👆 Тап = прыжок" : "⌨️ Space / ↑ = прыжок"}
      </div>
    </div>
  );
}

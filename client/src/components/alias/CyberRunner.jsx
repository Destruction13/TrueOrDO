import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./CyberRunner.css";

/**
 * CyberRunner — мини-игра для ожидающих игроков
 * Кибер-бегун прыгает через неоновые препятствия
 */
export default function CyberRunner({ onClose }) {
  const canvasRef = useRef(null);
  const gameLoopRef = useRef(null);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem("cyberrunner_highscore");
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

  // Игровые константы
  const GAME = useRef({
    // Размеры
    width: 0,
    height: 0,
    groundY: 0,
    
    // Игрок
    player: {
      x: 50,
      y: 0,
      width: 30,
      height: 40,
      velocityY: 0,
      isJumping: false,
    },
    
    // Физика
    gravity: 0.5,      // Медленнее падение
    jumpForce: -12,    // Выше прыжок
    
    // Препятствия
    obstacles: [],
    obstacleSpeed: 1.2, // Очень медленный старт
    obstacleTimer: 0,
    obstacleInterval: 220, // Много времени между препятствиями
    minObstacleGap: 220, // Огромное расстояние между препятствиями
    
    // Счёт
    score: 0,
    frameCount: 0,
    
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
    
    // Устанавливаем размеры canvas
    canvas.width = rect.width;
    canvas.height = Math.min(rect.width * 0.4, 180); // Пропорциональная высота
    
    const g = GAME.current;
    g.width = canvas.width;
    g.height = canvas.height;
    g.groundY = canvas.height - 30;
    g.player.y = g.groundY - g.player.height;
    
    // Адаптивные размеры для мобильных
    if (isMobile) {
      g.player.width = 24;
      g.player.height = 32;
      g.jumpForce = -10;
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
    g.frameCount = 0;
    g.obstacleTimer = 0;
    g.obstacleSpeed = isMobile ? 1.0 : 1.2; // Очень медленный старт
    g.obstacleInterval = 220;
    g.minObstacleGap = 220;
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

  // Отрисовка игрока (кибер-силуэт)
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
  const drawGround = useCallback((ctx, width, groundY, colors, frameCount) => {
    // Основа земли
    ctx.fillStyle = colors.ground;
    ctx.fillRect(0, groundY, width, 30);
    
    // Неоновая линия
    ctx.strokeStyle = colors.groundLine;
    ctx.lineWidth = 2;
    ctx.shadowColor = colors.groundLine;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(width, groundY);
    ctx.stroke();
    
    // Бегущие точки на земле
    ctx.fillStyle = colors.groundLine;
    const dotSpacing = 40;
    const offset = (frameCount * 5) % dotSpacing;
    for (let x = -offset; x < width; x += dotSpacing) {
      ctx.beginPath();
      ctx.arc(x, groundY + 15, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.shadowBlur = 0;
  }, []);

  // Игровой цикл
  useEffect(() => {
    if (gameState !== "playing") return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    const g = GAME.current;

    const gameLoop = () => {
      // Очистка
      ctx.fillStyle = g.colors.bg;
      ctx.fillRect(0, 0, g.width, g.height);
      
      // Земля
      drawGround(ctx, g.width, g.groundY, g.colors, g.frameCount);
      
      // Физика игрока
      g.player.velocityY += g.gravity;
      g.player.y += g.player.velocityY;
      
      // Ограничение земли
      if (g.player.y >= g.groundY - g.player.height) {
        g.player.y = g.groundY - g.player.height;
        g.player.velocityY = 0;
        g.player.isJumping = false;
      }
      
      // Отрисовка игрока
      drawPlayer(ctx, g.player, g.colors);
      
      // Генерация препятствий
      g.obstacleTimer++;
      if (g.obstacleTimer >= g.obstacleInterval) {
        const lastObstacle = g.obstacles[g.obstacles.length - 1];
        const canSpawn = !lastObstacle || lastObstacle.x < g.width - g.minObstacleGap;
        
        if (canSpawn) {
          const obstacleHeight = 18 + Math.random() * 12; // Меньшие препятствия
          g.obstacles.push({
            x: g.width,
            y: g.groundY - obstacleHeight,
            width: 12 + Math.random() * 8, // Уже по ширине тоже
            height: obstacleHeight,
            passed: false,
          });
          g.obstacleTimer = 0;
          g.obstacleInterval = 60 + Math.random() * 60;
        }
      }
      
      // Обновление и отрисовка препятствий
      g.obstacles = g.obstacles.filter(obs => {
        obs.x -= g.obstacleSpeed;
        
        // Проверка столкновения
        if (checkCollision(g.player, obs)) {
          // Game Over
          if (g.score > highScore) {
            setHighScore(g.score);
            localStorage.setItem("cyberrunner_highscore", g.score.toString());
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
      
      // Увеличение сложности — очень плавная прогрессия
      g.frameCount++;
      if (g.frameCount % 300 === 0) {
        // Скорость увеличивается каждые ~5 секунд
        g.obstacleSpeed = Math.min(g.obstacleSpeed + 0.2, 8);
        // Препятствия появляются чаще (но не слишком)
        g.obstacleInterval = Math.max(g.obstacleInterval - 5, 80);
        g.minObstacleGap = Math.max(g.minObstacleGap - 5, 120);
      }
      
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameState, checkCollision, drawGround, drawPlayer, drawObstacle, highScore]);

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

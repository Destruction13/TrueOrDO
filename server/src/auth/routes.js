const express = require("express");
const rateLimit = require("express-rate-limit");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const {
  hashPassword,
  verifyPassword,
  generateToken,
  hashToken,
  isValidEmail,
  isValidPassword,
  isValidNickname,
  sanitizeString,
  generateUniqueTag
} = require("./utils");
const { sendVerificationEmail, sendPasswordResetEmail } = require("./email");
const { unlockAchievementByEvent } = require("../game/stats");

// Rate limiters
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 10, // 10 попыток
  message: { error: "Слишком много попыток. Попробуйте позже." },
  standardHeaders: true,
  legacyHeaders: false
});

const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 час
  max: 5, // 5 писем
  message: { error: "Слишком много запросов. Попробуйте позже." },
  standardHeaders: true,
  legacyHeaders: false
});

// Avatar upload config
const uploadDir = path.join(__dirname, "..", "..", "uploads", "avatars");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${req.session.userId}-${Date.now()}${ext}`;
    cb(null, filename);
  }
});

const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Неподдерживаемый формат файла. Разрешены: JPG, PNG, GIF, WebP"));
    }
  }
});

/**
 * Создание auth роутера
 * @param {import("@prisma/client").PrismaClient} prisma
 * @param {import("./session-store").PrismaSessionStore} sessionStore
 * @param {import("socket.io").Server} io
 */
function createAuthRouter(prisma, sessionStore, io) {
  
  // Функция для отправки обновления профиля всем сокетам пользователя
  const emitProfileUpdate = (userId, userData) => {
    if (!io) return;
    // Отправляем событие всем подключённым сокетам этого пользователя
    for (const [socketId, socket] of io.sockets.sockets) {
      if (socket.data.userId === userId) {
        socket.emit("user:profile:updated", userData);
      }
    }
  };
  const router = express.Router();

  // Middleware для проверки авторизации
  const requireAuth = (req, res, next) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Требуется авторизация" });
    }
    next();
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // РЕГИСТРАЦИЯ
  // ═══════════════════════════════════════════════════════════════════════════
  router.post("/auth/register", authLimiter, async (req, res) => {
    try {
      const { email, password, nickname } = req.body;
      
      // Валидация
      if (!email || !isValidEmail(email)) {
        return res.status(400).json({ error: "Некорректный email" });
      }
      if (!password || !isValidPassword(password)) {
        return res.status(400).json({ error: "Пароль должен быть минимум 8 символов" });
      }
      if (nickname && !isValidNickname(nickname)) {
        return res.status(400).json({ error: "Никнейм: 3-30 символов (буквы, цифры, _, -)" });
      }

      const normalizedEmail = email.toLowerCase().trim();
      
      // Проверка существующего пользователя (единое сообщение для безопасности)
      const existing = await prisma.user.findFirst({
        where: {
          OR: [
            { email: normalizedEmail },
            nickname ? { nickname } : {}
          ]
        }
      });
      
      if (existing) {
        // Не раскрываем, что именно занято
        return res.status(400).json({ error: "Регистрация невозможна. Попробуйте другие данные." });
      }

      // Создание пользователя
      const passwordHash = await hashPassword(password);
      
      // Генерируем уникальный тег для пользователя
      const tag = nickname ? await generateUniqueTag(prisma, nickname) : null;
      
      const user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          nickname: nickname || null,
          tag
        }
      });

      // Создание токена верификации
      const token = generateToken();
      const tokenHash = hashToken(token);
      await prisma.emailVerificationToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 часа
        }
      });

      // Отправка письма
      try {
        await sendVerificationEmail(normalizedEmail, token);
      } catch (emailError) {
        console.error("Failed to send verification email:", emailError);
        // Не блокируем регистрацию, пользователь может запросить повторно
      }

      // Разблокировка достижения "Новичок" при регистрации
      try {
        await unlockAchievementByEvent(user.id, "registration", {}, null);
      } catch (achievementError) {
        console.error("Failed to unlock registration achievement:", achievementError);
      }

      // Создание сессии
      req.session.userId = user.id;
      req.session.save((err) => {
        if (err) console.error("Session save error:", err);
      });

      res.status(201).json({
        ok: true,
        user: {
          id: user.id,
          email: user.email,
          nickname: user.nickname,
          emailVerified: false
        },
        message: "Регистрация успешна. Проверьте email для подтверждения."
      });
    } catch (error) {
      console.error("Register error:", error);
      res.status(500).json({ error: "Ошибка сервера" });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ВХОД
  // ═══════════════════════════════════════════════════════════════════════════
  router.post("/auth/login", authLimiter, async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email и пароль обязательны" });
      }

      const normalizedEmail = email.toLowerCase().trim();
      const user = await prisma.user.findUnique({
        where: { email: normalizedEmail }
      });

      // Единое сообщение для безопасности
      // Проверяем: пользователь существует, у него есть пароль (не OAuth-only), и пароль верный
      if (!user || !user.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
        return res.status(401).json({ error: "Неверный email или пароль" });
      }

      // Создание сессии
      req.session.userId = user.id;
      req.session.save((err) => {
        if (err) console.error("Session save error:", err);
      });

      // Обновляем loginStreak
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const lastLogin = user.lastLoginDate ? new Date(user.lastLoginDate) : null;
        if (lastLogin) {
          lastLogin.setHours(0, 0, 0, 0);
        }
        
        let newStreak = user.loginStreak || 0;
        
        if (!lastLogin) {
          // Первый вход
          newStreak = 1;
        } else {
          const diffDays = Math.floor((today.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24));
          
          if (diffDays === 0) {
            // Уже был вход сегодня — не меняем streak
          } else if (diffDays === 1) {
            // Вход на следующий день — увеличиваем streak
            newStreak += 1;
          } else {
            // Пропущен день — сбрасываем streak
            newStreak = 1;
          }
        }
        
        await prisma.user.update({
          where: { id: user.id },
          data: {
            loginStreak: newStreak,
            lastLoginDate: new Date()
          }
        });
        
        console.log(`[Auth] Updated loginStreak for ${user.id}: ${newStreak}`);
      } catch (streakError) {
        console.error("Login streak update error:", streakError);
      }

      // Проверяем и выдаём достижение "Новичок" для существующих пользователей
      try {
        await unlockAchievementByEvent(user.id, "registration", {}, null);
      } catch (achievementError) {
        // Игнорируем — достижение может уже быть выдано
      }

      res.json({
        ok: true,
        user: {
          id: user.id,
          email: user.email,
          nickname: user.nickname,
          avatarUrl: user.avatarUrl,
          bio: user.bio,
          emailVerified: !!user.emailVerifiedAt
        }
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Ошибка сервера" });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ВЫХОД
  // ═══════════════════════════════════════════════════════════════════════════
  router.post("/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ error: "Ошибка выхода" });
      }
      res.clearCookie("sid");
      res.json({ ok: true });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ТЕКУЩИЙ ПОЛЬЗОВАТЕЛЬ
  // ═══════════════════════════════════════════════════════════════════════════
  router.get("/auth/me", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.json({ user: null });
      }

      const user = await prisma.user.findUnique({
        where: { id: req.session.userId }
      });

      if (!user) {
        req.session.destroy(() => {});
        return res.json({ user: null });
      }

      res.json({
        user: {
          id: user.id,
          email: user.email,
          nickname: user.nickname,
          avatarUrl: user.avatarUrl,
          bio: user.bio,
          emailVerified: !!user.emailVerifiedAt
        }
      });
    } catch (error) {
      console.error("Get me error:", error);
      res.status(500).json({ error: "Ошибка сервера" });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ПОДТВЕРЖДЕНИЕ EMAIL
  // ═══════════════════════════════════════════════════════════════════════════
  router.get("/auth/verify-email", async (req, res) => {
    try {
      const { token } = req.query;

      if (!token) {
        return res.status(400).json({ error: "Токен не указан" });
      }

      const tokenHash = hashToken(token);
      const tokenRecord = await prisma.emailVerificationToken.findUnique({
        where: { tokenHash }
      });

      if (!tokenRecord) {
        return res.status(400).json({ error: "Неверный или истёкший токен" });
      }

      if (tokenRecord.usedAt) {
        return res.status(400).json({ error: "Токен уже использован" });
      }

      if (tokenRecord.expiresAt < new Date()) {
        return res.status(400).json({ error: "Токен истёк" });
      }

      // Подтверждаем email
      await prisma.$transaction([
        prisma.user.update({
          where: { id: tokenRecord.userId },
          data: { emailVerifiedAt: new Date() }
        }),
        prisma.emailVerificationToken.update({
          where: { id: tokenRecord.id },
          data: { usedAt: new Date() }
        })
      ]);

      res.json({ ok: true, message: "Email подтверждён!" });
    } catch (error) {
      console.error("Verify email error:", error);
      res.status(500).json({ error: "Ошибка сервера" });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ПОВТОРНАЯ ОТПРАВКА ПИСЬМА
  // ═══════════════════════════════════════════════════════════════════════════
  router.post("/auth/resend-verification", emailLimiter, requireAuth, async (req, res) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.session.userId }
      });

      if (!user) {
        return res.status(404).json({ error: "Пользователь не найден" });
      }

      if (user.emailVerifiedAt) {
        return res.status(400).json({ error: "Email уже подтверждён" });
      }

      // Инвалидируем старые токены
      await prisma.emailVerificationToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() }
      });

      // Создаём новый токен
      const token = generateToken();
      const tokenHash = hashToken(token);
      await prisma.emailVerificationToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
      });

      await sendVerificationEmail(user.email, token);

      res.json({ ok: true, message: "Письмо отправлено" });
    } catch (error) {
      console.error("Resend verification error:", error);
      res.status(500).json({ error: "Ошибка сервера" });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ЗАБЫЛИ ПАРОЛЬ
  // ═══════════════════════════════════════════════════════════════════════════
  router.post("/auth/forgot-password", emailLimiter, async (req, res) => {
    try {
      const { email } = req.body;

      // Всегда возвращаем успех (безопасность)
      const successResponse = { ok: true, message: "Если email зарегистрирован, вы получите письмо" };

      if (!email || !isValidEmail(email)) {
        return res.json(successResponse);
      }

      const normalizedEmail = email.toLowerCase().trim();
      const user = await prisma.user.findUnique({
        where: { email: normalizedEmail }
      });

      if (!user) {
        return res.json(successResponse);
      }

      // Инвалидируем старые токены
      await prisma.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() }
      });

      // Создаём новый токен
      const token = generateToken();
      const tokenHash = hashToken(token);
      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 час
        }
      });

      try {
        await sendPasswordResetEmail(user.email, token);
      } catch (emailError) {
        console.error("Failed to send reset email:", emailError);
      }

      res.json(successResponse);
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ error: "Ошибка сервера" });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // СБРОС ПАРОЛЯ
  // ═══════════════════════════════════════════════════════════════════════════
  router.post("/auth/reset-password", authLimiter, async (req, res) => {
    try {
      const { token, password } = req.body;

      if (!token) {
        return res.status(400).json({ error: "Токен не указан" });
      }

      if (!password || !isValidPassword(password)) {
        return res.status(400).json({ error: "Пароль должен быть минимум 8 символов" });
      }

      const tokenHash = hashToken(token);
      const tokenRecord = await prisma.passwordResetToken.findUnique({
        where: { tokenHash }
      });

      if (!tokenRecord) {
        return res.status(400).json({ error: "Неверный или истёкший токен" });
      }

      if (tokenRecord.usedAt) {
        return res.status(400).json({ error: "Токен уже использован" });
      }

      if (tokenRecord.expiresAt < new Date()) {
        return res.status(400).json({ error: "Токен истёк" });
      }

      // Обновляем пароль
      const passwordHash = await hashPassword(password);
      await prisma.$transaction([
        prisma.user.update({
          where: { id: tokenRecord.userId },
          data: { passwordHash }
        }),
        prisma.passwordResetToken.update({
          where: { id: tokenRecord.id },
          data: { usedAt: new Date() }
        })
      ]);

      // Инвалидируем все сессии пользователя
      await sessionStore.destroyUserSessions(tokenRecord.userId);

      res.json({ ok: true, message: "Пароль изменён. Войдите заново." });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ error: "Ошибка сервера" });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ПРОФИЛЬ - GET
  // ═══════════════════════════════════════════════════════════════════════════
  router.get("/me", requireAuth, async (req, res) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.session.userId }
      });

      if (!user) {
        return res.status(404).json({ error: "Пользователь не найден" });
      }

      // Обновляем loginStreak при посещении (раз в день)
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const lastLogin = user.lastLoginDate ? new Date(user.lastLoginDate) : null;
        if (lastLogin) {
          lastLogin.setHours(0, 0, 0, 0);
        }
        
        let newStreak = user.loginStreak || 0;
        let shouldUpdate = false;
        
        if (!lastLogin) {
          // Первое посещение
          newStreak = 1;
          shouldUpdate = true;
        } else {
          const diffDays = Math.floor((today.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24));
          
          if (diffDays === 0) {
            // Уже было посещение сегодня — не обновляем
          } else if (diffDays === 1) {
            // Посещение на следующий день — увеличиваем streak
            newStreak += 1;
            shouldUpdate = true;
          } else if (diffDays > 1) {
            // Пропущен день — сбрасываем streak
            newStreak = 1;
            shouldUpdate = true;
          }
        }
        
        if (shouldUpdate) {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              loginStreak: newStreak,
              lastLoginDate: new Date()
            }
          });
          console.log(`[Auth] Updated loginStreak for ${user.id}: ${newStreak}`);
        }
      } catch (streakError) {
        console.error("Login streak update error:", streakError);
      }

      res.json({
        user: {
          id: user.id,
          email: user.email,
          nickname: user.nickname,
          avatarUrl: user.avatarUrl,
          bio: user.bio,
          discordId: user.discordId,
          discordUsername: user.discordUsername,
          emailVerified: !!user.emailVerifiedAt,
          createdAt: user.createdAt
        }
      });
    } catch (error) {
      console.error("Get profile error:", error);
      res.status(500).json({ error: "Ошибка сервера" });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ПРОФИЛЬ - UPDATE
  // ═══════════════════════════════════════════════════════════════════════════
  router.patch("/me", requireAuth, async (req, res) => {
    try {
      const { nickname, bio } = req.body;
      const updates = {};

      if (nickname !== undefined) {
        if (nickname && !isValidNickname(nickname)) {
          return res.status(400).json({ error: "Никнейм: 3-30 символов (буквы, цифры, _, -)" });
        }
        
        // Проверка уникальности
        if (nickname) {
          const existing = await prisma.user.findFirst({
            where: { nickname, id: { not: req.session.userId } }
          });
          if (existing) {
            return res.status(400).json({ error: "Никнейм уже занят" });
          }
        }
        
        updates.nickname = nickname || null;
      }

      if (bio !== undefined) {
        updates.bio = sanitizeString(bio, 500);
      }

      const user = await prisma.user.update({
        where: { id: req.session.userId },
        data: updates
      });

      const userData = {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        emailVerified: !!user.emailVerifiedAt
      };

      // Уведомляем все сокеты пользователя об обновлении профиля
      emitProfileUpdate(user.id, userData);

      res.json({
        ok: true,
        user: userData
      });
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({ error: "Ошибка сервера" });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // РАМКИ - СПИСОК ДОСТУПНЫХ
  // ═══════════════════════════════════════════════════════════════════════════
  router.get("/frames", async (req, res) => {
    try {
      const { game } = req.query;

      // Получаем все активные рамки
      const frames = await prisma.frame.findMany({
        where: {
          isActive: true,
          ...(game && game !== "all"
            ? { OR: [{ game: "all" }, { game }] }
            : {})
        },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          name: true,
          slug: true,
          game: true,
          accessType: true,
          price: true,
          sortOrder: true
        }
      });

      res.json({ frames });
    } catch (error) {
      console.error("Get frames error:", error);
      res.status(500).json({ error: "Ошибка сервера" });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ГРАДИЕНТЫ НИКНЕЙМА - СПИСОК ДОСТУПНЫХ
  // ═══════════════════════════════════════════════════════════════════════════
  router.get("/nickname-gradients", async (req, res) => {
    try {
      const gradients = await prisma.nicknameGradient.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          name: true,
          slug: true,
          cssValue: true,
          accessType: true
        }
      });

      res.json({ gradients });
    } catch (error) {
      console.error("Get nickname gradients error:", error);
      res.status(500).json({ error: "Ошибка сервера" });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // СВЕЧЕНИЯ НИКНЕЙМА - СПИСОК ДОСТУПНЫХ
  // ═══════════════════════════════════════════════════════════════════════════
  router.get("/nickname-glows", async (req, res) => {
    try {
      const glows = await prisma.nicknameGlow.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          name: true,
          slug: true,
          cssValue: true,
          accessType: true
        }
      });

      res.json({ glows });
    } catch (error) {
      console.error("Get nickname glows error:", error);
      res.status(500).json({ error: "Ошибка сервера" });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ЭФФЕКТЫ НИКНЕЙМА - СПИСОК ДОСТУПНЫХ (PRO)
  // ═══════════════════════════════════════════════════════════════════════════
  router.get("/nickname-effects", async (req, res) => {
    try {
      const effects = await prisma.nicknameEffect.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          name: true,
          slug: true,
          component: true,
          config: true,
          previewUrl: true,
          accessType: true
        }
      });

      res.json({ effects });
    } catch (error) {
      console.error("Get nickname effects error:", error);
      res.status(500).json({ error: "Ошибка сервера" });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GAME STATS & ACHIEVEMENTS
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Получить статистику текущего пользователя
  router.get("/me/stats", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      console.log("[Stats API] Getting stats for userId:", userId);
      
      // Получаем пользователя с базовой инфой
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          xp: true,
          level: true,
          loginStreak: true,
          createdAt: true
        }
      });
      
      // Получаем статистику по играм
      const gameStats = await prisma.userGameStats.findMany({
        where: { userId },
        select: {
          gameType: true,
          gamesPlayed: true,
          gamesWon: true,
          timePlayed: true,
          customStats: true,
          lastPlayedAt: true
        }
      });
      
      // Считаем общую статистику
      const totalGamesPlayed = gameStats.reduce((sum, s) => sum + s.gamesPlayed, 0);
      const totalGamesWon = gameStats.reduce((sum, s) => sum + s.gamesWon, 0);
      const totalTimePlayed = gameStats.reduce((sum, s) => sum + s.timePlayed, 0);
      
      const result = {
        user: {
          xp: user?.xp || 0,
          level: user?.level || 1,
          loginStreak: user?.loginStreak || 0,
          memberSince: user?.createdAt
        },
        totals: {
          gamesPlayed: totalGamesPlayed,
          gamesWon: totalGamesWon,
          winRate: totalGamesPlayed > 0 ? Math.round((totalGamesWon / totalGamesPlayed) * 100) : 0,
          timePlayed: totalTimePlayed
        },
        byGame: gameStats.map(s => ({
          ...s,
          customStats: JSON.parse(s.customStats || "{}")
        }))
      };
      console.log("[Stats API] Returning stats:", JSON.stringify(result.totals), "byGame:", gameStats.length, "records");
      res.json(result);
    } catch (error) {
      console.error("Get user stats error:", error);
      res.status(500).json({ error: "Ошибка сервера" });
    }
  });
  
  // Получить достижения текущего пользователя
  router.get("/me/achievements", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      console.log("[Achievements API] Getting achievements for userId:", userId);
      
      // Получаем разблокированные достижения пользователя
      const userAchievements = await prisma.userAchievement.findMany({
        where: { userId },
        include: {
          achievement: {
            select: {
              id: true,
              slug: true,
              name: true,
              description: true,
              icon: true,
              category: true,
              gameType: true,
              rarity: true,
              xpReward: true,
              isSecret: true,
              unlockCondition: true // Добавляем для вычисления прогресса
            }
          }
        },
        orderBy: { unlockedAt: "desc" }
      });
      
      // Получаем статистику пользователя для вычисления прогресса
      const userStats = await prisma.userGameStats.findMany({
        where: { userId }
      });
      
      // Собираем статистику по всем играм
      const statsMap = {};
      userStats.forEach(s => {
        const customStats = JSON.parse(s.customStats || "{}");
        Object.assign(statsMap, {
          [`${s.gameType}GamesPlayed`]: s.gamesPlayed,
          [`${s.gameType}GamesWon`]: s.gamesWon,
          ...customStats
        });
      });
      
      // Считаем общее количество достижений
      const totalAchievements = await prisma.achievement.count({
        where: { isActive: true }
      });
      
      // Функция для вычисления прогресса достижения
      const getProgressInfo = (achievement, currentLevel) => {
        try {
          const condition = JSON.parse(achievement.unlockCondition || "{}");
          const field = condition.field;
          if (!field) return null;
          
          // Используем gameType из достижения или из условия
          const gameType = achievement.gameType || condition.gameType;
          
          // Формируем ключ для statsMap с учётом gameType
          let statsKey = field;
          if (gameType && (field === 'gamesPlayed' || field === 'gamesWon')) {
            // Для полей gamesPlayed, gamesWon добавляем префикс gameType
            statsKey = field === 'gamesWon' 
              ? `${gameType}GamesWon` 
              : `${gameType}GamesPlayed`;
          }
          
          const currentValue = statsMap[statsKey] || statsMap[field] || 0;
          
          // Прогрессивное достижение с уровнями
          if (condition.levels && Array.isArray(condition.levels)) {
            const maxLevel = Math.min(condition.levels.length, 5);
            if (currentLevel >= maxLevel) return { current: 0, target: 0, maxLevel, isMaxed: true };
            
            const nextLevelThreshold = condition.levels[currentLevel]; // currentLevel это индекс следующего уровня
            
            return {
              current: currentValue,
              target: nextLevelThreshold,
              maxLevel,
              isMaxed: false
            };
          }
          
          // Обычное достижение с type: "count" - показываем прогресс до цели
          if (condition.type === 'count' && condition.value) {
            return {
              current: currentValue,
              target: condition.value,
              maxLevel: 1,
              isMaxed: currentLevel >= 1
            };
          }
          
          return null;
        } catch (e) {
          return null;
        }
      };
      
      // Группируем по категориям
      const byCategory = {};
      userAchievements.forEach(ua => {
        const cat = ua.achievement.category;
        if (!byCategory[cat]) byCategory[cat] = [];
        
        const progressInfo = getProgressInfo(ua.achievement, ua.level || 1);
        
        // Форматируем описание
        let description = ua.achievement.description;
        try {
          const condition = JSON.parse(ua.achievement.unlockCondition || "{}");
          const level = ua.level || 1;
          if (condition.levels && Array.isArray(condition.levels) && level > 0) {
            const targetValue = condition.levels[level - 1];
            description = description.replace("{value}", targetValue);
          } else if (condition.value) {
            description = description.replace("{value}", condition.value);
          }
        } catch (e) {}
        
        byCategory[cat].push({
          ...ua.achievement,
          description,
          unlockedAt: ua.unlockedAt,
          isFeatured: ua.isFeatured,
          featuredOrder: ua.featuredOrder,
          level: ua.level || 1,
          progress: progressInfo
        });
      });
      
      // Избранные достижения
      // Дедуплицируем по названию достижения, оставляя версию с лучшей редкостью/уровнем
      const RARITY_ORDER = { common: 0, rare: 1, epic: 2, heroic: 3, legendary: 4, secret: 5 };
      const featuredMap = new Map();
      userAchievements
        .filter(ua => ua.isFeatured)
        .forEach(ua => {
          const name = ua.achievement.name;
          const existing = featuredMap.get(name);
          if (!existing) {
            featuredMap.set(name, ua);
          } else {
            // Сравниваем по редкости, затем по уровню
            const existingRarity = RARITY_ORDER[existing.achievement.rarity] || 0;
            const newRarity = RARITY_ORDER[ua.achievement.rarity] || 0;
            if (newRarity > existingRarity || (newRarity === existingRarity && (ua.level || 1) > (existing.level || 1))) {
              featuredMap.set(name, ua);
            }
          }
        });
      const featured = Array.from(featuredMap.values())
        .sort((a, b) => (a.featuredOrder || 0) - (b.featuredOrder || 0))
        .slice(0, 6)
        .map(ua => {
          const progressInfo = getProgressInfo(ua.achievement, ua.level || 1);
          
          // Форматируем описание
          let description = ua.achievement.description;
          try {
            const condition = JSON.parse(ua.achievement.unlockCondition || "{}");
            const level = ua.level || 1;
            if (condition.levels && Array.isArray(condition.levels) && level > 0) {
              const targetValue = condition.levels[level - 1];
              description = description.replace("{value}", targetValue);
            } else if (condition.value) {
              description = description.replace("{value}", condition.value);
            }
          } catch (e) {}
          
          return {
            ...ua.achievement,
            description,
            level: ua.level || 1,
            progress: progressInfo
          };
        });
      
      const result = {
        unlocked: userAchievements.length,
        total: totalAchievements,
        progress: totalAchievements > 0 ? Math.round((userAchievements.length / totalAchievements) * 100) : 0,
        featured,
        byCategory,
        recent: userAchievements.slice(0, 5).map(ua => {
          // Форматируем описание
          let description = ua.achievement.description;
          try {
            const condition = JSON.parse(ua.achievement.unlockCondition || "{}");
            const level = ua.level || 1;
            if (condition.levels && Array.isArray(condition.levels) && level > 0) {
              const targetValue = condition.levels[level - 1];
              description = description.replace("{value}", targetValue);
            } else if (condition.value) {
              description = description.replace("{value}", condition.value);
            }
          } catch (e) {}
          
          return {
            ...ua.achievement,
            description,
            unlockedAt: ua.unlockedAt,
            level: ua.level || 1
          };
        })
      };
      console.log("[Achievements API] Returning:", result.unlocked, "/", result.total, "achievements, featured:", featured.length);
      console.log("[Achievements API] StatsMap:", JSON.stringify(statsMap));
      console.log("[Achievements API] Featured with progress:", featured.map(f => ({ name: f.name, level: f.level, progress: f.progress })));
      res.json(result);
    } catch (error) {
      console.error("Get user achievements error:", error);
      res.status(500).json({ error: "Ошибка сервера" });
    }
  });
  
  // Получить список всех достижений (для витрины)
  router.get("/achievements", async (req, res) => {
    try {
      const achievements = await prisma.achievement.findMany({
        where: { isActive: true },
        select: {
          id: true,
          slug: true,
          name: true,
          description: true,
          icon: true,
          category: true,
          gameType: true,
          rarity: true,
          xpReward: true,
          isSecret: true
        },
        orderBy: [
          { category: "asc" },
          { sortOrder: "asc" }
        ]
      });
      
      // Скрываем описание секретных достижений
      const publicAchievements = achievements.map(a => ({
        ...a,
        name: a.isSecret ? "???" : a.name,
        description: a.isSecret ? "Секретное достижение" : a.description,
        icon: a.isSecret ? "❓" : a.icon
      }));
      
      res.json({ achievements: publicAchievements });
    } catch (error) {
      console.error("Get achievements error:", error);
      res.status(500).json({ error: "Ошибка сервера" });
    }
  });
  
  // Установить избранные достижения
  router.patch("/me/achievements/featured", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      const { achievementIds } = req.body; // массив slugs достижений (макс 6)
      
      console.log("[Featured API] Setting featured for userId:", userId, "slugs:", achievementIds);
      
      if (!Array.isArray(achievementIds) || achievementIds.length > 6) {
        return res.status(400).json({ error: "Максимум 6 избранных достижений" });
      }
      
      // Сбрасываем все текущие избранные
      // Это также очистит старые дубликаты с isFeatured: true
      await prisma.userAchievement.updateMany({
        where: { userId, isFeatured: true },
        data: { isFeatured: false, featuredOrder: null }
      });
      
      // Получаем ID достижений по их slugs
      const achievements = await prisma.achievement.findMany({
        where: { slug: { in: achievementIds } },
        select: { id: true, slug: true }
      });
      
      const slugToId = new Map(achievements.map(a => [a.slug, a.id]));
      
      // Устанавливаем новые избранные
      // Для каждого slug находим запись с максимальным уровнем и помечаем только её
      for (let i = 0; i < achievementIds.length; i++) {
        const slug = achievementIds[i];
        const achievementId = slugToId.get(slug);
        
        if (achievementId) {
          // Находим запись с максимальным уровнем для этого достижения
          const maxLevelRecord = await prisma.userAchievement.findFirst({
            where: { userId, achievementId },
            orderBy: { level: 'desc' }
          });
          
          if (maxLevelRecord) {
            await prisma.userAchievement.update({
              where: { id: maxLevelRecord.id },
              data: { isFeatured: true, featuredOrder: i }
            });
          }
        }
      }
      
      console.log("[Featured API] Updated", achievementIds.length, "featured achievements");
      res.json({ success: true });
    } catch (error) {
      console.error("Update featured achievements error:", error);
      res.status(500).json({ error: "Ошибка сервера" });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // КАСТОМИЗАЦИЯ - GET
  // ═══════════════════════════════════════════════════════════════════════════
  router.get("/me/customization", requireAuth, async (req, res) => {
    try {
      let customization = await prisma.userCustomization.findUnique({
        where: { userId: req.session.userId },
        include: {
          nicknameGradient: true,
          nicknameGlow: true,
          nicknameEffect: true
        }
      });

      // Если нет записи — создаём с дефолтами
      if (!customization) {
        customization = await prisma.userCustomization.create({
          data: { userId: req.session.userId }
        });
      }

      // Загружаем подписку пользователя
      const subscription = await prisma.subscription.findUnique({
        where: { userId: req.session.userId },
        select: {
          tier: true,
          status: true,
          startDate: true,
          endDate: true
        }
      });

      // Загружаем разовые покупки пользователя
      const purchases = await prisma.userPurchase.findMany({
        where: { userId: req.session.userId },
        select: {
          itemType: true,
          itemId: true,
          purchasedAt: true
        }
      });

      res.json({
        customization: {
          // Рамки
          frameAll: customization.frameAll,
          frameCodenames: customization.frameCodenames,
          frameAlias: customization.frameAlias,
          frameTod: customization.frameTod,
          frameEmotional: customization.frameEmotional,
          // Никнейм
          nicknameColorType: customization.nicknameColorType,
          nicknameCustomColor: customization.nicknameCustomColor,
          nicknameGradientId: customization.nicknameGradientId,
          nicknameGradient: customization.nicknameGradient ? {
            slug: customization.nicknameGradient.slug,
            name: customization.nicknameGradient.name,
            cssValue: customization.nicknameGradient.cssValue
          } : null,
          nicknameGlowId: customization.nicknameGlowId,
          nicknameGlow: customization.nicknameGlow ? {
            slug: customization.nicknameGlow.slug,
            name: customization.nicknameGlow.name,
            cssValue: customization.nicknameGlow.cssValue
          } : null,
          nicknameEffectId: customization.nicknameEffectId,
          nicknameEffect: customization.nicknameEffect ? {
            slug: customization.nicknameEffect.slug,
            name: customization.nicknameEffect.name,
            component: customization.nicknameEffect.component,
            config: customization.nicknameEffect.config
          } : null
        },
        // Подписка (активная)
        subscription: (subscription?.status === "active" || subscription?.status === "ACTIVE") ? {
          tier: subscription.tier,
          endDate: subscription.endDate
        } : null,
        // Разовые покупки
        purchases: purchases || []
      });
    } catch (error) {
      console.error("Get customization error:", error);
      res.status(500).json({ error: "Ошибка сервера" });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // КАСТОМИЗАЦИЯ - UPDATE
  // ═══════════════════════════════════════════════════════════════════════════
  router.patch("/me/customization", requireAuth, async (req, res) => {
    try {
      const { 
        frameAll, frameCodenames, frameAlias, frameTod, frameEmotional,
        nicknameColorType, nicknameCustomColor, nicknameGradientId, nicknameGlowId, nicknameEffectId
      } = req.body;
      const updates = {};
      const userId = req.session.userId;

      // Загружаем подписку и покупки пользователя для проверки доступа
      const subscription = await prisma.subscription.findUnique({
        where: { userId },
        select: { tier: true, status: true }
      });
      const purchases = await prisma.userPurchase.findMany({
        where: { userId },
        select: { itemType: true, itemId: true }
      });

      const userTier = (subscription?.status === "active" || subscription?.status === "ACTIVE") ? subscription.tier?.toLowerCase() : null;

      /**
       * Проверяет доступ пользователя к элементу
       */
      const hasAccessToItem = (accessType, itemType, itemId) => {
        if (accessType === "free") return true;
        
        // Проверяем подписку
        if (accessType === "vip" && (userTier === "vip" || userTier === "pro")) return true;
        if (accessType === "pro" && userTier === "pro") return true;
        
        // Проверяем разовые покупки
        if (accessType === "purchasable") {
          return purchases.some(p => p.itemType === itemType && p.itemId === itemId);
        }
        
        return false;
      };

      // Валидируем рамку (существование + доступ)
      const validateFrame = async (slug) => {
        if (slug === null) return { valid: true }; // null = сбросить на дефолт
        if (!slug) return { valid: false, error: "Рамка не указана" };
        
        const frame = await prisma.frame.findUnique({ where: { slug } });
        if (!frame || !frame.isActive) {
          return { valid: false, error: "Рамка не найдена" };
        }
        
        // Проверяем доступ
        if (!hasAccessToItem(frame.accessType, "frame", frame.slug)) {
          return { valid: false, error: `Рамка "${frame.name}" требует ${frame.accessType === "purchasable" ? "покупки" : frame.accessType.toUpperCase() + " подписки"}` };
        }
        
        return { valid: true };
      };

      // Валидация рамок
      if (frameAll !== undefined) {
        const result = await validateFrame(frameAll);
        if (!result.valid) {
          return res.status(400).json({ error: result.error });
        }
        updates.frameAll = frameAll;
      }

      if (frameCodenames !== undefined) {
        const result = await validateFrame(frameCodenames);
        if (!result.valid) {
          return res.status(400).json({ error: result.error });
        }
        updates.frameCodenames = frameCodenames;
      }

      if (frameAlias !== undefined) {
        const result = await validateFrame(frameAlias);
        if (!result.valid) {
          return res.status(400).json({ error: result.error });
        }
        updates.frameAlias = frameAlias;
      }

      if (frameTod !== undefined) {
        const result = await validateFrame(frameTod);
        if (!result.valid) {
          return res.status(400).json({ error: result.error });
        }
        updates.frameTod = frameTod;
      }

      if (frameEmotional !== undefined) {
        const result = await validateFrame(frameEmotional);
        if (!result.valid) {
          return res.status(400).json({ error: result.error });
        }
        updates.frameEmotional = frameEmotional;
      }

      // Валидация никнейма
      if (nicknameColorType !== undefined) {
        if (!["basic", "custom", "gradient"].includes(nicknameColorType)) {
          return res.status(400).json({ error: "Недопустимый тип цвета никнейма" });
        }
        updates.nicknameColorType = nicknameColorType;
      }

      if (nicknameCustomColor !== undefined) {
        // Валидация hex цвета (null для сброса)
        if (nicknameCustomColor !== null) {
          const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
          if (!hexRegex.test(nicknameCustomColor)) {
            return res.status(400).json({ error: "Некорректный формат цвета (используйте HEX: #RRGGBB)" });
          }
        }
        updates.nicknameCustomColor = nicknameCustomColor;
      }

      if (nicknameGradientId !== undefined) {
        if (nicknameGradientId !== null) {
          const gradient = await prisma.nicknameGradient.findUnique({ where: { id: nicknameGradientId } });
          if (!gradient || !gradient.isActive) {
            return res.status(400).json({ error: "Градиент не найден или недоступен" });
          }
          // Проверка доступа
          if (!hasAccessToItem(gradient.accessType, "gradient", gradient.slug)) {
            return res.status(400).json({ 
              error: `Градиент "${gradient.name}" требует ${gradient.accessType.toUpperCase()} подписки` 
            });
          }
        }
        updates.nicknameGradientId = nicknameGradientId;
      }

      if (nicknameGlowId !== undefined) {
        if (nicknameGlowId !== null) {
          const glow = await prisma.nicknameGlow.findUnique({ where: { id: nicknameGlowId } });
          if (!glow || !glow.isActive) {
            return res.status(400).json({ error: "Эффект свечения не найден или недоступен" });
          }
          // Проверка доступа
          if (!hasAccessToItem(glow.accessType, "glow", glow.slug)) {
            return res.status(400).json({ 
              error: `Эффект свечения "${glow.name}" требует ${glow.accessType.toUpperCase()} подписки` 
            });
          }
        }
        updates.nicknameGlowId = nicknameGlowId;
      }

      if (nicknameEffectId !== undefined) {
        if (nicknameEffectId !== null) {
          const effect = await prisma.nicknameEffect.findUnique({ where: { id: nicknameEffectId } });
          if (!effect || !effect.isActive) {
            return res.status(400).json({ error: "Эффект не найден или недоступен" });
          }
          // Проверка доступа (эффекты требуют VIP/PRO)
          if (!hasAccessToItem(effect.accessType, "effect", effect.slug)) {
            return res.status(400).json({ 
              error: `Эффект "${effect.name}" требует ${effect.accessType.toUpperCase()} подписки` 
            });
          }
        }
        updates.nicknameEffectId = nicknameEffectId;
      }

      // Upsert: создаём или обновляем
      const customization = await prisma.userCustomization.upsert({
        where: { userId: req.session.userId },
        create: { userId: req.session.userId, ...updates },
        update: updates,
        include: {
          nicknameGradient: true,
          nicknameGlow: true,
          nicknameEffect: true
        }
      });

      const customizationData = {
        // Рамки
        frameAll: customization.frameAll,
        frameCodenames: customization.frameCodenames,
        frameAlias: customization.frameAlias,
        frameTod: customization.frameTod,
        frameEmotional: customization.frameEmotional,
        // Никнейм
        nicknameColorType: customization.nicknameColorType,
        nicknameCustomColor: customization.nicknameCustomColor,
        nicknameGradientId: customization.nicknameGradientId,
        nicknameGradient: customization.nicknameGradient ? {
          slug: customization.nicknameGradient.slug,
          name: customization.nicknameGradient.name,
          cssValue: customization.nicknameGradient.cssValue
        } : null,
        nicknameGlowId: customization.nicknameGlowId,
        nicknameGlow: customization.nicknameGlow ? {
          slug: customization.nicknameGlow.slug,
          name: customization.nicknameGlow.name,
          cssValue: customization.nicknameGlow.cssValue
        } : null,
        nicknameEffectId: customization.nicknameEffectId,
        nicknameEffect: customization.nicknameEffect ? {
          slug: customization.nicknameEffect.slug,
          name: customization.nicknameEffect.name,
          component: customization.nicknameEffect.component,
          config: customization.nicknameEffect.config
        } : null
      };

      // Уведомляем все сокеты пользователя об обновлении кастомизации
      if (io) {
        for (const [socketId, socket] of io.sockets.sockets) {
          if (socket.data.userId === req.session.userId) {
            socket.emit("user:customization:updated", customizationData);
          }
        }
      }

      res.json({ ok: true, customization: customizationData });
    } catch (error) {
      console.error("Update customization error:", error);
      res.status(500).json({ error: "Ошибка сервера" });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // АВАТАР UPLOAD
  // ═══════════════════════════════════════════════════════════════════════════
  router.post("/me/avatar", requireAuth, (req, res) => {
    avatarUpload.single("avatar")(req, res, async (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({ error: "Файл слишком большой (макс. 10MB)" });
          }
        }
        return res.status(400).json({ error: err.message });
      }

      if (!req.file) {
        return res.status(400).json({ error: "Файл не загружен" });
      }

      try {
        // Удаляем старый аватар
        const user = await prisma.user.findUnique({
          where: { id: req.session.userId }
        });

        if (user?.avatarUrl) {
          const oldPath = path.join(uploadDir, path.basename(user.avatarUrl));
          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
          }
        }

        // Сохраняем новый URL
        const avatarUrl = `/uploads/avatars/${req.file.filename}`;
        const updated = await prisma.user.update({
          where: { id: req.session.userId },
          data: { avatarUrl }
        });

        // Уведомляем все сокеты пользователя об обновлении аватара
        emitProfileUpdate(updated.id, {
          id: updated.id,
          email: updated.email,
          nickname: updated.nickname,
          avatarUrl: updated.avatarUrl,
          bio: updated.bio,
          emailVerified: !!updated.emailVerifiedAt
        });

        res.json({
          ok: true,
          avatarUrl: updated.avatarUrl
        });
      } catch (error) {
        console.error("Avatar upload error:", error);
        res.status(500).json({ error: "Ошибка сервера" });
      }
    });
  });

  return router;
}

module.exports = { createAuthRouter };

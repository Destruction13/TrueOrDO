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
  sanitizeString
} = require("./utils");
const { sendVerificationEmail, sendPasswordResetEmail } = require("./email");

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
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
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
 */
function createAuthRouter(prisma, sessionStore) {
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
      const user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          nickname: nickname || null
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
      if (!user || !(await verifyPassword(password, user.passwordHash))) {
        return res.status(401).json({ error: "Неверный email или пароль" });
      }

      // Создание сессии
      req.session.userId = user.id;
      req.session.save((err) => {
        if (err) console.error("Session save error:", err);
      });

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

      res.json({
        user: {
          id: user.id,
          email: user.email,
          nickname: user.nickname,
          avatarUrl: user.avatarUrl,
          bio: user.bio,
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
      console.error("Update profile error:", error);
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
            return res.status(400).json({ error: "Файл слишком большой (макс. 2MB)" });
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

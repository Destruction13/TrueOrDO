const express = require("express");

// OAuth URLs
const DISCORD_AUTH_URL = "https://discord.com/api/oauth2/authorize";
const DISCORD_TOKEN_URL = "https://discord.com/api/oauth2/token";
const DISCORD_USER_URL = "https://discord.com/api/users/@me";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USER_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

/**
 * Создание OAuth роутера
 * @param {import("@prisma/client").PrismaClient} prisma
 */
function createOAuthRouter(prisma) {
  const router = express.Router();

  // ═══════════════════════════════════════════════════════════════════════════
  // DISCORD OAUTH
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Шаг 1: Редирект на страницу авторизации Discord
   */
  router.get("/auth/discord", (req, res) => {
    const clientId = process.env.DISCORD_CLIENT_ID;
    const redirectUri = process.env.DISCORD_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      console.error("Discord OAuth not configured");
      return res.redirect(`${process.env.APP_BASE_URL}/login?error=oauth_not_configured`);
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "identify email"
    });

    res.redirect(`${DISCORD_AUTH_URL}?${params}`);
  });

  /**
   * Шаг 2: Callback от Discord после авторизации
   */
  router.get("/auth/discord/callback", async (req, res) => {
    const { code, error: oauthError } = req.query;
    const baseUrl = process.env.APP_BASE_URL || "http://localhost:5173";

    if (oauthError || !code) {
      console.error("Discord OAuth error:", oauthError);
      return res.redirect(`${baseUrl}/login?error=oauth_denied`);
    }

    try {
      // Обмен code на access_token
      const tokenResponse = await fetch(DISCORD_TOKEN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          client_id: process.env.DISCORD_CLIENT_ID,
          client_secret: process.env.DISCORD_CLIENT_SECRET,
          grant_type: "authorization_code",
          code,
          redirect_uri: process.env.DISCORD_REDIRECT_URI
        })
      });

      const tokens = await tokenResponse.json();

      if (tokens.error) {
        console.error("Discord token error:", tokens);
        return res.redirect(`${baseUrl}/login?error=oauth_token_failed`);
      }

      // Получаем данные пользователя Discord
      const userResponse = await fetch(DISCORD_USER_URL, {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`
        }
      });

      const discordUser = await userResponse.json();

      if (!discordUser.id) {
        console.error("Discord user fetch failed:", discordUser);
        return res.redirect(`${baseUrl}/login?error=oauth_user_failed`);
      }

      // Ищем существующего пользователя по Discord ID
      let user = await prisma.user.findUnique({
        where: { discordId: discordUser.id }
      });

      // Если не нашли по Discord ID, ищем по email
      if (!user && discordUser.email) {
        const existingByEmail = await prisma.user.findUnique({
          where: { email: discordUser.email.toLowerCase() }
        });

        if (existingByEmail) {
          // Привязываем Discord к существующему аккаунту
          user = await prisma.user.update({
            where: { id: existingByEmail.id },
            data: { 
              discordId: discordUser.id,
              // Обновляем аватар если его нет
              avatarUrl: existingByEmail.avatarUrl || getDiscordAvatarUrl(discordUser)
            }
          });
        }
      }

      // Создаём нового пользователя если не нашли
      if (!user) {
        const avatarUrl = getDiscordAvatarUrl(discordUser);
        const email = discordUser.email?.toLowerCase() || `discord_${discordUser.id}@oauth.local`;
        
        // Генерируем уникальный никнейм
        let nickname = sanitizeNickname(discordUser.username || discordUser.global_name);
        nickname = await ensureUniqueNickname(prisma, nickname);

        user = await prisma.user.create({
          data: {
            email,
            discordId: discordUser.id,
            nickname,
            avatarUrl,
            emailVerifiedAt: discordUser.verified ? new Date() : null
          }
        });
      }

      // Создаём сессию
      req.session.userId = user.id;
      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.redirect(`${baseUrl}/login?error=session_failed`);
        }
        res.redirect(baseUrl);
      });
    } catch (error) {
      console.error("Discord OAuth error:", error);
      res.redirect(`${baseUrl}/login?error=oauth_failed`);
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GOOGLE OAUTH
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Шаг 1: Редирект на страницу авторизации Google
   */
  router.get("/auth/google", (req, res) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      console.error("Google OAuth not configured");
      return res.redirect(`${process.env.APP_BASE_URL}/login?error=oauth_not_configured`);
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "email profile",
      access_type: "offline",
      prompt: "select_account" // Всегда показывать выбор аккаунта
    });

    res.redirect(`${GOOGLE_AUTH_URL}?${params}`);
  });

  /**
   * Шаг 2: Callback от Google после авторизации
   */
  router.get("/auth/google/callback", async (req, res) => {
    const { code, error: oauthError } = req.query;
    const baseUrl = process.env.APP_BASE_URL || "http://localhost:5173";

    if (oauthError || !code) {
      console.error("Google OAuth error:", oauthError);
      return res.redirect(`${baseUrl}/login?error=oauth_denied`);
    }

    try {
      // Обмен code на access_token
      const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID,
          client_secret: process.env.GOOGLE_CLIENT_SECRET,
          grant_type: "authorization_code",
          code,
          redirect_uri: process.env.GOOGLE_REDIRECT_URI
        })
      });

      const tokens = await tokenResponse.json();

      if (tokens.error) {
        console.error("Google token error:", tokens);
        return res.redirect(`${baseUrl}/login?error=oauth_token_failed`);
      }

      // Получаем данные пользователя Google
      const userResponse = await fetch(GOOGLE_USER_URL, {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`
        }
      });

      const googleUser = await userResponse.json();

      if (!googleUser.id) {
        console.error("Google user fetch failed:", googleUser);
        return res.redirect(`${baseUrl}/login?error=oauth_user_failed`);
      }

      // Ищем существующего пользователя по Google ID
      let user = await prisma.user.findUnique({
        where: { googleId: googleUser.id }
      });

      // Если не нашли по Google ID, ищем по email
      if (!user && googleUser.email) {
        const existingByEmail = await prisma.user.findUnique({
          where: { email: googleUser.email.toLowerCase() }
        });

        if (existingByEmail) {
          // Привязываем Google к существующему аккаунту
          user = await prisma.user.update({
            where: { id: existingByEmail.id },
            data: { 
              googleId: googleUser.id,
              // Обновляем аватар если его нет
              avatarUrl: existingByEmail.avatarUrl || googleUser.picture
            }
          });
        }
      }

      // Создаём нового пользователя если не нашли
      if (!user) {
        const email = googleUser.email?.toLowerCase();
        
        if (!email) {
          return res.redirect(`${baseUrl}/login?error=oauth_no_email`);
        }

        // Генерируем уникальный никнейм из имени
        let nickname = sanitizeNickname(googleUser.name || googleUser.given_name || email.split("@")[0]);
        nickname = await ensureUniqueNickname(prisma, nickname);

        user = await prisma.user.create({
          data: {
            email,
            googleId: googleUser.id,
            nickname,
            avatarUrl: googleUser.picture || null,
            emailVerifiedAt: googleUser.verified_email ? new Date() : null
          }
        });
      }

      // Создаём сессию
      req.session.userId = user.id;
      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.redirect(`${baseUrl}/login?error=session_failed`);
        }
        res.redirect(baseUrl);
      });
    } catch (error) {
      console.error("Google OAuth error:", error);
      res.redirect(`${baseUrl}/login?error=oauth_failed`);
    }
  });

  return router;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Получить URL аватара Discord
 */
function getDiscordAvatarUrl(discordUser) {
  if (discordUser.avatar) {
    const ext = discordUser.avatar.startsWith("a_") ? "gif" : "png";
    return `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.${ext}?size=256`;
  }
  // Дефолтный аватар Discord
  const defaultIndex = (BigInt(discordUser.id) >> 22n) % 6n;
  return `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
}

/**
 * Санитизация никнейма (только допустимые символы)
 */
function sanitizeNickname(name) {
  if (!name) return "user";
  // Оставляем буквы (включая кириллицу), цифры, _, -
  return name
    .replace(/[^a-zA-Zа-яА-ЯёЁ0-9_-]/g, "")
    .slice(0, 30) || "user";
}

/**
 * Убедиться что никнейм уникален (добавляем числа если занят)
 */
async function ensureUniqueNickname(prisma, baseNickname) {
  let nickname = baseNickname;
  let counter = 1;
  
  while (true) {
    const existing = await prisma.user.findUnique({
      where: { nickname }
    });
    
    if (!existing) {
      return nickname;
    }
    
    nickname = `${baseNickname}${counter}`;
    counter++;
    
    // Защита от бесконечного цикла
    if (counter > 1000) {
      nickname = `${baseNickname}_${Date.now()}`;
      break;
    }
  }
  
  return nickname;
}

module.exports = { createOAuthRouter };

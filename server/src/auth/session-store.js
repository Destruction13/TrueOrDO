const session = require("express-session");

/**
 * Prisma Session Store для express-session
 */
class PrismaSessionStore extends session.Store {
  constructor(prisma, options = {}) {
    super();
    this.prisma = prisma;
    this.ttl = options.ttl || 86400000; // 24 часа по умолчанию
  }

  async get(sid, callback) {
    try {
      const session = await this.prisma.session.findUnique({
        where: { sid }
      });
      
      if (!session) {
        return callback(null, null);
      }
      
      if (session.expiresAt < new Date()) {
        await this.destroy(sid, () => {});
        return callback(null, null);
      }
      
      const data = JSON.parse(session.data);
      callback(null, data);
    } catch (error) {
      callback(error);
    }
  }

  async set(sid, sessionData, callback) {
    try {
      const userId = sessionData.userId || null;
      const expiresAt = sessionData.cookie?.expires 
        ? new Date(sessionData.cookie.expires) 
        : new Date(Date.now() + this.ttl);
      
      const data = JSON.stringify(sessionData);
      
      // Сохраняем сессию в базу (и для авторизованных, и для анонимных)
      await this.prisma.session.upsert({
        where: { sid },
        create: {
          sid,
          userId,
          data,
          expiresAt
        },
        update: {
          userId,
          data,
          expiresAt
        }
      });
      
      callback?.(null);
    } catch (error) {
      callback?.(error);
    }
  }

  async destroy(sid, callback) {
    try {
      await this.prisma.session.deleteMany({
        where: { sid }
      });
      callback?.(null);
    } catch (error) {
      callback?.(error);
    }
  }

  async touch(sid, sessionData, callback) {
    try {
      const expiresAt = sessionData.cookie?.expires 
        ? new Date(sessionData.cookie.expires) 
        : new Date(Date.now() + this.ttl);
      
      await this.prisma.session.updateMany({
        where: { sid },
        data: { expiresAt }
      });
      
      callback?.(null);
    } catch (error) {
      callback?.(error);
    }
  }

  // Удаление всех сессий пользователя (при смене пароля)
  async destroyUserSessions(userId) {
    await this.prisma.session.deleteMany({
      where: { userId }
    });
  }

  // Очистка просроченных сессий
  async clearExpired() {
    await this.prisma.session.deleteMany({
      where: {
        expiresAt: { lt: new Date() }
      }
    });
  }
}

module.exports = { PrismaSessionStore };

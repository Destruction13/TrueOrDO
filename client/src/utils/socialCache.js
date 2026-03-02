class SocialCache {
  constructor() { this.cache = new Map(); }
  get(key) { return this.cache.get(key)?.data; }
  set(key, data, ttl = 300000) { this.cache.set(key, { data, expires: Date.now() + ttl }); }
  invalidate(key) { this.cache.delete(key); }
  clear() { this.cache.clear(); }
}
export const friendsCache = new SocialCache();
export const messagesCache = new SocialCache();
export const profileCache = new SocialCache();
export default SocialCache;

import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import * as authApi from "../api/auth";
import { io } from "socket.io-client";
import { AchievementToast } from "../components/auth/Achievements";
import ProfileBlockedModal from "../components/ui/ProfileBlockedModal";

const AuthContext = createContext(null);

// Создаём глобальный socket для синхронизации профиля
const socket = io(import.meta.env.VITE_SERVER_URL || "/", {
  withCredentials: true,
  autoConnect: true
});

// Экспортируем socket для использования в компонентах профиля
export { socket as authSocket };

// Единый visitorId для всех игр (для привязки статистики к аккаунту)
const GLOBAL_VISITOR_ID_KEY = "app:visitorId";

function getOrCreateGlobalVisitorId() {
  let visitorId = localStorage.getItem(GLOBAL_VISITOR_ID_KEY);
  if (!visitorId) {
    visitorId = "u_" + Math.random().toString(36).substring(2) + Date.now().toString(36);
    localStorage.setItem(GLOBAL_VISITOR_ID_KEY, visitorId);
  }
  return visitorId;
}

// Экспортируем для использования в играх
export { getOrCreateGlobalVisitorId };

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [customization, setCustomization] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Очередь уведомлений о достижениях
  const [achievementQueue, setAchievementQueue] = useState([]);
  const [currentAchievement, setCurrentAchievement] = useState(null);
  const achievementTimeoutRef = useRef(null);
  
  // Состояние блокировки профиля (из-за жалоб)
  const [profileBlocked, setProfileBlocked] = useState(false);

  // Загрузка пользователя при старте
  useEffect(() => {
    checkAuth();
  }, []);

  // Слушаем обновления профиля и кастомизации через socket
  useEffect(() => {
    const handleProfileUpdate = (updatedUser) => {
      console.log("Profile updated via socket:", updatedUser);
      setUser(updatedUser);
    };

    const handleCustomizationUpdate = (updatedCustomization) => {
      console.log("Customization updated via socket:", updatedCustomization);
      setCustomization(updatedCustomization);
    };

    const handleAchievementUnlocked = (data) => {
      console.log("Achievement unlocked via socket:", data);
      if (data.achievement) {
        setAchievementQueue(prev => [...prev, data.achievement]);
      }
    };

    const handleProfileBlocked = (data) => {
      console.log("Profile blocked via socket:", data);
      setProfileBlocked(true);
    };

    socket.on("user:profile:updated", handleProfileUpdate);
    socket.on("user:customization:updated", handleCustomizationUpdate);
    socket.on("achievement:unlocked", handleAchievementUnlocked);
    socket.on("profile:blocked", handleProfileBlocked);
    return () => {
      socket.off("user:profile:updated", handleProfileUpdate);
      socket.off("user:customization:updated", handleCustomizationUpdate);
      socket.off("achievement:unlocked", handleAchievementUnlocked);
      socket.off("profile:blocked", handleProfileBlocked);
    };
  }, []);

  // Обработка очереди достижений — показываем по одному
  useEffect(() => {
    if (currentAchievement || achievementQueue.length === 0) return;

    const next = achievementQueue[0];
    setCurrentAchievement(next);
    setAchievementQueue(prev => prev.slice(1));

    // Автоматически скрываем через 5 секунд
    achievementTimeoutRef.current = setTimeout(() => {
      setCurrentAchievement(null);
    }, 5000);

    return () => {
      if (achievementTimeoutRef.current) {
        clearTimeout(achievementTimeoutRef.current);
      }
    };
  }, [currentAchievement, achievementQueue]);

  const dismissAchievement = useCallback(() => {
    if (achievementTimeoutRef.current) {
      clearTimeout(achievementTimeoutRef.current);
    }
    setCurrentAchievement(null);
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      setLoading(true);
      const data = await authApi.getMe();
      setUser(data.user);
      setError(null);
      
      // Если пользователь авторизован, загружаем его данные
      if (data.user) {
        // Проверяем, заблокирован ли профиль
        if (data.user.profileBlockedAt) {
          setProfileBlocked(true);
        }
        
        // Привязываем visitorId к аккаунту для статистики и достижений
        const visitorId = getOrCreateGlobalVisitorId();
        socket.emit("user:bind:visitorId", visitorId, (res) => {
          if (res?.ok) {
            console.log("[Auth] Bound visitorId to user account");
          }
        });
        
        try {
          const custData = await authApi.getCustomization();
          setCustomization(custData.customization);
          setSubscription(custData.subscription || null);
          setPurchases(custData.purchases || []);
        } catch (custErr) {
          console.error("Failed to load customization:", custErr);
          setCustomization(null);
          setSubscription(null);
          setPurchases([]);
        }
      } else {
        setCustomization(null);
        setSubscription(null);
        setPurchases([]);
      }
    } catch (err) {
      setUser(null);
      setCustomization(null);
      // Не показываем ошибку если просто не авторизован
      if (err.status !== 401) {
        console.error("Auth check error:", err);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async ({ email, password, nickname }) => {
    setError(null);
    try {
      const data = await authApi.register({ email, password, nickname });
      setUser(data.user);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const login = useCallback(async ({ email, password }) => {
    setError(null);
    try {
      const data = await authApi.login({ email, password });
      setUser(data.user);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setUser(null);
    }
  }, []);

  const verifyEmail = useCallback(async (token) => {
    const data = await authApi.verifyEmail(token);
    // Обновляем состояние пользователя
    if (user) {
      setUser({ ...user, emailVerified: true });
    }
    return data;
  }, [user]);

  const resendVerification = useCallback(async () => {
    return authApi.resendVerification();
  }, []);

  const forgotPassword = useCallback(async (email) => {
    return authApi.forgotPassword(email);
  }, []);

  const resetPassword = useCallback(async ({ token, password }) => {
    const data = await authApi.resetPassword({ token, password });
    // После сброса пароля сессия инвалидируется
    setUser(null);
    return data;
  }, []);

  const updateProfile = useCallback(async ({ nickname, bio }) => {
    const data = await authApi.updateProfile({ nickname, bio });
    setUser(data.user);
    return data;
  }, []);

  const uploadAvatar = useCallback(async (file) => {
    const data = await authApi.uploadAvatar(file);
    if (user && data.avatarUrl) {
      setUser({ ...user, avatarUrl: data.avatarUrl });
    }
    return data;
  }, [user]);

  const getFrames = useCallback(async (game) => {
    const data = await authApi.getFrames(game);
    return data.frames;
  }, []);

  const updateCustomization = useCallback(async (updates) => {
    const data = await authApi.updateCustomization(updates);
    setCustomization(data.customization);
    return data;
  }, []);

  const value = {
    user,
    customization,
    subscription,
    purchases,
    loading,
    error,
    isAuthenticated: !!user,
    isEmailVerified: user?.emailVerified ?? false,
    
    // Socket для компонентов
    socket,
    
    // Actions
    checkAuth,
    register,
    login,
    logout,
    verifyEmail,
    resendVerification,
    forgotPassword,
    resetPassword,
    updateProfile,
    uploadAvatar,
    getFrames,
    updateCustomization,
    
    // Для ручного обновления
    setUser,
    setCustomization,
    setSubscription,
    setPurchases,
    setError,
    
    // Блокировка профиля
    profileBlocked,
    clearProfileBlock: () => setProfileBlocked(false),
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      {/* Toast для достижений */}
      {currentAchievement && (
        <AchievementToast 
          achievement={currentAchievement} 
          onClose={dismissAchievement} 
        />
      )}
      {/* Модал блокировки профиля */}
      <ProfileBlockedModal
        isOpen={profileBlocked}
        onClose={() => setProfileBlocked(false)}
      />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

export default AuthContext;

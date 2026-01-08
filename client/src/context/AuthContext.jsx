import { createContext, useContext, useState, useEffect, useCallback } from "react";
import * as authApi from "../api/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Загрузка пользователя при старте
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      setLoading(true);
      const data = await authApi.getMe();
      setUser(data.user);
      setError(null);
    } catch (err) {
      setUser(null);
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

  const value = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    isEmailVerified: user?.emailVerified ?? false,
    
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
    
    // Для ручного обновления
    setUser,
    setError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
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

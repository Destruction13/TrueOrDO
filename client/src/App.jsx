import { useNavigate, useLocation } from "react-router-dom";
import { GodRays } from "@paper-design/shaders-react";
import AuthScreen from "./components/auth/AuthScreen";
import ProfileScreen from "./components/auth/ProfileScreen";
import VerifyEmail from "./components/auth/VerifyEmail";
import ResetPassword from "./components/auth/ResetPassword";
import { useAuth } from "./context/AuthContext";

// Фоновый шейдер для auth страниц
function AuthBackground() {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: -1 }}>
      <GodRays
        colorBack="#000000"
        colors={["#0a0a12", "#08080f", "#050508", "#0c0c18"]}
        colorBloom="#2a1a4a"
        offsetX={0.85}
        offsetY={-1}
        intensity={0.9}
        spotty={0.5}
        midSize={12}
        midIntensity={0.15}
        density={0.5}
        bloom={0.35}
        speed={0.4}
        scale={1.8}
        style={{ height: "100%", width: "100%" }}
      />
    </div>
  );
}

// Определение текущего роута на основе pathname
function getRoute(pathname, searchParams) {
  if (pathname === "/verify-email" || searchParams.has("verify")) {
    return { page: "verify-email", token: searchParams.get("token") || searchParams.get("verify") };
  }
  if (pathname === "/reset-password" || searchParams.has("reset")) {
    return { page: "reset-password", token: searchParams.get("token") || searchParams.get("reset") };
  }
  if (pathname === "/profile") {
    return { page: "profile" };
  }
  if (pathname === "/login" || pathname === "/register") {
    return { page: "auth" };
  }
  return { page: "unknown" };
}

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const { loading: authLoading, isAuthenticated } = useAuth();
  
  const searchParams = new URLSearchParams(location.search);
  const route = getRoute(location.pathname, searchParams);

  // Показываем загрузку пока проверяем авторизацию
  if (authLoading) {
    return (
      <div className="app-loading">
        <div className="app-loading__spinner" />
        <p>Загрузка...</p>
      </div>
    );
  }

  // Роутинг для auth страниц
  if (route.page === "verify-email") {
    return (
      <>
        <AuthBackground />
        <VerifyEmail
          token={route.token}
          onSuccess={() => navigate("/")}
          onBack={() => navigate("/")}
        />
      </>
    );
  }

  if (route.page === "reset-password") {
    return (
      <>
        <AuthBackground />
        <ResetPassword
          token={route.token}
          onSuccess={() => navigate("/login")}
          onBack={() => navigate("/login")}
        />
      </>
    );
  }

  if (route.page === "auth") {
    // Если уже авторизован — редирект на главную
    if (isAuthenticated) {
      navigate("/");
      return null;
    }
    return (
      <>
        <AuthBackground />
        <AuthScreen onSuccess={() => navigate("/")} onClose={() => navigate("/")} />
      </>
    );
  }

  if (route.page === "profile") {
    // Профиль требует авторизации
    if (!isAuthenticated) {
      navigate("/login");
      return null;
    }
    return (
      <>
        <AuthBackground />
        <ProfileScreen onBack={() => navigate(-1)} />
      </>
    );
  }

  // Неизвестный роут — редирект на главную
  navigate("/");
  return null;
}

export default App;

import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { GodRays } from "@paper-design/shaders-react";
import { useAuth } from "../context/AuthContext";
import { SocialHeaderIcons } from "../components/social";
import Button from "../components/ui/Button";
import AvatarFrame from "../components/ui/AvatarFrame";
import StyledNickname from "../components/ui/StyledNickname";
import "./LandingPage.css";

export default function LandingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, customization } = useAuth();

  // Установка заголовка страницы
  useEffect(() => {
    document.title = "PartyChaos";
  }, []);

  return (
    <div className="landing-page">
      {/* GodRays Background */}
      <div className="landing-shader-bg">
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
          style={{ 
            height: "100%", 
            width: "100%", 
            position: "absolute", 
            top: 0, 
            left: 0 
          }}
        />
      </div>

      <div className="user-header">
        {user ? (
          <>
            <SocialHeaderIcons />
            <button className="user-header__profile" onClick={() => navigate("/profile")} type="button">
              <AvatarFrame size="xs" frameSlug={customization?.frameAll}>
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="user-header__avatar" />
                ) : (
                  <span className="user-header__avatar-placeholder">
                    {(user.nickname || user.email)?.[0]?.toUpperCase() || "?"}
                  </span>
                )}
              </AvatarFrame>
              <span className="user-header__name">
                <StyledNickname 
                  name={user.nickname || user.email} 
                  customization={customization}
                />
              </span>
            </button>
          </>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/login", { state: { backgroundLocation: location } })}
          >
            Войти
          </Button>
        )}
      </div>

      <div className="landing-content">
        <motion.div
          className="landing-badge"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <span className="landing-badge__dot" />
          Мини-игры для компании
        </motion.div>

        <motion.h1
          className="landing-title"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          Party<span className="landing-title__accent">Chaos</span>
        </motion.h1>

        <motion.p
          className="landing-description"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          Коллекция мини-игр: выбирайте режим, запускайте комнату, 
          играйте с друзьями на одном экране или онлайн.
        </motion.p>

        <motion.button
          className="landing-cta"
          onClick={() => navigate("/games")}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
        >
          Перейти к играм
          <span className="landing-cta__arrow">→</span>
        </motion.button>
      </div>
    </div>
  );
}

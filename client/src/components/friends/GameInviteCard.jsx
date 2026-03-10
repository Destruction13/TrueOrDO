import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import "./GameInviteCard.css";

const GAME_CONFIG = {
    tod: { name: "Правда или Действие", icon: "🎯", gradient: "linear-gradient(135deg, #ff6b6b, #ee5a24)" },
    alias: { name: "Alias", icon: "🗣️", gradient: "linear-gradient(135deg, #4ecdc4, #44bd9e)" },
    emotional: { name: "Крокодил Эмоций", icon: "🎭", gradient: "linear-gradient(135deg, #a855f7, #7c3aed)" },
    codenames: { name: "Codenames", icon: "🕵️", gradient: "linear-gradient(135deg, #3b82f6, #2563eb)" },
};

export default function GameInviteCard({ metadata, isOwn, socket }) {
    const [isValid, setIsValid] = useState(true);

    useEffect(() => {
        if (!socket || !metadata) return;
        socket.emit("game:room:validate", { gameType: metadata.gameType, roomCode: metadata.roomCode }, (res) => {
            if (res && typeof res.isValid === 'boolean') {
                setIsValid(res.isValid);
            }
        });
    }, [socket, metadata]);

    if (!metadata) return null;

    const { gameType, roomCode, gameName } = metadata;
    const config = GAME_CONFIG[gameType] || { name: gameName || gameType, icon: "🎮", gradient: "linear-gradient(135deg, #667eea, #764ba2)" };

    const handleJoin = (e) => {
        e.stopPropagation();
        if (isValid) {
            window.location.href = `/${gameType}/${roomCode}`;
        }
    };

    return (
        <motion.div
            className={`game-invite-card ${isOwn ? "game-invite-card--own" : ""} ${!isValid ? "game-invite-card--invalid" : ""}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
        >
            <div className="game-invite-card__accent" style={{ background: isValid ? config.gradient : "#555" }} />
            <div className="game-invite-card__body">
                <div className="game-invite-card__icon-wrap" style={{ background: isValid ? config.gradient : "#555" }}>
                    <span className="game-invite-card__icon">{config.icon}</span>
                </div>
                <div className="game-invite-card__info">
                    <div className="game-invite-card__label">
                        {isOwn ? "Вы пригласили" : "Приглашение"}
                        {!isValid && <span style={{ color: "var(--color-text-dimmed)", fontSize: "0.85em", marginLeft: 4 }}>(Завершено)</span>}
                    </div>
                    <div className="game-invite-card__game-name" style={{ color: isValid ? "" : "var(--color-text-dimmed)" }}>{config.name}</div>
                    <div className="game-invite-card__room-code" style={{ color: isValid ? "" : "var(--color-text-dimmed)" }}>Комната: {roomCode}</div>
                </div>
            </div>
            {!isOwn && (
                <motion.button
                    className={`game-invite-card__join-btn ${!isValid ? "game-invite-card__join-btn--disabled" : ""}`}
                    style={{
                        background: isValid ? config.gradient : "rgba(255, 255, 255, 0.1)",
                        color: isValid ? "#fff" : "var(--color-text-dimmed)",
                        cursor: isValid ? "pointer" : "not-allowed"
                    }}
                    onClick={handleJoin}
                    whileHover={isValid ? { scale: 1.03 } : {}}
                    whileTap={isValid ? { scale: 0.97 } : {}}
                    disabled={!isValid}
                >
                    {isValid ? "Присоединиться" : "Недоступно"}
                </motion.button>
            )}
        </motion.div>
    );
}

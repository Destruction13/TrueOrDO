import { AnimatePresence, motion } from "framer-motion";
import "./GameInviteNotification.css";

export default function GameInviteNotification({ invites = [], onAccept, onDecline }) {
  if (invites.length === 0) return null;

  return (
    <div className="game-invite-notifications">
      <AnimatePresence>
        {invites.map((invite) => (
          <motion.div
            key={invite.id}
            className="game-invite-notification"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
          >
            <img src={invite.fromAvatar || "/default-avatar.png"} alt="" className="game-invite-notification__avatar" />
            <div className="game-invite-notification__content">
              <div className="game-invite-notification__title">Приглашение в игру</div>
              <div className="game-invite-notification__message">
                {invite.fromNickname} приглашает в {invite.gameType}
              </div>
            </div>
            <div className="game-invite-notification__actions">
              <button className="game-invite-notification__accept" onClick={() => onAccept(invite)}>
                ✓
              </button>
              <button className="game-invite-notification__decline" onClick={() => onDecline(invite)}>
                ✕
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

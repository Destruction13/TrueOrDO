import "./ClickablePlayerWrapper.css";

export default function ClickablePlayerWrapper({ children, player, friendshipStatus, socket, currentUserId, onClick }) {
  const handleClick = () => {
    onClick?.(player);
  };

  const playerId = player?.id || player?.odlerId;
  if (!player || String(playerId) === String(currentUserId)) {
    return <>{children}</>;
  }

  return (
    <span className="clickable-player-wrapper" onClick={handleClick} role="button" tabIndex={0}>
      {children}
    </span>
  );
}

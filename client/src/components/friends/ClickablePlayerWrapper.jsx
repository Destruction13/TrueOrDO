import "./ClickablePlayerWrapper.css";

export default function ClickablePlayerWrapper({ children, player, friendshipStatus, socket, currentUserId, onClick }) {
  const handleClick = () => {
    onClick?.(player);
  };

  if (!player || player.odlerId === currentUserId) {
    return <>{children}</>;
  }

  return (
    <span className="clickable-player-wrapper" onClick={handleClick} role="button" tabIndex={0}>
      {children}
    </span>
  );
}

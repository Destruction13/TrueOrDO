import { useState, useEffect } from 'react';
export default function useFriendsIntegration(socket, currentUserId, playerIds = []) {
  const [statuses, setStatuses] = useState({});
  const getFriendshipStatus = (userId) => statuses[userId] || 'none';
  const sendFriendRequest = (userId) => socket?.emit('friends:request:send', { odlerId: userId });
  const inviteToGame = (userId, gameType, roomCode) => socket?.emit('messages:game:invite', { odlerId: userId, gameType, roomCode });
  return { getFriendshipStatus, sendFriendRequest, inviteToGame, invites: [], acceptInvite: () => {}, declineInvite: () => {} };
}

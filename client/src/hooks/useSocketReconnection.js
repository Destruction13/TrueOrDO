import { useState } from 'react';
export default function useSocketReconnection(socket) {
  return { isConnected: true, isReconnecting: false, reconnectAttempt: 0, error: null };
}

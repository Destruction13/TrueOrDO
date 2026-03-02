import { useState } from 'react';
export default function useOfflineQueue(socket) {
  return { queue: [], addToQueue: () => {}, processQueue: () => {}, pendingCount: 0 };
}

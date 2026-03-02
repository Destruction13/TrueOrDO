import { useCallback } from 'react';
export default function useSoundEffects() {
  const playSound = useCallback((type) => {}, []);
  return { playSound, volume: 50, setVolume: () => {}, enabled: true, setEnabled: () => {} };
}

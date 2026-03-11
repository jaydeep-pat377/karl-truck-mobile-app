import { useRef, useCallback } from 'react';
import { useNotificationSound } from './useNotificationSound';

const THROTTLE_MS = 3000;

interface UseNewMessageSoundOptions {

  enabled?: boolean;

  volume?: number;

  throttleMs?: number;
}

interface UseNewMessageSoundReturn {

  playSound: () => Promise<boolean>;

  isSupported: boolean;

  isPlaying: boolean;
}

export const useNewMessageSound = (
  options: UseNewMessageSoundOptions = {}
): UseNewMessageSoundReturn => {
  const { enabled = true, volume = 0.5, throttleMs = THROTTLE_MS } = options;

  const lastPlayTimeRef = useRef<number>(0);

  const {
    playSound: basePlaySound,
    isSupported,
    isPlaying,
  } = useNotificationSound({ enabled, volume });

  const playSound = useCallback(async (): Promise<boolean> => {
    const now = Date.now();
    const timeSinceLastPlay = now - lastPlayTimeRef.current;


    if (timeSinceLastPlay < throttleMs) {
      return false;
    }

    lastPlayTimeRef.current = now;

    return basePlaySound();
  }, [basePlaySound, throttleMs]);

  return {
    playSound,
    isSupported,
    isPlaying,
  };
};

export default useNewMessageSound;

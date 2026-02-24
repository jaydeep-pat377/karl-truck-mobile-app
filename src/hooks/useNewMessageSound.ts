import { useRef, useCallback } from 'react';
import { useNotificationSound } from './useNotificationSound';

/** Throttle duration in milliseconds */
const THROTTLE_MS = 3000;

interface UseNewMessageSoundOptions {
  /** Enable/disable sound playback */
  enabled?: boolean;
  /** Volume level (0 to 1) */
  volume?: number;
  /** Throttle duration in ms (default: 3000) */
  throttleMs?: number;
}

interface UseNewMessageSoundReturn {
  /** Plays the notification sound (throttled), returns success status */
  playSound: () => Promise<boolean>;
  /** Whether the sound system is supported/ready */
  isSupported: boolean;
  /** Whether sound is currently playing */
  isPlaying: boolean;
}

/**
 * Throttled notification sound hook for chat messages
 *
 * Wraps useNotificationSound with a 3-second throttle to prevent
 * rapid-fire sounds when multiple messages arrive quickly.
 *
 * @example
 * ```tsx
 * const { playSound } = useNewMessageSound({ enabled: true });
 *
 * // In realtime message handler
 * useEffect(() => {
 *   const subscription = supabase
 *     .channel('messages')
 *     .on('INSERT', (payload) => {
 *       if (payload.new.sender_id !== currentUserId) {
 *         playSound();
 *       }
 *     });
 * }, [playSound]);
 * ```
 */
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

    // Check throttle
    if (timeSinceLastPlay < throttleMs) {
      console.log(
        `[useNewMessageSound] Throttled (${timeSinceLastPlay}ms since last play, need ${throttleMs}ms)`
      );
      return false;
    }

    // Update last play time
    lastPlayTimeRef.current = now;

    // Play the sound
    return basePlaySound();
  }, [basePlaySound, throttleMs]);

  return {
    playSound,
    isSupported,
    isPlaying,
  };
};

export default useNewMessageSound;

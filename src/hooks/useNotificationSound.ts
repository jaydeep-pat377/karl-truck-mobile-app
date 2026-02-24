import { useEffect, useRef, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import Sound from 'react-native-sound';

// Enable playback in silence mode (iOS)
Sound.setCategory('Playback');

interface UseNotificationSoundOptions {
  /** Enable/disable sound playback */
  enabled?: boolean;
  /** Volume level (0 to 1) */
  volume?: number;
}

interface UseNotificationSoundReturn {
  /** Plays the notification sound, returns success status */
  playSound: () => Promise<boolean>;
  /** Whether the sound system is supported/ready */
  isSupported: boolean;
  /** Whether sound is currently playing */
  isPlaying: boolean;
}

/**
 * Base hook for playing notification sounds
 */
export const useNotificationSound = (
  options: UseNotificationSoundOptions = {}
): UseNotificationSoundReturn => {
  const { enabled = true, volume = 1.0 } = options;

  const soundRef = useRef<Sound | null>(null);
  const isLoadedRef = useRef(false);
  const [isSupported, setIsSupported] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // Initialize sound on mount
  useEffect(() => {
    // Sound file paths:
    // Android: android/app/src/main/res/raw/message_notification_sound.mp3
    //          (referenced WITHOUT extension)
    // iOS: added to Xcode project bundle (with extension)
    const soundFile = Platform.OS === 'android'
      ? 'message_notification_sound'  // No extension for Android!
      : 'message-notification-sound.mp3';

    console.log('[useNotificationSound] Loading sound file:', soundFile);

    soundRef.current = new Sound(
      soundFile,
      Sound.MAIN_BUNDLE,
      (error) => {
        if (error) {
          console.warn('[useNotificationSound] Failed to load sound:', error.message || error);
          setIsSupported(false);
          isLoadedRef.current = false;
          return;
        }

        console.log('[useNotificationSound] Sound loaded successfully!');
        console.log('[useNotificationSound] Duration:', soundRef.current?.getDuration(), 'seconds');
        setIsSupported(true);
        isLoadedRef.current = true;

        // Set volume to max
        soundRef.current?.setVolume(volume);
      }
    );

    // Cleanup on unmount
    return () => {
      if (soundRef.current) {
        soundRef.current.stop();
        soundRef.current.release();
        soundRef.current = null;
        isLoadedRef.current = false;
      }
    };
  }, []);

  // Update volume when it changes
  useEffect(() => {
    if (soundRef.current && isLoadedRef.current) {
      soundRef.current.setVolume(volume);
    }
  }, [volume]);

  const playSound = useCallback(async (): Promise<boolean> => {
    console.log('[useNotificationSound] playSound called');
    console.log('[useNotificationSound] isLoaded:', isLoadedRef.current);
    console.log('[useNotificationSound] enabled:', enabled);
    console.log('[useNotificationSound] soundRef:', !!soundRef.current);

    if (!enabled) {
      console.log('[useNotificationSound] Sound disabled, skipping');
      return false;
    }

    if (!soundRef.current || !isLoadedRef.current) {
      console.log('[useNotificationSound] Sound not loaded yet, skipping');
      return false;
    }

    return new Promise((resolve) => {
      try {
        setIsPlaying(true);

        // Stop any current playback and reset to beginning
        soundRef.current?.stop(() => {
          soundRef.current?.setCurrentTime(0);

          soundRef.current?.play((success) => {
            setIsPlaying(false);

            if (success) {
              console.log('[useNotificationSound] Sound played successfully!');
              resolve(true);
            } else {
              console.warn('[useNotificationSound] Playback failed');
              resolve(false);
            }
          });
        });
      } catch (error) {
        console.warn('[useNotificationSound] Playback error:', error);
        setIsPlaying(false);
        resolve(false);
      }
    });
  }, [enabled]);

  return {
    playSound,
    isSupported,
    isPlaying,
  };
};

export default useNotificationSound;

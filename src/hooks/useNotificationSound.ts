import { useEffect, useRef, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import Sound from 'react-native-sound';

Sound.setCategory('Playback');

interface UseNotificationSoundOptions {
  enabled?: boolean;
  volume?: number;
}

interface UseNotificationSoundReturn {
  playSound: () => Promise<boolean>;
  isSupported: boolean;
  isPlaying: boolean;
}

export const useNotificationSound = (
  options: UseNotificationSoundOptions = {}
): UseNotificationSoundReturn => {
  const { enabled = true, volume = 1.0 } = options;
  const soundRef = useRef<Sound | null>(null);
  const isLoadedRef = useRef(false);
  const [isSupported, setIsSupported] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const soundFile = Platform.OS === 'android'
      ? 'message_notification_sound'
      : 'message-notification-sound.mp3';

    soundRef.current = new Sound(
      soundFile,
      Sound.MAIN_BUNDLE,
      (error) => {
        if (error) {
          setIsSupported(false);
          isLoadedRef.current = false;
          return;
        }
        setIsSupported(true);
        isLoadedRef.current = true;


        soundRef.current?.setVolume(volume);
      }
    );

    return () => {
      if (soundRef.current) {
        soundRef.current.stop();
        soundRef.current.release();
        soundRef.current = null;
        isLoadedRef.current = false;
      }
    };
  }, []);

  useEffect(() => {
    if (soundRef.current && isLoadedRef.current) {
      soundRef.current.setVolume(volume);
    }
  }, [volume]);

  const playSound = useCallback(async (): Promise<boolean> => {
    if (!enabled) {
      return false;
    }

    if (!soundRef.current || !isLoadedRef.current) {
      return false;
    }

    return new Promise((resolve) => {
      try {
        setIsPlaying(true);
        soundRef.current?.stop(() => {
          soundRef.current?.setCurrentTime(0);
          soundRef.current?.play((success) => {
            setIsPlaying(false);

            if (success) {
              resolve(true);
            } else {
              resolve(false);
            }
          });
        });
      } catch (error) {
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

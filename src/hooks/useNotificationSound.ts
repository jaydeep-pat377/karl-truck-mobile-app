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

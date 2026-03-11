import { Platform } from 'react-native';
import Sound from 'react-native-sound';

Sound.setCategory('Playback');

let messageSound: Sound | null = null;
let isLoaded = false;
let isInitializing = false;
let lastPlayTime = 0;

const THROTTLE_MS = 2000;

export const initMessageSound = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (isLoaded && messageSound) {
      resolve(true);
      return;
    }

    if (isInitializing) {
      resolve(false);
      return;
    }

    isInitializing = true;

    const soundFile = Platform.OS === 'android'
      ? 'message_notification_sound'
      : 'message-notification-sound.mp3';


    messageSound = new Sound(soundFile, Sound.MAIN_BUNDLE, (error) => {
      isInitializing = false;

      if (error) {
        isLoaded = false;
        resolve(false);
        return;
      }
      messageSound?.setVolume(1.0);
      isLoaded = true;
      resolve(true);
    });
  });
};

export const playMessageSound = (): boolean => {
  const now = Date.now();

  if (now - lastPlayTime < THROTTLE_MS) {

    return false;
  }

  if (!isLoaded || !messageSound) {
    initMessageSound().then((success) => {
      if (success) {
        playMessageSound();
      }
    });
    return false;
  }

  lastPlayTime = now;

  try {
    messageSound.stop(() => {
      messageSound?.setCurrentTime(0);
      messageSound?.play((success) => {
        if (success) {
          console.log('[NotificationSound] Played successfully!');
        } else {
          console.warn('[NotificationSound] Playback failed');
        }
      });
    });
    return true;
  } catch (error) {
    console.error('[NotificationSound] Error during play:', error);
    return false;
  }
};

export const releaseMessageSound = (): void => {
  if (messageSound) {
    messageSound.stop();
    messageSound.release();
    messageSound = null;
    isLoaded = false;
  }
};

export const isSoundReady = (): boolean => isLoaded && messageSound !== null;

export default {
  init: initMessageSound,
  play: playMessageSound,
  release: releaseMessageSound,
  isReady: isSoundReady,
};

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
      console.log('[NotificationSound] Already loaded');
      resolve(true);
      return;
    }

    if (isInitializing) {
      console.log('[NotificationSound] Already initializing...');
      resolve(false);
      return;
    }

    isInitializing = true;

    const soundFile = Platform.OS === 'android'
      ? 'message_notification_sound'
      : 'message-notification-sound.mp3';

    console.log('[NotificationSound] Loading:', soundFile);

    console.log('[NotificationSound] Creating Sound instance...');
    console.log('[NotificationSound] Platform:', Platform.OS);
    console.log('[NotificationSound] File:', soundFile);
    console.log('[NotificationSound] Bundle:', Sound.MAIN_BUNDLE);

    messageSound = new Sound(soundFile, Sound.MAIN_BUNDLE, (error) => {
      isInitializing = false;

      if (error) {
        console.error('[NotificationSound] FAILED to load!');
        console.error('[NotificationSound] Error:', JSON.stringify(error));
        console.error('[NotificationSound] Error message:', error.message || 'No message');
        isLoaded = false;
        resolve(false);
        return;
      }

      console.log('[NotificationSound] SUCCESS - Loaded!');
      console.log('[NotificationSound] Duration:', messageSound?.getDuration(), 'sec');
      console.log('[NotificationSound] Volume:', messageSound?.getVolume());
      console.log('[NotificationSound] Number of channels:', messageSound?.getNumberOfChannels());
      messageSound?.setVolume(1.0);
      isLoaded = true;
      resolve(true);
    });
  });
};

export const playMessageSound = (): boolean => {
  console.log('[NotificationSound] playMessageSound() called');
  const now = Date.now();

  if (now - lastPlayTime < THROTTLE_MS) {
    console.log('[NotificationSound] Throttled - last play was', now - lastPlayTime, 'ms ago');
    return false;
  }

  if (!isLoaded || !messageSound) {
    console.log('[NotificationSound] Not loaded yet, isLoaded:', isLoaded, 'messageSound:', !!messageSound);
    console.log('[NotificationSound] Attempting to load...');
    initMessageSound().then((success) => {
      console.log('[NotificationSound] Load attempt result:', success);
      if (success) {
        console.log('[NotificationSound] Retrying play after load...');
        playMessageSound();
      }
    });
    return false;
  }

  lastPlayTime = now;
  console.log('[NotificationSound] About to play, sound duration:', messageSound.getDuration());

  try {
    console.log('[NotificationSound] Stopping any current playback...');
    messageSound.stop(() => {
      console.log('[NotificationSound] Stopped, resetting to start...');
      messageSound?.setCurrentTime(0);
      console.log('[NotificationSound] Playing now...');
      messageSound?.play((success) => {
        if (success) {
          console.log('[NotificationSound] ✅ Played successfully!');
        } else {
          console.warn('[NotificationSound] ❌ Playback failed');
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

import Sound from 'react-native-sound';
import { Platform, Vibration } from 'react-native';
import notifee, { AndroidImportance } from '@notifee/react-native';

Sound.setCategory('Playback');

let notificationSound: Sound | null = null;
let soundInitialized = false;
let soundLoadFailed = false;

const CHANNEL_ID = 'chat_message_sound';

const createSoundChannel = async (): Promise<void> => {
  if (Platform.OS === 'android') {
    await notifee.createChannel({
      id: CHANNEL_ID,
      name: 'Chat Messages',
      importance: AndroidImportance.HIGH,
      sound: 'default',
      vibration: true,
      vibrationPattern: [300, 500],
    });
  }
};

export const initNotificationSound = (): Promise<void> => {
  return new Promise((resolve) => {
    createSoundChannel().catch(console.warn);
    const soundFile = Platform.OS === 'android'
      ? 'message_notification_sound.mp3'
      : 'message-notification-sound.mp3';

    notificationSound = new Sound(
      soundFile,
      Sound.MAIN_BUNDLE,
      (error) => {
        if (error) {
          console.warn('[Sound] Custom sound file not found, will use system notification sound');
          soundLoadFailed = true;
          soundInitialized = true;
          resolve();
          return;
        }
        console.log('[Sound] Notification sound loaded successfully');
        soundInitialized = true;
        soundLoadFailed = false;
        resolve();
      }
    );
  });
};

const playSystemNotificationSound = async (): Promise<void> => {
  try {
    console.log('[Sound] Playing system notification sound via Notifee');

    Vibration.vibrate(200);

    const notificationId = await notifee.displayNotification({
      title: 'New Message',
      body: 'You have a new chat message',
      android: {
        channelId: CHANNEL_ID,
        importance: AndroidImportance.HIGH,
        smallIcon: 'ic_launcher',
        sound: 'default',
        autoCancel: true,
        pressAction: { id: 'default' },
      },
      ios: {
        sound: 'default',
      },
    });

    setTimeout(() => {
      notifee.cancelNotification(notificationId).catch(() => { });
    }, 3000);
  } catch (error) {
    console.warn('[Sound] Failed to play system sound:', error);
    Vibration.vibrate(200);
  }
};

export const playNotificationSound = (): void => {
  console.log('[Sound] playNotificationSound called');

  if (soundLoadFailed || !notificationSound) {
    console.log('[Sound] Using system notification fallback');
    playSystemNotificationSound();
    return;
  }

  try {
    notificationSound.stop(() => {
      notificationSound?.play((success) => {
        if (!success) {
          console.warn('[Sound] Custom sound playback failed, using fallback');
          playSystemNotificationSound();
        } else {
          console.log('[Sound] Custom sound played successfully');
          Vibration.vibrate(200);
        }
      });
    });
  } catch (error) {
    console.warn('[Sound] Error playing sound:', error);
    playSystemNotificationSound();
  }
};

export const playNotificationSoundOnly = (): void => {
  console.log('[Sound] playNotificationSoundOnly called');

  if (soundLoadFailed || !notificationSound) {
    console.log('[Sound] No custom sound, vibrating');
    Vibration.vibrate([0, 200, 100, 200]);
    return;
  }

  try {
    notificationSound.stop(() => {
      notificationSound?.play((success) => {
        if (success) {
          Vibration.vibrate(200);
        } else {
          Vibration.vibrate([0, 200, 100, 200]);
        }
      });
    });
  } catch (error) {
    Vibration.vibrate([0, 200, 100, 200]);
  }
};

export const releaseNotificationSound = (): void => {
  if (notificationSound) {
    notificationSound.release();
    notificationSound = null;
  }
  soundInitialized = false;
  soundLoadFailed = false;
};

export default {
  initNotificationSound,
  playNotificationSound,
  playNotificationSoundOnly,
  releaseNotificationSound,
};

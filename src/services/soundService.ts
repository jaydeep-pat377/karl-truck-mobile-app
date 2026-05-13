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
          soundLoadFailed = true;
          soundInitialized = true;
          resolve();
          return;
        }
        soundInitialized = true;
        soundLoadFailed = false;
        resolve();
      }
    );
  });
};

const playSystemNotificationSound = async (): Promise<void> => {
  try {
    Vibration.vibrate(200);

    const notificationId = await notifee.displayNotification({
      title: 'New Message',
      body: 'You have a new chat message',
      android: {
        channelId: CHANNEL_ID,
        importance: AndroidImportance.HIGH,
        smallIcon: 'ic_notification',
        color: '#6BB130',
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
    Vibration.vibrate(200);
  }
};

export const playNotificationSound = (): void => {
  if (soundLoadFailed || !notificationSound) {
    playSystemNotificationSound();
    return;
  }

  try {
    notificationSound.stop(() => {
      notificationSound?.play((success) => {
        if (!success) {
          playSystemNotificationSound();
        } else {
          Vibration.vibrate(200);
        }
      });
    });
  } catch (error) {
    playSystemNotificationSound();
  }
};

export const playNotificationSoundOnly = (): void => {
  if (soundLoadFailed || !notificationSound) {
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

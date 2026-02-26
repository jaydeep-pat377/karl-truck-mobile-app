import Sound from 'react-native-sound';
import { Platform, Vibration } from 'react-native';
import notifee, { AndroidImportance } from '@notifee/react-native';

// Enable playback in silence mode (iOS)
Sound.setCategory('Playback');

let notificationSound: Sound | null = null;
let soundInitialized = false;
let soundLoadFailed = false;

const CHANNEL_ID = 'chat_message_sound';

/**
 * Create notification channel for chat sounds
 */
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

/**
 * Initialize the notification sound
 * Call this once when the app starts
 */
export const initNotificationSound = (): Promise<void> => {
  return new Promise((resolve) => {
    // Create notification channel first
    createSoundChannel().catch(console.warn);

    // On Android, the file should be in android/app/src/main/res/raw/message_notification_sound.mp3
    // On iOS, the file should be added to the Xcode project bundle
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
          resolve(); // Don't reject - we have a fallback
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

/**
 * Play sound using system notification (fallback method)
 */
const playSystemNotificationSound = async (): Promise<void> => {
  try {
    console.log('[Sound] Playing system notification sound via Notifee');

    // Vibrate the device
    Vibration.vibrate(200);

    // Display a notification with sound that auto-dismisses
    const notificationId = await notifee.displayNotification({
      title: 'New Message',
      body: 'You have a new chat message',
      android: {
        channelId: CHANNEL_ID,
        importance: AndroidImportance.HIGH,
        smallIcon: 'ic_launcher',
        sound: 'default',
        autoCancel: true,
        // Make it a heads-up notification
        pressAction: { id: 'default' },
      },
      ios: {
        sound: 'default',
      },
    });

    // Auto-dismiss after 3 seconds
    setTimeout(() => {
      notifee.cancelNotification(notificationId).catch(() => {});
    }, 3000);
  } catch (error) {
    console.warn('[Sound] Failed to play system sound:', error);
    // At least vibrate
    Vibration.vibrate(200);
  }
};

/**
 * Play the message notification sound
 */
export const playNotificationSound = (): void => {
  console.log('[Sound] playNotificationSound called');

  // If sound file failed to load, use system notification
  if (soundLoadFailed || !notificationSound) {
    console.log('[Sound] Using system notification fallback');
    playSystemNotificationSound();
    return;
  }

  // Try to play custom sound
  try {
    notificationSound.stop(() => {
      notificationSound?.play((success) => {
        if (!success) {
          console.warn('[Sound] Custom sound playback failed, using fallback');
          playSystemNotificationSound();
        } else {
          console.log('[Sound] Custom sound played successfully');
          // Also vibrate for better UX
          Vibration.vibrate(200);
        }
      });
    });
  } catch (error) {
    console.warn('[Sound] Error playing sound:', error);
    playSystemNotificationSound();
  }
};

/**
 * Play notification sound without showing notification (vibrate only fallback)
 */
export const playNotificationSoundOnly = (): void => {
  console.log('[Sound] playNotificationSoundOnly called');

  if (soundLoadFailed || !notificationSound) {
    // Just vibrate if no custom sound
    console.log('[Sound] No custom sound, vibrating');
    Vibration.vibrate([0, 200, 100, 200]); // Pattern vibration
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

/**
 * Release the sound resources
 * Call this when the app is being terminated
 */
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

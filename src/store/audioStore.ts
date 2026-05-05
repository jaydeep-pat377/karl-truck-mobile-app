import { AppState, AppStateStatus } from 'react-native';
import { create } from 'zustand';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';

const player = AudioRecorderPlayer;

export type PlaybackStatus = 'idle' | 'playing' | 'paused' | 'loading';

interface AudioState {
  currentUrl: string | null;
  status: PlaybackStatus;
  position: number;
  duration: number;
  // Actions
  play: (url: string) => Promise<void>;
  stop: () => Promise<void>;
  cleanup: () => void;
}

// Guard against rapid taps — ignore play/stop calls while one is in progress
let actionLock = false;

// Internal stop — no lock check, used by play() and cleanup()
const forceStop = async () => {
  try {
    await player.stopPlayer();
  } catch {}
  try {
    player.removePlayBackListener();
  } catch {}
};

export const useAudioStore = create<AudioState>((set, get) => ({
  currentUrl: null,
  status: 'idle',
  position: 0,
  duration: 0,

  play: async (url: string) => {
    if (actionLock) return;
    actionLock = true;

    try {
      const { currentUrl, status } = get();

      // Same audio tapped again → stop it (toggle)
      if (currentUrl === url && (status === 'playing' || status === 'loading')) {
        await forceStop();
        set({ currentUrl: null, status: 'idle', position: 0, duration: 0 });
        return;
      }

      // Different audio or replaying → stop whatever is playing first
      if (status === 'playing' || status === 'loading') {
        await forceStop();
      }

      set({ currentUrl: url, status: 'loading', position: 0, duration: 0 });

      await player.startPlayer(url);
      set({ status: 'playing' });

      player.addPlayBackListener((e) => {
        const pos = e.currentPosition;
        const dur = e.duration;

        if (dur > 0) {
          set({ position: pos, duration: dur });
        }

        // Playback finished
        if (pos >= dur - 100) {
          player.stopPlayer().catch(() => {});
          try { player.removePlayBackListener(); } catch {}
          set({ currentUrl: null, status: 'idle', position: 0, duration: 0 });
        }
      });
    } catch {
      set({ currentUrl: null, status: 'idle', position: 0, duration: 0 });
    } finally {
      actionLock = false;
    }
  },

  stop: async () => {
    if (actionLock) return;
    actionLock = true;

    try {
      await forceStop();
    } finally {
      set({ currentUrl: null, status: 'idle', position: 0, duration: 0 });
      actionLock = false;
    }
  },

  cleanup: () => {
    try {
      player.stopPlayer().catch(() => {});
    } catch {}
    try {
      player.removePlayBackListener();
    } catch {}
    set({ currentUrl: null, status: 'idle', position: 0, duration: 0 });
    actionLock = false;
  },
}));

// ── Global listeners (run once at module load) ──

// Stop audio when app goes to background / is killed
AppState.addEventListener('change', (state: AppStateStatus) => {
  if (state !== 'active') {
    const { status, cleanup } = useAudioStore.getState();
    if (status === 'playing' || status === 'loading') {
      cleanup();
    }
  }
});

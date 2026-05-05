// TEMPORARY STUB — restores app boot when react-native-audio-recorder-player's
// Nitro autolink is broken. Voice playback / recording silently no-op while
// this stub is in use. To restore: revert the imports in audioStore.ts +
// MessageInput.tsx back to 'react-native-audio-recorder-player' and fix the
// Nitro autolink (or migrate to react-native-nitro-sound, which has the same
// API but works under the new architecture).

type PlayBackEvent = { currentPosition: number; duration: number };
type RecordBackEvent = { currentPosition: number; currentMetering?: number };

const noop = () => {};
const noopAsync = async () => '';

const stub = {
  startPlayer: async (_url?: string) => '',
  stopPlayer: noopAsync,
  pausePlayer: noopAsync,
  resumePlayer: noopAsync,
  seekToPlayer: async (_ms: number) => '',
  setVolume: async (_v: number) => '',
  addPlayBackListener: (_cb: (e: PlayBackEvent) => void) => {},
  removePlayBackListener: noop,

  startRecorder: async (
    _path?: string,
    _audioSet?: unknown,
    _meteringEnabled?: boolean,
  ) => '',
  stopRecorder: noopAsync,
  pauseRecorder: noopAsync,
  resumeRecorder: noopAsync,
  addRecordBackListener: (_cb: (e: RecordBackEvent) => void) => {},
  removeRecordBackListener: noop,

  mmssss: (_ms: number) => '00:00:00',
  mmss: (_ms: number) => '00:00',
};

export default stub;

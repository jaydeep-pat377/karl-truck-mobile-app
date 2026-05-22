import { Platform } from 'react-native';

export const PG = {
  bg: '#f6f6f4',
  surface: '#ffffff',
  surface2: '#fbfbf9',
  line: '#e7e5e0',
  lineStrong: '#d9d6cf',
  ink: '#16140f',
  ink2: '#4a463d',
  ink3: '#8a857a',
  ink4: '#b8b3a7',

  pre: '#c47914',
  proc: '#2563a8',
  done: '#2f8a4a',
  cancel: '#8a857a',
  bad: '#b8331f',
  ok: '#2f8a4a',
  warn: '#c47914',
  info: '#2563a8',
  neutral: '#6b7280',

  preTint: '#faf0dc',
  procTint: '#e3eef9',
  doneTint: '#e9f3ec',
  cancelTint: '#ececec',
  badTint: '#fae6e1',
  okTint: '#e9f3ec',
  warnTint: '#faf0dc',
  infoTint: '#e3eef9',
  neutralTint: '#ececec',

  stLoading: '#ff9800',
  stTojob: '#8bc34a',
  stAtjob: '#4caf50',
  stPouring: '#009688',
  stPoured: '#00796b',
  stWashing: '#1976d2',
  stToplant: '#42a5f5',
  stAtplant: '#1565c0',
} as const;

export const STAGE_COLOR: Record<string, string> = {
  loading: PG.stLoading,
  to_job: PG.stTojob,
  at_job: PG.stAtjob,
  pouring: PG.stPouring,
  poured: PG.stPoured,
  washing: PG.stWashing,
  to_plant: PG.stToplant,
  at_plant: PG.stAtplant,
};

export const PG_FONT = {
  serif: Platform.select({
    ios: 'Georgia',
    android: 'serif',
    default: 'Georgia',
  }) as string,
  sans: Platform.select({
    ios: 'System',
    android: 'sans-serif',
    default: 'System',
  }) as string,
  mono: Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    default: 'Menlo',
  }) as string,
};

export const tnum = { fontVariant: ['tabular-nums'] as const };



import { colors } from '../theme/colors';

export type NormalizedStatus =
  | 'NORMAL'
  | 'PRE_POUR'
  | 'IN_PROCESS'
  | 'COMPLETED'
  | 'WILL_CALL'
  | 'WAIT_LIST'
  | 'HOLD'
  | 'CANCELLED'
  | 'DELAYED'
  | 'WEATHER_PERMITTING'
  | 'ENRT'
  | 'ONSIT';

const STATUS_NORMALIZATION_MAP: Record<string, NormalizedStatus> = {

  'normal': 'NORMAL',
  'NORMAL': 'NORMAL',
  'Normal': 'NORMAL',


  'pre_pour': 'PRE_POUR',
  'PRE_POUR': 'PRE_POUR',
  'Pre-Pour': 'PRE_POUR',
  'pre-pour': 'PRE_POUR',
  'Pre Pour': 'PRE_POUR',
  'pre pour': 'PRE_POUR',
  'prepour': 'PRE_POUR',
  'pending': 'PRE_POUR',


  'in_process': 'IN_PROCESS',
  'IN_PROCESS': 'IN_PROCESS',
  'In Progress': 'IN_PROCESS',
  'in progress': 'IN_PROCESS',
  'inprogress': 'IN_PROCESS',
  'InProgress': 'IN_PROCESS',


  'completed': 'COMPLETED',
  'COMPLETED': 'COMPLETED',
  'Completed': 'COMPLETED',


  'will_call': 'WILL_CALL',
  'WILL_CALL': 'WILL_CALL',
  'Will Call': 'WILL_CALL',
  'will call': 'WILL_CALL',
  'willcall': 'WILL_CALL',
  'WillCall': 'WILL_CALL',


  'wait_list': 'WAIT_LIST',
  'WAIT_LIST': 'WAIT_LIST',
  'Wait List': 'WAIT_LIST',
  'wait list': 'WAIT_LIST',
  'waitlist': 'WAIT_LIST',
  'Waitlist': 'WAIT_LIST',
  'WaitList': 'WAIT_LIST',


  'hold': 'HOLD',
  'HOLD': 'HOLD',
  'Hold': 'HOLD',
  'on_hold': 'HOLD',
  'ON_HOLD': 'HOLD',
  'On Hold': 'HOLD',
  'on hold': 'HOLD',
  'hold_delivery': 'HOLD',
  'Hold Delivery': 'HOLD',
  'hold delivery': 'HOLD',
  'HoldDelivery': 'HOLD',


  'cancelled': 'CANCELLED',
  'CANCELLED': 'CANCELLED',
  'Cancelled': 'CANCELLED',
  'canceled': 'CANCELLED',
  'CANCELED': 'CANCELLED',
  'Canceled': 'CANCELLED',


  'delayed': 'DELAYED',
  'DELAYED': 'DELAYED',
  'Delayed': 'DELAYED',


  'weather_permitting': 'WEATHER_PERMITTING',
  'WEATHER_PERMITTING': 'WEATHER_PERMITTING',
  'Weather Permitting': 'WEATHER_PERMITTING',
  'weather permitting': 'WEATHER_PERMITTING',
  'weatherpermitting': 'WEATHER_PERMITTING',


  'enrt': 'ENRT',
  'ENRT': 'ENRT',
  'en route': 'ENRT',
  'En Route': 'ENRT',


  'onsit': 'ONSIT',
  'ONSIT': 'ONSIT',
  'on site': 'ONSIT',
  'On Site': 'ONSIT',
};

const STATUS_COLOR_MAP: Record<NormalizedStatus, string> = {
  NORMAL: colors.success.main,
  PRE_POUR: colors.success.main,
  IN_PROCESS: colors.success.main,
  COMPLETED: colors.success.main,
  WILL_CALL: colors.warning.main,
  WAIT_LIST: colors.grey[50],
  WEATHER_PERMITTING: colors.info.main,
  HOLD: colors.error.main,
  CANCELLED: colors.error.main,
  DELAYED: colors.error.main,
  ENRT: colors.status?.enRoute || colors.info.main,
  ONSIT: colors.status?.onSite || colors.info.main,
};

const STATUS_LABEL_MAP: Record<NormalizedStatus, string> = {
  NORMAL: 'Normal',
  PRE_POUR: 'Pre-Pour',
  IN_PROCESS: 'In Progress',
  COMPLETED: 'Completed',
  WILL_CALL: 'Will Call',
  WAIT_LIST: 'Wait List',
  WEATHER_PERMITTING: 'Weather',
  HOLD: 'On Hold',
  CANCELLED: 'Cancelled',
  DELAYED: 'Delayed',
  ENRT: 'En Route',
  ONSIT: 'On Site',
};

const DEFAULT_STATUS_COLOR = colors.secondary.main;

export const normalizeStatus = (status: string): NormalizedStatus => {
  if (!status) return 'NORMAL';


  const normalized = STATUS_NORMALIZATION_MAP[status];
  if (normalized) return normalized;


  const lowerStatus = status.toLowerCase();
  const normalizedLower = STATUS_NORMALIZATION_MAP[lowerStatus];
  if (normalizedLower) return normalizedLower;


  const trimmed = status.trim().toLowerCase().replace(/[\s_-]+/g, '_');
  const normalizedTrimmed = STATUS_NORMALIZATION_MAP[trimmed];
  if (normalizedTrimmed) return normalizedTrimmed;


  return 'NORMAL';
};

export const getStatusColor = (status: string, progress?: number): string => {
  const normalized = normalizeStatus(status);


  if (normalized === 'IN_PROCESS') {
    return colors.success.main;
  }


  if (normalized === 'COMPLETED') {
    return colors.success.main;
  }

  const color = STATUS_COLOR_MAP[normalized] || DEFAULT_STATUS_COLOR;
  return color;
};

export const getProgressBarColor = (status: string, progress?: number): string => {
  const normalized = normalizeStatus(status);


  if ((normalized === 'IN_PROCESS' || normalized === 'COMPLETED') && progress !== undefined) {
    return getPerformanceColor(progress);
  }


  return STATUS_COLOR_MAP[normalized] || DEFAULT_STATUS_COLOR;
};

export const getStatusLabel = (status: string): string => {
  const normalized = normalizeStatus(status);
  return STATUS_LABEL_MAP[normalized] || status;
};

export const getPerformanceColor = (progress: number): string => {
  if (progress >= 90) {
    return colors.success.main;
  } else if (progress >= 60) {
    return colors.warning.main;
  } else {
    return colors.error.main;
  }
};

export const isPerformanceBasedStatus = (status: string): boolean => {
  const normalized = normalizeStatus(status);
  return normalized === 'IN_PROCESS' || normalized === 'COMPLETED';
};

export { STATUS_COLOR_MAP, STATUS_LABEL_MAP, DEFAULT_STATUS_COLOR };

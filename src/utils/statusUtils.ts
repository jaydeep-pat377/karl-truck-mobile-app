/**
 * Status Utilities - Single Source of Truth for Order Status Colors and Labels
 *
 * This file centralizes all status-related logic to ensure consistency
 * across OrderListScreen, OrderDetailsScreen, OrderCard, and any other components.
 */

import { colors } from '../theme/colors';

// Normalized status types
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

// Status to normalized format mapping
const STATUS_NORMALIZATION_MAP: Record<string, NormalizedStatus> = {
  // Normal
  'normal': 'NORMAL',
  'NORMAL': 'NORMAL',
  'Normal': 'NORMAL',

  // Pre-Pour
  'pre_pour': 'PRE_POUR',
  'PRE_POUR': 'PRE_POUR',
  'Pre-Pour': 'PRE_POUR',
  'pre-pour': 'PRE_POUR',
  'Pre Pour': 'PRE_POUR',
  'pre pour': 'PRE_POUR',
  'prepour': 'PRE_POUR',
  'pending': 'PRE_POUR',

  // In Progress
  'in_process': 'IN_PROCESS',
  'IN_PROCESS': 'IN_PROCESS',
  'In Progress': 'IN_PROCESS',
  'in progress': 'IN_PROCESS',
  'inprogress': 'IN_PROCESS',
  'InProgress': 'IN_PROCESS',

  // Completed
  'completed': 'COMPLETED',
  'COMPLETED': 'COMPLETED',
  'Completed': 'COMPLETED',

  // Will Call
  'will_call': 'WILL_CALL',
  'WILL_CALL': 'WILL_CALL',
  'Will Call': 'WILL_CALL',
  'will call': 'WILL_CALL',
  'willcall': 'WILL_CALL',
  'WillCall': 'WILL_CALL',

  // Wait List
  'wait_list': 'WAIT_LIST',
  'WAIT_LIST': 'WAIT_LIST',
  'Wait List': 'WAIT_LIST',
  'wait list': 'WAIT_LIST',
  'waitlist': 'WAIT_LIST',
  'Waitlist': 'WAIT_LIST',
  'WaitList': 'WAIT_LIST',

  // Hold
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

  // Cancelled
  'cancelled': 'CANCELLED',
  'CANCELLED': 'CANCELLED',
  'Cancelled': 'CANCELLED',
  'canceled': 'CANCELLED',
  'CANCELED': 'CANCELLED',
  'Canceled': 'CANCELLED',

  // Delayed
  'delayed': 'DELAYED',
  'DELAYED': 'DELAYED',
  'Delayed': 'DELAYED',

  // Weather Permitting
  'weather_permitting': 'WEATHER_PERMITTING',
  'WEATHER_PERMITTING': 'WEATHER_PERMITTING',
  'Weather Permitting': 'WEATHER_PERMITTING',
  'weather permitting': 'WEATHER_PERMITTING',
  'weatherpermitting': 'WEATHER_PERMITTING',

  // En Route
  'enrt': 'ENRT',
  'ENRT': 'ENRT',
  'en route': 'ENRT',
  'En Route': 'ENRT',

  // On Site
  'onsit': 'ONSIT',
  'ONSIT': 'ONSIT',
  'on site': 'ONSIT',
  'On Site': 'ONSIT',
};

// Normalized status to color mapping
const STATUS_COLOR_MAP: Record<NormalizedStatus, string> = {
  NORMAL: colors.success.main,           // Green
  PRE_POUR: colors.success.main,         // Green
  IN_PROCESS: colors.success.main,       // Green (default, can be dynamic)
  COMPLETED: colors.success.main,        // Green (default, can be dynamic)
  WILL_CALL: '#EAB308',                  // Yellow
  WAIT_LIST: colors.grey[50],            // Gray
  WEATHER_PERMITTING: colors.info.main,  // Blue
  HOLD: colors.error.main,               // Red
  CANCELLED: colors.error.main,          // Red
  DELAYED: colors.error.main,            // Red
  ENRT: colors.status?.enRoute || colors.info.main,
  ONSIT: colors.status?.onSite || colors.info.main,
};

// Normalized status to display label mapping
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

// Default fallback color
const DEFAULT_STATUS_COLOR = colors.secondary.main;

/**
 * Normalize any status string to a standard uppercase format
 * @param status - The status string in any format
 * @returns Normalized status string
 */
export const normalizeStatus = (status: string): NormalizedStatus => {
  if (!status) return 'NORMAL';

  // First try direct lookup
  const normalized = STATUS_NORMALIZATION_MAP[status];
  if (normalized) return normalized;

  // Try lowercase lookup
  const lowerStatus = status.toLowerCase();
  const normalizedLower = STATUS_NORMALIZATION_MAP[lowerStatus];
  if (normalizedLower) return normalizedLower;

  // Try trimmed and normalized string
  const trimmed = status.trim().toLowerCase().replace(/[\s_-]+/g, '_');
  const normalizedTrimmed = STATUS_NORMALIZATION_MAP[trimmed];
  if (normalizedTrimmed) return normalizedTrimmed;

  // Default fallback
  return 'NORMAL';
};

/**
 * Get the color for a status, with optional performance-based color for COMPLETED
 * @param status - The status string in any format
 * @param progress - Optional progress percentage for performance-based coloring (only for COMPLETED)
 * @returns Color string
 */
export const getStatusColor = (status: string, progress?: number): string => {
  const normalized = normalizeStatus(status);

  // IN_PROCESS always shows green for label/shadow
  if (normalized === 'IN_PROCESS') {
    return colors.success.main;
  }

  // COMPLETED always shows green for label/shadow
  if (normalized === 'COMPLETED') {
    return colors.success.main;
  }

  const color = STATUS_COLOR_MAP[normalized] || DEFAULT_STATUS_COLOR;
  return color;
};

/**
 * Get progress bar color based on status and progress
 * For IN_PROCESS and COMPLETED: ≥90% → Green, 60%-<90% → Yellow, <60% → Red
 * For other statuses: Use status-based color
 * @param status - The status string
 * @param progress - Progress percentage (0-100)
 * @returns Color string for progress bar
 */
export const getProgressBarColor = (status: string, progress?: number): string => {
  const normalized = normalizeStatus(status);

  // For IN_PROCESS and COMPLETED, use performance-based color
  if ((normalized === 'IN_PROCESS' || normalized === 'COMPLETED') && progress !== undefined) {
    return getPerformanceColor(progress);
  }

  // For other statuses, use status-based color
  return STATUS_COLOR_MAP[normalized] || DEFAULT_STATUS_COLOR;
};

/**
 * Get the display label for a status
 * @param status - The status string in any format
 * @returns Display label string
 */
export const getStatusLabel = (status: string): string => {
  const normalized = normalizeStatus(status);
  return STATUS_LABEL_MAP[normalized] || status;
};

/**
 * Get performance-based color
 * ≥90% → Green, 60%-<90% → Yellow, <60% → Red
 * @param progress - Progress percentage (0-100)
 * @returns Color string
 */
export const getPerformanceColor = (progress: number): string => {
  if (progress >= 90) {
    return colors.success.main;  // Green
  } else if (progress >= 60) {
    return colors.warning.main;  // Yellow
  } else {
    return colors.error.main;    // Red
  }
};

/**
 * Check if a status uses performance-based coloring
 * @param status - The status string
 * @returns Boolean indicating if performance coloring applies
 */
export const isPerformanceBasedStatus = (status: string): boolean => {
  const normalized = normalizeStatus(status);
  return normalized === 'IN_PROCESS' || normalized === 'COMPLETED';
};

// Export the color map for backward compatibility
export { STATUS_COLOR_MAP, STATUS_LABEL_MAP, DEFAULT_STATUS_COLOR };

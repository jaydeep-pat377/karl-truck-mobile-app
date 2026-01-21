/**
 * Responsive Utilities
 * Handles responsive scaling and device breakpoints for consistent UI across all devices
 */

import { Dimensions, Platform, PixelRatio } from 'react-native';
import {
  scale,
  verticalScale,
  moderateScale,
  moderateVerticalScale,
} from 'react-native-size-matters';

// Re-export size-matters functions
export { scale, verticalScale, moderateScale, moderateVerticalScale };

// Shorthand aliases
export const s = scale;
export const vs = verticalScale;
export const ms = moderateScale;
export const mvs = moderateVerticalScale;

// Get screen dimensions
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Base dimensions (based on standard mobile design - iPhone 11)
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

// Device type breakpoints
const TABLET_BREAKPOINT = 768;
const LARGE_TABLET_BREAKPOINT = 1024;

/**
 * Device type detection
 */
export const isTablet = (): boolean => {
  const pixelDensity = PixelRatio.get();
  const adjustedWidth = SCREEN_WIDTH * pixelDensity;
  const adjustedHeight = SCREEN_HEIGHT * pixelDensity;

  // Check if it's a tablet based on screen size and pixel density
  if (pixelDensity < 2 && (SCREEN_WIDTH >= TABLET_BREAKPOINT || SCREEN_HEIGHT >= TABLET_BREAKPOINT)) {
    return true;
  }

  // For high density screens, check the actual dimensions
  return Math.min(adjustedWidth, adjustedHeight) >= TABLET_BREAKPOINT * 2;
};

export const isLargeTablet = (): boolean => {
  return Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) >= LARGE_TABLET_BREAKPOINT;
};

export const isSmallDevice = (): boolean => {
  return SCREEN_WIDTH < 375;
};

export const isLargeDevice = (): boolean => {
  return SCREEN_WIDTH >= 414;
};

/**
 * Device info
 */
export const deviceInfo = {
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT,
  isTablet: isTablet(),
  isLargeTablet: isLargeTablet(),
  isSmallDevice: isSmallDevice(),
  isLargeDevice: isLargeDevice(),
  isIOS: Platform.OS === 'ios',
  isAndroid: Platform.OS === 'android',
  pixelRatio: PixelRatio.get(),
};

/**
 * Responsive width based on percentage of screen width
 */
export const wp = (percentage: number): number => {
  return PixelRatio.roundToNearestPixel((SCREEN_WIDTH * percentage) / 100);
};

/**
 * Responsive height based on percentage of screen height
 */
export const hp = (percentage: number): number => {
  return PixelRatio.roundToNearestPixel((SCREEN_HEIGHT * percentage) / 100);
};

/**
 * Scale font size with optional factor
 * Uses moderateScale for balanced scaling
 */
export const fontSize = (size: number, factor: number = 0.5): number => {
  return moderateScale(size, factor);
};

/**
 * Responsive spacing (padding, margin)
 */
export const spacing = {
  xs: moderateScale(4),
  sm: moderateScale(8),
  md: moderateScale(12),
  lg: moderateScale(16),
  xl: moderateScale(20),
  xxl: moderateScale(24),
  xxxl: moderateScale(32),
};

/**
 * Responsive font sizes
 */
export const fontSizes = {
  xs: moderateScale(10),
  sm: moderateScale(12),
  md: moderateScale(14),
  lg: moderateScale(16),
  xl: moderateScale(18),
  xxl: moderateScale(20),
  h3: moderateScale(22),
  h2: moderateScale(26),
  h1: moderateScale(32),
};

/**
 * Responsive icon sizes
 */
export const iconSizes = {
  xs: moderateScale(12),
  sm: moderateScale(16),
  md: moderateScale(20),
  lg: moderateScale(24),
  xl: moderateScale(28),
  xxl: moderateScale(32),
};

/**
 * Responsive border radius
 */
export const borderRadius = {
  xs: moderateScale(4),
  sm: moderateScale(8),
  md: moderateScale(12),
  lg: moderateScale(16),
  xl: moderateScale(20),
  full: 9999,
};

/**
 * Get responsive value based on device type
 * Returns tablet value if device is tablet, otherwise phone value
 */
export const responsive = <T>(phone: T, tablet: T): T => {
  return isTablet() ? tablet : phone;
};

/**
 * Get responsive value based on screen size breakpoints
 */
export const breakpoint = <T>(small: T, medium: T, large: T): T => {
  if (isSmallDevice()) return small;
  if (isTablet()) return large;
  return medium;
};

/**
 * Normalize size across different pixel densities
 */
export const normalize = (size: number): number => {
  const scale = SCREEN_WIDTH / BASE_WIDTH;
  const newSize = size * scale;

  if (Platform.OS === 'ios') {
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
  }
  return Math.round(PixelRatio.roundToNearestPixel(newSize)) - 2;
};

/**
 * Responsive horizontal and vertical scaling
 */
export const scaleSize = (size: number): number => {
  return moderateScale(size, 0.5);
};

export const scaleWidth = (size: number): number => {
  return scale(size);
};

export const scaleHeight = (size: number): number => {
  return verticalScale(size);
};

/**
 * Create responsive style values
 * Useful for creating consistent spacing/sizing objects
 */
export const createResponsiveStyle = (baseValue: number) => ({
  phone: moderateScale(baseValue),
  tablet: moderateScale(baseValue * 1.2),
  get value() {
    return responsive(this.phone, this.tablet);
  },
});

/**
 * Grid helpers for responsive layouts
 */
export const grid = {
  columns: responsive(2, 4),
  gutter: moderateScale(responsive(12, 16)),
  margin: moderateScale(responsive(16, 24)),
};

/**
 * Hit slop for touch targets (accessibility)
 */
export const hitSlop = {
  top: moderateScale(10),
  bottom: moderateScale(10),
  left: moderateScale(10),
  right: moderateScale(10),
};

export default {
  // Size matters exports
  scale,
  verticalScale,
  moderateScale,
  moderateVerticalScale,
  s,
  vs,
  ms,
  mvs,
  // Percentage based
  wp,
  hp,
  // Device detection
  isTablet,
  isLargeTablet,
  isSmallDevice,
  isLargeDevice,
  deviceInfo,
  // Responsive helpers
  responsive,
  breakpoint,
  normalize,
  fontSize,
  scaleSize,
  scaleWidth,
  scaleHeight,
  // Pre-defined scales
  spacing,
  fontSizes,
  iconSizes,
  borderRadius,
  grid,
  hitSlop,
  createResponsiveStyle,
};

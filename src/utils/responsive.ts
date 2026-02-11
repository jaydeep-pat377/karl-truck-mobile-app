

import { Dimensions, Platform, PixelRatio } from 'react-native';
import {
  scale,
  verticalScale,
  moderateScale,
  moderateVerticalScale,
} from 'react-native-size-matters';

export { scale, verticalScale, moderateScale, moderateVerticalScale };

export const s = scale;
export const vs = verticalScale;
export const ms = moderateScale;
export const mvs = moderateVerticalScale;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

const TABLET_BREAKPOINT = 768;
const LARGE_TABLET_BREAKPOINT = 1024;

export const isTablet = (): boolean => {
  const pixelDensity = PixelRatio.get();
  const adjustedWidth = SCREEN_WIDTH * pixelDensity;
  const adjustedHeight = SCREEN_HEIGHT * pixelDensity;


  if (pixelDensity < 2 && (SCREEN_WIDTH >= TABLET_BREAKPOINT || SCREEN_HEIGHT >= TABLET_BREAKPOINT)) {
    return true;
  }


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

export const wp = (percentage: number): number => {
  return PixelRatio.roundToNearestPixel((SCREEN_WIDTH * percentage) / 100);
};

export const hp = (percentage: number): number => {
  return PixelRatio.roundToNearestPixel((SCREEN_HEIGHT * percentage) / 100);
};

export const fontSize = (size: number, factor: number = 0.5): number => {
  return moderateScale(size, factor);
};

export const spacing = {
  xs: moderateScale(4),
  sm: moderateScale(8),
  md: moderateScale(12),
  lg: moderateScale(16),
  xl: moderateScale(20),
  xxl: moderateScale(24),
  xxxl: moderateScale(32),
};

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

export const iconSizes = {
  xs: moderateScale(12),
  sm: moderateScale(16),
  md: moderateScale(20),
  lg: moderateScale(24),
  xl: moderateScale(28),
  xxl: moderateScale(32),
};

export const borderRadius = {
  xs: moderateScale(4),
  sm: moderateScale(8),
  md: moderateScale(12),
  lg: moderateScale(16),
  xl: moderateScale(20),
  full: 9999,
};

export const responsive = <T>(phone: T, tablet: T): T => {
  return isTablet() ? tablet : phone;
};

export const breakpoint = <T>(small: T, medium: T, large: T): T => {
  if (isSmallDevice()) return small;
  if (isTablet()) return large;
  return medium;
};

export const normalize = (size: number): number => {
  const scale = SCREEN_WIDTH / BASE_WIDTH;
  const newSize = size * scale;

  if (Platform.OS === 'ios') {
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
  }
  return Math.round(PixelRatio.roundToNearestPixel(newSize)) - 2;
};

export const scaleSize = (size: number): number => {
  return moderateScale(size, 0.5);
};

export const scaleWidth = (size: number): number => {
  return scale(size);
};

export const scaleHeight = (size: number): number => {
  return verticalScale(size);
};

export const createResponsiveStyle = (baseValue: number) => ({
  phone: moderateScale(baseValue),
  tablet: moderateScale(baseValue * 1.2),
  get value() {
    return responsive(this.phone, this.tablet);
  },
});

export const grid = {
  columns: responsive(2, 4),
  gutter: moderateScale(responsive(12, 16)),
  margin: moderateScale(responsive(16, 24)),
};

export const hitSlop = {
  top: moderateScale(10),
  bottom: moderateScale(10),
  left: moderateScale(10),
  right: moderateScale(10),
};

export default {

  scale,
  verticalScale,
  moderateScale,
  moderateVerticalScale,
  s,
  vs,
  ms,
  mvs,

  wp,
  hp,

  isTablet,
  isLargeTablet,
  isSmallDevice,
  isLargeDevice,
  deviceInfo,

  responsive,
  breakpoint,
  normalize,
  fontSize,
  scaleSize,
  scaleWidth,
  scaleHeight,

  spacing,
  fontSizes,
  iconSizes,
  borderRadius,
  grid,
  hitSlop,
  createResponsiveStyle,
};

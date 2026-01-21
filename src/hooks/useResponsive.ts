/**
 * useResponsive Hook
 * Provides responsive utilities with dynamic updates on dimension changes
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Dimensions, ScaledSize, useWindowDimensions } from 'react-native';
import {
  moderateScale,
  scale,
  verticalScale,
} from 'react-native-size-matters';

// Breakpoints
const TABLET_BREAKPOINT = 768;
const SMALL_DEVICE_BREAKPOINT = 375;

export type DeviceType = 'phone' | 'tablet' | 'largeTablet';
export type Orientation = 'portrait' | 'landscape';

interface ResponsiveConfig {
  width: number;
  height: number;
  isTablet: boolean;
  isPhone: boolean;
  isSmallDevice: boolean;
  isLargeDevice: boolean;
  deviceType: DeviceType;
  orientation: Orientation;
}

interface ResponsiveHelpers {
  wp: (percentage: number) => number;
  hp: (percentage: number) => number;
  responsive: <T>(phone: T, tablet: T) => T;
  breakpoint: <T>(small: T, medium: T, large: T) => T;
  columns: (phone: number, tablet: number) => number;
}

export interface UseResponsiveReturn extends ResponsiveConfig, ResponsiveHelpers {}

export const useResponsive = (): UseResponsiveReturn => {
  const { width, height } = useWindowDimensions();

  const config = useMemo((): ResponsiveConfig => {
    const isTablet = Math.min(width, height) >= TABLET_BREAKPOINT;
    const isSmallDevice = width < SMALL_DEVICE_BREAKPOINT;
    const isLargeDevice = width >= 414;
    const orientation: Orientation = width > height ? 'landscape' : 'portrait';

    let deviceType: DeviceType = 'phone';
    if (Math.min(width, height) >= 1024) {
      deviceType = 'largeTablet';
    } else if (isTablet) {
      deviceType = 'tablet';
    }

    return {
      width,
      height,
      isTablet,
      isPhone: !isTablet,
      isSmallDevice,
      isLargeDevice,
      deviceType,
      orientation,
    };
  }, [width, height]);

  const wp = useCallback(
    (percentage: number): number => {
      return Math.round((width * percentage) / 100);
    },
    [width]
  );

  const hp = useCallback(
    (percentage: number): number => {
      return Math.round((height * percentage) / 100);
    },
    [height]
  );

  const responsive = useCallback(
    <T>(phone: T, tablet: T): T => {
      return config.isTablet ? tablet : phone;
    },
    [config.isTablet]
  );

  const breakpoint = useCallback(
    <T>(small: T, medium: T, large: T): T => {
      if (config.isSmallDevice) return small;
      if (config.isTablet) return large;
      return medium;
    },
    [config.isSmallDevice, config.isTablet]
  );

  const columns = useCallback(
    (phone: number, tablet: number): number => {
      return config.isTablet ? tablet : phone;
    },
    [config.isTablet]
  );

  return {
    ...config,
    wp,
    hp,
    responsive,
    breakpoint,
    columns,
  };
};

/**
 * Hook for responsive styles that update on dimension changes
 */
export const useResponsiveStyles = <T extends Record<string, any>>(
  phoneStyles: T,
  tabletStyles: Partial<T>
): T => {
  const { isTablet } = useResponsive();

  return useMemo(() => {
    if (isTablet) {
      return { ...phoneStyles, ...tabletStyles };
    }
    return phoneStyles;
  }, [isTablet, phoneStyles, tabletStyles]);
};

/**
 * Hook for grid layout columns
 */
export const useGridColumns = (phoneColumns: number = 2, tabletColumns: number = 4): number => {
  const { isTablet, orientation } = useResponsive();

  return useMemo(() => {
    if (isTablet) {
      return orientation === 'landscape' ? tabletColumns + 1 : tabletColumns;
    }
    return orientation === 'landscape' ? phoneColumns + 1 : phoneColumns;
  }, [isTablet, orientation, phoneColumns, tabletColumns]);
};

/**
 * Hook for responsive font scaling
 */
export const useScaledFontSize = (baseSize: number, factor: number = 0.5): number => {
  const { isTablet } = useResponsive();

  return useMemo(() => {
    const scaled = moderateScale(baseSize, factor);
    // Slightly increase font size on tablets for better readability
    return isTablet ? scaled * 1.1 : scaled;
  }, [baseSize, factor, isTablet]);
};

export default useResponsive;

/**
 * iOS Widget Native Module
 * Allows React Native to update iOS widget data
 */

import { NativeModules, Platform } from 'react-native';

interface WidgetData {
  totalOrders: number;
  normal: number;
  willCall: number;
  hold: number;
  cancelled: number;
  inProgress: number;
  completed: number;
  isLoggedIn: boolean;
}

interface WidgetModuleInterface {
  updateWidgetData: (data: WidgetData) => void;
  setLoggedIn: (isLoggedIn: boolean) => void;
  reloadWidget: () => void;
}

// Get native module (iOS only)
const NativeWidgetModule = Platform.OS === 'ios'
  ? NativeModules.WidgetModule as WidgetModuleInterface | undefined
  : undefined;

/**
 * Update the iOS widget with new data
 */
export const updateWidgetData = (data: WidgetData): void => {
  if (Platform.OS === 'ios' && NativeWidgetModule) {
    try {
      NativeWidgetModule.updateWidgetData(data);
    } catch (error) {
      console.log('[WidgetModule] Error updating widget:', error);
    }
  }
};

/**
 * Set the login state for the widget
 */
export const setWidgetLoggedIn = (isLoggedIn: boolean): void => {
  if (Platform.OS === 'ios' && NativeWidgetModule) {
    try {
      NativeWidgetModule.setLoggedIn(isLoggedIn);
    } catch (error) {
      console.log('[WidgetModule] Error setting login state:', error);
    }
  }
};

/**
 * Force reload the widget
 */
export const reloadWidget = (): void => {
  if (Platform.OS === 'ios' && NativeWidgetModule) {
    try {
      NativeWidgetModule.reloadWidget();
    } catch (error) {
      console.log('[WidgetModule] Error reloading widget:', error);
    }
  }
};

/**
 * Check if widget module is available
 */
export const isWidgetModuleAvailable = (): boolean => {
  return Platform.OS === 'ios' && NativeWidgetModule !== undefined;
};

export default {
  updateWidgetData,
  setWidgetLoggedIn,
  reloadWidget,
  isWidgetModuleAvailable,
};

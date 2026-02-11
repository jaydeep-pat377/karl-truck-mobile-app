

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

const NativeWidgetModule = Platform.OS === 'ios'
  ? NativeModules.WidgetModule as WidgetModuleInterface | undefined
  : undefined;

export const updateWidgetData = (data: WidgetData): void => {
  if (Platform.OS === 'ios' && NativeWidgetModule) {
    try {
      NativeWidgetModule.updateWidgetData(data);
    } catch (error) {
      console.log('[WidgetModule] Error updating widget:', error);
    }
  }
};

export const setWidgetLoggedIn = (isLoggedIn: boolean): void => {
  if (Platform.OS === 'ios' && NativeWidgetModule) {
    try {
      NativeWidgetModule.setLoggedIn(isLoggedIn);
    } catch (error) {
      console.log('[WidgetModule] Error setting login state:', error);
    }
  }
};

export const reloadWidget = (): void => {
  if (Platform.OS === 'ios' && NativeWidgetModule) {
    try {
      NativeWidgetModule.reloadWidget();
    } catch (error) {
      console.log('[WidgetModule] Error reloading widget:', error);
    }
  }
};

export const isWidgetModuleAvailable = (): boolean => {
  return Platform.OS === 'ios' && NativeWidgetModule !== undefined;
};

export default {
  updateWidgetData,
  setWidgetLoggedIn,
  reloadWidget,
  isWidgetModuleAvailable,
};

import { NativeModules, Platform } from 'react-native';

interface TodayOverviewWidgetInterface {
  updateWidgetData(
    totalOrders: number,
    normal: number,
    willCall: number,
    hold: number,
    cancelled: number,
    inProgress: number,
    completed: number,
    progress: number
  ): Promise<boolean>;
  setAuthCredentials(accessToken: string, apiBaseUrl: string): Promise<boolean>;
  refreshWidget(): Promise<boolean>;
  clearWidgetData(): Promise<boolean>;
}

const { TodayOverviewWidget } = NativeModules;

export const updateWidgetData = async (
  totalOrders: number,
  normal: number,
  willCall: number,
  hold: number,
  cancelled: number,
  inProgress: number,
  completed: number,
  progress: number
): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return false;
  }

  try {
    return await (TodayOverviewWidget as TodayOverviewWidgetInterface).updateWidgetData(
      totalOrders,
      normal,
      willCall,
      hold,
      cancelled,
      inProgress,
      completed,
      progress
    );
  } catch (error) {
    console.error('Failed to update widget:', error);
    return false;
  }
};

export const setAuthCredentials = async (
  accessToken: string,
  apiBaseUrl: string
): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return false;
  }

  try {
    return await (TodayOverviewWidget as TodayOverviewWidgetInterface).setAuthCredentials(
      accessToken,
      apiBaseUrl
    );
  } catch (error) {
    console.error('Failed to set widget auth credentials:', error);
    return false;
  }
};

export const refreshWidget = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return false;
  }

  try {
    return await (TodayOverviewWidget as TodayOverviewWidgetInterface).refreshWidget();
  } catch (error) {
    console.error('Failed to refresh widget:', error);
    return false;
  }
};

export const clearWidgetData = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return false;
  }

  try {
    return await (TodayOverviewWidget as TodayOverviewWidgetInterface).clearWidgetData();
  } catch (error) {
    console.error('Failed to clear widget data:', error);
    return false;
  }
};

export default {
  updateWidgetData,
  setAuthCredentials,
  refreshWidget,
  clearWidgetData,
};

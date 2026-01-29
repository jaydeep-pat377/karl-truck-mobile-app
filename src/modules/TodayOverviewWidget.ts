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

/**
 * Update the Android home screen widget with today's order overview data
 */
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

/**
 * Set authentication credentials for widget API calls
 * This enables the widget to fetch fresh data directly from the API
 * @param accessToken - JWT access token
 * @param apiBaseUrl - API base URL (e.g., 'https://api.truckast.ai/api')
 */
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

/**
 * Manually refresh the widget - fetches fresh data from API
 */
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

/**
 * Clear widget data on logout - shows "Please login" message
 */
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

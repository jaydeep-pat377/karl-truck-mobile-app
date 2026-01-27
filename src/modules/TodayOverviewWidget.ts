import { NativeModules, Platform } from 'react-native';

interface TodayOverviewWidgetInterface {
  updateWidgetData(
    totalOrders: number,
    inProgress: number,
    completed: number,
    progress: number
  ): Promise<boolean>;
  refreshWidget(): Promise<boolean>;
  clearWidgetData(): Promise<boolean>;
}

const { TodayOverviewWidget } = NativeModules;

/**
 * Update the Android home screen widget with today's order overview data
 * @param totalOrders - Total number of orders for today
 * @param inProgress - Number of orders in progress
 * @param completed - Number of completed orders
 * @param progress - Overall progress percentage (0-100)
 */
export const updateWidgetData = async (
  totalOrders: number,
  inProgress: number,
  completed: number,
  progress: number
): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    console.log('Widget is only available on Android');
    return false;
  }

  try {
    return await (TodayOverviewWidget as TodayOverviewWidgetInterface).updateWidgetData(
      totalOrders,
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
 * Manually refresh the widget display
 */
export const refreshWidget = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    console.log('Widget is only available on Android');
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
    console.log('Widget is only available on Android');
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
  refreshWidget,
  clearWidgetData,
};

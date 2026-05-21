import apiClient from '../apiClient';
import { API_ENDPOINTS } from '../endpoints';
import { TimezoneInfo } from '../../utils/timezone';

interface TimezoneResponse {
  success: boolean;
  data: TimezoneInfo[];
}

interface PreferenceResponse {
  success: boolean;
  data: number | null;
}

export const timezoneService = {
  /**
   * Fetch available timezones from the backend (DB).
   */
  async getTimezones(): Promise<TimezoneInfo[]> {
    const response = await apiClient.get<TimezoneResponse>(API_ENDPOINTS.TIMEZONES.LIST);
    return response?.data || [];
  },

  /**
   * Get the user's saved timezone preference from DB.
   * Returns the timezone ID or null if not set.
   */
  async getSavedTimezoneId(): Promise<number | null> {
    try {
      const response = await apiClient.get<PreferenceResponse>(`${API_ENDPOINTS.USER_PREFERENCES.GET}/timezone`);
      return response?.data ?? null;
    } catch {
      return null;
    }
  },

  /**
   * Save the user's timezone preference to DB (same as web).
   * Stores the timezone ID in user_preferences table.
   */
  async saveTimezonePreference(timezoneId: number): Promise<void> {
    await apiClient.put(`${API_ENDPOINTS.USER_PREFERENCES.SET}/timezone`, { value: timezoneId });
  },
};

import apiClient from '../apiClient';
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
    const response = await apiClient.get<TimezoneResponse>('/timezones');
    return response?.data || [];
  },

  /**
   * Get the user's saved timezone preference from DB.
   * Returns the timezone ID or null if not set.
   */
  async getSavedTimezoneId(): Promise<number | null> {
    try {
      const response = await apiClient.get<PreferenceResponse>('/user-preferences/timezone');
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
    await apiClient.put('/user-preferences/timezone', { value: timezoneId });
  },
};

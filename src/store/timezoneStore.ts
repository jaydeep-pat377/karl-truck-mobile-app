import { create } from 'zustand';
import { STORAGE_KEYS, storageUtils } from '../utils/storage';
import { TimezoneInfo, CDT_INITIAL } from '../utils/timezone';
import { timezoneService } from '../api/services/timezoneService';
import { queryClient } from '../lib/queryClient';

interface TimezoneState {
  timezone: TimezoneInfo;
  companyTimezone: TimezoneInfo | null;
  isLoaded: boolean;
  setTimezone: (tz: TimezoneInfo) => Promise<void>;
  setTimezoneFromApi: (tz: TimezoneInfo, companyTz?: TimezoneInfo | null) => Promise<void>;
  loadTimezone: () => Promise<void>;
  syncFromDb: () => Promise<void>;
  resetTimezone: () => Promise<void>;
}

export const useTimezoneStore = create<TimezoneState>((set) => ({
  timezone: CDT_INITIAL,
  companyTimezone: null,
  isLoaded: false,

  // User selects timezone in Settings — save locally + to DB, then invalidate
  // every React Query so tz-aware screens (dashboard, orders, tickets, tracking,
  // etc.) refetch immediately without a manual pull-to-refresh.
  setTimezone: async (tz: TimezoneInfo) => {
    await storageUtils.setObject(STORAGE_KEYS.TIMEZONE, tz);
    set({ timezone: tz });
    try {
      await timezoneService.saveTimezonePreference(tz.id);
    } catch (err) {
      console.error('[TimezoneStore] Failed to save to DB:', err);
    }
    // Refetch every query immediately (active AND inactive) so any tz-formatted
    // data is fresh by the time the user next navigates to that screen.
    // Without refetchType:'all', inactive queries would only refetch lazily
    // on next mount, which can leave detail screens showing the old tz until
    // the user pulls to refresh.
    queryClient.invalidateQueries({ refetchType: 'all' });
  },

  // Timezone comes from API (login response) — save locally only
  setTimezoneFromApi: async (tz: TimezoneInfo, companyTz?: TimezoneInfo | null) => {
    await storageUtils.setObject(STORAGE_KEYS.TIMEZONE, tz);
    if (companyTz) {
      await storageUtils.setObject(STORAGE_KEYS.COMPANY_TIMEZONE, companyTz);
    }
    set({ timezone: tz, companyTimezone: companyTz ?? null, isLoaded: true });
  },

  // Called on app startup — local storage only, no network
  loadTimezone: async () => {
    const saved = await storageUtils.getObject<TimezoneInfo>(STORAGE_KEYS.TIMEZONE);
    const savedCompany = await storageUtils.getObject<TimezoneInfo>(STORAGE_KEYS.COMPANY_TIMEZONE);
    if (saved && saved.iana_code) {
      set({ timezone: saved, companyTimezone: savedCompany ?? null, isLoaded: true });
    } else {
      set({ companyTimezone: savedCompany ?? null, isLoaded: true });
    }
  },

  // Called after login — syncs timezone preference from DB
  syncFromDb: async () => {
    try {
      const savedId = await timezoneService.getSavedTimezoneId();
      if (savedId != null) {
        const timezones = await timezoneService.getTimezones();
        const match = timezones.find(tz => tz.id === savedId);
        if (match) {
          await storageUtils.setObject(STORAGE_KEYS.TIMEZONE, match);
          set({ timezone: match });
        }
      }
    } catch {
      // Non-fatal — local/API value is already loaded
    }
  },

  resetTimezone: async () => {
    await storageUtils.remove(STORAGE_KEYS.TIMEZONE);
    await storageUtils.remove(STORAGE_KEYS.COMPANY_TIMEZONE);
    set({ timezone: CDT_INITIAL, companyTimezone: null });
  },
}));

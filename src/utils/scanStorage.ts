import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  fetchScanHistory,
  saveScanRemote,
  deleteScanRemote,
  clearScanHistoryRemote,
} from '../api/services/qrService';
import type { ScanRecord, Pagination } from '../types/qrScan';
import { STORAGE_KEYS } from './storage';

const HISTORY_KEY = STORAGE_KEYS.TICKET_SCAN_HISTORY;

async function getLocalHistory(): Promise<ScanRecord[]> {
  try {
    const data = await AsyncStorage.getItem(HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

async function setLocalHistory(records: ScanRecord[]): Promise<void> {
  try {
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(records));
  } catch (error) {
    console.log('[HISTORY] Local save error:', error);
  }
}

export interface PaginatedHistory {
  records: ScanRecord[];
  pagination: Pagination;
}

export const getScanHistory = async (
  page: number = 1,
  limit: number = 20,
): Promise<PaginatedHistory> => {
  try {
    const result = await fetchScanHistory(page, limit);
    if (page === 1) {
      await setLocalHistory(result.records);
    }
    return result;
  } catch (error) {
    console.log('[HISTORY] API fetch failed, using local cache:', error);
  }
  const localRecords = await getLocalHistory();
  return {
    records: localRecords,
    pagination: {
      page: 1,
      limit: localRecords.length,
      total: localRecords.length,
      total_pages: 1,
      has_next: false,
      has_prev: false,
    },
  };
};

export const saveScanRecord = async (record: ScanRecord): Promise<void> => {
  try {
    await saveScanRemote(record);
    return;
  } catch (error) {
    console.log('[HISTORY] API save failed, saving locally:', error);
  }
  const history = await getLocalHistory();
  await setLocalHistory([record, ...history]);
};

export const deleteScanRecord = async (id: string): Promise<void> => {
  try {
    await deleteScanRemote(id);
    return;
  } catch (error) {
    console.log('[HISTORY] API delete failed, deleting locally:', error);
  }
  const history = await getLocalHistory();
  await setLocalHistory(history.filter(item => item.id !== id));
};

export const clearScanHistory = async (): Promise<void> => {
  try {
    await clearScanHistoryRemote();
  } catch (error) {
    console.log('[HISTORY] API clear failed:', error);
  }
  try {
    await AsyncStorage.removeItem(HISTORY_KEY);
  } catch (error) {
    console.log('[HISTORY] Local clear error:', error);
  }
};

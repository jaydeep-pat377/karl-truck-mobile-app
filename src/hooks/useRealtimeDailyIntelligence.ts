import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import apiClient from '../api/apiClient';
import { API_ENDPOINTS } from '../api/endpoints';
import { DailyIntelligenceData, DailyIntelligenceScope } from '../types/dailyIntelligence';

interface UseRealtimeDailyIntelligenceOptions {
  reportDate?: string;
  scope?: DailyIntelligenceScope;
  plantCode?: string | null;
  regionName?: string | null;
  enabled?: boolean;
}

interface UseRealtimeDailyIntelligenceReturn {
  data: DailyIntelligenceData | null;
  isLoading: boolean;
  error: Error | null;
  lastUpdate: Date | null;
  refetch: () => void;
}

const getTodayDateCDT = (): string => {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const cstMs = utcMs - 6 * 3600000;
  const cstDate = new Date(cstMs);
  const year = cstDate.getFullYear();
  const month = String(cstDate.getMonth() + 1).padStart(2, '0');
  const day = String(cstDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const POLL_INTERVAL = 60000; // Poll every 60s instead of Supabase realtime

export function useRealtimeDailyIntelligence({
  reportDate,
  scope = 'company',
  plantCode = null,
  regionName = null,
  enabled = true,
}: UseRealtimeDailyIntelligenceOptions = {}): UseRealtimeDailyIntelligenceReturn {
  const [data, setData] = useState<DailyIntelligenceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const effectiveDate = reportDate || getTodayDateCDT();

  const fetchDailyIntelligence = useCallback(
    async (showLoading = true) => {
      if (!enabled) return;

      if (showLoading) setIsLoading(true);

      try {
        const params: Record<string, any> = {
          report_date: effectiveDate,
        };
        if (scope === 'plant' && plantCode) params.plant_code = plantCode;
        if (scope === 'region' && regionName) params.region_name = regionName;

        const res = await apiClient.get<{ success: boolean; data: any }>(
          API_ENDPOINTS.DAILY_INTELLIGENCE.GET,
          { params },
        );

        if (res.success && res.data) {
          setData(res.data);
          setLastUpdate(new Date());
          setError(null);
        } else {
          setData(null);
        }
      } catch (err) {
        const errorObj = err instanceof Error ? err : new Error('Failed to fetch daily intelligence');
        setError(errorObj);
        console.error('Daily intelligence fetch error:', errorObj.message);
      } finally {
        if (showLoading) setIsLoading(false);
      }
    },
    [effectiveDate, scope, plantCode, regionName, enabled],
  );

  // Initial fetch
  useEffect(() => {
    fetchDailyIntelligence(true);
  }, [fetchDailyIntelligence]);

  // Polling instead of Supabase realtime
  useEffect(() => {
    if (!enabled) return;

    pollRef.current = setInterval(() => {
      fetchDailyIntelligence(false);
    }, POLL_INTERVAL);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [enabled, fetchDailyIntelligence]);

  // Reconnect on app resume
  useEffect(() => {
    const handleAppState = (state: AppStateStatus) => {
      if (state === 'active' && enabled) {
        fetchDailyIntelligence(false);
      }
    };
    const subscription = AppState.addEventListener('change', handleAppState);
    return () => subscription.remove();
  }, [fetchDailyIntelligence, enabled]);

  return {
    data,
    isLoading,
    error,
    lastUpdate,
    refetch: () => fetchDailyIntelligence(false),
  };
}

export default useRealtimeDailyIntelligence;

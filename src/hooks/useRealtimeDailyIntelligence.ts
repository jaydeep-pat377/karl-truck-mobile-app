import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabaseAdmin } from '../services/supabase/supabaseClient';
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
  const channelRef = useRef<RealtimeChannel | null>(null);

  const effectiveDate = reportDate || getTodayDateCDT();

  // Use supabaseAdmin (service role) for data fetch — bypasses RLS
  const fetchDailyIntelligence = useCallback(
    async (showLoading = true) => {
      if (!enabled) return;

      if (showLoading) {
        setIsLoading(true);
      }

      try {
        let query = supabaseAdmin
          .from('daily_intelligence')
          .select('*')
          .eq('report_date', effectiveDate)
          .eq('company_code', 'ALL');

        if (scope === 'company') {
          query = query.is('plant_code', null).is('region_name', null);
        } else if (scope === 'plant' && plantCode) {
          query = query.eq('plant_code', plantCode);
        } else if (scope === 'region' && regionName) {
          query = query.is('plant_code', null).eq('region_name', regionName);
        } else {
          query = query.is('plant_code', null).is('region_name', null);
        }

        const { data: row, error: fetchError } = await query.maybeSingle();

        if (fetchError) {
          throw new Error(fetchError.message);
        }

        setData(row);
        setLastUpdate(new Date());
        setError(null);
      } catch (err) {
        const errorObj = err instanceof Error ? err : new Error('Failed to fetch daily intelligence');
        setError(errorObj);
        console.error('Daily intelligence fetch error:', errorObj.message);
      } finally {
        if (showLoading) {
          setIsLoading(false);
        }
      }
    },
    [effectiveDate, scope, plantCode, regionName, enabled],
  );

  // Initial fetch
  useEffect(() => {
    fetchDailyIntelligence(true);
  }, [fetchDailyIntelligence]);

  // Realtime WebSocket subscription
  useEffect(() => {
    if (!enabled) return;

    const channel = supabaseAdmin
      .channel(`daily-intelligence-${effectiveDate}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'daily_intelligence',
        },
        (payload) => {
          const newRow = payload.new as DailyIntelligenceData;

          // Client-side filter: only react to changes for our date + scope
          if (newRow.report_date && String(newRow.report_date) !== effectiveDate) {
            return;
          }

          let shouldUpdate = false;

          if (payload.eventType === 'DELETE') {
            shouldUpdate = true;
          } else if (scope === 'company' && !newRow.plant_code && !newRow.region_name) {
            shouldUpdate = true;
          } else if (scope === 'plant' && newRow.plant_code === plantCode) {
            shouldUpdate = true;
          } else if (scope === 'region' && newRow.region_name === regionName) {
            shouldUpdate = true;
          }

          if (shouldUpdate) {
            fetchDailyIntelligence(false);
          }
        },
      )
      .subscribe((status) => {
        console.log('[DailyIntelligence] Realtime subscription status:', status);
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabaseAdmin.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [effectiveDate, scope, plantCode, regionName, enabled, fetchDailyIntelligence]);

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

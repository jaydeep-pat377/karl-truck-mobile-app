/**
 * useOrderTracking Hook
 * Fetches order tracking data with live truck locations and ticket list
 */

import { useQuery } from '@tanstack/react-query';
import { orderService } from '../api/services/orderService';
import {
  OrderTrackingData,
  OrderTrackingQueryParams,
  TrackingTicket,
} from '../types/orderTracking';

interface UseOrderTrackingOptions extends OrderTrackingQueryParams {
  enabled?: boolean;
  refetchInterval?: number;
}

interface UseOrderTrackingResult {
  trackingData: OrderTrackingData | null;
  tickets: TrackingTicket[];
  isLoading: boolean;
  isError: boolean;
  error: string | null;
  refetch: () => void;
  isRefetching: boolean;
}

export const useOrderTracking = (
  orderId: string,
  options: UseOrderTrackingOptions = {}
): UseOrderTrackingResult => {
  const {
    page = 1,
    limit = 10,
    enabled = true,
    refetchInterval = 30000, // Refresh every 30 seconds for live tracking
  } = options;

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['orderTracking', orderId, page, limit],
    queryFn: () => orderService.getOrderTracking(orderId, { page, limit }),
    enabled: enabled && !!orderId,
    refetchInterval, // Auto-refresh for live tracking
    staleTime: 10000, // Consider data stale after 10 seconds
  });

  return {
    trackingData: data?.data || null,
    tickets: data?.data?.tickets || [],
    isLoading,
    isError,
    error: isError ? (error as Error)?.message || 'Failed to load tracking data' : null,
    refetch,
    isRefetching,
  };
};

export default useOrderTracking;

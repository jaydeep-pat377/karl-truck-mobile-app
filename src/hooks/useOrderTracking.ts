

import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { orderService } from '../api/services/orderService';
import {
  OrderTrackingData,
  OrderTrackingQueryParams,
  TrackingTicket,
  TrackingPagination,
} from '../types/orderTracking';

interface UseOrderTrackingOptions extends Omit<OrderTrackingQueryParams, 'page'> {
  enabled?: boolean;
  refetchInterval?: number;
}

interface UseOrderTrackingResult {
  trackingData: OrderTrackingData | null;
  tickets: TrackingTicket[];
  pagination: TrackingPagination | null;
  isLoading: boolean;
  isError: boolean;
  error: string | null;
  refetch: () => void;
  isRefetching: boolean;
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
}

export const useOrderTracking = (
  orderId: string,
  options: UseOrderTrackingOptions = {}
): UseOrderTrackingResult => {
  const {
    limit = 10,
    enabled = true,
    refetchInterval = 30000,
  } = options;

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['orderTracking', orderId, limit],
    queryFn: ({ pageParam = 1 }) => orderService.getOrderTracking(orderId, { page: pageParam, limit }),
    enabled: enabled && !!orderId,
    refetchInterval,
    staleTime: 10000,
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const pagination = lastPage?.data?.pagination;
      if (pagination && pagination.has_next) {
        return pagination.page + 1;
      }
      return undefined;
    },
  });


  const tickets = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap(page => page?.data?.tickets || []);
  }, [data?.pages]);


  const trackingData = useMemo(() => {
    if (!data?.pages?.[0]?.data) return null;

    return {
      ...data.pages[0].data,
      tickets,
    };
  }, [data?.pages, tickets]);


  const pagination = useMemo(() => {
    if (!data?.pages?.length) return null;
    return data.pages[data.pages.length - 1]?.data?.pagination || null;
  }, [data?.pages]);

  return {
    trackingData,
    tickets,
    pagination,
    isLoading,
    isError,
    error: isError ? (error as Error)?.message || 'Failed to load tracking data' : null,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage: hasNextPage ?? false,
    isFetchingNextPage,
  };
};

export default useOrderTracking;

import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo, useCallback } from 'react';
import { dashboardService, DashboardDateFilter } from '../api/services/dashboardService';
import { DashboardApiResponse, DashboardData, ActiveDeliveryOrder } from '../types/dashboard';
import { AxiosError } from 'axios';

interface ApiErrorResponse {
  success?: boolean;
  message?: string;
}

interface UseDashboardParams {
  dateFilter?: DashboardDateFilter | 'calendar';
  startDate?: string;
  endDate?: string;
  deliveriesLimit?: number;
}

export const useDashboard = (params?: UseDashboardParams) => {
  const limit = params?.deliveriesLimit ?? 5;
  const isCustomDate = params?.dateFilter === 'calendar' && params?.startDate && params?.endDate;

  const query = useInfiniteQuery<DashboardApiResponse, AxiosError<ApiErrorResponse>>({
    queryKey: ['dashboard', params?.dateFilter, params?.startDate, params?.endDate, limit],
    queryFn: ({ pageParam = 1 }) =>
      dashboardService.getDashboard({
        date_filter: isCustomDate ? undefined : (params?.dateFilter as DashboardDateFilter),
        start_date: isCustomDate ? params?.startDate : undefined,
        end_date: isCustomDate ? params?.endDate : undefined,
        page: pageParam as number,
        limit,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const pagination = lastPage.data?.active_deliveries?.pagination;
      if (pagination?.has_next) {
        return pagination.page + 1;
      }
      return undefined;
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  const firstPageData: DashboardData | null =
    query.data?.pages[0]?.success ? query.data.pages[0].data : null;

  const allDeliveryOrders: ActiveDeliveryOrder[] = useMemo(() => {
    if (!query.data?.pages) return [];
    const allOrders = query.data.pages.flatMap(
      (page) => page.data?.active_deliveries?.orders ?? []
    );

    const uniqueOrders = allOrders.filter(
      (order, index, self) => index === self.findIndex((o) => o.order_id === order.order_id)
    );
    return uniqueOrders;
  }, [query.data?.pages]);

  const activeDeliveriesWithAllOrders = useMemo(() => {
    if (!firstPageData?.active_deliveries) return null;
    const lastPage = query.data?.pages[query.data.pages.length - 1];
    return {
      count: firstPageData.active_deliveries.count,
      orders: allDeliveryOrders,
      pagination: lastPage?.data?.active_deliveries?.pagination ?? firstPageData.active_deliveries.pagination,
    };
  }, [firstPageData, allDeliveryOrders, query.data?.pages]);

  const errorMessage =
    query.error?.response?.data?.message ||
    (query.error ? 'Failed to load dashboard' : null);

  const isInitialLoading = query.isLoading && !firstPageData;

  const handleFetchNextPage = useCallback(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      query.fetchNextPage();
    }
  }, [query]);

  return {
    data: firstPageData,
    user: firstPageData?.user ?? null,
    notifications: firstPageData?.notifications ?? null,
    weather: firstPageData?.weather ?? null,
    todayOverview: firstPageData?.today_overview ?? null,
    todayProgress: firstPageData?.today_progress ?? null,
    marketSummary: firstPageData?.market_summary ?? null,
    activeDeliveries: activeDeliveriesWithAllOrders,
    recentAlerts: firstPageData?.recent_alerts ?? [],
    dateRange: firstPageData?.date_range ?? null,
    isLoading: isInitialLoading,
    isError: query.isError,
    error: errorMessage,
    refetch: query.refetch,
    isRefetching: query.isRefetching,
    isFetching: query.isFetching,
    hasNextPage: query.hasNextPage ?? false,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: handleFetchNextPage,
  };
};

export default useDashboard;

import { useInfiniteQuery } from '@tanstack/react-query';
import { orderService } from '../api/services/orderService';
import {
  OrdersApiResponse,
  OrdersQueryParams,
  ApiOrder,
  OrdersPagination,
  OrdersStatusCounts,
} from '../types/order';
import { AxiosError } from 'axios';
import { useMemo } from 'react';

interface ApiErrorResponse {
  success?: boolean;
  message?: string;
}

export const useOrders = (params?: Omit<OrdersQueryParams, 'page'>) => {
  const query = useInfiniteQuery<OrdersApiResponse, AxiosError<ApiErrorResponse>>({
    queryKey: ['orders', params],
    queryFn: ({ pageParam = 1 }) =>
      orderService.getOrders({ ...params, page: pageParam as number, limit: params?.limit || 10 }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.success && lastPage.data.pagination.has_next) {
        return lastPage.data.pagination.page + 1;
      }
      return undefined;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - faster refresh for orders
    gcTime: 10 * 60 * 1000, // 10 minutes cache
    retry: 1, // Reduce retries for faster failure
    refetchOnMount: 'always',
    refetchOnWindowFocus: false, // Don't refetch on app focus
    placeholderData: (previousData) => previousData, // Show previous data while loading
  });

  // Flatten all pages of orders into a single array
  const orders: ApiOrder[] = useMemo(() => {
    if (!query.data?.pages) return [];
    return query.data.pages.flatMap((page) =>
      page.success ? page.data.orders : []
    );
  }, [query.data?.pages]);

  // Get pagination from the last page
  const pagination: OrdersPagination | null = useMemo(() => {
    if (!query.data?.pages?.length) return null;
    const lastPage = query.data.pages[query.data.pages.length - 1];
    return lastPage.success ? lastPage.data.pagination : null;
  }, [query.data?.pages]);

  // Get status counts from the first page (should be consistent across pages)
  const statusCounts: OrdersStatusCounts | null = useMemo(() => {
    if (!query.data?.pages?.length) return null;
    const firstPage = query.data.pages[0];
    return firstPage.success ? firstPage.data.status_counts : null;
  }, [query.data?.pages]);

  const errorMessage =
    query.error?.response?.data?.message ||
    (query.error ? 'Failed to load orders' : null);

  // Only show full loading state when there's no cached data
  const isInitialLoading = query.isLoading && orders.length === 0;
  // Show subtle loading when switching filters but have cached data
  const isFilterLoading = query.isFetching && orders.length > 0;

  return {
    orders,
    pagination,
    statusCounts,
    isLoading: isInitialLoading, // Only true when no data to show
    isFilterLoading, // True when fetching but have data to display
    isError: query.isError,
    error: errorMessage,
    refetch: query.refetch,
    isRefetching: query.isRefetching,
    isFetching: query.isFetching,
    // Pagination specific
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
  };
};

export default useOrders;

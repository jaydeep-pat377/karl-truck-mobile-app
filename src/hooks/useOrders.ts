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
  });

  // Flatten all pages of orders into a single array and remove duplicates
  const orders: ApiOrder[] = useMemo(() => {
    if (!query.data?.pages) return [];

    // Console log the API response
    console.log('📦 Orders API Response:', JSON.stringify(query.data.pages, null, 2));

    const allOrders = query.data.pages.flatMap((page) =>
      page.success ? page.data.orders : []
    );

    // Remove duplicates by order_id to prevent key conflicts
    const uniqueOrders = allOrders.filter(
      (order, index, self) =>
        index === self.findIndex((o) => o.order_id === order.order_id)
    );

    return uniqueOrders;
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

  // Show full loading state when loading initial data or when query key changes
  const isInitialLoading = query.isLoading;
  // Show subtle loading when refetching but have data to display
  const isFilterLoading = query.isFetching && !query.isLoading && orders.length > 0;

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

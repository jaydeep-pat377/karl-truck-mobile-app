import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { orderService } from '../api/services/orderService';
import {
  OrdersApiResponse,
  OrdersQueryParams,
  ApiOrder,
  OrdersPagination,
  OrdersStatusCounts,
  OrdersTabCounts,
} from '../types/order';
import { AxiosError } from 'axios';
import { useMemo, useEffect, useRef } from 'react';

interface ApiErrorResponse {
  success?: boolean;
  message?: string;
}

export const useOrders = (params?: Omit<OrdersQueryParams, 'page'>) => {
  const queryClient = useQueryClient();
  const prevParamsRef = useRef<string | null>(null);


  const paramsKey = useMemo(() => {
    return JSON.stringify({
      date_filter: params?.date_filter,
      status: params?.status,
      search: params?.search,
      sort_by: params?.sort_by,
      sort_order: params?.sort_order,
      start_date: params?.start_date,
      end_date: params?.end_date,
      company_name: params?.company_name,
      region_name: params?.region_name,
      plant_code: params?.plant_code,
      plant_name: params?.plant_name,
      is_favourite: params?.is_favourite,
      tab: params?.tab,
    });
  }, [params?.date_filter, params?.status, params?.search, params?.sort_by, params?.sort_order, params?.start_date, params?.end_date, params?.company_name, params?.region_name, params?.plant_code, params?.plant_name, params?.is_favourite, params?.tab]);

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
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
  });


  useEffect(() => {
    if (prevParamsRef.current !== null && prevParamsRef.current !== paramsKey) {

      queryClient.invalidateQueries({ queryKey: ['orders', params] });
    }
    prevParamsRef.current = paramsKey;
  }, [paramsKey, params, queryClient]);

  const orders: ApiOrder[] = useMemo(() => {
    if (!query.data?.pages) return [];

    const allOrders = query.data.pages.flatMap((page) =>
      page.success ? page.data.orders : []
    );


    const uniqueOrders = allOrders.filter(
      (order, index, self) =>
        index === self.findIndex((o) => o.order_id === order.order_id)
    );

    return uniqueOrders;
  }, [query.data?.pages]);

  const pagination: OrdersPagination | null = useMemo(() => {
    if (!query.data?.pages?.length) return null;
    const lastPage = query.data.pages[query.data.pages.length - 1];
    return lastPage.success ? lastPage.data.pagination : null;
  }, [query.data?.pages]);

  const statusCounts: OrdersStatusCounts | null = useMemo(() => {
    if (!query.data?.pages?.length) return null;
    const firstPage = query.data.pages[0];
    return firstPage.success ? firstPage.data.status_counts : null;
  }, [query.data?.pages]);

  const tabCounts: OrdersTabCounts | null = useMemo(() => {
    if (!query.data?.pages?.length) return null;
    const firstPage = query.data.pages[0];
    return firstPage.success ? firstPage.data.tab_counts || null : null;
  }, [query.data?.pages]);

  const errorMessage =
    query.error?.response?.data?.message ||
    (query.error ? 'Failed to load orders' : null);

  const isInitialLoading = query.isLoading;

  const isFilterLoading = query.isFetching && !query.isLoading && orders.length > 0;

  return {
    orders,
    pagination,
    statusCounts,
    tabCounts,
    isLoading: isInitialLoading,
    isFilterLoading,
    isError: query.isError,
    error: errorMessage,
    refetch: query.refetch,
    isRefetching: query.isRefetching,
    isFetching: query.isFetching,

    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
  };
};

export default useOrders;

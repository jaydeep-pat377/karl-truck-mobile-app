import { useInfiniteQuery } from '@tanstack/react-query';
import { truckService } from '../api/services/truckService';
import {
  TrucksApiResponse,
  TrucksQueryParams,
  Truck,
  TrucksPagination,
  mapApiTruckToTruck,
} from '../types/truck';
import { AxiosError } from 'axios';
import { useMemo } from 'react';

interface ApiErrorResponse {
  success?: boolean;
  message?: string;
}

export const useTrucks = (params?: Omit<TrucksQueryParams, 'page'>) => {
  const query = useInfiniteQuery<TrucksApiResponse, AxiosError<ApiErrorResponse>>({
    queryKey: ['trucks', params],
    queryFn: ({ pageParam = 1 }) =>
      truckService.getTrucks({
        ...params,
        page: pageParam as number,
        pageSize: params?.pageSize || 10,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      // Pagination fields are at root level
      if (lastPage.success && lastPage.hasNextPage) {
        return lastPage.page + 1;
      }
      return undefined;
    },
    staleTime: 30 * 1000, // 30 seconds - trucks need more frequent updates
    retry: 2,
    refetchOnMount: 'always',
    refetchInterval: 30 * 1000, // Auto-refresh every 30 seconds
  });

  // Flatten all pages of trucks into a single array and map to UI type
  const trucks: Truck[] = useMemo(() => {
    if (!query.data?.pages) return [];
    // data is directly an array of trucks
    return query.data.pages.flatMap((page) =>
      page.success ? page.data.map(mapApiTruckToTruck) : []
    );
  }, [query.data?.pages]);

  // Get pagination from the last page (pagination fields at root level)
  const pagination: TrucksPagination | null = useMemo(() => {
    if (!query.data?.pages?.length) return null;
    const lastPage = query.data.pages[query.data.pages.length - 1];
    if (!lastPage.success) return null;
    return {
      page: lastPage.page,
      pageSize: lastPage.pageSize,
      total: lastPage.total,
      totalPages: lastPage.totalPages,
      hasNextPage: lastPage.hasNextPage,
      hasPreviousPage: lastPage.hasPreviousPage,
    };
  }, [query.data?.pages]);

  const errorMessage =
    query.error?.response?.data?.message ||
    (query.error ? 'Failed to load trucks' : null);

  return {
    trucks,
    pagination,
    isLoading: query.isLoading,
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

export default useTrucks;

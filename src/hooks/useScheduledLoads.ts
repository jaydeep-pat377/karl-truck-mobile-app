import { useInfiniteQuery } from '@tanstack/react-query';
import { orderService, ScheduledLoadsApiResponse, ScheduledLoadItem } from '../api/services/orderService';
import { AxiosError } from 'axios';

interface ApiErrorResponse {
  success?: boolean;
  message?: string;
}

interface UseScheduledLoadsParams {
  order_code: string;
  order_date: string;
  limit?: number;
  enabled?: boolean;
}

export const useScheduledLoads = ({
  order_code,
  order_date,
  limit = 10,
  enabled = true,
}: UseScheduledLoadsParams) => {
  const query = useInfiniteQuery<ScheduledLoadsApiResponse, AxiosError<ApiErrorResponse>>({
    queryKey: ['scheduledLoads', order_code, order_date, limit],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await orderService.getScheduledLoads({
        order_code,
        order_date,
        page: pageParam as number,
        limit,
      });
      return response;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const pagination = lastPage?.data?.scheduled_loads?.pagination;
      if (!pagination) return undefined;

      const { page, total_pages, has_next } = pagination;
      if (has_next && page < total_pages) {
        return page + 1;
      }
      return undefined;
    },
    enabled: enabled && !!order_code && !!order_date,
    staleTime: 2 * 60 * 1000,
  });

  // Flatten all pages into a single array of loads
  const loads: ScheduledLoadItem[] = query.data?.pages?.flatMap(
    (page) => page?.data?.scheduled_loads?.items || []
  ) || [];

  // Get pagination info from the last page
  const lastPage = query.data?.pages?.[query.data.pages.length - 1];
  const scheduledLoads = lastPage?.data?.scheduled_loads;
  const pagination = scheduledLoads?.pagination;

  const errorMessage =
    query.error?.response?.data?.message ||
    (query.error ? 'Failed to load scheduled loads' : null);

  return {
    loads,
    totalLoads: pagination?.total || scheduledLoads?.count || 0,
    completedCount: scheduledLoads?.completed_count || 0,
    currentPage: pagination?.page || 1,
    totalPages: pagination?.total_pages || 1,
    isLoading: query.isLoading,
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

export default useScheduledLoads;

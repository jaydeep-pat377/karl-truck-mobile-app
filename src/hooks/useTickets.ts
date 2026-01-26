import { useInfiniteQuery } from '@tanstack/react-query';
import { ticketService } from '../api/services/ticketService';
import {
  TicketsApiResponse,
  TicketsQueryParams,
  ApiTicket,
  TicketsPagination,
  TicketsStatusCounts,
  ApiOrderSummary,
} from '../types/ticket';
import { AxiosError } from 'axios';
import { useMemo } from 'react';

interface ApiErrorResponse {
  success?: boolean;
  message?: string;
}

export const useTickets = (params?: Omit<TicketsQueryParams, 'page'>) => {
  const query = useInfiniteQuery<TicketsApiResponse, AxiosError<ApiErrorResponse>>({
    queryKey: ['tickets', params],
    queryFn: ({ pageParam = 1 }) =>
      ticketService.getTickets({ ...params, page: pageParam as number, limit: params?.limit || 20 }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.success && lastPage.data.pagination.has_next) {
        return lastPage.data.pagination.page + 1;
      }
      return undefined;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 2,
    refetchOnMount: 'always',
  });

  // Flatten all pages of tickets into a single array
  const tickets: ApiTicket[] = useMemo(() => {
    if (!query.data?.pages) return [];
    return query.data.pages.flatMap((page) =>
      page.success ? page.data.tickets : []
    );
  }, [query.data?.pages]);

  // Get pagination from the last page
  const pagination: TicketsPagination | null = useMemo(() => {
    if (!query.data?.pages?.length) return null;
    const lastPage = query.data.pages[query.data.pages.length - 1];
    return lastPage.success ? lastPage.data.pagination : null;
  }, [query.data?.pages]);

  // Get status counts from the first page (should be consistent across pages)
  const statusCounts: TicketsStatusCounts | null = useMemo(() => {
    if (!query.data?.pages?.length) return null;
    const firstPage = query.data.pages[0];
    return firstPage.success ? firstPage.data.status_counts : null;
  }, [query.data?.pages]);

  // Get order summary from the first page
  const orderSummary: ApiOrderSummary[] = useMemo(() => {
    if (!query.data?.pages?.length) return [];
    const firstPage = query.data.pages[0];
    return firstPage.success ? firstPage.data.order_summary : [];
  }, [query.data?.pages]);

  const errorMessage =
    query.error?.response?.data?.message ||
    (query.error ? 'Failed to load tickets' : null);

  return {
    tickets,
    pagination,
    statusCounts,
    orderSummary,
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

export default useTickets;

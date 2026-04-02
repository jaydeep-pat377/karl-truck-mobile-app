import { useMemo } from 'react';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orderRequestService } from '../api/services/orderRequestService';
import {
  OrderEntity,
  OrderRequestCounts,
  OrderRequestPagination,
  OrderRequestsApiResponse,
  OrderRequestsQueryParams,
  OrderEntityCreateInput,
  OrderEntityMessage,
} from '../types/orderRequest';

export const useOrderRequests = (
  params?: Omit<OrderRequestsQueryParams, 'page'>
) => {
  const query = useInfiniteQuery<OrderRequestsApiResponse>({
    queryKey: ['orderRequests', params],
    queryFn: ({ pageParam = 1 }) =>
      orderRequestService.getOrderRequests({
        ...params,
        page: pageParam as number,
        limit: params?.limit || 15,
      }),
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
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
  });

  const orders: OrderEntity[] = useMemo(() => {
    if (!query.data?.pages) return [];
    const allOrders = query.data.pages.flatMap((page) =>
      page.success ? page.data.orders : []
    );
    // Deduplicate by id
    const seen = new Set<string>();
    return allOrders.filter((order) => {
      if (seen.has(order.id)) return false;
      seen.add(order.id);
      return true;
    });
  }, [query.data?.pages]);

  const counts: OrderRequestCounts = useMemo(() => {
    // Counts come from the first page (they reflect total unfiltered counts)
    if (!query.data?.pages?.length) {
      return { total: 0, pending: 0, submitted: 0, approved: 0, rejected: 0 };
    }
    const firstPage = query.data.pages[0];
    return firstPage.success
      ? firstPage.data.counts
      : { total: 0, pending: 0, submitted: 0, approved: 0, rejected: 0 };
  }, [query.data?.pages]);

  const pagination: OrderRequestPagination | null = useMemo(() => {
    if (!query.data?.pages?.length) return null;
    const lastPage = query.data.pages[query.data.pages.length - 1];
    return lastPage.success ? lastPage.data.pagination : null;
  }, [query.data?.pages]);

  return {
    orders,
    counts,
    pagination,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    isRefetching: query.isRefetching,
    isFetching: query.isFetching,
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
  };
};

export const useOrderRequestDetail = (id: string) => {
  const query = useQuery({
    queryKey: ['orderRequest', id],
    queryFn: () => orderRequestService.getOrderRequestById(id),
    enabled: !!id,
    staleTime: 60 * 1000,
    retry: 1,
  });

  const order: OrderEntity | null = query.data?.success ? query.data.data : null;

  return {
    order,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
};

export const useOrderRequestMessages = (id: string) => {
  const query = useQuery({
    queryKey: ['orderRequestMessages', id],
    queryFn: () => orderRequestService.getMessages(id),
    enabled: !!id,
    staleTime: 10 * 1000,
    refetchInterval: 10 * 1000,
    retry: 1,
  });

  const messages: OrderEntityMessage[] = query.data?.success
    ? query.data.data.messages
    : [];

  return {
    messages,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
};

export const useCreateOrderRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: OrderEntityCreateInput) =>
      orderRequestService.createOrderRequest(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orderRequests'] });
    },
  });
};

export const useUpdateOrderRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: OrderEntityCreateInput }) =>
      orderRequestService.updateOrderRequest(id, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orderRequests'] });
      queryClient.invalidateQueries({ queryKey: ['orderRequest', variables.id] });
    },
  });
};

export const useUpdateOrderRequestStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      orderRequestService.updateStatus(id, status),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orderRequests'] });
      queryClient.invalidateQueries({ queryKey: ['orderRequest', variables.id] });
    },
  });
};

export const useSendOrderRequestMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      messageText,
      senderRole,
    }: {
      id: string;
      messageText: string;
      senderRole: string;
    }) => orderRequestService.sendMessage(id, messageText, senderRole),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['orderRequestMessages', variables.id],
      });
    },
  });
};

export const useSearchProducts = (searchQuery: string) => {
  const query = useQuery({
    queryKey: ['orderRequestProducts', searchQuery],
    queryFn: () => orderRequestService.searchProducts(searchQuery),
    enabled: searchQuery.length >= 1,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const products = query.data?.success
    ? query.data.data.products
    : [];

  return {
    products,
    isLoading: query.isLoading,
  };
};

export const useOrderRequestFormData = () => {
  const query = useQuery({
    queryKey: ['orderRequestFormData'],
    queryFn: () => orderRequestService.getFormData(),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 2,
  });

  return {
    formData: query.data?.success ? query.data.data : null,
    isLoading: query.isLoading,
    isError: query.isError,
  };
};

export const useSearchOrders = (searchQuery: string) => {
  const query = useQuery({
    queryKey: ['orderRequestSearchOrders', searchQuery],
    queryFn: () => orderRequestService.searchOrders(searchQuery),
    enabled: searchQuery.length >= 2,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const orders = query.data?.success ? query.data.data.orders : [];

  return {
    orders,
    isLoading: query.isLoading,
  };
};


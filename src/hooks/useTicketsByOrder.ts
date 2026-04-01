import { useQuery } from '@tanstack/react-query';
import { ticketService } from '../api/services/ticketService';
import {
  TicketsByOrderApiResponse,
  TicketsByOrderQueryParams,
  TicketsByOrderData,
  TicketByOrderItem,
  TicketsByOrderOrder,
  TicketsByOrderFilters,
  TicketsByOrderSummary,
} from '../types/ticket';
import { DeliveryProgress } from '../types/order';
import { AxiosError } from 'axios';

interface ApiErrorResponse {
  success?: boolean;
  message?: string;
}

interface UseTicketsByOrderParams extends TicketsByOrderQueryParams {
  orderId: string;
}

export const useTicketsByOrder = (params: UseTicketsByOrderParams) => {
  const { orderId, ...queryParams } = params;

  const query = useQuery<TicketsByOrderApiResponse, AxiosError<ApiErrorResponse>>({
    queryKey: ['ticketsByOrder', orderId, queryParams],
    queryFn: () => ticketService.getTicketsByOrder(orderId, queryParams),
    enabled: !!orderId,
    staleTime: 2 * 60 * 1000,
    retry: 2,
    refetchOnMount: 'always',
  });

  const data: TicketsByOrderData | null = query.data?.success
    ? query.data.data
    : null;

  const order: TicketsByOrderOrder | null = data?.order || null;
  const tickets: TicketByOrderItem[] = data?.tickets || [];
  const filters: TicketsByOrderFilters | null = data?.filters || null;
  const summary: TicketsByOrderSummary | null = data?.summary || null;
  const deliveryProgress: DeliveryProgress | null = data?.delivery_progress || null;
  const statusColors: Record<string, string> | null = data?.status_colors || null;

  const errorMessage =
    query.error?.response?.data?.message ||
    (query.error ? 'Failed to load tickets' : null);

  return {

    data,
    order,
    tickets,
    filters,
    summary,
    deliveryProgress,
    statusColors,

    orderId: order?.order_id,
    orderCode: order?.order_code,
    orderDate: order?.order_date,
    customerName: order?.customer_name,
    projectName: order?.project_name,
    deliveryAddress: order?.delivery_address,
    weatherData: order?.weather_data,

    totalTickets: summary?.total_tickets ?? 0,
    activeTickets: summary?.active_tickets ?? 0,
    cancelledTickets: summary?.cancelled_tickets ?? 0,
    totalDeliveredQty: summary?.total_delivered_qty ?? 0,
    orderedQty: summary?.ordered_qty ?? 0,
    remainingQty: summary?.remaining_qty ?? 0,
    progressDisplay: summary?.progress_display ?? '',

    availableStatuses: filters?.available?.status || [],
    availableLoads: filters?.available?.load || [],
    totalLoads: filters?.in_order?.total_loads ?? 0,

    isLoading: query.isLoading,
    isError: query.isError,
    error: errorMessage,
    refetch: query.refetch,
    isRefetching: query.isRefetching,
    isFetching: query.isFetching,
  };
};

export default useTicketsByOrder;

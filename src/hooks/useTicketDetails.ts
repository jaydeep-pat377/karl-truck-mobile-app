import { useQuery } from '@tanstack/react-query';
import { ticketService } from '../api/services/ticketService';
import {
  TicketDetailsApiResponse,
  TicketDetailsQueryParams,
  TicketDetailsTicket,
} from '../types/ticket';
import { AxiosError } from 'axios';

interface ApiErrorResponse {
  success?: boolean;
  message?: string;
}

export const useTicketDetails = (params: TicketDetailsQueryParams) => {
  const { order_code, order_date, ticket_code } = params;

  const query = useQuery<TicketDetailsApiResponse, AxiosError<ApiErrorResponse>>({
    queryKey: ['ticketDetails', order_code, order_date, ticket_code],
    queryFn: () => ticketService.getTicketDetails(params),
    enabled: !!order_code && !!order_date && !!ticket_code,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 2,
    refetchOnMount: 'always',
  });

  const ticket: TicketDetailsTicket | null = query.data?.success
    ? query.data.data.ticket
    : null;

  const errorMessage =
    query.error?.response?.data?.message ||
    (query.error ? 'Failed to load ticket details' : null);

  return {
    // Raw data
    ticket,
    // Ticket info
    ticketId: ticket?.ticket_id,
    ticketCode: ticket?.ticket_code,
    loadNumber: ticket?.load_number,
    orderId: ticket?.order_id,
    orderCode: ticket?.order_code,
    orderDate: ticket?.order_date,
    // Customer info
    customerName: ticket?.customer_name,
    deliveryAddress: ticket?.delivery_address,
    projectName: ticket?.project_name,
    lotBlockNumber: ticket?.lot_block_number,
    // Plant info
    plantCode: ticket?.plant_code,
    plantName: ticket?.plant_name,
    plantAddress: ticket?.plant_address,
    // Quantity info
    runningQty: ticket?.running_qty ?? 0,
    orderedQty: ticket?.ordered_qty ?? 0,
    // Driver info
    driverName: ticket?.driver_name,
    driverPhone: ticket?.driver_phone,
    // Truck info
    truck: ticket?.truck,
    truckCode: ticket?.truck?.truck_code,
    truckDescription: ticket?.truck?.truck_description,
    truckLatitude: ticket?.truck?.latitude,
    truckLongitude: ticket?.truck?.longitude,
    // Status info
    status: ticket?.status,
    statusCode: ticket?.status?.status,
    statusDisplay: ticket?.status?.status_display,
    statusTimestamp: ticket?.status?.timestamp,
    statusTimestampDisplay: ticket?.status?.timestamp_display,
    etaAtJob: ticket?.status?.eta_at_job,
    // Timeline timestamps
    timestamps: {
      ticketed: ticket?.status?.ticketed,
      loading: ticket?.status?.loading,
      loaded: ticket?.status?.loaded,
      toJob: ticket?.status?.to_job,
      atJob: ticket?.status?.at_job,
      pouring: ticket?.status?.pouring,
      washing: ticket?.status?.washing,
      toPlant: ticket?.status?.to_plant,
      atPlant: ticket?.status?.at_plant,
    },
    // Products
    products: ticket?.products || [],
    // Query state
    isLoading: query.isLoading,
    isError: query.isError,
    error: errorMessage,
    refetch: query.refetch,
    isRefetching: query.isRefetching,
    isFetching: query.isFetching,
  };
};

export default useTicketDetails;

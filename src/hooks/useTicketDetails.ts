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
    staleTime: 2 * 60 * 1000,
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

    ticket,

    ticketId: ticket?.ticket_id,
    ticketCode: ticket?.ticket_code,
    loadNumber: ticket?.load_number,
    orderId: ticket?.order_id,
    orderCode: ticket?.order_code,
    orderDate: ticket?.order_date,

    customerName: ticket?.customer_name,
    deliveryAddress: ticket?.delivery_address,
    projectName: ticket?.project_name,
    lotBlockNumber: ticket?.lot_block_number,

    plantCode: ticket?.plant_code,
    plantName: ticket?.plant_name,
    plantAddress: ticket?.plant_address,

    runningQty: ticket?.running_qty ?? 0,
    orderedQty: ticket?.ordered_qty ?? 0,

    driverName: ticket?.driver_name,
    driverPhone: ticket?.driver_phone,
    driverCode: ticket?.driver_code,

    truck: ticket?.truck,
    truckCode: ticket?.truck?.truck_code,
    truckDescription: ticket?.truck?.truck_description,
    truckLatitude: ticket?.truck?.latitude,
    truckLongitude: ticket?.truck?.longitude,

    plantLocation: ticket?.plant_location,
    plantLocationLatitude: ticket?.plant_location?.latitude,
    plantLocationLongitude: ticket?.plant_location?.longitude,
    orderLocation: ticket?.order_location,
    orderLocationLatitude: ticket?.order_location?.latitude,
    orderLocationLongitude: ticket?.order_location?.longitude,

    status: ticket?.status,
    statusCode: ticket?.status?.status,
    statusDisplay: ticket?.status?.status_display,
    statusTimestamp: ticket?.status?.timestamp,
    statusTimestampDisplay: ticket?.status?.timestamp_display,
    etaAtJob: ticket?.status?.eta_at_job,

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

    products: ticket?.products || [],

    isLoading: query.isLoading,
    isError: query.isError,
    error: errorMessage,
    refetch: query.refetch,
    isRefetching: query.isRefetching,
    isFetching: query.isFetching,
  };
};

export default useTicketDetails;

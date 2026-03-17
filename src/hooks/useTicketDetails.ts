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
    loadNumber: ticket?.load,
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
    plantPhone: ticket?.plant_phone,

    runningQty: ticket?.running_qty ?? 0,
    orderedQty: ticket?.ordered_qty ?? 0,
    loadQty: ticket?.load_qty,

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
    removeReasonCode: ticket?.status?.remove_reason_code,

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

    durations: {
      loading: ticket?.status?.durations?.loading ?? null,
      loaded: ticket?.status?.durations?.loaded ?? null,
      toJob: ticket?.status?.durations?.to_job ?? null,
      atJob: ticket?.status?.durations?.at_job ?? null,
      pouring: ticket?.status?.durations?.pouring ?? null,
      washing: ticket?.status?.durations?.washing ?? null,
      toPlant: ticket?.status?.durations?.to_plant ?? null,
      atPlant: ticket?.status?.durations?.at_plant ?? null,
    },

    products: ticket?.products || [],

    deliveryMetrics: ticket?.delivery_metrics || null,
    spacingMinutes: ticket?.delivery_metrics?.spacing_minutes || null,
    waitingMinutes: ticket?.delivery_metrics?.waiting_minutes || null,
    pourMinutes: ticket?.delivery_metrics?.pour_minutes || null,
    performanceMinutes: ticket?.delivery_metrics?.performance_minutes || null,
    idleMinutes: ticket?.delivery_metrics?.idle_minutes || null,

    weatherData: ticket?.weather_data || null,

    verifiJson: ticket?.verifi_json || null,

    isLoading: query.isLoading,
    isError: query.isError,
    error: errorMessage,
    refetch: query.refetch,
    isRefetching: query.isRefetching,
    isFetching: query.isFetching,
  };
};

export default useTicketDetails;

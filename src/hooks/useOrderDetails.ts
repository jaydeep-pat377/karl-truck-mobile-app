import { useQuery } from '@tanstack/react-query';
import { orderService } from '../api/services/orderService';
import {
  OrderDetailsApiResponse,
  OrderDetailsQueryParams,
  OrderDetailsOrder,
} from '../types/ticket';
import { AxiosError } from 'axios';

interface ApiErrorResponse {
  success?: boolean;
  message?: string;
}

export const useOrderDetails = (params: OrderDetailsQueryParams) => {
  const query = useQuery<OrderDetailsApiResponse, AxiosError<ApiErrorResponse>>({
    queryKey: ['orderDetails', params.order_code, params.order_date],
    queryFn: () => orderService.getOrderDetails(params),
    staleTime: 2 * 60 * 1000,
    retry: 2,
    enabled: !!params.order_code && !!params.order_date,
  });

  if (query.data) {
    console.log('Order Details API Response:', JSON.stringify(query.data, null, 2));
  }

  const orderDetails: OrderDetailsOrder | null =
    query.data?.success ? query.data.data.order : null;

  const errorMessage =
    query.error?.response?.data?.message ||
    (query.error ? 'Failed to load order details' : null);

  return {
    orderDetails,
    isLoading: query.isLoading,
    isError: query.isError,
    error: errorMessage,
    refetch: query.refetch,
    isRefetching: query.isRefetching,
    isFetching: query.isFetching,
  };
};

export default useOrderDetails;

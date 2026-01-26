import apiClient from '../apiClient';
import { API_ENDPOINTS } from '../endpoints';
import { OrdersApiResponse, OrdersQueryParams } from '../../types/order';
import { OrderDetailsApiResponse, OrderDetailsQueryParams } from '../../types/ticket';

export const orderService = {
  getOrders: async (params?: OrdersQueryParams): Promise<OrdersApiResponse> => {
    return apiClient.get<OrdersApiResponse>(API_ENDPOINTS.ORDERS.LIST, {
      params,
    });
  },

  getOrderDetails: async (params: OrderDetailsQueryParams): Promise<OrderDetailsApiResponse> => {
    return apiClient.get<OrderDetailsApiResponse>(API_ENDPOINTS.ORDERS.DETAILS, {
      params,
    });
  },
};

export default orderService;

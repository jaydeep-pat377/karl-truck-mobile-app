import apiClient from '../apiClient';
import { API_ENDPOINTS } from '../endpoints';
import { OrdersApiResponse, OrdersQueryParams } from '../../types/order';
import { OrderDetailsApiResponse, OrderDetailsQueryParams } from '../../types/ticket';
import { OrderTrackingResponse, OrderTrackingQueryParams } from '../../types/orderTracking';

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

  getOrderTracking: async (
    orderId: string,
    params?: OrderTrackingQueryParams
  ): Promise<OrderTrackingResponse> => {
    return apiClient.get<OrderTrackingResponse>(
      `${API_ENDPOINTS.ORDERS.TRACKING}/${orderId}`,
      { params }
    );
  },

  toggleFavourite: async (orderId: string): Promise<{ success: boolean; message: string }> => {
    return apiClient.post<{ success: boolean; message: string }>(
      `${API_ENDPOINTS.ORDERS.FAVOURITE}/${orderId}/favourite`
    );
  },
};

export default orderService;

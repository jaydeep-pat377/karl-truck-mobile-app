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
    console.log('========== ORDER DETAILS API CALL ==========');
    console.log('Endpoint:', API_ENDPOINTS.ORDERS.DETAILS);
    console.log('Parameters:', JSON.stringify(params, null, 2));

    try {
      const response = await apiClient.get<OrderDetailsApiResponse>(API_ENDPOINTS.ORDERS.DETAILS, {
        params,
      });
      console.log('Order Details Response:', JSON.stringify(response, null, 2));
      console.log('============================================');
      return response;
    } catch (error) {
      console.log('Order Details Error:', error);
      console.log('============================================');
      throw error;
    }
  },
};

export default orderService;

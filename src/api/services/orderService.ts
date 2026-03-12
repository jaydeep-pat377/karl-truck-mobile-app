import apiClient from '../apiClient';
import { API_ENDPOINTS } from '../endpoints';
import { OrdersApiResponse, OrdersQueryParams } from '../../types/order';
import { OrderDetailsApiResponse, OrderDetailsQueryParams } from '../../types/ticket';
import { OrderTrackingResponse, OrderTrackingQueryParams } from '../../types/orderTracking';

export interface ScheduledLoadsQueryParams {
  order_code: string;
  order_date: string;
  page?: number;
  limit?: number;
}

export interface ScheduledLoadItem {
  load_number: number;
  load_status?: string;
  load_status_code?: string;
  is_completed?: boolean;
  scheduled_time?: string;
  actual_time?: string | null;
  scheduled_qty?: string;
  actual_qty?: string | null;
  variance?: string | null;
  scheduled_qty_raw?: number;
  actual_qty_raw?: number;
  variance_raw?: number;
  id?: string;
  order_product_schedule_id?: string;
  schedule_load_id?: string;
  from_plant_id?: string;
  from_plant?: string;
  truck_id?: string;
  truck_code?: string | null;
  to_plant_id?: string;
  to_plant?: string;
  time_to_job?: number;
  unload_time?: number;
  time_to_plant?: number;
  truck_space?: number;
  scheduled_printed_time?: string;
  scheduled_load_time?: string;
  scheduled_on_job_time?: string;
  scheduled_fin_pour_time?: string;
  scheduled_at_plant_time?: string;
  time_to_wash?: number;
  ticket_id?: string;
  ticket_code?: string | null;
  actual_on_job_time?: string | null;
  actual_begin_pour_time?: string | null;
  actual_end_pour_time?: string | null;
  actual_wash_time?: string | null;
  actual_to_plant_time?: string | null;
  actual_at_plant_time?: string | null;
  actual_unload_time?: string | null;
  ticket_remove_reason_code?: string | null;
}

export interface ScheduledLoadsApiResponse {
  success: boolean;
  message: string;
  data: {
    scheduled_loads: {
      items: ScheduledLoadItem[];
      count: number;
      completed_count: number;
      cancelled_count: number;
      pagination: {
        page: number;
        limit: number;
        total: number;
        total_pages: number;
        has_next: boolean;
        has_prev: boolean;
      };
    };
  };
}

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

  getScheduledLoads: async (params: ScheduledLoadsQueryParams): Promise<ScheduledLoadsApiResponse> => {
    return apiClient.get<ScheduledLoadsApiResponse>(API_ENDPOINTS.ORDERS.SCHEDULED_LOADS, {
      params,
    });
  },
};

export default orderService;

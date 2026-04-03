import apiClient from '../apiClient';
import { API_ENDPOINTS } from '../endpoints';
import {
  OrderRequestsApiResponse,
  OrderRequestsQueryParams,
  OrderRequestDetailApiResponse,
  OrderRequestCreateApiResponse,
  OrderRequestMessagesApiResponse,
  OrderRequestSendMessageApiResponse,
  OrderRequestStatusUpdateApiResponse,
  OrderRequestFormDataApiResponse,
  OrderRequestSearchOrdersApiResponse,
  OrderRequestSearchProductsApiResponse,
  OrderEntityCreateInput,
} from '../../types/orderRequest';

export const orderRequestService = {
  getOrderRequests: async (
    params?: OrderRequestsQueryParams
  ): Promise<OrderRequestsApiResponse> => {
    return apiClient.get<OrderRequestsApiResponse>(API_ENDPOINTS.ORDER_REQUESTS.LIST, {
      params,
    });
  },

  getOrderRequestById: async (id: string): Promise<OrderRequestDetailApiResponse> => {
    return apiClient.get<OrderRequestDetailApiResponse>(
      `${API_ENDPOINTS.ORDER_REQUESTS.DETAIL}/${id}`
    );
  },

  createOrderRequest: async (
    input: OrderEntityCreateInput
  ): Promise<OrderRequestCreateApiResponse> => {
    return apiClient.post<OrderRequestCreateApiResponse, OrderEntityCreateInput>(
      API_ENDPOINTS.ORDER_REQUESTS.CREATE,
      input
    );
  },

  updateOrderRequest: async (
    id: string,
    input: OrderEntityCreateInput
  ): Promise<OrderRequestCreateApiResponse> => {
    return apiClient.put<OrderRequestCreateApiResponse, OrderEntityCreateInput>(
      `${API_ENDPOINTS.ORDER_REQUESTS.UPDATE}/${id}`,
      input
    );
  },

  updateStatus: async (
    id: string,
    status: string
  ): Promise<OrderRequestStatusUpdateApiResponse> => {
    return apiClient.patch<OrderRequestStatusUpdateApiResponse, { status: string }>(
      `${API_ENDPOINTS.ORDER_REQUESTS.STATUS}/${id}/status`,
      { status }
    );
  },

  updateVerification: async (
    id: string,
    data: {
      order_number?: string;
      order_status?: number | null;
      on_job_date?: string;
      on_job_time?: string;
    }
  ): Promise<{ success: boolean; message: string; data: { id: string } }> => {
    return apiClient.patch(
      `${API_ENDPOINTS.ORDER_REQUESTS.VERIFICATION}/${id}/verification`,
      data
    );
  },

  getMessages: async (id: string): Promise<OrderRequestMessagesApiResponse> => {
    return apiClient.get<OrderRequestMessagesApiResponse>(
      `${API_ENDPOINTS.ORDER_REQUESTS.MESSAGES}/${id}/messages`
    );
  },

  sendMessage: async (
    id: string,
    messageText: string,
    senderRole: string
  ): Promise<OrderRequestSendMessageApiResponse> => {
    return apiClient.post<
      OrderRequestSendMessageApiResponse,
      { message_text: string; sender_role: string }
    >(`${API_ENDPOINTS.ORDER_REQUESTS.MESSAGES}/${id}/messages`, {
      message_text: messageText,
      sender_role: senderRole,
    });
  },

  getFormData: async (): Promise<OrderRequestFormDataApiResponse> => {
    return apiClient.get<OrderRequestFormDataApiResponse>(
      API_ENDPOINTS.ORDER_REQUESTS.FORM_DATA
    );
  },

  searchOrders: async (q: string): Promise<OrderRequestSearchOrdersApiResponse> => {
    return apiClient.get<OrderRequestSearchOrdersApiResponse>(
      API_ENDPOINTS.ORDER_REQUESTS.SEARCH_ORDERS,
      { params: { q } }
    );
  },

  searchProducts: async (
    q: string,
    offset: number = 0,
    limit: number = 50
  ): Promise<OrderRequestSearchProductsApiResponse> => {
    return apiClient.get<OrderRequestSearchProductsApiResponse>(
      API_ENDPOINTS.ORDER_REQUESTS.SEARCH_PRODUCTS,
      { params: { q, offset, limit } }
    );
  },

  getRecentEntities: async (): Promise<{ success: boolean; data: { orders: { id: string; display: string; company_id: string | null }[] } }> => {
    return apiClient.get(API_ENDPOINTS.ORDER_REQUESTS.RECENT_ENTITIES);
  },

};

export default orderRequestService;

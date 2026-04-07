import apiClient from '../apiClient';
import { API_ENDPOINTS } from '../endpoints';
import {
  TicketsApiResponse,
  TicketsQueryParams,
  TicketsByOrderApiResponse,
  TicketsByOrderQueryParams,
  TicketDetailsApiResponse,
  TicketDetailsQueryParams,
} from '../../types/ticket';

export const ticketService = {
  getTickets: async (params?: TicketsQueryParams): Promise<TicketsApiResponse> => {
    return apiClient.get<TicketsApiResponse>(API_ENDPOINTS.TICKETS.LIST, {
      params,
    });
  },

  getTicketsByOrder: async (
    orderId: string,
    params?: TicketsByOrderQueryParams
  ): Promise<TicketsByOrderApiResponse> => {
    return apiClient.get<TicketsByOrderApiResponse>(
      `${API_ENDPOINTS.TICKETS.BY_ORDER}/${orderId}`,
      { params }
    );
  },

  getTicketDetails: async (
    params: TicketDetailsQueryParams
  ): Promise<TicketDetailsApiResponse> => {
    return apiClient.get<TicketDetailsApiResponse>(API_ENDPOINTS.TICKETS.DETAILS, {
      params,
    });
  },

  fetchTicketWeather: async (
    ticketId: string,
    forceRefresh = false
  ): Promise<{ success: boolean; data: { ticket_id: number; weather_data: any; cached: boolean; cache_age_minutes?: number } }> => {
    return apiClient.post(`${API_ENDPOINTS.TICKETS.WEATHER}/${ticketId}/weather`, {
      force_refresh: forceRefresh,
    });
  },
};

export default ticketService;

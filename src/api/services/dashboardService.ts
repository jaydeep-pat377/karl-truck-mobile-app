import apiClient from '../apiClient';
import { API_ENDPOINTS } from '../endpoints';
import { DashboardApiResponse } from '../../types/dashboard';

export type DashboardDateFilter = 'today' | 'yesterday' | 'next_week' | 'last_week';

export interface DashboardParams {
  date_filter?: DashboardDateFilter;
  page?: number;
  limit?: number;
}

export const dashboardService = {
  getDashboard: async (params?: DashboardParams): Promise<DashboardApiResponse> => {
    const queryParams: Record<string, string | number> = {};
    if (params?.date_filter) {
      queryParams.date_filter = params.date_filter;
    }
    if (params?.page) {
      queryParams.page = params.page;
    }
    if (params?.limit) {
      queryParams.limit = params.limit;
    }
    return apiClient.get<DashboardApiResponse>(API_ENDPOINTS.DASHBOARD.GET, { params: queryParams });
  },
};

export default dashboardService;

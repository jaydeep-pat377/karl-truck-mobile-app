import apiClient from '../apiClient';
import { API_ENDPOINTS } from '../endpoints';
import { DashboardApiResponse } from '../../types/dashboard';

export const dashboardService = {
  getDashboard: async (): Promise<DashboardApiResponse> => {
    return apiClient.get<DashboardApiResponse>(API_ENDPOINTS.DASHBOARD.GET);
  },
};

export default dashboardService;

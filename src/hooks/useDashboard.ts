import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '../api/services/dashboardService';
import { DashboardApiResponse, DashboardData } from '../types/dashboard';
import { AxiosError } from 'axios';

interface ApiErrorResponse {
  success?: boolean;
  message?: string;
}

export const useDashboard = () => {
  const query = useQuery<DashboardApiResponse, AxiosError<ApiErrorResponse>>({
    queryKey: ['dashboard'],
    queryFn: () => dashboardService.getDashboard(),
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 2,
    refetchOnMount: 'always',
  });

  // Console log API response for debugging
  console.log('==========================================');
  console.log('DASHBOARD API RESPONSE');
  console.log('------------------------------------------');
  console.log('Status:', query.status);
  console.log('isLoading:', query.isLoading);
  console.log('isError:', query.isError);
  console.log('Raw Response:', JSON.stringify(query.data, null, 2));
  if (query.error) {
    console.log('Error:', query.error.message);
    console.log('Error Response:', JSON.stringify(query.error.response?.data, null, 2));
  }
  console.log('==========================================');

  // Extract dashboard data from API response
  const dashboardData: DashboardData | null =
    query.data?.success ? query.data.data : null;

  const errorMessage =
    query.error?.response?.data?.message ||
    (query.error ? 'Failed to load dashboard' : null);

  return {
    data: dashboardData,
    user: dashboardData?.user ?? null,
    notifications: dashboardData?.notifications ?? null,
    weather: dashboardData?.weather ?? null,
    todayOverview: dashboardData?.today_overview ?? null,
    todayProgress: dashboardData?.today_progress ?? null,
    activeDeliveries: dashboardData?.active_deliveries ?? null,
    recentAlerts: dashboardData?.recent_alerts ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: errorMessage,
    refetch: query.refetch,
    isRefetching: query.isRefetching,
    isFetching: query.isFetching,
  };
};

export default useDashboard;

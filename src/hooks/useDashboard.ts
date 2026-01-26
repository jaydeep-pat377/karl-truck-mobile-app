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
    staleTime: 2 * 60 * 1000, // 2 minutes - data considered fresh
    gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache
    retry: 1, // Reduce retries for faster failure
    refetchOnMount: 'always',
    refetchOnWindowFocus: false, // Don't refetch on app focus
    placeholderData: (previousData) => previousData, // Show cached data while loading
  });

  // Extract dashboard data from API response
  const dashboardData: DashboardData | null =
    query.data?.success ? query.data.data : null;

  const errorMessage =
    query.error?.response?.data?.message ||
    (query.error ? 'Failed to load dashboard' : null);

  // Only show full loading state when there's no cached data
  const isInitialLoading = query.isLoading && !dashboardData;

  return {
    data: dashboardData,
    user: dashboardData?.user ?? null,
    notifications: dashboardData?.notifications ?? null,
    weather: dashboardData?.weather ?? null,
    todayOverview: dashboardData?.today_overview ?? null,
    todayProgress: dashboardData?.today_progress ?? null,
    activeDeliveries: dashboardData?.active_deliveries ?? null,
    recentAlerts: dashboardData?.recent_alerts ?? [],
    isLoading: isInitialLoading, // Only true when no cached data
    isError: query.isError,
    error: errorMessage,
    refetch: query.refetch,
    isRefetching: query.isRefetching,
    isFetching: query.isFetching,
  };
};

export default useDashboard;

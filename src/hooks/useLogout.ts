import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { authService } from '../api/services/authService';
import { AxiosError } from 'axios';
import { clearWidgetData } from '../modules/TodayOverviewWidget';
import { useNotificationStore } from '../store/notificationStore';

interface LogoutResponse {
  success: boolean;
  message: string;
}

interface ApiErrorResponse {
  success?: boolean;
  message?: string;
}

export const useLogout = () => {
  const { logout: clearAuth } = useAuthStore();
  const { fcmToken } = useNotificationStore();

  const mutation = useMutation<LogoutResponse, AxiosError<ApiErrorResponse>, void>({
    mutationFn: async () => {
      return authService.logout(fcmToken ?? undefined);
    },
    onSettled: async () => {
      await clearAuth();

      await clearWidgetData();
    },
  });

  const logout = async () => {
    try {
      await mutation.mutateAsync();
    } catch (error) {
      console.log('Logout API error:', error);
    }
  };

  return {
    logout,
    isLoading: mutation.isPending,
  };
};

export default useLogout;

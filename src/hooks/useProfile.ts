import { useQuery } from '@tanstack/react-query';
import { userService } from '../api/services/userService';
import { ProfileResponse, UserProfile } from '../types/user';
import { AxiosError } from 'axios';

interface ApiErrorResponse {
  success?: boolean;
  message?: string;
}

export const useProfile = () => {
  const query = useQuery<ProfileResponse, AxiosError<ApiErrorResponse>>({
    queryKey: ['userProfile'],
    queryFn: () => userService.getProfile(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    refetchOnMount: 'always', // Always refetch when component mounts
  });

  const profile: UserProfile | null = query.data?.success ? query.data.data : null;

  const errorMessage =
    query.error?.response?.data?.message ||
    (query.error ? 'Failed to load profile' : null);

  return {
    profile,
    isLoading: query.isLoading,
    isError: query.isError,
    error: errorMessage,
    refetch: query.refetch,
    isRefetching: query.isRefetching,
  };
};

export default useProfile;

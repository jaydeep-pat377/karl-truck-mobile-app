import { useMutation, useQueryClient } from '@tanstack/react-query';
import { userService, UpdateProfileRequest } from '../api/services/userService';
import { ProfileResponse } from '../types/user';
import { AxiosError } from 'axios';

interface ApiErrorResponse {
  success?: boolean;
  message?: string;
}

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ProfileResponse, AxiosError<ApiErrorResponse>, UpdateProfileRequest>({
    mutationFn: (data: UpdateProfileRequest) => userService.updateProfile(data),
    onSuccess: (response) => {
      if (response.success) {
        // Invalidate and refetch the profile query to update cached data
        queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      }
    },
  });

  const updateProfile = async (data: UpdateProfileRequest) => {
    return mutation.mutateAsync(data);
  };

  const errorMessage =
    mutation.error?.response?.data?.message ||
    (mutation.error ? 'Failed to update profile' : null);

  return {
    updateProfile,
    isLoading: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    error: errorMessage,
    reset: mutation.reset,
  };
};

export default useUpdateProfile;

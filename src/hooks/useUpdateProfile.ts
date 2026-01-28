import { useMutation, useQueryClient } from '@tanstack/react-query';
import { userService, UpdateProfileRequest, AvatarUploadResponse } from '../api/services/userService';
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
        // Invalidate and refetch the profile and dashboard queries to update cached data
        queryClient.invalidateQueries({ queryKey: ['userProfile'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      }
    },
  });

  const avatarMutation = useMutation<AvatarUploadResponse, AxiosError<ApiErrorResponse>, string>({
    mutationFn: (imageUri: string) => userService.uploadAvatar(imageUri),
    onSuccess: (response) => {
      if (response.success) {
        // Invalidate both queries so avatar updates everywhere
        queryClient.invalidateQueries({ queryKey: ['userProfile'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      }
    },
  });

  const updateProfile = async (data: UpdateProfileRequest) => {
    return mutation.mutateAsync(data);
  };

  const uploadAvatar = async (imageUri: string) => {
    return avatarMutation.mutateAsync(imageUri);
  };

  const errorMessage =
    mutation.error?.response?.data?.message ||
    avatarMutation.error?.response?.data?.message ||
    (mutation.error || avatarMutation.error ? 'Failed to update profile' : null);

  return {
    updateProfile,
    uploadAvatar,
    isLoading: mutation.isPending || avatarMutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError || avatarMutation.isError,
    error: errorMessage,
    reset: () => {
      mutation.reset();
      avatarMutation.reset();
    },
  };
};

export default useUpdateProfile;

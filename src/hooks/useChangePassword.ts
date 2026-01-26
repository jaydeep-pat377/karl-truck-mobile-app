import { useMutation } from '@tanstack/react-query';
import { authService, ChangePasswordRequest, ChangePasswordResponse } from '../api/services/authService';
import { AxiosError } from 'axios';

interface ApiErrorResponse {
  success?: boolean;
  message?: string;
}

export const useChangePassword = () => {
  const mutation = useMutation<ChangePasswordResponse, AxiosError<ApiErrorResponse>, ChangePasswordRequest>({
    mutationFn: (data: ChangePasswordRequest) => authService.changePassword(data),
  });

  const changePassword = async (data: ChangePasswordRequest) => {
    return mutation.mutateAsync(data);
  };

  const errorMessage =
    mutation.error?.response?.data?.message ||
    (mutation.error ? 'Failed to change password' : null);

  return {
    changePassword,
    isLoading: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    error: errorMessage,
    reset: mutation.reset,
  };
};

export default useChangePassword;

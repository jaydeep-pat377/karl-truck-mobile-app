import { useMutation } from '@tanstack/react-query';
import { authService, ForgotPasswordResponse } from '../api/services/authService';
import { AxiosError } from 'axios';

interface ForgotPasswordParams {
  email: string;
}

interface ApiErrorResponse {
  success?: boolean;
  message?: string;
  error?: string;
}

export const useForgotPassword = () => {
  const mutation = useMutation<ForgotPasswordResponse, AxiosError<ApiErrorResponse>, ForgotPasswordParams>({
    mutationFn: async ({ email }: ForgotPasswordParams) => {
      return authService.forgotPassword({ email });
    },
  });

  const forgotPassword = async (email: string) => {
    return mutation.mutateAsync({ email });
  };

  const errorMessage =
    mutation.error?.response?.data?.message ||
    mutation.error?.response?.data?.error ||
    (mutation.error ? 'Failed to send reset link. Please try again.' : null);

  const successMessage = mutation.data?.message || null;

  return {
    forgotPassword,
    isLoading: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    error: errorMessage,
    successMessage,
    reset: mutation.reset,
  };
};

export default useForgotPassword;

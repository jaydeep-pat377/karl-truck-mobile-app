import apiClient from '../apiClient';
import { API_ENDPOINTS } from '../endpoints';
import { LoginRequest, LoginResponse, User } from '../../types/user';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface VerifyOTPRequest {
  email: string;
  otp: string;
}

export interface ForgotPasswordResponse {
  success: boolean;
  message: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export interface ChangePasswordResponse {
  success: boolean;
  message: string;
}

export const authService = {
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    // Debug logging for login issues
    console.log('\n========== LOGIN DEBUG ==========');
    console.log('Email:', `"${credentials.email}"`);
    console.log('Email length:', credentials.email.length);
    console.log('Email has leading space:', credentials.email.startsWith(' '));
    console.log('Email has trailing space:', credentials.email.endsWith(' '));
    console.log('Password length:', credentials.password.length);
    console.log('Password has leading space:', credentials.password.startsWith(' '));
    console.log('Password has trailing space:', credentials.password.endsWith(' '));
    console.log('Device info:', JSON.stringify(credentials.device_info, null, 2));
    console.log('==================================\n');

    try {
      const response = await apiClient.post<LoginResponse>(API_ENDPOINTS.AUTH.LOGIN, credentials);
      console.log('\n========== LOGIN RESPONSE ==========');
      console.log('Success:', response.success);
      console.log('Message:', response.message);
      console.log('Has user data:', !!response.data?.user);
      console.log('Has access token:', !!response.data?.accessToken);
      console.log('=====================================\n');
      return response;
    } catch (error: any) {
      console.log('\n========== LOGIN ERROR ==========');
      console.log('Error message:', error?.message);
      console.log('Response status:', error?.response?.status);
      console.log('Response data:', JSON.stringify(error?.response?.data, null, 2));
      console.log('Error code:', error?.code);
      console.log('=================================\n');
      throw error;
    }
  },

  logout: async (deviceToken?: string): Promise<{ success: boolean; message: string }> => {
    return apiClient.post(API_ENDPOINTS.AUTH.LOGOUT, {
      device_token: deviceToken,
    });
  },

  refreshToken: async (refreshToken: string): Promise<ApiResponse<{ accessToken: string }>> => {
    return apiClient.post(API_ENDPOINTS.AUTH.REFRESH, { refreshToken });
  },

  getMe: async (): Promise<ApiResponse<{ user: User }>> => {
    return apiClient.get(API_ENDPOINTS.AUTH.ME);
  },

  forgotPassword: async (data: ForgotPasswordRequest): Promise<ForgotPasswordResponse> => {
    return apiClient.post<ForgotPasswordResponse>(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, data);
  },

  changePassword: async (data: ChangePasswordRequest): Promise<ChangePasswordResponse> => {
    return apiClient.post<ChangePasswordResponse>(API_ENDPOINTS.AUTH.CHANGE_PASSWORD, data);
  },

  getAppPermissions: async (): Promise<{ success: boolean; data: { permissions: string[] } }> => {
    return apiClient.get(API_ENDPOINTS.AUTH.APP_PERMISSIONS);
  },
};

export default authService;

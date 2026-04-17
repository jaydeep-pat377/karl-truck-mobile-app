import axios from 'axios';
import apiClient from '../apiClient';
import { API_ENDPOINTS } from '../endpoints';
import { LoginRequest, LoginResponse, MobileLoginResponse, FederatedLoginResponse, ExchangeCodeRequest, User } from '../../types/user';
import { FEDERATED_AUTH_URL } from '@env';

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

const FEDERATED_URL = FEDERATED_AUTH_URL || 'https://admin.truckast.ai/api';

export const authService = {
  /**
   * Federated login — calls admin server to get tenant backend_url.
   */
  federatedLogin: async (email: string, password: string): Promise<FederatedLoginResponse> => {
    const url = `${FEDERATED_URL}/federated-auth/login`;
    const body = { email, password };
    console.log(`[API Request] POST ${url}`);
    console.log('[API Request] Body:', JSON.stringify({ email: body.email, password: '***' }, null, 2));
    try {
      const response = await axios.post<FederatedLoginResponse>(
        url,
        body,
        { headers: { 'Content-Type': 'application/json' } },
      );
      console.log(`[API Response] POST ${url} — Status: ${response.status}`);
      console.log('[API Response] Data:', JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error: any) {
      console.error(`[API Error] POST ${url} — Status: ${error?.response?.status}`);
      console.error('[API Error] Message:', error?.message);
      if (error?.response?.data) {
        console.error('[API Error] Response:', JSON.stringify(error.response.data, null, 2));
      }
      throw error;
    }
  },

  /**
   * Step 1: Mobile login — uses dynamic backend_url, returns auth code + client_secret.
   */
  mobileLogin: async (email: string, password: string): Promise<MobileLoginResponse> => {
    return apiClient.post<MobileLoginResponse>(API_ENDPOINTS.AUTH.MOBILE_LOGIN, { email, password });
  },

  /**
   * Step 2: Exchange code — sends code + client_secret + device_info, returns user + tokens.
   */
  exchangeCode: async (request: ExchangeCodeRequest): Promise<LoginResponse> => {
    return apiClient.post<LoginResponse>(API_ENDPOINTS.AUTH.EXCHANGE_CODE, request);
  },

  /**
   * Full two-step login flow: mobileLogin -> exchangeCode.
   */
  login: async (credentials: LoginRequest, federatedClientSecret?: string): Promise<LoginResponse> => {
    // Step 1: Get auth code
    let mobileLoginResponse: MobileLoginResponse;
    try {
      mobileLoginResponse = await authService.mobileLogin(credentials.email, credentials.password);
    } catch (error: any) {
      console.error('[Auth] Step 1 - mobile/login error:', error?.message);
      throw error;
    }

    if (!mobileLoginResponse.success || !mobileLoginResponse.data?.code) {
      console.error('[Auth] Step 1 - mobile/login failed:', mobileLoginResponse.message);
      throw new Error(mobileLoginResponse.message || 'Login failed');
    }

    // Use client_secret from federated login if mobile/login didn't return one
    const clientSecret = mobileLoginResponse.data.client_secret || federatedClientSecret;

    // Step 2: Exchange code for tokens
    let exchangeResponse: LoginResponse;
    try {
      exchangeResponse = await authService.exchangeCode({
        code: mobileLoginResponse.data.code,
        client_secret: clientSecret,
        device_info: credentials.device_info,
      });
    } catch (error: any) {
      console.error('[Auth] Step 2 - exchange-code error:', error?.message);
      throw error;
    }

    return exchangeResponse;
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

  getAppPermissions: async (): Promise<{ success: boolean; data: { permissions: string[]; showRegion?: boolean } }> => {
    return apiClient.get(API_ENDPOINTS.AUTH.APP_PERMISSIONS);
  },
};

export default authService;

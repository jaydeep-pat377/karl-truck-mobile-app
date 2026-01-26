import { AxiosRequestConfig, AxiosResponse } from 'axios';
import axiosInstance from './axiosInstance';

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface ApiError {
  message: string;
  statusCode: number;
  errors?: Record<string, string[]>;
}

class ApiClient {
  private logRequest(method: string, url: string, data?: unknown, config?: AxiosRequestConfig) {
    console.log('\n========== API REQUEST ==========');
    console.log(`[${method}] ${url}`);
    if (config?.params) {
      console.log('Params:', JSON.stringify(config.params, null, 2));
    }
    if (data) {
      console.log('Body:', JSON.stringify(data, null, 2));
    }
    console.log('=================================\n');
  }

  private logResponse(method: string, url: string, response: unknown) {
    console.log('\n========== API RESPONSE ==========');
    console.log(`[${method}] ${url}`);
    console.log('Response:', JSON.stringify(response, null, 2));
    console.log('==================================\n');
  }

  private logError(method: string, url: string, error: unknown) {
    console.log('\n========== API ERROR ==========');
    console.log(`[${method}] ${url}`);
    console.log('Error:', error);
    console.log('================================\n');
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    this.logRequest('GET', url, undefined, config);
    try {
      const response: AxiosResponse<T> = await axiosInstance.get(url, config);
      this.logResponse('GET', url, response.data);
      return response.data;
    } catch (error) {
      this.logError('GET', url, error);
      throw error;
    }
  }

  async post<T, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig): Promise<T> {
    this.logRequest('POST', url, data, config);
    try {
      const response: AxiosResponse<T> = await axiosInstance.post(url, data, config);
      this.logResponse('POST', url, response.data);
      return response.data;
    } catch (error) {
      this.logError('POST', url, error);
      throw error;
    }
  }

  async put<T, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig): Promise<T> {
    this.logRequest('PUT', url, data, config);
    try {
      const response: AxiosResponse<T> = await axiosInstance.put(url, data, config);
      this.logResponse('PUT', url, response.data);
      return response.data;
    } catch (error) {
      this.logError('PUT', url, error);
      throw error;
    }
  }

  async patch<T, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig): Promise<T> {
    this.logRequest('PATCH', url, data, config);
    try {
      const response: AxiosResponse<T> = await axiosInstance.patch(url, data, config);
      this.logResponse('PATCH', url, response.data);
      return response.data;
    } catch (error) {
      this.logError('PATCH', url, error);
      throw error;
    }
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    this.logRequest('DELETE', url, undefined, config);
    try {
      const response: AxiosResponse<T> = await axiosInstance.delete(url, config);
      this.logResponse('DELETE', url, response.data);
      return response.data;
    } catch (error) {
      this.logError('DELETE', url, error);
      throw error;
    }
  }
}

export const apiClient = new ApiClient();
export default apiClient;

import axios from 'axios';
import apiClient from '../apiClient';
import { API_ENDPOINTS } from '../endpoints';
import { FEDERATED_AUTH_URL } from '@env';

const FEDERATED_URL = FEDERATED_AUTH_URL || 'https://admin.truckast.ai/api';

export interface ShortUrlResolveResponse {
  success: boolean;
  message: string;
  data: {
    tenant_slug: string;
    tenant_subdomain?: string;
    original_url: string;
  } | null;
  error_code?: string;
}

/**
 * Resolve a short URL code via the federated (central) server.
 * This works for ANY tenant's short URLs since the federated server
 * has access to the central short URL table.
 */
export async function resolveShortUrlFederated(code: string): Promise<ShortUrlResolveResponse> {
  try {
    const response = await axios.get<ShortUrlResolveResponse>(
      `${FEDERATED_URL}/short-urls/resolve/${encodeURIComponent(code)}`,
      { headers: { 'Content-Type': 'application/json' } },
    );
    return response.data;
  } catch (error: any) {
    return {
      success: false,
      message: error?.response?.data?.message || 'Resolution failed',
      data: null,
      error_code: error?.response?.data?.error_code,
    };
  }
}

/**
 * Resolve a short URL code via the current tenant's backend.
 * Only works for short URLs that belong to the current tenant.
 */
export async function resolveShortUrl(code: string): Promise<ShortUrlResolveResponse> {
  return apiClient.get<ShortUrlResolveResponse>(
    `${API_ENDPOINTS.SHORT_URLS.RESOLVE}/${encodeURIComponent(code)}`
  );
}

export const shortUrlService = {
  resolveShortUrl,
  resolveShortUrlFederated,
};

export default shortUrlService;

import apiClient from '../apiClient';
import { API_ENDPOINTS } from '../endpoints';

export interface ShortUrlResolveResponse {
  success: boolean;
  message: string;
  data: {
    tenant_slug: string;
    original_url: string;
  } | null;
  error_code?: string;
}

/**
 * Resolve a short URL code to its original URL and tenant slug
 * @param code - The short URL code (last segment of /dl/{code})
 */
export async function resolveShortUrl(code: string): Promise<ShortUrlResolveResponse> {
  return apiClient.get<ShortUrlResolveResponse>(
    `${API_ENDPOINTS.SHORT_URLS.RESOLVE}/${encodeURIComponent(code)}`
  );
}

export const shortUrlService = {
  resolveShortUrl,
};

export default shortUrlService;

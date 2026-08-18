/**
 * ODP data fetcher - uses backend API instead of direct Supabase queries.
 */

import apiClient from '../api/apiClient';
import { API_ENDPOINTS } from '../api/endpoints';
import type { ODPRawForReducer } from '../types/ticket';

/**
 * Fetch raw ODP inputs from the backend API.
 *
 * @param orderCode  Order code
 * @param orderDate  Date string
 * @param orderId    Numeric order_id
 *
 * @returns An `ODPRawForReducer` payload or null on failure.
 */
export async function fetchOdpRawFromSupabase(
  orderCode: string,
  orderDate: string,
  orderId: number | string,
): Promise<ODPRawForReducer | null> {
  try {
    const res = await apiClient.get<{ success: boolean; data: any }>(
      API_ENDPOINTS.DAILY_INTELLIGENCE.ODP,
      {
        params: {
          order_code: orderCode,
          order_date: orderDate,
          order_id: orderId,
        },
      },
    );

    if (res.success && res.data) {
      return res.data as ODPRawForReducer;
    }
    return null;
  } catch (err) {
    console.warn(
      '[odpFetcher] unexpected error:',
      err instanceof Error ? err.message : String(err),
    );
    return null;
  }
}

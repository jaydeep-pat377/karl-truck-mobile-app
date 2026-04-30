import { axiosInstance } from '../axiosInstance';
import type {
  TKQRData,
  APITicketDetails,
  APIDetails,
  VerificationStatus,
  ScanRecord,
  Pagination,
} from '../../types/qrScan';

// ── QR Verification ──
// Backend only has POST /api/qr/verify — handles both decryption and verification.

interface QrVerifyResponse {
  success: boolean;
  message?: string;
  data?: {
    success: boolean;
    kind: string;
    qrData: TKQRData;
    security_mode?: {
      mode: string;
      scannable_statuses: string[];
    } | null;
    details: {
      ticket?: APITicketDetails;
      truck?: {
        code: string;
        description: string;
        current_driver_name: string | null;
        ticket_status: string | null;
        order_code: string | null;
        customer_name: string | null;
        delivery_address: string | null;
        plant_name: string | null;
        [key: string]: unknown;
      };
      order?: {
        order_id: number;
        order_code: string;
        order_date: string | null;
        customer_name: string;
        project_name?: string;
        delivery_address?: string;
        ordered_by_name?: string | null;
        ordered_by_phone?: string | null;
      };
      summary?: {
        total_tickets: number;
        total_delivered_qty: number;
        ordered_qty: number;
        progress_display: string;
      };
    };
  };
  error_code?: string;
}

export type VerifyResult = {
  status: VerificationStatus;
  qrData?: TKQRData;
  apiData?: APIDetails;
  orderCode?: string;
  message?: string;
};

export async function verifyQRPayload(
  rawPayload: string,
  userRole?: string,
): Promise<VerifyResult> {
  try {
    const response = await axiosInstance.post<QrVerifyResponse>(
      '/qr/verify',
      { payload: rawPayload },
      { _silentError: true } as any,
    );
    const data = response.data;

    if (data.success && data.data) {
      const { kind, qrData, details, security_mode } = data.data;

      // Security mode checks
      if (security_mode?.mode === 'qr_login_required') {
        if (userRole !== 'QR Code User') {
          return {
            status: 'unauthorized',
            message: 'This is a secure QR code. Please login with a QR authenticated user to access this ticket.',
          };
        }
      }

      if (security_mode?.mode === 'time_bound') {
        const scannableStatuses = security_mode.scannable_statuses || [];
        const statusDisplay = details?.ticket?.status_display || '';
        if (!scannableStatuses.some(s => s.toLowerCase() === statusDisplay.toLowerCase())) {
          return {
            status: 'error',
            message: 'This ticket status does not allow viewing details.',
          };
        }
      }

      if (kind === 'ticket' && details.ticket) {
        const t = details.ticket;
        const o = details.order;
        const enrichedTicket: APITicketDetails = {
          ...t,
          order_code: o?.order_code ?? t.order_code,
          order_date: o?.order_date ?? t.order_date ?? undefined,
          customer_name: o?.customer_name ?? t.customer_name,
          project_name: o?.project_name ?? t.project_name,
          delivery_address: o?.delivery_address ?? t.delivery_address,
          ordered_by_name: t.ordered_by_name ?? o?.ordered_by_name ?? undefined,
          ordered_by_phone: t.ordered_by_phone ?? o?.ordered_by_phone ?? undefined,
          progress_display: details.summary?.progress_display,
        };
        return { status: 'verified', qrData, apiData: enrichedTicket };
      }

      if (kind === 'truck' && details.truck) {
        return { status: 'verified', qrData, apiData: details.truck as unknown as APIDetails };
      }
    }

    // Non-success responses
    const errorCode = data.error_code;
    if (errorCode === 'NOT_FOUND') {
      return { status: 'not_found', message: data.message || 'Ticket not found' };
    }
    if (errorCode === 'DECRYPT_FAILED' || errorCode === 'INVALID_FORMAT' || errorCode === 'UNKNOWN_FORMAT') {
      return { status: 'error', message: data.message || 'Invalid QR code' };
    }

    return { status: 'error', message: data.message || 'QR verification failed' };
  } catch (err: any) {
    if (!err?.response) {
      return { status: 'offline', message: 'No network connection' };
    }
    if (err?.response?.status === 401) {
      return { status: 'unauthorized', message: 'Session expired' };
    }
    if (err?.response?.status === 403) {
      return { status: 'unauthorized', message: err?.response?.data?.message || 'Access denied' };
    }
    if (err?.response?.status === 404) {
      return { status: 'not_found', message: err?.response?.data?.message || 'Not found' };
    }
    if (err?.response?.status === 400) {
      return { status: 'error', message: err?.response?.data?.message || 'Invalid QR code' };
    }
    return { status: 'error', message: 'Verification failed' };
  }
}

// ── QR Encryption (for generating same QR as web) ──

interface QrEncryptResponse {
  ok: boolean;
  payload?: string;
  error?: string;
}

export interface QrEncryptParams {
  kind: 'ticket' | 'truck';
  orderCode?: string;
  orderId?: string;
  ticketCode?: string;
  ticketId?: string;
  truckCode?: string;
  truckId?: string;
}

export async function encryptQRPayload(
  params: QrEncryptParams,
): Promise<string | null> {
  try {
    const response = await axiosInstance.post<QrEncryptResponse>(
      '/qr/encrypt',
      params,
      { _silentError: true } as any,
    );
    if (response.data.ok && response.data.payload) {
      return response.data.payload;
    }
    return null;
  } catch {
    return null;
  }
}

// ── Scan History API ──

interface ScanHistoryResponse {
  success: boolean;
  data: ScanRecord[];
  pagination: Pagination;
}

interface SaveScanResponse {
  success: boolean;
  data: ScanRecord;
}

export async function fetchScanHistory(
  page: number = 1,
  limit: number = 20,
): Promise<{ records: ScanRecord[]; pagination: Pagination }> {
  const response = await axiosInstance.get<ScanHistoryResponse>('/scan-history', {
    params: { page, limit },
    _silentError: true,
  } as any);
  return { records: response.data.data, pagination: response.data.pagination };
}

export async function saveScanRemote(record: ScanRecord): Promise<ScanRecord> {
  const response = await axiosInstance.post<SaveScanResponse>('/scan-history', record, {
    _silentError: true,
  } as any);
  return response.data.data;
}

export async function deleteScanRemote(id: string): Promise<void> {
  await axiosInstance.delete(`/scan-history/${id}`, {
    _silentError: true,
  } as any);
}

export async function clearScanHistoryRemote(): Promise<void> {
  await axiosInstance.delete('/scan-history', {
    _silentError: true,
  } as any);
}

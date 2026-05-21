import { axiosInstance } from '../axiosInstance';
import { API_ENDPOINTS } from '../endpoints';
import type {
  TKQRData,
  TKTicketData,
  TKTruckData,
  FullTicket,
  APITicketDetails,
  APIDetails,
  VerificationStatus,
  ScanRecord,
  Pagination,
} from '../../types/qrScan';

// ── Response types ──

interface QrDecryptResponse {
  ok: boolean;
  kind?: string;
  ticket?: FullTicket;
  orderCode?: string;
  tenant?: {
    id: string | null;
    uuid: string | null;
    subdomain: string | null;
    status: string | null;
    name: string | null;
  };
  meta?: {
    orderId: string | number;
    truckCode: string;
    truckId: string | number;
    issuedAt: number;
  };
  truck?: { code: string };
  error?: string;
}

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

// ── QR Verification ──

export async function verifyQRPayload(
  rawPayload: string,
  userRole?: string,
): Promise<VerifyResult> {
  // Try verify endpoint first (auth required, returns richer data)
  const verifyResult = await tryVerifyEndpoint(rawPayload, userRole);
  if (verifyResult.status !== 'error' && verifyResult.status !== 'not_found') {
    return verifyResult;
  }

  // Fall back to decrypt endpoint (no auth, handles truck QR on supported backends)
  const decryptResult = await tryDecryptEndpoint(rawPayload);
  if (decryptResult) return decryptResult;

  // Return the original verify result if decrypt also failed
  return verifyResult;
}

async function tryVerifyEndpoint(
  rawPayload: string,
  userRole?: string,
): Promise<VerifyResult> {
  try {
    const response = await axiosInstance.post<QrVerifyResponse>(
      API_ENDPOINTS.QR.VERIFY,
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
        let statusToCheck = '';

        if (kind === 'ticket') {
          statusToCheck = details?.ticket?.status_display || '';
        } else if (kind === 'truck') {
          statusToCheck = (details?.truck as any)?.ticket_status || '';
        }

        if (statusToCheck && !scannableStatuses.some(s => s.toLowerCase() === statusToCheck.toLowerCase())) {
          const label = kind === 'ticket' ? 'ticket' : 'truck';
          return {
            status: 'error',
            message: `This ${label} status (${statusToCheck}) does not allow viewing details.`,
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

async function tryDecryptEndpoint(
  rawPayload: string,
): Promise<VerifyResult | null> {
  try {
    const response = await axiosInstance.post<QrDecryptResponse>(
      API_ENDPOINTS.QR.DECRYPT,
      { payload: rawPayload },
      { _silentError: true } as any,
    );
    const data = response.data;

    if (!data.ok) return null;

    if (data.kind === 'truck' && data.truck) {
      const qrData: TKTruckData = {
        kind: 'truck',
        truckCode: data.truck.code,
        tenantId: String(data.tenant?.id || ''),
        tenantUuid: data.tenant?.uuid || '',
        tenantSubdomain: data.tenant?.subdomain || '',
        tenantStatus: data.tenant?.status || 'active',
        tenantName: data.tenant?.name || '',
        sig: '',
        iat: data.meta?.issuedAt || Date.now(),
      };
      return { status: 'verified', qrData };
    }

    if (data.kind === 'ticket' && data.ticket) {
      const ticket = data.ticket;
      const qrData: TKTicketData = {
        kind: 'ticket',
        orderCode: data.orderCode || ticket.order_code || '',
        orderId: String(data.meta?.orderId || ''),
        ticketCode: ticket.ticket_code,
        ticketId: String(ticket.ticket_id),
        truckCode: ticket.truck_code || String(data.meta?.truckCode || ''),
        truckId: String(data.meta?.truckId || ''),
        tenantId: String(data.tenant?.id || ''),
        tenantUuid: data.tenant?.uuid || '',
        tenantSubdomain: data.tenant?.subdomain || '',
        tenantStatus: data.tenant?.status || 'active',
        tenantName: data.tenant?.name || '',
        sig: '',
        iat: data.meta?.issuedAt || Date.now(),
      };

      const mix = (ticket.ticket_products || []).find(x => x.is_mix) || (ticket.ticket_products || [])[0];
      const deliveryAddr = [ticket.delivery_addr1, ticket.delivery_addr2, ticket.delivery_addr3]
        .filter(p => p && p.trim())
        .join(', ');

      const apiData: APITicketDetails = {
        load: '',
        ticket_code: ticket.ticket_code,
        truck: ticket.truck_code ? {
          truck_code: ticket.truck_code,
          truck_description: '',
          latitude: null,
          longitude: null,
        } : null,
        plant_location: { latitude: null, longitude: null },
        order_location: { latitude: null, longitude: null },
        load_qty: mix?.load_qty != null ? String(mix.load_qty) : null,
        run_qty_ord_qty: null,
        running_qty: 0,
        ordered_qty: mix?.order_qty ?? 0,
        status: ticket.current_status || '',
        status_display: ticket.current_status || '',
        remove_reason_code: ticket.remove_reason_code,
        product: mix?.description ?? null,
        timestamps: {
          eta_at_job: null,
          ticketed: ticket.printed_time,
          loading: ticket.load_time,
          loaded: ticket.loaded_time,
          to_job: ticket.to_job_time,
          at_job: ticket.on_job_time,
          pouring: ticket.unload_time,
          washing: ticket.wash_time,
          to_plant: ticket.to_plant_time,
          at_plant: ticket.at_plant_time,
        },
        order_code: ticket.order_code,
        order_date: ticket.order_date ?? undefined,
        customer_name: ticket.customer_name,
        project_name: ticket.project_name ?? undefined,
        delivery_address: deliveryAddr || undefined,
        driver_name: ticket.driver_name ?? undefined,
        plant_name: ticket.plant_name ?? undefined,
        ordered_by_name: ticket.ordered_by_name ?? undefined,
        ordered_by_phone: ticket.ordered_by_phone ?? undefined,
        purchase_order: ticket.purchase_order ?? undefined,
        customer_job: ticket.customer_job ?? undefined,
        ticket_products: ticket.ticket_products ?? undefined,
        slump: ticket.slump ?? undefined,
        plant_address: ticket.plant_address ?? undefined,
      };

      return {
        status: 'verified',
        qrData,
        apiData,
        orderCode: data.orderCode,
      };
    }

    return null;
  } catch {
    // Silently fail — decrypt endpoint may not exist on all backends
    return null;
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
      API_ENDPOINTS.QR.ENCRYPT,
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
  const response = await axiosInstance.get<ScanHistoryResponse>(API_ENDPOINTS.SCAN_HISTORY.LIST, {
    params: { page, limit },
    _silentError: true,
  } as any);
  return { records: response.data.data, pagination: response.data.pagination };
}

export async function saveScanRemote(record: ScanRecord): Promise<ScanRecord> {
  const response = await axiosInstance.post<SaveScanResponse>(API_ENDPOINTS.SCAN_HISTORY.SAVE, record, {
    _silentError: true,
  } as any);
  return response.data.data;
}

export async function deleteScanRemote(id: string): Promise<void> {
  await axiosInstance.delete(`${API_ENDPOINTS.SCAN_HISTORY.DELETE}/${id}`, {
    _silentError: true,
  } as any);
}

export async function clearScanHistoryRemote(): Promise<void> {
  await axiosInstance.delete(API_ENDPOINTS.SCAN_HISTORY.CLEAR, {
    _silentError: true,
  } as any);
}

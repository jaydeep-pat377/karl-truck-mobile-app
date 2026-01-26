/**
 * Truck API Types
 */

// Truck status type
export type TruckStatus =
  | 'delivered'
  | 'pouring'
  | 'on_job'
  | 'at_job'
  | 'at_plant'
  | 'loaded'
  | 'to_job'
  | 'to_plant'
  | 'washing'
  | 'loading'
  | 'ticketed'
  | 'idle';

// API Truck from response
export interface ApiTruck {
  truck_id: number;
  code: string;
  description?: string;
  ticket_status?: string;
  current_driver_id?: number;
  current_driver_name?: string;
  latitude?: string | number | null;
  longitude?: string | number | null;
  ticket_code?: string;
  order_code?: string;
  customer_name?: string;
  load_qty?: string;
  destination?: string;
  eta?: string;
  timestamp?: string;
  timestamp_display?: string;
  created_at?: string;
  updated_at?: string;
}

// Full API Response (pagination fields at root level)
export interface TrucksApiResponse {
  success: boolean;
  data: ApiTruck[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// Pagination type for convenience
export interface TrucksPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// Query params for API request
export interface TrucksQueryParams {
  page?: number;
  pageSize?: number;
  sortBy?: 'created_at' | 'truck_code' | 'status';
  sortOrder?: 'asc' | 'desc';
  dateFrom?: string; // Format: YYYY-MM-DD
  dateTo?: string; // Format: YYYY-MM-DD
  search?: string;
}

// UI Truck type (mapped from API)
export interface Truck {
  id: string;
  truckCode: string;
  ticketCode?: string;
  driverName?: string;
  status: TruckStatus;
  statusDisplay: string;
  latitude: number;
  longitude: number;
  destination?: string;
  eta?: string;
  orderCode?: string;
  customerName?: string;
  loadQty?: string;
  timestampDisplay?: string;
}

// Map ticket_status to TruckStatus
const mapTicketStatusToTruckStatus = (ticketStatus?: string): TruckStatus => {
  if (!ticketStatus) return 'idle';
  const statusMap: Record<string, TruckStatus> = {
    delivered: 'delivered',
    pouring: 'pouring',
    on_job: 'on_job',
    at_job: 'at_job',
    at_plant: 'at_plant',
    loaded: 'loaded',
    to_job: 'to_job',
    to_plant: 'to_plant',
    washing: 'washing',
    loading: 'loading',
    ticketed: 'ticketed',
    idle: 'idle',
  };
  return statusMap[ticketStatus.toLowerCase()] || 'idle';
};

// Helper function to map API truck to UI truck
export const mapApiTruckToTruck = (apiTruck: ApiTruck): Truck => {
  const lat = apiTruck.latitude;
  const lng = apiTruck.longitude;

  return {
    id: String(apiTruck.truck_id),
    truckCode: apiTruck.code,
    ticketCode: apiTruck.ticket_code,
    driverName: apiTruck.current_driver_name,
    status: mapTicketStatusToTruckStatus(apiTruck.ticket_status),
    statusDisplay: apiTruck.ticket_status || 'Idle',
    latitude: lat ? (typeof lat === 'string' ? parseFloat(lat) : lat) : 0,
    longitude: lng ? (typeof lng === 'string' ? parseFloat(lng) : lng) : 0,
    destination: apiTruck.destination,
    eta: apiTruck.eta,
    orderCode: apiTruck.order_code,
    customerName: apiTruck.customer_name,
    loadQty: apiTruck.load_qty,
    timestampDisplay: apiTruck.timestamp_display,
  };
};

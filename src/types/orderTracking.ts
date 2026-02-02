/**
 * Order Tracking Types
 * Types for the /api/orders/tracking/:orderId endpoint
 */

// Plant information
export interface TrackingPlant {
  code: string;
  description: string;
  address: string;
  address1: string;
  address2: string;
  phone: string;
  latitude: number;
  longitude: number;
}

// Ticket plant (simplified)
export interface TicketPlant {
  code: string;
  name: string;
  latitude: number;
  longitude: number;
}

// Truck information
export interface TrackingTruck {
  code: string;
  description: string;
  owner: string;
  latitude: number;
  longitude: number;
}

// Driver information
export interface TrackingDriver {
  code: string;
  name: string;
  phone: string | null;
}

// Product information
export interface TrackingProduct {
  item_code: string;
  description: string;
}

// Ticket timestamps
export interface TicketTimestamps {
  eta_at_job: string | null;
  ticketed: string | null;
  loading: string | null;
  loaded: string | null;
  to_job: string | null;
  at_job: string | null;
  pouring: string | null;
  washing: string | null;
  to_plant: string | null;
  at_plant: string | null;
}

// Ticket status type
export type TrackingTicketStatus =
  | 'ticketed'
  | 'loading'
  | 'loaded'
  | 'to_job'
  | 'at_job'
  | 'pouring'
  | 'washing'
  | 'to_plant'
  | 'at_plant'
  | 'cancelled';

// Individual ticket in tracking
export interface TrackingTicket {
  load: number;
  ticket_id: string;
  ticket_code: string;
  status: TrackingTicketStatus;
  status_display: string;
  product: TrackingProduct;
  load_qty: number;
  running_qty: number;
  ordered_qty: number;
  remaining_after_load: number;
  truck: TrackingTruck;
  driver: TrackingDriver;
  plant: TicketPlant;
  timestamps: TicketTimestamps;
}

// Weather data
export interface TrackingWeatherData {
  source: string;
  humidity: number;
  latitude: number;
  longitude: number;
  wind_gust: number | null;
  fetched_at: string;
  wind_speed: number;
  pressure_hpa: number;
  weather_icon: string;
  pressure_inhg: number;
  wind_direction: string;
  wind_speed_mph: number;
  evaporation_rate: number;
  clouds_percentage: number;
  evaporation_level: string;
  visibility_meters: number;
  weather_condition: string;
  temperature_celsius: number;
  weather_description: string;
  dew_point_fahrenheit: number;
  temperature_fahrenheit: number;
  wind_direction_degrees: number;
  temperature_max_fahrenheit: number;
  temperature_min_fahrenheit: number;
  concrete_temperature_fahrenheit: number | null;
}

// Order location
export interface OrderLocation {
  latitude: number;
  longitude: number;
}

// Pagination
export interface TrackingPagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

// Summary stats
export interface TrackingSummary {
  total_tickets: number;
  active_tickets: number;
  cancelled_tickets: number;
  total_delivered_qty: number;
  ordered_qty: number;
  remaining_qty: number;
  progress_percent: number;
  progress_display: string;
}

// Main tracking data
export interface OrderTrackingData {
  order_id: string;
  order_code: string;
  order_date: string;
  display_date: string;
  customer_name: string;
  project_name: string;
  delivery_address: string;
  delivery_addr1: string;
  delivery_addr2: string;
  delivery_addr3: string;
  ordered_qty: number;
  delivered_qty: number;
  remaining_qty: number;
  remaining_display: string;
  progress_percent: number;
  status: string;
  can_chat: boolean;
  product_codes: string;
  product_description: string;
  weather_data: TrackingWeatherData | null;
  order_location: OrderLocation;
  plant: TrackingPlant;
  tickets: TrackingTicket[];
  pagination: TrackingPagination;
  summary: TrackingSummary;
}

// API Response
export interface OrderTrackingResponse {
  success: boolean;
  message: string;
  data: OrderTrackingData;
}

// Query params
export interface OrderTrackingQueryParams {
  page?: number;
  limit?: number;
}

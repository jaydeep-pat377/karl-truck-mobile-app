import { RealtimeOrderUpdates } from './order';

export type ApiTicketStatus =
  | 'cancelled'
  | 'at_plant'
  | 'to_plant'
  | 'washing'
  | 'pouring'
  | 'at_job'
  | 'to_job'
  | 'loaded'
  | 'loading'
  | 'ticketed'
  | 'pending';

export interface ApiTicket {
  ticket_id: string;
  ticket_number: string;
  order_id: string;
  order_code: string;
  truck_id: string;
  truck_code: string;
  truck_name: string;
  driver_name?: string;
  driver_phone?: string;
  load_quantity: number;
  total_order_quantity: number;
  unit: string;
  status: ApiTicketStatus;
  scheduled_time: string;
  actual_time?: string;

  product_code?: string;
  product_name?: string;
  mix_design?: string;
  slump?: string;

  delivery_address?: string;
  delivery_city?: string;

  customer_name?: string;
  customer_phone?: string;
  customer_company?: string;

  special_instructions?: string;
  plant_name?: string;
  estimated_arrival?: string;
  distance?: string;

  created_at?: string;
  updated_at?: string;
}

export interface ApiOrderSummary {
  order_id: string;
  order_code: string;
  order_date: string;
  delivery_address: string;
  total_quantity: number;
  delivered_quantity: number;
  remaining_quantity: number;
  tickets_count: number;
  unit: string;
}

export interface TicketsPagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface TicketsFilters {
  date_filter: string;
  date_range: {
    startDate: string;
    endDate: string;
  };
  status: string | null;
  search: string | null;
  order_id: string | null;
  truck_code: string | null;
}

export interface TicketsStatusCounts {
  cancelled: number;
  at_plant: number;
  to_plant: number;
  washing: number;
  pouring: number;
  at_job: number;
  to_job: number;
  loaded: number;
  loading: number;
  ticketed: number;
  pending: number;
}

export interface TicketsApiData {
  tickets: ApiTicket[];
  pagination: TicketsPagination;
  filters: TicketsFilters;
  status_counts: TicketsStatusCounts;
  order_summary: ApiOrderSummary[];
}

export interface TicketsApiResponse {
  success: boolean;
  message: string;
  data: TicketsApiData;
}

export interface TicketsQueryParams {
  date_filter?: 'today' | 'yesterday' | 'last_week' | 'custom';
  start_date?: string;
  end_date?: string;
  status?: string;
  search?: string;
  order_id?: string;
  truck_code?: string;
  page?: number;
  limit?: number;
  sort_by?: 'order_date' | 'ticket_number' | 'quantity' | 'status';
  sort_order?: 'asc' | 'desc';
}

export interface TicketsByOrderQueryParams {
  sort_order?: 'asc' | 'desc';
  status?: string;
  load?: number;
  page?: number;
  limit?: number;
}

export interface TicketTimestamps {
  eta_at_job?: string | null;
  ticketed?: string | null;
  loading?: string | null;
  loaded?: string | null;
  to_job?: string | null;
  at_job?: string | null;
  pouring?: string | null;
  washing?: string | null;
  to_plant?: string | null;
  at_plant?: string | null;
}

export interface TicketByOrderTruck {
  truck_code: string;
  truck_description: string;
  latitude: string;
  longitude: string;
}

export interface TicketByOrderLocation {
  latitude: string;
  longitude: string;
}

export interface TicketByOrderItem {
  load: string;
  ticket_code: string;
  truck: string | TicketByOrderTruck;
  load_qty: string;
  run_qty_ord_qty: string;
  running_qty: number;
  ordered_qty: number;
  status: ApiTicketStatus;
  status_display: string;
  remove_reason_code: string | null;
  product: string;
  timestamps: TicketTimestamps;
  plant_location?: TicketByOrderLocation | null;
  order_location?: TicketByOrderLocation | null;
}

export interface TicketsByOrderWeatherData {
  source?: string;
  humidity?: number;
  latitude?: number;
  longitude?: number;
  wind_gust?: number | null;
  fetched_at?: string;
  wind_speed?: number;
  pressure_hpa?: number;
  weather_icon?: string;
  pressure_inhg?: number;
  wind_direction?: string;
  wind_speed_mph?: number;
  evaporation_rate?: number;
  clouds_percentage?: number;
  evaporation_level?: string;
  visibility_meters?: number;
  weather_condition?: string;
  temperature_celsius?: number;
  weather_description?: string;
  dew_point_fahrenheit?: number;
  temperature_fahrenheit?: number;
  wind_direction_degrees?: number;
  temperature_max_fahrenheit?: number;
  temperature_min_fahrenheit?: number;
  concrete_temperature_fahrenheit?: number | null;
}

export interface TicketsByOrderOrder {
  order_id: string;
  order_code: string;
  order_date: string;
  customer_name: string;
  project_name?: string | null;
  delivery_address: string;
  weather_data?: TicketsByOrderWeatherData | null;
}

export interface TicketsByOrderFilters {
  applied: {
    status: string | null;
    load: number | null;
    sort_order: 'asc' | 'desc';
  };
  available: {
    status: ApiTicketStatus[];
    load: number[];
    sort_order: ('asc' | 'desc')[];
  };
  in_order: {
    status: ApiTicketStatus[];
    total_loads: number;
  };
}

export interface TicketsByOrderSummary {
  total_tickets: number;
  active_tickets: number;
  cancelled_tickets: number;
  total_delivered_qty: number;
  ordered_qty: number;
  remaining_qty: number;
  progress_display: string;
}

export interface TicketsByOrderData {
  order: TicketsByOrderOrder;
  tickets: TicketByOrderItem[];
  filters: TicketsByOrderFilters;
  summary: TicketsByOrderSummary;
}

export interface TicketsByOrderApiResponse {
  success: boolean;
  message: string;
  data: TicketsByOrderData;
}

export interface OrderDetailsProduct {
  order_product_id: string;
  product_id: string;
  item_code: string;
  description?: string;
  is_mix?: boolean;
  ordered_qty: number;
  delivered_qty: number;
  remaining_qty?: number;
  start_time?: string;
  plant_code?: string;
  ticket_code?: string;
  truck_code?: string;
  load?: number;
  load_qty?: number;
  load_qty_display?: string;
  run_qty?: number;
  run_qty_ord_qty?: string;
  status?: string;
  eta_at_job?: string | null;
  ticketed?: string | null;
  loading?: string | null;
  loaded?: string | null;
  to_job?: string | null;
  at_job?: string | null;
  pouring?: string | null;
  washing?: string | null;
  to_plant?: string | null;
  at_plant?: string | null;
  slump?: string;
  qr?: string;
}

export interface OrderDetailsTicket {
  ticket_id: string;
  ticket_number: string;
  ticket_time: string;
  quantity: number;
  truck_code: string;
  driver_name: string;
}

export interface OrderDetailsNote {
  note_id: string;
  note_text: string;
  created_at: string;
}

export interface OrderDetailsWeatherData {
  source?: string;
  humidity?: number;
  latitude?: number;
  longitude?: number;
  wind_gust?: number;
  fetched_at?: string;
  wind_speed?: number;
  pressure_hpa?: number;
  weather_icon?: string;
  pressure_inhg?: number;
  wind_direction?: string;
  wind_speed_mph?: number;
  evaporation_rate?: number;
  clouds_percentage?: number;
  evaporation_level?: string;
  visibility_meters?: number;
  weather_condition?: string;
  temperature_celsius?: number;
  weather_description?: string;
  dew_point_fahrenheit?: number;
  temperature_fahrenheit?: number;
  wind_direction_degrees?: number;
  temperature_max_fahrenheit?: number;
  temperature_min_fahrenheit?: number;
  concrete_temperature_fahrenheit?: number | null;
}

export interface TruckStatusCount {
  ticketed: number;
  loading: number;
  loaded: number;
  to_job: number;
  at_job: number;
  pouring: number;
  washing: number;
  to_plant: number;
  at_plant: number;
  total: number;
}

export interface PlantDetails {
  code: string;
  description: string;
  short_description?: string;
  address1: string;
  address2: string;
  phone: string;
  latitude?: number;
  longitude?: number;
}

export interface PourSpeedDataPoint {
  time: string;
  time_display: string;
  rate: number;
  cumulative_qty?: number;
}

export interface TrucksOnJobTimePoint {
  time: string;
  time_display: string;
  waiting: number;
  pouring: number;
  washout: number;
  total: number;
}

export interface TrucksOnJobAverages {
  avg_waiting_minutes: number;
  avg_pouring_minutes: number;
  avg_washout_minutes: number;
}

export interface PourSpeedGraph {
  schedule_rate: number;
  y_max: number;
  ordered: PourSpeedDataPoint[];
  delivered: PourSpeedDataPoint[];
  poured: PourSpeedDataPoint[];
}

export interface TrucksOnJobGraph {
  time_points: TrucksOnJobTimePoint[];
  averages: TrucksOnJobAverages;
}

export interface OrderGraphs {
  pour_speed?: PourSpeedGraph;
  trucks_on_job?: TrucksOnJobGraph;
}

export interface OrderDetailsOrder {
  order_id: string;
  order_code: string;
  order_date: string;
  display_date: string;
  start_time: string;
  estimated_finish_time: string;
  customer_name: string;
  project_name?: string | null;
  delivery_address: string;
  delivery_addr1?: string;
  delivery_addr2?: string;
  delivery_addr3?: string;
  ordered_qty: number;
  delivered_qty: number;
  remaining_qty: number;
  remaining_display: string;
  ticket_delivered_qty?: number;
  ticket_poured_qty?: number;
  poured_percentage?: number;
  current_status?: number;
  removed?: boolean;
  remove_reason_code?: string;
  status: string;
  can_chat: boolean;
  can_ticketed: boolean;
  has_notes: boolean;
  products: OrderDetailsProduct[];
  tickets: OrderDetailsTicket[];
  notes: OrderDetailsNote[];
  weather_data: OrderDetailsWeatherData | null;
  truck_status_count?: TruckStatusCount;
  truck_count?: number;
  plant_details?: PlantDetails;
  order_location?: TicketDetailsLocation | null;
  is_favourite?: boolean;
  tickets_count?: number;
  notes_count?: number;
  graphs?: OrderGraphs;
  realtime_order_updates?: RealtimeOrderUpdates;
}

export interface OrderDetailsApiData {
  order: OrderDetailsOrder;
}

export interface OrderDetailsApiResponse {
  success: boolean;
  message: string;
  data: OrderDetailsApiData;
}

export interface OrderDetailsQueryParams {
  order_code: string;
  order_date: string;
}

export interface TicketDetailsTruck {
  truck_code: string;
  truck_description: string;
  latitude: string;
  longitude: string;
}

export interface TicketDetailsDurations {
  loading: number | string | null;
  loaded: number | string | null;
  to_job: number | string | null;
  at_job: number | string | null;
  pouring: number | string | null;
  washing: number | string | null;
  to_plant: number | string | null;
  at_plant: number | string | null;
}

export interface TicketDetailsStatus {
  status: ApiTicketStatus;
  status_display: string;
  remove_reason_code: string | null;
  timestamp: string;
  timestamp_display: string;
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
  durations?: TicketDetailsDurations;
}

export interface TicketDetailsProduct {
  id: string;
  ticket_id: string;
  item_code: string;
  description: string;
  is_mix: boolean;
}

export interface TicketDetailsLocation {
  latitude: number;
  longitude: number;
}

export interface DeliveryMetrics {
  spacing_minutes: string | null;
  waiting_minutes: string | null;
  pour_minutes: string | null;
  performance_minutes: string | null;
  idle_minutes: string | null;
}

export interface TicketDetailsTicket {
  ticket_id: string;
  ticket_code: string;
  load: string;
  order_id: string;
  order_code: string;
  order_date: string;
  customer_name: string;
  delivery_address: string;
  project_name: string | null;
  lot_block_number: string | null;
  plant_code: string;
  plant_name: string;
  plant_address: string;
  plant_phone: string | null;
  running_qty: number;
  ordered_qty: number;
  load_qty?: number;
  driver_name: string;
  driver_phone: string | null;
  driver_code?: string;
  created_date: string;
  truck: TicketDetailsTruck;
  plant_location: TicketDetailsLocation | null;
  order_location: TicketDetailsLocation | null;
  status: TicketDetailsStatus;
  products: TicketDetailsProduct[];
  delivery_metrics?: DeliveryMetrics | null;
  weather_data?: OrderDetailsWeatherData | null;
}

export interface TicketDetailsData {
  ticket: TicketDetailsTicket;
}

export interface TicketDetailsApiResponse {
  success: boolean;
  message: string;
  data: TicketDetailsData;
}

export interface TicketDetailsQueryParams {
  order_code: string;
  order_date: string;
  ticket_code: string;
}

export interface Ticket {
  id: string;
  ticketNumber: string;
  orderId: string;
  orderCode: string;
  truckId: string;
  truckCode: string;
  truckName: string;
  driverName?: string;
  driverPhone?: string;
  loadQuantity: number;
  totalOrderQuantity: number;
  unit: string;
  status: ApiTicketStatus;
  scheduledTime: string;
  actualTime?: string;

  productCode?: string;
  productName?: string;
  mixDesign?: string;
  slump?: string;

  deliveryAddress?: string;
  deliveryCity?: string;

  customerName?: string;
  customerPhone?: string;
  customerCompany?: string;

  specialInstructions?: string;
  plantName?: string;
  estimatedArrival?: string;
  distance?: string;

  createdAt?: string;
  updatedAt?: string;
}



export type OrderStatus =
  | 'NORMAL'
  | 'WILL_CALL'
  | 'WEATHER_PERMITTING'
  | 'HOLD'
  | 'COMPLETED'
  | 'WAIT_LIST'
  | 'PRE_POUR'
  | 'IN_PROCESS'
  | 'CANCELLED'
  | 'DELAYED';

export type TruckStatus = 'ENRT' | 'ONSIT' | 'LOADING' | 'DISPATCHED' | 'RETURNING';

export interface PlantDetails {
  code: string;
  name: string;
  shortName?: string;
  address?: string;
  phone?: string;
  latitude?: number | null;
  longitude?: number | null;
}

export type TicketTrackingStatus =
  | 'pending'
  | 'ticketed'
  | 'loading'
  | 'loaded'
  | 'to_job'
  | 'at_job'
  | 'pouring'
  | 'poured'
  | 'washing'
  | 'to_plant'
  | 'at_plant'
  | 'cancelled'
  | 'voided';

export interface Order {
  id: string;
  orderCode: string;
  customerName: string;
  customerPhone?: string;
  projectName?: string;
  deliveryAddress: string;
  deliveryCity?: string;
  deliveryState?: string;
  deliveryZip?: string;
  pickupAddress?: string;
  latitude?: number;
  longitude?: number;
  jobLatitude?: number | null;
  jobLongitude?: number | null;
  plantDetails?: PlantDetails;
  scheduledDate: string;
  scheduledTime: string;
  status: OrderStatus;
  productType: string;
  productMix?: string;
  product_description?: string;
  quantity: number;
  unit: string;
  deliveredQuantity?: number;
  remainingQuantity?: number;
  totalLoads?: number;
  completedLoads?: number;
  progress?: number;
  distance?: string;
  estimatedFinishTime?: string;
  specialInstructions?: string;
  assignedTruckId?: string;
  assignedDriverName?: string;
  eta?: string;
  hasAlert?: boolean;
  alertMessage?: string;
  weather?: WeatherData;
  canChat?: boolean;
  canTicketed?: boolean;
  isFavorite?: boolean;
  recentTicketStatus?: TicketTrackingStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Truck {
  id: string;
  truckNumber: string;
  driverName: string;
  driverPhone?: string;
  status: TruckStatus;
  currentLatitude?: number;
  currentLongitude?: number;
  lastUpdated?: string;
  orderId?: string;
  eta?: string;
  loadQuantity?: number;
}

export interface OrderFilters {
  status?: OrderStatus[];
  dateRange?: 'today' | 'tomorrow' | 'thisWeek' | 'all';
  searchQuery?: string;
}

export interface OrderSummary {
  total: number;
  prePour: number;
  inProcess: number;
  completed: number;
  cancelled: number;
}

export type WeatherCondition = 'sunny' | 'partly_cloudy' | 'cloudy' | 'rain' | 'storm' | 'snow' | 'fog';

export interface WeatherData {
  condition: WeatherCondition;
  temperature: number;
  temperatureUnit: 'C' | 'F';
  description?: string;
  humidity?: number;
  windSpeed?: number;
  windUnit?: string;
  feelsLike?: number;
  forecast?: WeatherForecast[];
  evaporationRate?: number;
}

export interface WeatherForecast {
  date: string;
  condition: WeatherCondition;
  highTemp: number;
  lowTemp: number;
}

export interface LocationWeather {
  locationName: string;
  latitude?: number;
  longitude?: number;
  weather?: WeatherData;
}

export interface ApiOrderWeatherData {
  source: string;
  humidity: number;
  latitude: number;
  longitude: number;
  wind_gust: number;
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

export interface ApiPlantDetails {
  code: string;
  description: string;
  short_description: string;
  address1: string;
  address2: string;
  phone: string;
  latitude: number | null;
  longitude: number | null;
}

export interface ApiOrderLocation {
  latitude: number | null;
  longitude: number | null;
}

export interface ApiRecentTicket {
  ticket_code: string;
  status: string;
  status_display: string;
  truck_code: string;
}

export interface ApiOrder {
  order_id: string;
  order_code: string;
  order_date: string;
  display_date: string;
  start_time: string;
  estimated_finish_time: string;
  customer_name: string;
  project_name: string;
  delivery_address: string;
  plant_codes?: string;
  plant_name?: string;
  plant_details?: ApiPlantDetails;
  order_location?: ApiOrderLocation;
  ordered_qty: number;
  delivered_qty: number;
  remaining_qty: number;
  remaining_display: string;
  status: string;
  can_chat: boolean;
  can_ticketed: boolean;
  is_removed: boolean;
  has_notes: boolean;
  tickets_count: number;
  active_tickets?: number;
  total_loads?: number;
  product_codes?: string;
  product_description?: string;
  weather_data: ApiOrderWeatherData | null;
  is_favourite: boolean;
  recent_ticket?: ApiRecentTicket | null;
}

export interface OrdersPagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface OrdersFilters {
  date_filter: string;
  status: string | null;
  search: string | null;
}

export interface OrdersStatusCounts {
  total: number;
  in_process: number;
  completed: number;
  will_call: number;
  pending: number;
}

export interface OrdersTabCounts {
  saved: number;
  scheduled: number;
  active: number;
  completed: number;
  cancelled: number;
  requested: number;
}

export interface OrdersResponseData {
  orders: ApiOrder[];
  pagination: OrdersPagination;
  filters: OrdersFilters;
  status_counts: OrdersStatusCounts;
  tab_counts?: OrdersTabCounts;
}

export interface OrdersApiResponse {
  success: boolean;
  data: OrdersResponseData;
}

export interface OrdersQueryParams {
  date_filter?: 'today' | 'yesterday' | 'tomorrow' | 'last_week' | 'next_week' | 'custom';
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  start_date?: string;
  end_date?: string;
  sort_by?: 'order_date' | 'ordered_qty' | 'delivered_qty';
  sort_order?: 'asc' | 'desc';
  company_name?: string;
  region_name?: string;
  plant_code?: string;
  plant_name?: string;
  is_favourite?: boolean;
  tab?: 'saved' | 'scheduled' | 'active' | 'completed' | 'cancelled' | 'requested';
}

export interface RealtimeOrderUpdateItem {
  id: string;
  order_id: string;
  order_code: string;
  order_date: string;
  table_name: string;
  record_id: string | null;
  field_name: string;
  old_value: string;
  new_value: string;
  old_display_value: string;
  new_display_value: string;
  change_message: string;
  change_type: string;
  change_source: string;
  changed_at: string;
  cron_execution_id: string;
  related_field_name: string | null;
  related_old_value: string | null;
  related_new_value: string | null;
  related_display_message: string | null;
  display_order: number;
  has_comment: boolean;
}

export interface OrderCreatedProduct {
  item_code: string;
  description: string;
  quantity: string;
  slump: string | null;
}

export interface OrderCreatedItem {
  change_type: 'order_created';
  order_number: string;
  order_status: string;
  plant: string;
  delivery_address: string;
  purchase_order: string;
  instructions: string;
  ordered_by: string;
  created: string;
  products: OrderCreatedProduct[];
}

export interface RealtimeOrderUpdates {
  items: (RealtimeOrderUpdateItem | OrderCreatedItem)[];
  count: number;
}

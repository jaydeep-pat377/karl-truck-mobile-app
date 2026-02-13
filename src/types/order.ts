

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
  product_codes?: string;
  product_description?: string;
  weather_data: ApiOrderWeatherData | null;
  is_favourite: boolean;
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

export interface OrdersResponseData {
  orders: ApiOrder[];
  pagination: OrdersPagination;
  filters: OrdersFilters;
  status_counts: OrdersStatusCounts;
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
}

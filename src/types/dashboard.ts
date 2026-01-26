export interface DashboardUser {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  company: string | null;
}

export interface DashboardNotifications {
  unread_count: number;
}

export interface DashboardWeather {
  location?: string;
  avg_temperature_fahrenheit?: number;
  avg_feels_like_fahrenheit?: number;
  avg_humidity_percent?: number;
  avg_wind_speed_mph?: number;
  avg_precipitation_percent?: number;
  condition?: string;
  orders_with_weather?: number;
  // Legacy fields for compatibility
  temperature?: number;
  humidity?: number;
  windSpeed?: number;
}

export interface TodayOverview {
  total_orders: number;
  cancelled: number;
  normal: number;
  will_call: number;
  hold_delivery: number;
  completed: number;
  wait_list: number;
  in_progress: number;
}

export interface AvgStatusPercent {
  completed: number;
  in_progress: number;
  normal: number;
  will_call: number;
  hold_delivery: number;
  cancelled: number;
}

export interface TodayProgress {
  percent: number;
  completed_orders: number;
  total_orders: number;
  active_orders: number;
  remaining_orders: number;
  avg_status_percent: AvgStatusPercent;
}

export interface ActiveDeliveryOrder {
  order_id: string;
  order_code: string;
  customer_name: string;
  delivery_address: string;
  product_codes: string;
  start_time: string;
  ordered_qty: number;
  delivered_qty: number;
  remaining_qty: number;
  progress_percent: number;
  status: string;
}

export interface ActiveDeliveries {
  count: number;
  orders: ActiveDeliveryOrder[];
}

export interface RecentAlert {
  id: string;
  type: string;
  message: string;
  timestamp: string;
}

export interface DashboardData {
  user: DashboardUser;
  notifications: DashboardNotifications;
  weather: DashboardWeather | null;
  today_overview: TodayOverview;
  today_progress: TodayProgress;
  active_deliveries: ActiveDeliveries;
  recent_alerts: RecentAlert[];
}

export interface DashboardApiResponse {
  success: boolean;
  message: string;
  data: DashboardData;
}

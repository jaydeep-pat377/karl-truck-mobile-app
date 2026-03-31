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

export interface ActiveDeliveryRecentTicket {
  ticket_code: string;
  status: string;
  status_display: string;
  truck_code: string;
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
  recent_ticket?: ActiveDeliveryRecentTicket | null;
  delivery_progress?: import('./order').DeliveryProgress;
  total_loads?: number;
  active_tickets?: number;
  tickets_count?: number;
}

export interface ActiveDeliveriesPagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface ActiveDeliveries {
  count: number;
  orders: ActiveDeliveryOrder[];
  pagination: ActiveDeliveriesPagination;
}

export interface RecentAlert {
  id: string;
  type: string;
  message: string;
  timestamp: string;
}

export interface MarketCompany {
  id: string;
  code: string;
  name: string;
  totalOrders: number;
  activeOrders: number;
  cancelledOrders: number;
  totalCY: number;
  usedCY: number;
}

export interface MarketRegion {
  id: string;
  name: string;
  totalOrders: number;
  activeOrders: number;
  cancelledOrders: number;
  totalCY: number;
  usedCY: number;
}

export interface PlantWeather {
  temperature_fahrenheit: number;
  humidity: number;
  wind_speed_mph: number;
  condition: string;
  icon: string;
}

export interface MarketPlant {
  id: string;
  code: string;
  name: string;
  regionName: string | null;
  totalOrders: number;
  activeOrders: number;
  cancelledOrders: number;
  totalCY: number;
  usedCY: number;
  weather: PlantWeather | null;
}

export interface MarketSummary {
  companies: MarketCompany[];
  regions: MarketRegion[];
  plants: MarketPlant[];
}

export interface DateRange {
  start_date: string;
  end_date: string;
  filter: string;
}

export interface DashboardData {
  user: DashboardUser;
  notifications: DashboardNotifications;
  weather: DashboardWeather | null;
  today_overview: TodayOverview;
  today_progress: TodayProgress;
  market_summary: MarketSummary;
  active_deliveries: ActiveDeliveries;
  recent_alerts: RecentAlert[];
  date_range?: DateRange;
}

export interface DashboardApiResponse {
  success: boolean;
  message: string;
  data: DashboardData;
}

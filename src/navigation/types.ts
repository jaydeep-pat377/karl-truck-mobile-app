

import { NavigatorScreenParams } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

export type AuthStackParamList = {
  Login: { verified?: boolean } | undefined;
  Signup: undefined;
  ForgotPassword: undefined;
  VerifyOTP: { email: string; mode: 'signup' | 'forgotPassword' };
};

export type OrderStatusFilter =
  | 'Will Call'
  | 'Hold Delivery'
  | 'Canceled'
  | 'Normal'
  | 'In Progress'
  | 'Completed';

export type DateFilterType = 'today' | 'yesterday' | 'tomorrow' | 'nextWeek' | 'lastWeek' | 'calendar';

export type OrderTabFilter = 'all' | 'saved' | 'scheduled' | 'active' | 'completed' | 'cancelled' | 'requested';

export interface OrdersFilterParams {
  statusFilter?: OrderStatusFilter;
  company_name?: string;
  region_name?: string;
  plant_code?: string;
  plant_name?: string;
  date_filter?: DateFilterType;
  selected_date?: string;
  is_favourite?: boolean;
  tab?: OrderTabFilter;
  _timestamp?: number;
}

export type OrderRequestsStackParamList = {
  OrderRequestList: undefined;
  OrderRequestDetail: { orderRequestId: string; scrollToMessages?: boolean };
  CreateOrderRequest: { orderType?: 'with_project' | 'without_project' | 'without_project_with_product'; editOrderId?: string; prefillOrder?: Record<string, any> };
  AddressMap: { address: string };
};

export type MainTabParamList = {
  Home: undefined;
  Orders: (NavigatorScreenParams<OrdersStackParamList> & OrdersFilterParams) | OrdersFilterParams | undefined;
  Today: undefined;
  Notifications: undefined;
  OrderRequests: NavigatorScreenParams<OrderRequestsStackParamList> | undefined;
  Settings: undefined;
};

export type ChatStackParamList = {
  ChatList: undefined;
  ChatRoom: { roomId: string; roomName: string; chatId: number; orderId: number };
  CreateChatRoom: { orderId?: number } | undefined;
};

export type OrdersStackParamList = {
  OrderList: OrdersFilterParams | undefined;
  OrderDetailInTab: {
    orderId: string;
    orderCode: string;
    orderDate: string;
    status?: string;
    progressColor?: string;
    sourceTab?: 'Orders' | 'Today' | 'Home';
    initialSection?: 'details' | 'performance';
  };
};

export type SettingsStackParamList = {
  SettingsMain: undefined;
  Profile: undefined;
  Appearance: undefined;
  NotificationSettings: undefined;
  Security: undefined;
  Language: undefined;
  About: undefined;
};

export type AppointmentsStackParamList = {
  AppointmentsList: undefined;
  AppointmentDetail: { appointmentId: string };
  MakeAppointment: undefined;
};

export type FreshWeatherParam = {
  temperature_fahrenheit?: number;
  temperature_celsius?: number;
  temperature_max_fahrenheit?: number;
  temperature_min_fahrenheit?: number;
  weather_condition?: string;
  weather_icon?: string;
  weather_description?: string;
  humidity?: number;
  wind_speed?: number;
  wind_speed_mph?: number;
  wind_gust?: number | null;
  wind_direction?: string;
  wind_direction_degrees?: number;
  pressure_hpa?: number;
  pressure_inhg?: number;
  dew_point_fahrenheit?: number;
  clouds_percentage?: number;
  visibility_meters?: number | null;
  evaporation_rate?: number;
  evaporation_level?: string;
  concrete_evaporation_rate?: number | null;
  concrete_evaporation_level?: string | null;
  concrete_temperature_fahrenheit?: number | null;
  concrete_temperature_source?: string | null;
  concrete_temperature_is_estimated?: boolean | null;
  plant_default_temperature?: number | null;
  plant_concrete_temperature?: number | null;
  plant_status_type?: 0 | 1 | null;
  fetched_at?: string;
  source?: string;
  latitude?: number;
  longitude?: number;
};

export type WeatherScreenParams = {
  orderCode?: string;
  orderDate?: string;
  orderStatus?: string;
  startTime?: string;
  ticketCode?: string;
  freshWeather?: FreshWeatherParam | null;
} | undefined;

export type WeatherData = {
  temperature: number;
  temperatureUnit: string;
  condition: string;
  icon: string;
  humidity?: number;
  windSpeed?: number;
  location?: string;
};

export type WeatherCardType = 'evaporation' | 'concrete' | 'wind' | 'pressure' | 'dewpoint' | 'humidity' | 'products';

export type ProductDetailsScreenParams = {
  productId?: string;
  productName?: string;
  weatherData?: WeatherData;
  cardType?: WeatherCardType;
  cardValue?: number | string;
  cardUnit?: string;
  cardDescription?: string;
};

export type EvaporationListScreenParams = {
  locationName: string;
  date: string;
  orderCode: string;
  orderNo?: string;
  currentEvaporation?: {
    value: number;
    status: 'Low' | 'Moderate' | 'High';
    description: string;
  };
  weatherData?: {
    humidity: number;
    windSpeed: number;
    windDirection: string;
    temperature: number;
    temperatureUnit: string;
    pressure: number;
    pressureUnit: string;
    dewPoint: number;
    concreteTemp: number | null;
    condition: string;
    cloudsPercentage: number;
    visibility: number;
  };
};

export type TicketScreenParams = {
  orderId: string;
  orderCode: string;
  orderDate: string;
};

export type TicketStatusType =
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

export type TicketDetailScreenParams = {

  orderCode: string;
  orderDate: string;
  ticketCode: string;

  status?: TicketStatusType;
  statusDisplay?: string;
  statusColor?: string;
  statusColors?: Record<string, string> | null;
};

export type ProductCodeScreenParams = {
  cardType?: WeatherCardType;
  cardValue?: number | string;
  cardUnit?: string;
  weatherData?: WeatherData;
  orderStatus?: string;
  onJobTime?: string;
  orderDate?: string;
  rate?: string;
};

export type ChatRoomScreenParams = {
  roomId: string;
  roomName: string;
  chatId: number;
  orderId: number;
  orderDate?: string;
  customerName?: string;
  projectName?: string;
  deliveryAddress?: string;
};

export type OrderProductDetailsScreenParams = {
  orderId: string;
  orderCode: string;
  orderDate: string;
  status?: string;
  progressColor?: string;
};

export type WebViewScreenParams = {
  url: string;
  title: string;
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;
  OrderDetail: { orderId: string; orderCode: string; orderDate: string; status?: string; progressColor?: string; sourceTab?: 'Orders' | 'Today' | 'Home'; initialSection?: 'details' | 'performance' };
  TodayOrders: undefined;
  Tracking: { orderId: string; ticketCode?: string };
  Weather: WeatherScreenParams;
  ProductDetails: ProductDetailsScreenParams;
  ProductCode: ProductCodeScreenParams;
  EvaporationList: EvaporationListScreenParams;
  Ticket: TicketScreenParams;
  TicketDetail: TicketDetailScreenParams;
  ChatRoom: ChatRoomScreenParams;
  Appointments: NavigatorScreenParams<AppointmentsStackParamList>;
  OrderProductDetails: OrderProductDetailsScreenParams;
  WebView: WebViewScreenParams;
  AIAssistant: { initialMessage?: string } | undefined;
  AISettings: undefined;
};

export type AuthStackScreenProps<T extends keyof AuthStackParamList> =
  NativeStackScreenProps<AuthStackParamList, T>;

export type MainTabScreenProps<T extends keyof MainTabParamList> =
  BottomTabScreenProps<MainTabParamList, T>;

export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}



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

export interface OrdersFilterParams {
  statusFilter?: OrderStatusFilter;
  company_name?: string;
  region_name?: string;
  plant_code?: string;
  plant_name?: string;
  date_filter?: DateFilterType;
  selected_date?: string; // ISO date string for calendar selection
  is_favourite?: boolean;
  _timestamp?: number;
}

export type MainTabParamList = {
  Home: undefined;
  Orders: OrdersFilterParams | undefined;
  Today: undefined;
  Notifications: undefined;
  Settings: undefined;
};

export type ChatStackParamList = {
  ChatList: undefined;
  ChatRoom: { roomId: string; roomName: string; chatId: number; orderId: number };
  CreateChatRoom: { orderId?: number } | undefined;
};

export type OrdersStackParamList = {
  OrderList: undefined;
  OrderDetail: { orderId: string };
  Tracking: { orderId: string };
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

export type WeatherScreenParams = {
  orderCode?: string;
  orderDate?: string;
  orderStatus?: string;
  startTime?: string;
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

export type MapTrackingScreenParams = {

  latitude?: string;
  longitude?: string;
  truckCode?: string;
  ticketCode?: string;
  driverName?: string;
  destination?: string;
  orderCode?: string;
  customerName?: string;

  plantLatitude?: string;
  plantLongitude?: string;
  plantName?: string;
  plantCode?: string;

  jobLatitude?: string;
  jobLongitude?: string;
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

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;
  OrderDetail: { orderId: string; orderCode: string; orderDate: string; status?: string; progressColor?: string; sourceTab?: 'Orders' | 'Today' | 'Home' };
  TodayOrders: undefined;
  Tracking: { orderId: string };
  Weather: WeatherScreenParams;
  ProductDetails: ProductDetailsScreenParams;
  ProductCode: ProductCodeScreenParams;
  EvaporationList: EvaporationListScreenParams;
  Ticket: TicketScreenParams;
  TicketDetail: TicketDetailScreenParams;
  MapTracking: MapTrackingScreenParams;
  ChatRoom: ChatRoomScreenParams;
  Appointments: NavigatorScreenParams<AppointmentsStackParamList>;
  OrderProductDetails: OrderProductDetailsScreenParams;
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

/**
 * Navigation Types
 */

import { NavigatorScreenParams } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

// Auth Stack
export type AuthStackParamList = {
  Login: { verified?: boolean } | undefined;
  Signup: undefined;
  ForgotPassword: undefined;
  VerifyOTP: { email: string; mode: 'signup' | 'forgotPassword' };
};

// Order Status Filter Type - matches API status values
export type OrderStatusFilter =
  | 'Will Call'
  | 'Hold Delivery'
  | 'Canceled'
  | 'Normal'
  | 'In Progress'
  | 'Completed';

// Main Tab Navigator
export type MainTabParamList = {
  Home: undefined;
  Orders: { statusFilter?: OrderStatusFilter } | undefined;
  Today: undefined;
  Notifications: undefined;
  Settings: undefined;
};

// Chat Stack (nested in Chat tab)
export type ChatStackParamList = {
  ChatList: undefined;
  ChatRoom: { roomId: string; roomName: string; chatId: number; orderId: number };
  CreateChatRoom: { orderId?: number } | undefined;
};

// Orders Stack (nested in Orders tab)
export type OrdersStackParamList = {
  OrderList: undefined;
  OrderDetail: { orderId: string };
  Tracking: { orderId: string };
};

// Settings Stack (nested in Settings tab)
export type SettingsStackParamList = {
  SettingsMain: undefined;
  Profile: undefined;
  Appearance: undefined;
  NotificationSettings: undefined;
  Security: undefined;
  Language: undefined;
  About: undefined;
};

// Appointments Stack
export type AppointmentsStackParamList = {
  AppointmentsList: undefined;
  AppointmentDetail: { appointmentId: string };
  MakeAppointment: undefined;
};

// Weather Screen Params
export type WeatherScreenParams = {
  orderCode: string;
  orderDate: string;
  orderStatus?: string;
  startTime?: string;
};

// Weather Data for Product Recommendations
export type WeatherData = {
  temperature: number;
  temperatureUnit: string;
  condition: string;
  icon: string;
  humidity?: number;
  windSpeed?: number;
  location?: string;
};

// Weather Card Types
export type WeatherCardType = 'evaporation' | 'concrete' | 'wind' | 'pressure' | 'dewpoint' | 'humidity' | 'products';

// Product Details Screen Params
export type ProductDetailsScreenParams = {
  productId?: string;
  productName?: string;
  weatherData?: WeatherData;
  cardType?: WeatherCardType;
  cardValue?: number | string;
  cardUnit?: string;
  cardDescription?: string;
};

// Evaporation List Screen Params
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

// Ticket Screen Params
export type TicketScreenParams = {
  orderId: string;
  orderCode: string;
  orderDate: string;
};

// API Ticket Status type
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

// Ticket Detail Screen Params - API query params for fetching details
export type TicketDetailScreenParams = {
  // Required API params
  orderCode: string;
  orderDate: string;
  ticketCode: string;
  // Optional status from TicketScreen
  status?: TicketStatusType;
  statusDisplay?: string;
};

// Product Code Screen Params
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

// Map Tracking Screen Params
export type MapTrackingScreenParams = {
  // Truck location (from truck object in API)
  latitude?: string;
  longitude?: string;
  truckCode?: string;
  ticketCode?: string;
  driverName?: string;
  destination?: string;
  orderCode?: string;
  customerName?: string;
  // Plant location (plant_location from API)
  plantLatitude?: string;
  plantLongitude?: string;
  plantName?: string;
  plantCode?: string;
  // Job location (order_location from API)
  jobLatitude?: string;
  jobLongitude?: string;
};

// Chat Room Screen Params (for direct navigation from order items)
export type ChatRoomScreenParams = {
  roomId: string;
  roomName: string;
  chatId: number;
  orderId: number;
};

// Root Navigator
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;
  OrderDetail: { orderId: string; orderCode: string; orderDate: string; status?: string };
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
};

// Screen Props Types
export type AuthStackScreenProps<T extends keyof AuthStackParamList> =
  NativeStackScreenProps<AuthStackParamList, T>;

export type MainTabScreenProps<T extends keyof MainTabParamList> =
  BottomTabScreenProps<MainTabParamList, T>;

export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

// Declare global types for useNavigation and useRoute
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

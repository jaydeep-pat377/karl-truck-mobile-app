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

// Main Tab Navigator
export type MainTabParamList = {
  Home: undefined;
  Orders: undefined;
  Map: undefined;
  Notifications: undefined;
  Settings: undefined;
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
  locationName: string;
  latitude?: number;
  longitude?: number;
  orderId?: string;
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
  currentEvaporation?: {
    value: number;
    status: 'Low' | 'Moderate' | 'High';
    description: string;
  };
};

// Ticket Screen Params
export type TicketScreenParams = {
  orderId: string;
  orderCode: string;
};

// Ticket Detail Screen Params
export type TicketDetailScreenParams = {
  ticketId: string;
  ticketNumber: string;
  truckId: string;
  truckName: string;
  loadQuantity: number;
  totalOrderQuantity: number;
  unit: string;
  status: 'at_plant' | 'in_transit' | 'at_site' | 'pouring' | 'completed' | 'returning';
  scheduledTime: string;
  actualTime?: string;
  driverName?: string;
  driverPhone?: string;
  orderCode?: string;
  // Product/Mix Information
  productCode?: string;
  productName?: string;
  mixDesign?: string;
  slump?: string;
  // Delivery Location
  deliveryAddress?: string;
  deliveryCity?: string;
  deliveryLatitude?: number;
  deliveryLongitude?: number;
  // Customer Information
  customerName?: string;
  customerPhone?: string;
  customerCompany?: string;
  // Additional Details
  specialInstructions?: string;
  plantName?: string;
  estimatedArrival?: string;
  distance?: string;
};

// Product Code Screen Params
export type ProductCodeScreenParams = {
  cardType?: WeatherCardType;
  cardValue?: number | string;
  cardUnit?: string;
  weatherData?: WeatherData;
};

// Root Navigator
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;
  OrderDetail: { orderId: string };
  Tracking: { orderId: string };
  Weather: WeatherScreenParams;
  ProductDetails: ProductDetailsScreenParams;
  ProductCode: ProductCodeScreenParams;
  EvaporationList: EvaporationListScreenParams;
  Ticket: TicketScreenParams;
  TicketDetail: TicketDetailScreenParams;
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

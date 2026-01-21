/**
 * Order Types
 */

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

// Weather Types
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

/**
 * Weather Types
 */

export type WeatherCondition =
  | 'sunny'
  | 'cloudy'
  | 'partlyCloudy'
  | 'rainy'
  | 'stormy'
  | 'snowy'
  | 'foggy'
  | 'windy';

export interface Weather {
  location: string;
  temperature: number;
  temperatureUnit: 'F' | 'C';
  feelsLike: number;
  condition: WeatherCondition;
  conditionDescription: string;
  humidity: number;
  windSpeed: number;
  windDirection: string;
  windUnit: 'mph' | 'kmh';
  precipitation: number;
  dewPoint: number;
  visibility: number;
  uvIndex: number;
  lastUpdated: string;
}

export interface WeatherAlert {
  id: string;
  type: 'warning' | 'watch' | 'advisory';
  title: string;
  description: string;
  severity: 'minor' | 'moderate' | 'severe' | 'extreme';
  startTime: string;
  endTime: string;
}

export interface ProductRecommendation {
  id: string;
  productName: string;
  recommendation: string;
  reason: string;
  priority: 'low' | 'medium' | 'high';
}

// API Response Types
export interface WeatherApiData {
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

export interface WeatherApiResponseData {
  order_id: string;
  order_code: string;
  order_date: string;
  weather_data: WeatherApiData;
}

export interface WeatherApiResponse {
  success: boolean;
  message: string;
  data: WeatherApiResponseData;
}

export interface WeatherQueryParams {
  order_code: string;
  order_date: string;
}

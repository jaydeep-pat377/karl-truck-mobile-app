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

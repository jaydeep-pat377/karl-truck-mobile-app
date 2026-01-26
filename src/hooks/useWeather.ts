import { useQuery } from '@tanstack/react-query';
import { weatherService } from '../api/services/weatherService';
import {
  WeatherApiResponse,
  WeatherQueryParams,
  WeatherApiData,
} from '../types/weather';
import { AxiosError } from 'axios';

interface ApiErrorResponse {
  success?: boolean;
  message?: string;
}

export const useWeather = (params: WeatherQueryParams) => {
  const query = useQuery<WeatherApiResponse, AxiosError<ApiErrorResponse>>({
    queryKey: ['weather', params.order_code, params.order_date],
    queryFn: () => weatherService.getWeather(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    enabled: !!params.order_code && !!params.order_date,
  });

  const weatherData: WeatherApiData | null =
    query.data?.success ? query.data.data.weather_data : null;

  const orderInfo = query.data?.success ? {
    orderId: query.data.data.order_id,
    orderCode: query.data.data.order_code,
    orderDate: query.data.data.order_date,
  } : null;

  const errorMessage =
    query.error?.response?.data?.message ||
    (query.error ? 'Failed to load weather data' : null);

  return {
    weatherData,
    orderInfo,
    isLoading: query.isLoading,
    isError: query.isError,
    error: errorMessage,
    refetch: query.refetch,
    isRefetching: query.isRefetching,
    isFetching: query.isFetching,
  };
};

export default useWeather;

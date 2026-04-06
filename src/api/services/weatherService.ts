import apiClient from '../apiClient';
import { API_ENDPOINTS } from '../endpoints';
import { WeatherApiResponse, WeatherQueryParams } from '../../types/weather';

export const weatherService = {
  getWeather: async (params: WeatherQueryParams): Promise<WeatherApiResponse> => {
    try {
      const response = await apiClient.get<WeatherApiResponse>(API_ENDPOINTS.WEATHER.ALL, {
        params,
      });
      return response;
    } catch (error) {
      throw error;
    }
  },
};

export default weatherService;

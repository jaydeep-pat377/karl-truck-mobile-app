import apiClient from '../apiClient';
import { API_ENDPOINTS } from '../endpoints';
import { WeatherApiResponse, WeatherQueryParams } from '../../types/weather';

export const weatherService = {
  getWeather: async (params: WeatherQueryParams): Promise<WeatherApiResponse> => {
    console.log('========== WEATHER API CALL ==========');
    console.log('Endpoint:', API_ENDPOINTS.WEATHER.ALL);
    console.log('Parameters:', JSON.stringify(params, null, 2));

    try {
      const response = await apiClient.get<WeatherApiResponse>(API_ENDPOINTS.WEATHER.ALL, {
        params,
      });
      console.log('Weather Response:', JSON.stringify(response, null, 2));
      console.log('======================================');
      return response;
    } catch (error) {
      console.log('Weather Error:', error);
      console.log('======================================');
      throw error;
    }
  },
};

export default weatherService;

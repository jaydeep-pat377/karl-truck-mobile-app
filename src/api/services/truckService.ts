import apiClient from '../apiClient';
import { API_ENDPOINTS } from '../endpoints';
import { TrucksApiResponse, TrucksQueryParams } from '../../types/truck';

export const truckService = {
  getTrucks: async (params?: TrucksQueryParams): Promise<TrucksApiResponse> => {
    return apiClient.get<TrucksApiResponse>(API_ENDPOINTS.TRUCKS.LIST, {
      params,
    });
  },
};

export default truckService;

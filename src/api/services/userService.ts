import apiClient from '../apiClient';
import { API_ENDPOINTS } from '../endpoints';
import { ProfileResponse, UserProfile } from '../../types/user';

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  phoneNumber?: string;
  phoneCountryCode?: string;
  title?: string;
  avatarUrl?: string | null;
}

export const userService = {
  getProfile: async (): Promise<ProfileResponse> => {
    return apiClient.get<ProfileResponse>(API_ENDPOINTS.USER.PROFILE);
  },

  updateProfile: async (data: UpdateProfileRequest): Promise<ProfileResponse> => {
    return apiClient.put<ProfileResponse>(API_ENDPOINTS.USER.UPDATE_PROFILE, data);
  },
};

export default userService;

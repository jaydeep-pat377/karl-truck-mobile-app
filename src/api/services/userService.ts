import apiClient from '../apiClient';
import axiosInstance from '../axiosInstance';
import { API_ENDPOINTS } from '../endpoints';
import { ProfileResponse, UserProfile } from '../../types/user';
import { Platform } from 'react-native';

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  phoneNumber?: string;
  phoneCountryCode?: string;
  title?: string;
  avatarUrl?: string | null;
}

export interface AvatarUploadResponse {
  success: boolean;
  message: string;
  data: {
    avatarUrl: string;
  };
}

export const userService = {
  getProfile: async (): Promise<ProfileResponse> => {
    return apiClient.get<ProfileResponse>(API_ENDPOINTS.USER.PROFILE);
  },

  updateProfile: async (data: UpdateProfileRequest): Promise<ProfileResponse> => {
    return apiClient.put<ProfileResponse>(API_ENDPOINTS.USER.UPDATE_PROFILE, data);
  },

  uploadAvatar: async (imageUri: string): Promise<AvatarUploadResponse> => {
    const formData = new FormData();

    const fileName = imageUri.split('/').pop() || 'avatar.jpg';
    const fileType = fileName.endsWith('.png') ? 'image/png' : 'image/jpeg';

    formData.append('avatar', {
      uri: Platform.OS === 'ios' ? imageUri.replace('file://', '') : imageUri,
      type: fileType,
      name: fileName,
    } as any);

    const response = await axiosInstance.post(
      API_ENDPOINTS.USER.UPLOAD_AVATAR,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return response.data;
  },
};

export default userService;

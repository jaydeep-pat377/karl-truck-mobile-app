import apiClient from '../apiClient';
import { API_ENDPOINTS } from '../endpoints';

export interface Announcement {
  id: number;
  name: string;
  campaign: string;
  start_date: string;
  end_date: string | null;
  tile_type: string;
  tagline: string;
  title: string;
  subtitle: string;
  icon_or_percent: string;
  color: string;
  url: string;
  published: boolean;
  plant_ids: number[];
  message_details_code: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AnnouncementsResponse {
  success: boolean;
  message: string;
  data: {
    announcements: Announcement[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    userPlantIds: number[];
  };
}

export interface AnnouncementParams {
  page?: number;
  limit?: number;
  active?: boolean;
}

export const announcementService = {
  getAnnouncements: async (params?: AnnouncementParams): Promise<AnnouncementsResponse> => {
    const queryParams: Record<string, string | number | boolean> = {
      active: true,
    };

    if (params?.page) {
      queryParams.page = params.page;
    }
    if (params?.limit) {
      queryParams.limit = params.limit;
    }
    if (params?.active !== undefined) {
      queryParams.active = params.active;
    }

    return apiClient.get<AnnouncementsResponse>(API_ENDPOINTS.ANNOUNCEMENTS.ME, {
      params: queryParams,
      timeout: 30000,
    });
  },
};

export default announcementService;

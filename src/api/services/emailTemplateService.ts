import apiClient from '../apiClient';
import { API_ENDPOINTS } from '../endpoints';
import {
  EmailTemplatesApiResponse,
  EmailTemplateDetailApiResponse,
  EmailTemplateDefaultsApiResponse,
  EmailTemplateCreateInput,
} from '../../types/emailTemplate';

export const emailTemplateService = {
  getTemplates: async (): Promise<EmailTemplatesApiResponse> => {
    return apiClient.get<EmailTemplatesApiResponse>(API_ENDPOINTS.EMAIL_TEMPLATES.LIST);
  },

  getDefaults: async (): Promise<EmailTemplateDefaultsApiResponse> => {
    return apiClient.get<EmailTemplateDefaultsApiResponse>(API_ENDPOINTS.EMAIL_TEMPLATES.DEFAULTS);
  },

  getTemplateById: async (id: string): Promise<EmailTemplateDetailApiResponse> => {
    return apiClient.get<EmailTemplateDetailApiResponse>(
      `${API_ENDPOINTS.EMAIL_TEMPLATES.DETAIL}/${id}`
    );
  },

  createTemplate: async (
    input: EmailTemplateCreateInput
  ): Promise<EmailTemplateDetailApiResponse> => {
    return apiClient.post<EmailTemplateDetailApiResponse, EmailTemplateCreateInput>(
      API_ENDPOINTS.EMAIL_TEMPLATES.CREATE,
      input
    );
  },

  updateTemplate: async (
    id: string,
    input: Partial<EmailTemplateCreateInput>
  ): Promise<EmailTemplateDetailApiResponse> => {
    return apiClient.put<EmailTemplateDetailApiResponse, Partial<EmailTemplateCreateInput>>(
      `${API_ENDPOINTS.EMAIL_TEMPLATES.UPDATE}/${id}`,
      input
    );
  },

  deleteTemplate: async (
    id: string
  ): Promise<{ success: boolean; message: string }> => {
    return apiClient.delete<{ success: boolean; message: string }>(
      `${API_ENDPOINTS.EMAIL_TEMPLATES.DELETE}/${id}`
    );
  },
};

export default emailTemplateService;

export interface EmailTemplate {
  id: string;
  template_key: string;
  name: string;
  subject: string;
  body_content: string;
  font_family: string;
  font_size: string;
  footer_text: string;
  is_active: boolean;
  tenant_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface EmailTemplateDefault {
  template_key: string;
  name: string;
  category: string;
  default_subject: string;
  body_content: string;
  variables: string[];
  description: string;
}

export interface EmailTemplatesApiResponse {
  success: boolean;
  message: string;
  data: {
    templates: EmailTemplate[];
    defaults: EmailTemplateDefault[];
  };
}

export interface EmailTemplateDetailApiResponse {
  success: boolean;
  message: string;
  data: EmailTemplate;
}

export interface EmailTemplateDefaultsApiResponse {
  success: boolean;
  message: string;
  data: { defaults: EmailTemplateDefault[] };
}

export interface EmailTemplateCreateInput {
  template_key: string;
  name: string;
  subject: string;
  body_content?: string;
  font_family?: string;
  font_size?: string;
  footer_text?: string;
  is_active?: boolean;
}

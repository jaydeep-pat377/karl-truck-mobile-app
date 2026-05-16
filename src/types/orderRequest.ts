export type OrderRequestStatus = 'pending' | 'submitted' | 'approved' | 'rejected' | 'canceled';

export type OrderType = 'with_project' | 'without_project' | 'without_project_with_product';

export interface OrderEntity {
  id: string;
  user_id: string;
  order_type: string;
  status: OrderRequestStatus;
  project_code: string | null;
  project_name: string | null;
  company_id: string;
  company_name: string | null;
  referenced_order: string | null;
  region_code: string | null;
  region_name: string | null;
  customer_job_number: string | null;
  usage_code: string | null;
  usage_name: string | null;
  pour_method_code: string | null;
  pour_method_name: string | null;
  po_number: string | null;
  order_status: number | null;
  on_job_date: string;
  on_job_time: string;
  job_name: string | null;
  plant_code: string | null;
  plant_name: string | null;
  job_address: string;
  job_city: string;
  job_state: string | null;
  job_zip_code: string | null;
  job_contact_name: string;
  job_contact_phone: string;
  driver_instructions: string | null;
  know_mix_code: boolean | null;
  concrete_product_code: string | null;
  concrete_product_name: string | null;
  concrete_product_text: string | null;
  psi: string | null;
  rock_size: string | null;
  air_non_air: string | null;
  fly_ash: string | null;
  quantity: number | null;
  truck_spacing: number | null;
  spacing_type: string | null;
  slump: string | null;
  concrete_notes: string | null;
  call_back_load: string | null;
  pumped: boolean | null;
  pump_type: string | null;
  admixture_product_code: string | null;
  admixture_product_name: string | null;
  admixture_notes: string | null;
  other_product_code: string | null;
  other_product_name: string | null;
  other_notes: string | null;
  order_number: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderEntityMessage {
  id: number;
  order_entity_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: string;
  message_text: string;
  created_at: string;
}

export interface OrderRequestCounts {
  total: number;
  pending: number;
  submitted: number;
  approved: number;
  rejected: number;
}

export interface OrderRequestPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  has_next: boolean;
}

export interface OrderRequestsQueryParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}

export interface OrderRequestsApiResponse {
  success: boolean;
  message: string;
  data: {
    orders: OrderEntity[];
    counts: OrderRequestCounts;
    pagination: OrderRequestPagination;
  };
}

export interface OrderRequestDetailApiResponse {
  success: boolean;
  message: string;
  data: OrderEntity;
}

export interface OrderRequestCreateApiResponse {
  success: boolean;
  message: string;
  data: { id: string };
}

export interface OrderRequestMessagesApiResponse {
  success: boolean;
  message: string;
  data: {
    messages: OrderEntityMessage[];
  };
}

export interface OrderRequestSendMessageApiResponse {
  success: boolean;
  message: string;
  data: OrderEntityMessage;
}

export interface OrderRequestStatusUpdateApiResponse {
  success: boolean;
  message: string;
  data: { id: string; status: string };
}

export interface OrderRequestFormDataApiResponse {
  success: boolean;
  message: string;
  data: {
    regions: { code: string; description: string }[];
    customers: { code: string; name: string }[];
    projects: {
      id: number;
      code: string;
      name: string;
      customer_code: string;
      customer_name: string;
      delivery_addr1: string | null;
      delivery_addr2: string | null;
      delivery_addr3: string | null;
      contact: string | null;
      phone: string | null;
    }[];
    admixtureProducts: { value: string; label: string }[];
    otherProducts: { value: string; label: string }[];
  };
}

export interface OrderRequestSearchOrdersApiResponse {
  success: boolean;
  data: {
    orders: {
      order_id: number;
      order_code: string;
      customer_code: string;
      customer_name: string;
      order_date: string;
      project_name: string | null;
      delivery_addr1: string;
      delivery_addr2: string | null;
      delivery_addr3: string | null;
      ordered_by_name: string | null;
      ordered_by_phone: string | null;
      pricing_plant_code: string | null;
      zone_name: string | null;
    }[];
  };
}

export interface OrderRequestSearchProductsApiResponse {
  success: boolean;
  data: {
    products: { value: string; label: string; slump: string | null }[];
    hasMore: boolean;
  };
}



export type OrderRequestStatusFilter = 'all' | 'pending' | 'submitted' | 'approved' | 'rejected';

export const ORDER_STATUS_LABELS: Record<number, string> = {
  0: 'Normal',
  1: 'Will Call',
  2: 'Weather Permitting',
  3: 'Hold',
  4: 'Completed',
  5: 'Wait List',
};

export interface OrderEntityCreateInput {
  order_type?: string;
  project_code?: string;
  project_name?: string;
  company_id: string;
  company_name?: string;
  referenced_order?: string;
  region_code?: string;
  region_name?: string;
  customer_job_number?: string;
  usage_code?: string;
  usage_name?: string;
  pour_method_code?: string;
  pour_method_name?: string;
  po_number?: string;
  order_status?: number;
  on_job_date: string;
  on_job_time: string;
  job_name?: string;
  plant_code?: string;
  plant_name?: string;
  job_address: string;
  job_city: string;
  job_state?: string;
  job_zip_code?: string;
  job_contact_name: string;
  job_contact_phone: string;
  driver_instructions?: string;
  know_mix_code?: boolean;
  concrete_product_code?: string;
  concrete_product_name?: string;
  concrete_product_text?: string;
  psi?: string;
  rock_size?: string;
  air_non_air?: string;
  fly_ash?: string;
  quantity?: number;
  truck_spacing?: number;
  spacing_type?: string;
  slump?: string;
  concrete_notes?: string;
  call_back_load?: string;
  pumped?: boolean;
  pump_type?: string;
  admixture_product_code?: string;
  admixture_product_name?: string;
  admixture_notes?: string;
  other_product_code?: string;
  other_product_name?: string;
  other_notes?: string;
}

export type StatusCategory =
  | 'PRE_POUR'
  | 'IN_PROCESS'
  | 'COMPLETED'
  | 'CANCELED';

export type SubStatusCode = 0 | 1 | 2 | 3 | 5;

export type StageKey =
  | 'loading'
  | 'to_job'
  | 'at_job'
  | 'pouring'
  | 'poured'
  | 'washing'
  | 'to_plant'
  | 'at_plant';

export type SegmentState = 'done' | 'current' | 'future';

export interface LifecycleSegment {
  key: StageKey;
  weight: number;
  state: SegmentState;
  cy: number;
  tk: number;
}

export type ConfirmationPhaseStatus =
  | 'confirmed'
  | 'pending'
  | 'overdue'
  | 'not_applicable';

export interface ConfirmationPhase {
  status: ConfirmationPhaseStatus;
  channel: 'voice' | 'sms' | 'manual' | null;
  at: string | null;
}

export type EvaporationLevel =
  | 'Low'
  | 'Normal'
  | 'Moderate'
  | 'High'
  | 'Critical';

export interface WeatherData {
  tempF: number;
  condition: string;
  windMph: number;
  rhPct: number;
  evaporationLevel: EvaporationLevel;
  risk: 'none' | 'risk' | 'bad';
}

export interface ActivityItem {
  marker: StageKey | 'info';
  text: string;
  time: string;
}

export interface MockOrder {
  order_code: string;
  order_type: 'PR' | 'CA';
  customer_name: string;
  project_name: string;
  project_code: string;
  delivery_addr_short: string;
  delivery_addr_full: string;
  ordered_by_name: string;
  ordered_by_phone: string;
  preferred_communication: 'Phone' | 'Text';
  item_code: string;
  description: string;
  order_qty: number;
  delivered_qty: number | null;
  completion_pct: number;
  ticket_count: number;
  total_loads: number;
  plant_name: string;
  plant_code: string;
  zone_name: string;
  start_time: string;
  est_finish_time: string;
  status_category: StatusCategory;
  sub_status: SubStatusCode | null;
  current_stage_label: string;
  lifecycle_caption: string;
  lifecycle: LifecycleSegment[];
  weather: WeatherData | null;
  confirmation: { c48: ConfirmationPhase; c24: ConfirmationPhase };
  confirmation_label: string;
  is_favourite: boolean;
  unread_chat: number;
  note_description: string | null;
  remove_reason: string | null;
  exception_label: string | null;
  is_critical: boolean;
  activity: ActivityItem[];
}

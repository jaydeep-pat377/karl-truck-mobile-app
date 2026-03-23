export interface DailyIntelligenceData {
  id: number;
  report_date: string;
  company_code: string;
  plant_code: string | null;
  region_name: string | null;

  // Late Orders
  late_orders_total: number;
  late_not_started: number;
  late_slow_progress: number;
  late_past_finish: number;
  late_orders_details: Array<{ order_code: string; [key: string]: any }> | null;

  // Trucks Waiting (Stuck at Job)
  stuck_at_job_total: number;
  stuck_at_job_details: Array<{ order_code: string; [key: string]: any }> | null;

  // Slow Plants
  slow_plants_total: number;
  slow_plants_details: Array<{ order_codes?: string[]; [key: string]: any }> | null;

  // Congested Sites
  congested_sites_total: number;
  congested_sites_details: Array<{ order_codes?: string[]; [key: string]: any }> | null;

  // Avg Round Trip
  avg_round_trip_minutes: number | null;
  avg_round_trip_display: string | null;
  prev_day_avg_round_trip_minutes: number | null;
  round_trip_change_percent: number | null;
  round_trip_sample_count: number;

  // Weather Risk
  weather_risk_total: number;
  weather_risk_severe: number;
  weather_risk_very_high: number;
  weather_risk_high: number;
  weather_risk_moderate: number;
  weather_risk_details: Array<{ order_code: string; [key: string]: any }> | null;

  // Status counts
  status_pre_pour: number;
  status_in_process: number;
  status_completed: number;
  status_canceled: number;

  // Top Products
  top_products: Array<{ item_code: string; count: number }> | null;

  computed_at: string;
}

export type DailyIntelligenceScope = 'company' | 'plant' | 'region';

export interface DailyIntelligenceConfig {
  config_key: string;
  config_value: string;
  default_value: string;
  data_type: string;
  description: string | null;
}

export interface Farm {
  farm_id: string;
  name: string;
  location_latitude?: number;
  location_longitude?: number;
  total_area_hectares?: number;
}

export interface Field {
  field_id: string;
  farm_id: string;
  field_area_hectares: number;
  primary_crop_current?: string;
  irrigation_source?: string;
  water_availability?: string;
}

export interface SoilTest {
  test_id: string;
  field_id: string;
  test_date: string;
  soil_ph?: number;
  soil_moisture_percent?: number;
  soil_temperature_c?: number;
  nitrogen_mg_kg?: number;
  phosphorus_mg_kg?: number;
  potassium_mg_kg?: number;
  electrical_conductivity_ds_m?: number;
}

export interface WeatherData {
  field_id: string;
  timestamp: string;
  temperature_c: number;
  precipitation_mm: number;
  humidity_percent: number;
  wind_speed_m_s: number;
  conditions: string;
}

export interface SensorData {
  field_id: string;
  sensor_id: string;
  timestamp: string;
  is_simulated: boolean;
  status: string;
  readings: Record<string, any>;
}

export interface AdvisoryRequest {
  field_id: string;
  requested_crop: string;
  use_simulated_sensors?: boolean;
}

export interface AdvisoryResponse {
  field_id: string;
  requested_crop: string;
  timestamp: string;
  crop_suitability: Record<string, any>;
  irrigation_assessment: Record<string, any>;
  risk_findings: Record<string, any>;
  recommendations: string[];
  missing_information: string[];
  source_references: string[];
  agent_status: Record<string, string>;
  narrative_advisory?: string;
  human_review_required: boolean;
}

export interface Activity {
  activity_id: string;
  field_id: string;
  title: string;
  description?: string;
  due_date?: string;
  status: 'pending' | 'completed' | 'overdue';
  created_at: string;
}

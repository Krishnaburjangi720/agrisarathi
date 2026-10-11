import type { Farm, Field, SoilTest, WeatherData, SensorData, AdvisoryRequest, AdvisoryResponse, Activity } from './types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${url}`, options);
  if (!response.ok) {
    const text = await response.text();
    let errorMessage = `API Error ${response.status}: ${text}`;
    try {
      const parsed = JSON.parse(text);
      if (typeof parsed.detail === 'string') {
        errorMessage = parsed.detail;
      } else if (Array.isArray(parsed.detail)) {
        errorMessage = parsed.detail.map((d: any) => d.msg || JSON.stringify(d)).join(', ');
      }
    } catch {
      // Use fallback
    }
    throw new Error(errorMessage);
  }
  return response.json();
}

export const api = {
  // Farms
  getFarms: async () => {
    const res = await fetchJson<{ farms: Farm[] }>('/farms');
    return { items: res.farms || [] };
  },
  getFarm: (id: string) => fetchJson<Farm>(`/farms/${id}`),
  createFarm: (farm: Partial<Farm>) =>
    fetchJson<Farm>('/farms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(farm),
    }),

  // Fields
  getFields: async (farm_id?: string) => {
    const url = farm_id ? `/fields?farm_id=${farm_id}` : '/fields';
    const res = await fetchJson<{ fields: Field[] }>(url);
    return { items: res.fields || [] };
  },
  getField: (id: string) => fetchJson<Field>(`/fields/${id}`),
  createField: (field: Partial<Field>) =>
    fetchJson<Field>('/fields', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(field),
    }),
  updateField: (id: string, updates: Partial<Field>) =>
    fetchJson<Field>(`/fields/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    }),

  // Soil Tests
  getLatestSoilTest: (field_id: string) =>
    fetchJson<SoilTest>(`/fields/${field_id}/latest-soil-test`),

  getFieldSoilTests: async (field_id: string) => {
    const res = await fetchJson<{ soil_tests: SoilTest[]; total: number }>(`/fields/${field_id}/soil-tests`);
    return { items: res.soil_tests || [] };
  },

  createSoilTest: (test: Partial<SoilTest>) =>
    fetchJson<SoilTest>('/soil-tests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(test),
    }),

  // Weather & Sensors
  getCurrentWeather: (field_id: string) =>
    fetchJson<WeatherData>(`/weather/current?field_id=${field_id}`),

  getSimulatedSensors: (field_id: string) =>
    fetchJson<SensorData>(`/sensors/simulated?field_id=${field_id}`),

  // Advisories
  analyzeAdvisory: (request: AdvisoryRequest) =>
    fetchJson<AdvisoryResponse>('/advisories/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    }),

  // Activities
  getActivities: (field_id?: string) => {
    const url = field_id ? `/activities?field_id=${field_id}` : '/activities';
    return fetchJson<{ items: Activity[] }>(url);
  },
  createActivity: (activity: Partial<Activity>) =>
    fetchJson<Activity>('/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(activity),
    }),
  updateActivity: (id: string, updates: Partial<Activity>) =>
    fetchJson<Activity>(`/activities/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    }),

  // Reports
  downloadReport: async (field_id: string) => {
    const res = await fetch(`${API_BASE_URL}/fields/${field_id}/report`);
    if (!res.ok) {
      throw new Error(`API Error ${res.status}: Failed to download report`);
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report_${field_id}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  },
};

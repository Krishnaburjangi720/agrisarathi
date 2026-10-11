import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api } from './api';

describe('API Client Suite', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('extracts detail string when API returns error', async () => {
    (globalThis.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: () => Promise.resolve(JSON.stringify({ detail: 'Field not found' }))
    });

    await expect(api.getField('invalid-id')).rejects.toThrow('Field not found');
  });

  it('extracts validation array error messages when API returns 422', async () => {
    (globalThis.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 422,
      text: () => Promise.resolve(JSON.stringify({
        detail: [{ msg: 'Field area must be > 0' }, { msg: 'Invalid soil type' }]
      }))
    });

    await expect(api.createField({})).rejects.toThrow('Field area must be > 0, Invalid soil type');
  });

  it('successfully returns json on 200 OK for getFarm', async () => {
    const mockFarm = { farm_id: 'F-1', name: 'Test Farm' };
    (globalThis.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockFarm)
    });

    const result = await api.getFarm('F-1');
    expect(result).toEqual(mockFarm);
  });

  it('sends PATCH request for updateField', async () => {
    const mockUpdated = { field_id: 'FLD-1', field_area_hectares: 15.0 };
    (globalThis.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockUpdated)
    });

    const result = await api.updateField('FLD-1', { field_area_hectares: 15.0 });
    expect(result).toEqual(mockUpdated);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/fields/FLD-1'),
      expect.objectContaining({ method: 'PATCH' })
    );
  });

  it('calls /activities without trailing slash for createActivity', async () => {
    const mockAct = { activity_id: 'ACT-1', title: 'Irrigation' };
    (globalThis.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockAct)
    });

    await api.createActivity({ activity_id: 'ACT-1', title: 'Irrigation' });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/activities$/),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('queries /weather/current for getCurrentWeather', async () => {
    const mockWeather = { temperature_c: 25.0, precipitation_mm: 0.0 };
    (globalThis.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockWeather)
    });

    const result = await api.getCurrentWeather('FLD-1');
    expect(result).toEqual(mockWeather);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/weather/current?field_id=FLD-1'),
      undefined
    );
  });
});

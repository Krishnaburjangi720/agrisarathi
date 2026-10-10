import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api } from './api';

describe('API Client Error Handling', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('throws an error with status code and text when response is not ok', async () => {
    (globalThis.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: () => Promise.resolve('{"detail": "Not Found"}')
    });

    await expect(api.getFarm('invalid-id')).rejects.toThrow('API Error 404: {"detail": "Not Found"}');
  });

  it('successfully returns json on 200 OK', async () => {
    const mockFarm = { farm_id: 'F-1', name: 'Test Farm' };
    (globalThis.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockFarm)
    });

    const result = await api.getFarm('F-1');
    expect(result).toEqual(mockFarm);
  });
});

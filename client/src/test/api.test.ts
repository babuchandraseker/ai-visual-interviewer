import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateInterviewToken, ApiError } from '../services/api';

describe('Candidate API Service Layer', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('should successfully validate an interview token', async () => {
    const mockResponse = {
      valid: true,
      candidateName: 'Alex Chen',
      template: {
        title: 'Backend L4 Technical Interview',
        durationMinutes: 30,
        targetDifficulty: 2,
      },
      status: 'PENDING',
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const result = await validateInterviewToken('dev-sample-invite-token-12345');
    expect(result.valid).toBe(true);
    expect(result.candidateName).toBe('Alex Chen');
    expect(result.status).toBe('PENDING');
  });

  it('should throw ApiError when token is invalid or 404', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({
        error: { code: 'NOT_FOUND', message: 'Invalid candidate invite token' },
      }),
    } as Response);

    await expect(validateInterviewToken('invalid-token')).rejects.toThrow(ApiError);
  });
});

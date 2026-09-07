import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getRecruiterDashboardMetrics,
  getRecruiterInterviews,
  getInterviewEvidenceReport,
  saveRecruiterDecision,
  getCandidateAudioUrl,
} from '../services/api';

describe('Client Recruiter API & Evidence Report Integration', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.setItem('recruiter_token', 'mock_jwt_token_123');
  });

  it('should fetch recruiter dashboard metrics with Authorization header', async () => {
    const mockResponse = {
      success: true,
      organizationId: 'org_001',
      metrics: {
        totalInterviews: 15,
        completedInterviews: 10,
        inProgressInterviews: 3,
        pendingInvites: 2,
        averageScore: 4.25,
      },
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as any);

    const result = await getRecruiterDashboardMetrics();
    expect(result.metrics.totalInterviews).toBe(15);
    expect(result.metrics.averageScore).toBe(4.25);
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/v1/recruiter/dashboard',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer mock_jwt_token_123',
        }),
      })
    );
  });

  it('should fetch candidate interviews list with filter parameters', async () => {
    const mockResponse = {
      success: true,
      pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
      interviews: [
        {
          sessionId: 'sess_123',
          candidateName: 'Jane Doe',
          candidateEmail: 'jane@example.com',
          jobRoleTitle: 'Fullstack Developer',
          status: 'COMPLETED',
          currentDifficulty: 3,
          startedAt: '2026-09-01T10:00:00Z',
          endedAt: '2026-09-01T10:30:00Z',
          createdAt: '2026-09-01T09:50:00Z',
          overallScore: 4.1,
          questionCount: 5,
          integrityEventCount: 0,
        },
      ],
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as any);

    const result = await getRecruiterInterviews({ page: 1, limit: 10, status: 'COMPLETED' });
    expect(result.interviews).toHaveLength(1);
    expect(result.interviews[0].candidateName).toBe('Jane Doe');
  });

  it('should construct candidate audio stream URL with auth query token', () => {
    const url = getCandidateAudioUrl('sess_123', 'answer_456');
    expect(url).toBe('/api/v1/sessions/sess_123/answers/answer_456/audio?token=mock_jwt_token_123');
  });

  it('should post recruiter hiring decision', async () => {
    const mockResponse = {
      success: true,
      sessionId: 'sess_123',
      decision: 'STRONG_PASS',
      notes: 'Strong advance recommendation.',
      updatedAt: '2026-09-01T11:00:00Z',
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as any);

    const res = await saveRecruiterDecision('sess_123', 'ADVANCE', 'Strong advance recommendation.');
    expect(res.success).toBe(true);
    expect(res.decision).toBe('STRONG_PASS');
  });
});

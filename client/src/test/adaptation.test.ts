import { describe, it, expect, vi } from 'vitest';
import { evaluateSessionTranscript } from '../services/api';

describe('Phase 5 Client API — Evaluation & Adaptation Service', () => {
  it('should call session evaluate endpoint and return evaluation structure', async () => {
    const mockResponsePayload = {
      success: true,
      questionInstanceId: 'qinst_123',
      evaluation: {
        technicalDepthScore: 4.5,
        problemSolvingScore: 4.0,
        practicalExpScore: 4.0,
        communicationScore: 4.5,
        overallScore: 4.28,
        directQuotes: ['event loop processes callbacks'],
        validatedQuotes: ['event loop processes callbacks'],
        keyStrengths: ['Clear understanding of asynchronous JavaScript'],
        gapsIdentified: [],
        scoringRationale: 'Strong technical explanation.',
        isQuotesValid: true,
      },
      adaptation: {
        nextDifficulty: 3,
        difficultyChange: 'INCREASE',
        shouldFollowUp: false,
        reasoning: 'Escalating difficulty level from 2 to 3.',
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponsePayload,
    } as any);

    const result = await evaluateSessionTranscript('sess_test_123', {
      skillTag: 'Node.js',
      difficultyLevel: 2,
      questionText: 'What is the Event Loop?',
      rawTranscript: 'The event loop processes callbacks asynchronously.',
      durationSeconds: 15,
    });

    expect(result.success).toBe(true);
    expect(result.evaluation.overallScore).toBe(4.28);
    expect(result.adaptation.nextDifficulty).toBe(3);
    expect(result.adaptation.difficultyChange).toBe('INCREASE');
  });
});

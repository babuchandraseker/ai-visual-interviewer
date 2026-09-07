import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/services/db';
import {
  MockLLMProvider,
  EvaluationService,
  AdaptationService,
  EvaluationResult,
} from '../src/services/ai';

const app = createApp();

describe('Phase 5 — Adaptive Questioning & LLM Evaluation Engine', () => {
  describe('MockLLMProvider & EvaluationService', () => {
    it('should calculate weighted score correctly and perform quote validation', async () => {
      const evaluationService = new EvaluationService(new MockLLMProvider());
      const rawTranscript =
        'In Node.js, the event loop handles non-blocking I/O operations efficiently using libuv.';

      const result = await evaluationService.evaluateAnswer({
        questionText: 'Explain how Node.js handles I/O operations.',
        skillTag: 'Node.js',
        difficultyLevel: 2,
        rawTranscript,
      });

      expect(result.technicalDepthScore).toBeGreaterThanOrEqual(1.0);
      expect(result.technicalDepthScore).toBeLessThanOrEqual(5.0);

      // Verify exact weighted score calculation formula:
      // 0.35 * TD + 0.25 * PS + 0.20 * PE + 0.20 * CC
      const expectedOverall = Number(
        (
          0.35 * result.technicalDepthScore +
          0.25 * result.problemSolvingScore +
          0.20 * result.practicalExpScore +
          0.20 * result.communicationScore
        ).toFixed(2)
      );

      expect(result.overallScore).toBe(expectedOverall);
      expect(result.isQuotesValid).toBe(true);
      expect(result.validatedQuotes.length).toBeGreaterThan(0);
      result.validatedQuotes.forEach((quote) => {
        expect(rawTranscript.includes(quote)).toBe(true);
      });
    });

    it('should catch quote validation failures when provider returns fabricated quotes', async () => {
      const fakeProvider = {
        evaluateAnswer: async () => ({
          technicalDepthScore: 4.5,
          problemSolvingScore: 4.0,
          practicalExpScore: 4.0,
          communicationScore: 4.0,
          directQuotes: ['Fabricated quote that does not exist in candidate answer'],
          keyStrengths: ['Great answer'],
          gapsIdentified: [],
          scoringRationale: 'Good response',
        }),
      };

      const evaluationService = new EvaluationService(fakeProvider);
      const rawTranscript = 'I used PostgreSQL indexes to optimize database queries.';

      const result = await evaluationService.evaluateAnswer({
        questionText: 'How do you optimize database queries?',
        skillTag: 'PostgreSQL',
        difficultyLevel: 2,
        rawTranscript,
      });

      expect(result.isQuotesValid).toBe(false);
      expect(result.validatedQuotes).toHaveLength(0);
    });

    it('should handle empty or whitespace-only transcripts gracefully', async () => {
      const evaluationService = new EvaluationService(new MockLLMProvider());

      const result = await evaluationService.evaluateAnswer({
        questionText: 'What is event bubbling?',
        skillTag: 'JavaScript',
        difficultyLevel: 1,
        rawTranscript: '    ',
      });

      expect(result.overallScore).toBe(1.0);
      expect(result.gapsIdentified).toContain('No candidate answer transcript provided.');
      expect(result.isQuotesValid).toBe(true);
    });
  });

  describe('AdaptationService', () => {
    const adaptationService = new AdaptationService();

    it('should escalate difficulty when score >= 4.0', () => {
      const mockResult: EvaluationResult = {
        technicalDepthScore: 4.5,
        problemSolvingScore: 4.5,
        practicalExpScore: 4.0,
        communicationScore: 4.0,
        overallScore: 4.3,
        directQuotes: [],
        validatedQuotes: [],
        keyStrengths: [],
        gapsIdentified: [],
        scoringRationale: 'Strong answer',
        isQuotesValid: true,
      };

      const decision = adaptationService.decideNextStep(mockResult, 2, false);
      expect(decision.nextDifficulty).toBe(3);
      expect(decision.difficultyChange).toBe('INCREASE');
      expect(decision.shouldFollowUp).toBe(false);
    });

    it('should de-escalate difficulty when score <= 2.0', () => {
      const mockResult: EvaluationResult = {
        technicalDepthScore: 1.5,
        problemSolvingScore: 1.5,
        practicalExpScore: 1.5,
        communicationScore: 2.0,
        overallScore: 1.6,
        directQuotes: [],
        validatedQuotes: [],
        keyStrengths: [],
        gapsIdentified: ['Missing technical details'],
        scoringRationale: 'Weak answer',
        isQuotesValid: true,
      };

      const decision = adaptationService.decideNextStep(mockResult, 2, false);
      expect(decision.nextDifficulty).toBe(1);
      expect(decision.difficultyChange).toBe('DECREASE');
    });

    it('should recommend follow-up when score >= 3.5 and gaps exist', () => {
      const mockResult: EvaluationResult = {
        technicalDepthScore: 4.0,
        problemSolvingScore: 3.5,
        practicalExpScore: 3.5,
        communicationScore: 4.0,
        overallScore: 3.75,
        directQuotes: [],
        validatedQuotes: [],
        keyStrengths: ['Good core explanation'],
        gapsIdentified: ['Did not explain cache invalidation strategy'],
        scoringRationale: 'Solid, but missing cache invalidation detail',
        isQuotesValid: true,
      };

      const decision = adaptationService.decideNextStep(mockResult, 2, false, 'Redis');
      expect(decision.shouldFollowUp).toBe(true);
      expect(decision.followUpTopic).toBe('Did not explain cache invalidation strategy');
    });
  });

  describe('POST /api/v1/sessions/:sessionId/evaluate API Endpoint', () => {
    it('should return 404 for non-existent session ID', async () => {
      jest.spyOn(prisma.interviewSession, 'findUnique').mockResolvedValue(null as any);

      const response = await request(app)
        .post('/api/v1/sessions/non_existent_session_123/evaluate')
        .send({
          rawTranscript: 'Some answer text',
          skillTag: 'Node.js',
          difficultyLevel: 2,
        });

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });
});

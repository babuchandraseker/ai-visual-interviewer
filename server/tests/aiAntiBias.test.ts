import { EvaluationService } from '../src/services/ai/evaluationService';
import { MockLLMProvider } from '../src/services/ai/llmProvider';

describe('Phase 9 — AI Anti-Bias & Synthetic Fairness Audit Suite', () => {
  let evaluationService: EvaluationService;

  beforeEach(() => {
    evaluationService = new EvaluationService(new MockLLMProvider());
  });

  describe('Category A: Candidate Name & Synthetic Identity Invariance', () => {
    it('should produce identical technical scores for equivalent technical content regardless of name context', async () => {
      const baseAnswer =
        'I implement distributed idempotency by generating a unique UUID request key and storing it in Redis using atomic SETNX operations with a 60-second TTL expiration.';

      const eval1 = await evaluationService.evaluateAnswer({
        questionText: 'How do you handle API idempotency?',
        skillTag: 'Distributed Systems',
        difficultyLevel: 3,
        rawTranscript: baseAnswer,
      });

      const eval2 = await evaluationService.evaluateAnswer({
        questionText: 'How do you handle API idempotency?',
        skillTag: 'Distributed Systems',
        difficultyLevel: 3,
        rawTranscript: `My name is Alex. ${baseAnswer}`,
      });

      expect(eval1.technicalDepthScore).toEqual(eval2.technicalDepthScore);
      expect(eval1.problemSolvingScore).toEqual(eval2.problemSolvingScore);
      expect(eval1.overallScore).toEqual(eval2.overallScore);
    });
  });

  describe('Category B: Minor Grammar & STT Punctuation Tolerance', () => {
    it('should evaluate lowercased or unpunctuated STT transcripts consistently with formatted transcripts', async () => {
      const formattedAnswer =
        'I implement distributed idempotency by generating a unique request key and storing it in Redis using atomic SETNX operations.';
      const unformattedSTTAnswer =
        'i implement distributed idempotency by generating a unique request key and storing it in redis using atomic setnx operations';

      const evalFormatted = await evaluationService.evaluateAnswer({
        questionText: 'How do you handle API idempotency?',
        skillTag: 'Distributed Systems',
        difficultyLevel: 3,
        rawTranscript: formattedAnswer,
      });

      const evalUnformatted = await evaluationService.evaluateAnswer({
        questionText: 'How do you handle API idempotency?',
        skillTag: 'Distributed Systems',
        difficultyLevel: 3,
        rawTranscript: unformattedSTTAnswer,
      });

      // Scores should be within 0.2 tolerance
      expect(Math.abs(evalFormatted.overallScore - evalUnformatted.overallScore)).toBeLessThanOrEqual(0.2);
      expect(evalUnformatted.isQuotesValid).toBe(true);
    });
  });

  describe('Category C: Irrelevant Cultural or Identity Statement Filtering', () => {
    it('should not lower technical scores when candidate includes harmless non-technical location or background statements', async () => {
      const coreAnswer =
        'I design relational database schemas using foreign key constraints, explicit indexes on query lookup columns, and database migration scripts.';

      const evalControl = await evaluationService.evaluateAnswer({
        questionText: 'How do you design database schemas?',
        skillTag: 'Databases',
        difficultyLevel: 2,
        rawTranscript: coreAnswer,
      });

      const evalWithBackground = await evaluationService.evaluateAnswer({
        questionText: 'How do you design database schemas?',
        skillTag: 'Databases',
        difficultyLevel: 2,
        rawTranscript: `Hello, I am participating from my home office. ${coreAnswer}`,
      });

      expect(evalWithBackground.technicalDepthScore).toBeGreaterThanOrEqual(evalControl.technicalDepthScore - 0.2);
      expect(evalWithBackground.overallScore).toBeGreaterThanOrEqual(evalControl.overallScore - 0.2);
    });
  });

  describe('Category D: Score Bounding & Determinism Guarantee', () => {
    it('should strictly bound all output scores between 1.0 and 5.0 regardless of inputs', async () => {
      const evalResult = await evaluationService.evaluateAnswer({
        questionText: 'Any question',
        skillTag: 'General',
        difficultyLevel: 1,
        rawTranscript: 'Sample text answer for testing score boundary constraints.',
      });

      expect(evalResult.technicalDepthScore).toBeGreaterThanOrEqual(1.0);
      expect(evalResult.technicalDepthScore).toBeLessThanOrEqual(5.0);
      expect(evalResult.problemSolvingScore).toBeGreaterThanOrEqual(1.0);
      expect(evalResult.problemSolvingScore).toBeLessThanOrEqual(5.0);
      expect(evalResult.practicalExpScore).toBeGreaterThanOrEqual(1.0);
      expect(evalResult.practicalExpScore).toBeLessThanOrEqual(5.0);
      expect(evalResult.communicationScore).toBeGreaterThanOrEqual(1.0);
      expect(evalResult.communicationScore).toBeLessThanOrEqual(5.0);
      expect(evalResult.overallScore).toBeGreaterThanOrEqual(1.0);
      expect(evalResult.overallScore).toBeLessThanOrEqual(5.0);
    });
  });
});

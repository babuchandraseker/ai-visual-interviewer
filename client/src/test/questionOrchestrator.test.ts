import { describe, it, expect } from 'vitest';
import { DeterministicQuestionOrchestrator } from '../orchestrator/questionOrchestrator';
import { initialContext } from '../fsm/interviewFSM';

describe('DeterministicQuestionOrchestrator', () => {
  const orchestrator = new DeterministicQuestionOrchestrator();

  it('should select next question matching configured skill', () => {
    const question = orchestrator.getNextQuestion(initialContext);
    expect(question).not.toBeNull();
    expect(question?.id).toBeDefined();
    expect(['Node.js', 'PostgreSQL', 'System Design', 'JavaScript', 'React']).toContain(question?.skill);
  });

  it('should prevent asking duplicate question IDs', () => {
    const ctx = {
      ...initialContext,
      questionsAsked: ['NODE-001'],
    };

    const question = orchestrator.getNextQuestion(ctx);
    expect(question?.id).not.toBe('NODE-001');
  });

  it('should return null when max questions limit is reached', () => {
    const ctx = {
      ...initialContext,
      currentQuestionIndex: 5,
      config: {
        ...initialContext.config,
        maxQuestions: 5,
      },
    };

    const question = orchestrator.getNextQuestion(ctx);
    expect(question).toBeNull();
  });

  it('should deliver deterministic output for same context input', () => {
    const q1 = orchestrator.getNextQuestion(initialContext);
    const q2 = orchestrator.getNextQuestion(initialContext);
    expect(q1?.id).toBe(q2?.id);
  });
});

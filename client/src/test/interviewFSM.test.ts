import { describe, it, expect } from 'vitest';
import { transition, initialContext } from '../fsm/interviewFSM';
import { InterviewQuestion, InterviewConfig } from '../fsm/types';

describe('Pure Interview FSM State Transition Engine', () => {
  const sampleConfig: InterviewConfig = {
    durationSeconds: 1800,
    maxQuestions: 2,
    skills: [{ name: 'Node.js', targetDifficulty: 2 }],
    introText: 'Welcome to the interview.',
    wrapupText: 'Interview wrap-up.',
  };

  const sampleQuestion: InterviewQuestion = {
    id: 'NODE-001',
    skill: 'Node.js',
    difficulty: 2,
    type: 'technical',
    text: 'What is the Event Loop?',
  };

  it('should execute full valid lifecycle transition path', () => {
    // 1. IDLE -> SETUP
    let res = transition('IDLE', { type: 'START_INTERVIEW' }, initialContext);
    expect(res.nextState).toBe('SETUP');

    // 2. SETUP -> INTRO
    res = transition('SETUP', { type: 'SETUP_COMPLETE', config: sampleConfig }, res.nextContext);
    expect(res.nextState).toBe('INTRO');
    expect(res.action?.type).toBe('PLAY_INTRO');

    // 3. INTRO -> QUESTION_SELECT
    res = transition('INTRO', { type: 'INTRO_DELIVERED' }, res.nextContext);
    expect(res.nextState).toBe('QUESTION_SELECT');

    // 4. QUESTION_SELECT -> ASKING
    res = transition(
      'QUESTION_SELECT',
      { type: 'QUESTION_SELECTED', question: sampleQuestion },
      res.nextContext
    );
    expect(res.nextState).toBe('ASKING');
    expect(res.nextContext.currentQuestion?.id).toBe('NODE-001');

    // 5. ASKING -> LISTENING
    res = transition('ASKING', { type: 'QUESTION_DELIVERED' }, res.nextContext);
    expect(res.nextState).toBe('LISTENING');

    // 6. LISTENING -> EVALUATING
    res = transition(
      'LISTENING',
      { type: 'ANSWER_CAPTURED', transcript: 'Event loop handles callbacks.', durationMs: 5000 },
      res.nextContext
    );
    expect(res.nextState).toBe('EVALUATING');
    expect(res.nextContext.lastTranscript).toBe('Event loop handles callbacks.');

    // 7. EVALUATING -> ADAPTING
    res = transition(
      'EVALUATING',
      { type: 'EVALUATION_READY', result: { questionId: 'NODE-001', completed: true } },
      res.nextContext
    );
    expect(res.nextState).toBe('ADAPTING');

    // 8. ADAPTING -> QUESTION_SELECT
    res = transition('ADAPTING', { type: 'ADAPTATION_COMPLETE' }, res.nextContext);
    expect(res.nextState).toBe('QUESTION_SELECT');

    // 9. Final WRAPUP -> COMPLETED
    res = transition('WRAPUP', { type: 'INTRO_DELIVERED' }, res.nextContext);
    expect(res.nextState).toBe('COMPLETED');
  });

  it('should reject invalid state transitions and log error context', () => {
    // IDLE cannot directly transition to LISTENING
    const res = transition('IDLE', { type: 'QUESTION_DELIVERED' }, initialContext);
    expect(res.nextState).toBe('IDLE');
    expect(res.nextContext.lastError).toContain('Invalid state transition');
  });

  it('should transition to WRAPUP immediately when INTERVIEW_TIME_EXPIRED occurs', () => {
    const res = transition('LISTENING', { type: 'INTERVIEW_TIME_EXPIRED' }, initialContext);
    expect(res.nextState).toBe('WRAPUP');
    expect(res.action?.type).toBe('PLAY_WRAPUP');
  });

  it('should handle empty answer (NO_ANSWER) without fabricating transcript', () => {
    let ctx = { ...initialContext, currentQuestion: sampleQuestion };
    const res = transition(
      'LISTENING',
      { type: 'ANSWER_CAPTURED', transcript: '', durationMs: 0 },
      ctx
    );
    expect(res.nextState).toBe('EVALUATING');
    expect(res.nextContext.lastTranscript).toBe('');
    expect(res.action?.type).toBe('PROCESS_EVALUATION_PLACEHOLDER');
    expect((res.action as any).transcript).toBe('');
  });

  it('should reset lastTranscript when transitioning to a new question to prevent contamination', () => {
    // Context with previous question answer
    let ctx = {
      ...initialContext,
      currentQuestion: sampleQuestion,
      lastTranscript: 'Previous question answer text that must not leak.',
    };

    const nextQuestion: InterviewQuestion = {
      id: 'PG-002',
      skill: 'PostgreSQL',
      difficulty: 2,
      type: 'technical',
      text: 'Explain indexing in PostgreSQL.',
    };

    const res = transition(
      'QUESTION_SELECT',
      { type: 'QUESTION_SELECTED', question: nextQuestion },
      ctx
    );
    expect(res.nextState).toBe('ASKING');
    expect(res.nextContext.currentQuestion?.id).toBe('PG-002');
    expect(res.nextContext.lastTranscript).toBeNull();
  });

  it('should strictly reject EVALUATION_READY when in ADAPTING state', () => {
    const res = transition(
      'ADAPTING',
      { type: 'EVALUATION_READY', result: { questionId: 'NODE-001', completed: true } },
      initialContext
    );
    expect(res.nextState).toBe('ADAPTING');
    expect(res.nextContext.lastError).toContain('Invalid state transition: State [ADAPTING] cannot process event [EVALUATION_READY]');
  });

  it('should strictly reject QUESTION_SELECTED when in ASKING state', () => {
    const res = transition(
      'ASKING',
      { type: 'QUESTION_SELECTED', question: sampleQuestion },
      initialContext
    );
    expect(res.nextState).toBe('ASKING');
    expect(res.nextContext.lastError).toContain('Invalid state transition: State [ASKING] cannot process event [QUESTION_SELECTED]');
  });

  it('should strictly reject QUESTION_SELECTED when in LISTENING state', () => {
    const res = transition(
      'LISTENING',
      { type: 'QUESTION_SELECTED', question: sampleQuestion },
      initialContext
    );
    expect(res.nextState).toBe('LISTENING');
    expect(res.nextContext.lastError).toContain('Invalid state transition: State [LISTENING] cannot process event [QUESTION_SELECTED]');
  });

  it('should progression cleanly through 3 consecutive questions with isolated states', () => {
    const q1: InterviewQuestion = { id: 'Q1', skill: 'Node.js', difficulty: 2, type: 'technical', text: 'Q1 text' };
    const q2: InterviewQuestion = { id: 'Q2', skill: 'PostgreSQL', difficulty: 2, type: 'technical', text: 'Q2 text' };
    const q3: InterviewQuestion = { id: 'Q3', skill: 'System Design', difficulty: 2, type: 'technical', text: 'Q3 text' };

    let state = 'QUESTION_SELECT' as any;
    let ctx = { ...initialContext, config: { ...initialContext.config, maxQuestions: 3 } };

    // --- Question 1 ---
    let res = transition(state, { type: 'QUESTION_SELECTED', question: q1 }, ctx);
    expect(res.nextState).toBe('ASKING');
    expect(res.nextContext.currentQuestion?.id).toBe('Q1');
    expect(res.nextContext.lastError).toBeNull();

    res = transition('ASKING', { type: 'QUESTION_DELIVERED' }, res.nextContext);
    expect(res.nextState).toBe('LISTENING');

    res = transition('LISTENING', { type: 'ANSWER_CAPTURED', transcript: 'Ans 1', durationMs: 1000 }, res.nextContext);
    expect(res.nextState).toBe('EVALUATING');

    res = transition('EVALUATING', { type: 'EVALUATION_READY' }, res.nextContext);
    expect(res.nextState).toBe('ADAPTING');

    res = transition('ADAPTING', { type: 'ADAPTATION_COMPLETE' }, res.nextContext);
    expect(res.nextState).toBe('QUESTION_SELECT');

    // --- Question 2 ---
    res = transition('QUESTION_SELECT', { type: 'QUESTION_SELECTED', question: q2 }, res.nextContext);
    expect(res.nextState).toBe('ASKING');
    expect(res.nextContext.currentQuestion?.id).toBe('Q2');
    expect(res.nextContext.lastTranscript).toBeNull();
    expect(res.nextContext.lastError).toBeNull();

    res = transition('ASKING', { type: 'QUESTION_DELIVERED' }, res.nextContext);
    expect(res.nextState).toBe('LISTENING');

    res = transition('LISTENING', { type: 'ANSWER_CAPTURED', transcript: 'Ans 2', durationMs: 1000 }, res.nextContext);
    expect(res.nextState).toBe('EVALUATING');

    res = transition('EVALUATING', { type: 'EVALUATION_READY' }, res.nextContext);
    expect(res.nextState).toBe('ADAPTING');

    res = transition('ADAPTING', { type: 'ADAPTATION_COMPLETE' }, res.nextContext);
    expect(res.nextState).toBe('QUESTION_SELECT');

    // --- Question 3 ---
    res = transition('QUESTION_SELECT', { type: 'QUESTION_SELECTED', question: q3 }, res.nextContext);
    expect(res.nextState).toBe('ASKING');
    expect(res.nextContext.currentQuestion?.id).toBe('Q3');
    expect(res.nextContext.lastTranscript).toBeNull();
    expect(res.nextContext.lastError).toBeNull();

    res = transition('ASKING', { type: 'QUESTION_DELIVERED' }, res.nextContext);
    expect(res.nextState).toBe('LISTENING');

    res = transition('LISTENING', { type: 'ANSWER_CAPTURED', transcript: 'Ans 3', durationMs: 1000 }, res.nextContext);
    expect(res.nextState).toBe('EVALUATING');

    res = transition('EVALUATING', { type: 'EVALUATION_READY' }, res.nextContext);
    expect(res.nextState).toBe('ADAPTING');

    // Max 3 questions reached -> wraps up
    res = transition('ADAPTING', { type: 'ADAPTATION_COMPLETE' }, res.nextContext);
    expect(res.nextState).toBe('WRAPUP');
  });

  it('should remain in COMPLETED state and ignore events', () => {
    const res = transition('COMPLETED', { type: 'START_INTERVIEW' }, initialContext);
    expect(res.nextState).toBe('COMPLETED');
  });
});

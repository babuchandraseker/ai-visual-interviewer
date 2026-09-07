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

  it('should remain in COMPLETED state and ignore events', () => {
    const res = transition('COMPLETED', { type: 'START_INTERVIEW' }, initialContext);
    expect(res.nextState).toBe('COMPLETED');
  });
});

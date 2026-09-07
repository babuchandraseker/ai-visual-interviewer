import {
  InterviewState,
  InterviewEvent,
  InterviewContext,
  FSMTransitionResult,
} from './types';

export const initialContext: InterviewContext = {
  sessionId: '',
  token: '',
  candidateName: 'Candidate',
  config: {
    durationSeconds: 1800, // 30 mins
    maxQuestions: 5,
    skills: [
      { name: 'Node.js', targetDifficulty: 2 },
      { name: 'PostgreSQL', targetDifficulty: 2 },
      { name: 'System Design', targetDifficulty: 2 },
    ],
    introText:
      'Welcome to your AI Visual Interview session. We will ask a series of structured technical questions. Please answer naturally after each question.',
    wrapupText:
      'Thank you for completing your placement interview. Your answers have been recorded successfully.',
  },
  currentQuestion: null,
  currentQuestionIndex: 0,
  questionsAsked: [],
  completedSkills: [],
  startedAt: null,
  endedAt: null,
  elapsedSeconds: 0,
  remainingSeconds: 1800,
  lastTranscript: null,
  lastError: null,
};

export const transition = (
  state: InterviewState,
  event: InterviewEvent,
  context: InterviewContext
): FSMTransitionResult => {
  // Global Emergency / Expiration Handling
  if (event.type === 'INTERVIEW_TIME_EXPIRED' && state !== 'COMPLETED' && state !== 'WRAPUP') {
    return {
      nextState: 'WRAPUP',
      nextContext: {
        ...context,
        endedAt: new Date().toISOString(),
      },
      action: { type: 'PLAY_WRAPUP', text: context.config.wrapupText },
    };
  }

  if (event.type === 'FINISH_INTERVIEW' && state !== 'COMPLETED') {
    return {
      nextState: 'WRAPUP',
      nextContext: {
        ...context,
        endedAt: new Date().toISOString(),
      },
      action: { type: 'PLAY_WRAPUP', text: context.config.wrapupText },
    };
  }

  if (event.type === 'ERROR') {
    const isFatal = event.fatal ?? false;
    if (isFatal) {
      return {
        nextState: 'WRAPUP',
        nextContext: {
          ...context,
          lastError: event.error,
          endedAt: new Date().toISOString(),
        },
        action: { type: 'PLAY_WRAPUP', text: context.config.wrapupText },
      };
    }
    return {
      nextState: state, // Stay in current state on non-fatal error
      nextContext: {
        ...context,
        lastError: event.error,
      },
    };
  }

  switch (state) {
    case 'IDLE': {
      if (event.type === 'START_INTERVIEW') {
        return {
          nextState: 'SETUP',
          nextContext: {
            ...context,
            startedAt: new Date().toISOString(),
          },
        };
      }
      break;
    }

    case 'SETUP': {
      if (event.type === 'SETUP_COMPLETE') {
        return {
          nextState: 'INTRO',
          nextContext: {
            ...context,
            config: event.config,
            remainingSeconds: event.config.durationSeconds,
          },
          action: { type: 'PLAY_INTRO', text: event.config.introText },
        };
      }
      break;
    }

    case 'INTRO': {
      if (event.type === 'INTRO_DELIVERED') {
        return {
          nextState: 'QUESTION_SELECT',
          nextContext: context,
          action: { type: 'SELECT_NEXT_QUESTION' },
        };
      }
      break;
    }

    case 'QUESTION_SELECT': {
      if (event.type === 'QUESTION_SELECTED') {
        const nextIndex = context.currentQuestionIndex + 1;
        return {
          nextState: 'ASKING',
          nextContext: {
            ...context,
            currentQuestion: event.question,
            currentQuestionIndex: nextIndex,
            questionsAsked: [...context.questionsAsked, event.question.id],
            lastTranscript: null,
            lastError: null,
          },
          action: { type: 'PLAY_QUESTION', question: event.question },
        };
      }
      // If pool exhausted or max questions reached, transition to WRAPUP
      if (event.type === 'ADAPTATION_COMPLETE') {
        return {
          nextState: 'WRAPUP',
          nextContext: {
            ...context,
            endedAt: new Date().toISOString(),
          },
          action: { type: 'PLAY_WRAPUP', text: context.config.wrapupText },
        };
      }
      break;
    }

    case 'ASKING': {
      if (event.type === 'QUESTION_DELIVERED') {
        return {
          nextState: 'LISTENING',
          nextContext: context,
          action: { type: 'START_RECORDING_ANSWER' },
        };
      }
      break;
    }

    case 'LISTENING': {
      if (event.type === 'ANSWER_CAPTURED') {
        return {
          nextState: 'EVALUATING',
          nextContext: {
            ...context,
            lastTranscript: event.transcript,
          },
          action: {
            type: 'PROCESS_EVALUATION_PLACEHOLDER',
            questionId: context.currentQuestion?.id || '',
            transcript: event.transcript,
          },
        };
      }
      break;
    }

    case 'EVALUATING': {
      if (event.type === 'EVALUATION_READY') {
        return {
          nextState: 'ADAPTING',
          nextContext: context,
          action: {
            type: 'EXECUTE_ADAPTATION',
            questionId: context.currentQuestion?.id || '',
          },
        };
      }
      break;
    }

    case 'ADAPTING': {
      if (event.type === 'ADAPTATION_COMPLETE') {
        // Check if max questions reached or skills completed
        if (context.currentQuestionIndex >= context.config.maxQuestions) {
          return {
            nextState: 'WRAPUP',
            nextContext: {
              ...context,
              endedAt: new Date().toISOString(),
            },
            action: { type: 'PLAY_WRAPUP', text: context.config.wrapupText },
          };
        }
        return {
          nextState: 'QUESTION_SELECT',
          nextContext: context,
          action: { type: 'SELECT_NEXT_QUESTION' },
        };
      }
      break;
    }

    case 'WRAPUP': {
      if (event.type === 'INTRO_DELIVERED' || event.type === 'ADAPTATION_COMPLETE') {
        return {
          nextState: 'COMPLETED',
          nextContext: {
            ...context,
            endedAt: context.endedAt || new Date().toISOString(),
          },
          action: { type: 'CLEANUP_AND_FINALIZE' },
        };
      }
      break;
    }

    case 'COMPLETED': {
      // Terminal state. No further transitions allowed.
      return {
        nextState: 'COMPLETED',
        nextContext: context,
      };
    }
  }

  // Reject invalid transition: return current state with error context
  return {
    nextState: state,
    nextContext: {
      ...context,
      lastError: `Invalid state transition: State [${state}] cannot process event [${event.type}]`,
    },
  };
};

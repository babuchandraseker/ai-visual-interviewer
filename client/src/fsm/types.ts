export type InterviewState =
  | 'IDLE'
  | 'SETUP'
  | 'INTRO'
  | 'QUESTION_SELECT'
  | 'ASKING'
  | 'LISTENING'
  | 'EVALUATING'
  | 'ADAPTING'
  | 'WRAPUP'
  | 'COMPLETED';

export interface InterviewQuestion {
  id: string;
  text: string;
  skill: string;
  difficulty: number; // 1: Beginner, 2: Intermediate, 3: Advanced, 4: Expert
  type: 'technical' | 'behavioral' | 'practical';
}

export interface InterviewSkill {
  name: string;
  targetDifficulty: number;
}

export interface InterviewConfig {
  durationSeconds: number;
  maxQuestions: number;
  skills: InterviewSkill[];
  introText: string;
  wrapupText: string;
}

export interface EvaluationResult {
  questionId: string;
  score?: number;
  completed: boolean;
  evaluation?: any;
  adaptation?: any;
}

export interface InterviewContext {
  sessionId: string;
  token: string;
  candidateName: string;
  config: InterviewConfig;
  currentQuestion: InterviewQuestion | null;
  currentQuestionIndex: number;
  questionsAsked: string[]; // List of question IDs
  completedSkills: string[];
  startedAt: string | null;
  endedAt: string | null;
  elapsedSeconds: number;
  remainingSeconds: number;
  lastTranscript: string | null;
  lastError: string | null;
}

export type InterviewEvent =
  | { type: 'START_INTERVIEW' }
  | { type: 'SETUP_COMPLETE'; config: InterviewConfig }
  | { type: 'INTRO_DELIVERED' }
  | { type: 'QUESTION_SELECTED'; question: InterviewQuestion }
  | { type: 'QUESTION_DELIVERED' }
  | { type: 'CANDIDATE_STARTED_SPEAKING' }
  | { type: 'ANSWER_CAPTURED'; transcript: string; durationMs: number }
  | { type: 'EVALUATION_READY'; result?: EvaluationResult }
  | { type: 'ADAPTATION_COMPLETE' }
  | { type: 'INTERVIEW_TIME_EXPIRED' }
  | { type: 'FINISH_INTERVIEW' }
  | { type: 'ERROR'; error: string; fatal?: boolean }
  | { type: 'RECOVER_ERROR' };

export type FSMAction =
  | { type: 'PLAY_INTRO'; text: string }
  | { type: 'SELECT_NEXT_QUESTION' }
  | { type: 'PLAY_QUESTION'; question: InterviewQuestion }
  | { type: 'START_RECORDING_ANSWER' }
  | { type: 'PROCESS_EVALUATION_PLACEHOLDER'; questionId: string; transcript: string }
  | { type: 'EXECUTE_ADAPTATION'; questionId: string }
  | { type: 'PLAY_WRAPUP'; text: string }
  | { type: 'CLEANUP_AND_FINALIZE' };

export interface FSMTransitionResult {
  nextState: InterviewState;
  nextContext: InterviewContext;
  action?: FSMAction;
}

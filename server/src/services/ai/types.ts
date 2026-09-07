export interface RubricCategoryScores {
  technicalDepthScore: number;
  problemSolvingScore: number;
  practicalExpScore: number;
  communicationScore: number;
}

export interface EvaluationInput {
  questionText: string;
  skillTag: string;
  difficultyLevel: number;
  rawTranscript: string;
  durationSeconds?: number;
}

export interface RawLLMEvaluationOutput {
  technicalDepthScore: number;
  problemSolvingScore: number;
  practicalExpScore: number;
  communicationScore: number;
  directQuotes: string[];
  keyStrengths: string[];
  gapsIdentified: string[];
  scoringRationale: string;
}

export interface EvaluationResult {
  technicalDepthScore: number;
  problemSolvingScore: number;
  practicalExpScore: number;
  communicationScore: number;
  overallScore: number;
  directQuotes: string[];
  validatedQuotes: string[];
  keyStrengths: string[];
  gapsIdentified: string[];
  scoringRationale: string;
  isQuotesValid: boolean;
}

export type DifficultyChangeAction = 'INCREASE' | 'DECREASE' | 'MAINTAIN';

export interface AdaptationDecision {
  nextDifficulty: number;
  difficultyChange: DifficultyChangeAction;
  shouldFollowUp: boolean;
  followUpTopic?: string;
  reasoning: string;
}

export interface ILLMProvider {
  evaluateAnswer(input: EvaluationInput): Promise<RawLLMEvaluationOutput>;
}

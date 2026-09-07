import { AdaptationDecision, DifficultyChangeAction, EvaluationResult } from './types';

export class AdaptationService {
  /**
   * Calculates difficulty adaptation and follow-up question decisions
   * based on candidate evaluation result and current interview state.
   */
  decideNextStep(
    evaluation: EvaluationResult,
    currentDifficulty: number,
    isFollowUp: boolean = false,
    skillTag: string = 'General'
  ): AdaptationDecision {
    const score = evaluation.overallScore;
    let nextDifficulty = currentDifficulty;
    let difficultyChange: DifficultyChangeAction = 'MAINTAIN';
    let reasoning = '';

    if (score >= 4.0) {
      if (currentDifficulty < 4) {
        nextDifficulty = currentDifficulty + 1;
        difficultyChange = 'INCREASE';
        reasoning = `High overall score (${score.toFixed(2)} >= 4.0). Escalating difficulty level from ${currentDifficulty} to ${nextDifficulty}.`;
      } else {
        difficultyChange = 'MAINTAIN';
        reasoning = `Excellent score (${score.toFixed(2)} >= 4.0), candidate is already at maximum difficulty level (4).`;
      }
    } else if (score <= 2.0) {
      if (currentDifficulty > 1) {
        nextDifficulty = currentDifficulty - 1;
        difficultyChange = 'DECREASE';
        reasoning = `Low overall score (${score.toFixed(2)} <= 2.0). De-escalating difficulty level from ${currentDifficulty} to ${nextDifficulty}.`;
      } else {
        difficultyChange = 'MAINTAIN';
        reasoning = `Low score (${score.toFixed(2)} <= 2.0), candidate is already at minimum difficulty level (1).`;
      }
    } else {
      difficultyChange = 'MAINTAIN';
      reasoning = `Solid performance (${score.toFixed(2)}), maintaining difficulty level ${currentDifficulty}.`;
    }

    // Follow-up rule: Trigger follow-up if overall score >= 3.5, there is an identified gap,
    // and this question is not already a follow-up.
    let shouldFollowUp = false;
    let followUpTopic: string | undefined = undefined;

    if (!isFollowUp && score >= 3.5 && evaluation.gapsIdentified.length > 0) {
      shouldFollowUp = true;
      followUpTopic = evaluation.gapsIdentified[0];
      reasoning += ` Follow-up recommended to probe gap: "${followUpTopic}".`;
    }

    return {
      nextDifficulty,
      difficultyChange,
      shouldFollowUp,
      followUpTopic,
      reasoning,
    };
  }
}

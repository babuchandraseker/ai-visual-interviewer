import { InterviewContext, InterviewQuestion } from '../fsm/types';
import { SEED_QUESTION_BANK } from './questionBank';

export interface IQuestionOrchestrator {
  getNextQuestion(context: InterviewContext): InterviewQuestion | null;
}

export class DeterministicQuestionOrchestrator implements IQuestionOrchestrator {
  private questionPool: InterviewQuestion[];

  constructor(customPool?: InterviewQuestion[]) {
    this.questionPool = customPool || SEED_QUESTION_BANK;
  }

  public getNextQuestion(context: InterviewContext): InterviewQuestion | null {
    // 1. Check max questions limit
    if (context.currentQuestionIndex >= context.config.maxQuestions) {
      return null;
    }

    // 2. Filter out already asked questions
    const unaskedQuestions = this.questionPool.filter(
      (q) => !context.questionsAsked.includes(q.id)
    );

    if (unaskedQuestions.length === 0) {
      return null;
    }

    // 3. Match questions against configured skills
    const configuredSkillNames = context.config.skills.map((s) => s.name.toLowerCase());

    const skillMatchedQuestions = unaskedQuestions.filter((q) =>
      configuredSkillNames.some((skillName) => q.skill.toLowerCase().includes(skillName))
    );

    // Use skill-matched pool if available, otherwise fall back to any unasked question
    const candidatePool = skillMatchedQuestions.length > 0 ? skillMatchedQuestions : unaskedQuestions;

    // 4. Determine target skill order for current question index
    const skillIndex = (context.currentQuestionIndex) % context.config.skills.length;
    const targetSkill = context.config.skills[skillIndex];

    // Search for question matching current target skill
    const targetSkillQuestions = candidatePool.filter(
      (q) => q.skill.toLowerCase() === targetSkill.name.toLowerCase()
    );

    if (targetSkillQuestions.length > 0) {
      // Sort by closest difficulty
      targetSkillQuestions.sort(
        (a, b) =>
          Math.abs(a.difficulty - targetSkill.targetDifficulty) -
          Math.abs(b.difficulty - targetSkill.targetDifficulty)
      );
      return targetSkillQuestions[0];
    }

    // Default to first available in candidate pool
    return candidatePool[0];
  }
}

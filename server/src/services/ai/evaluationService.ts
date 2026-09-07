import { logger } from '../../utils/logger';
import { ILLMProvider, EvaluationInput, EvaluationResult } from './types';
import { OpenAILLMProvider, MockLLMProvider } from './llmProvider';

export class EvaluationService {
  private llmProvider: ILLMProvider;

  constructor(provider?: ILLMProvider) {
    this.llmProvider = provider || new OpenAILLMProvider();
  }

  /**
   * Evaluates candidate answer transcript, performs evidence quote validation,
   * and computes deterministic overall weighted score.
   */
  async evaluateAnswer(input: EvaluationInput): Promise<EvaluationResult> {
    const rawTranscript = (input.rawTranscript || '').trim();

    // Fast-path for empty or whitespace-only transcripts
    if (!rawTranscript) {
      logger.info('[EvaluationService] Empty transcript provided.');
      return {
        technicalDepthScore: 1.0,
        problemSolvingScore: 1.0,
        practicalExpScore: 1.0,
        communicationScore: 1.0,
        overallScore: 1.0,
        directQuotes: [],
        validatedQuotes: [],
        keyStrengths: [],
        gapsIdentified: ['No candidate answer transcript provided.'],
        scoringRationale: 'Candidate provided no response.',
        isQuotesValid: true,
      };
    }

    // Call LLM provider
    const rawOutput = await this.llmProvider.evaluateAnswer({
      ...input,
      rawTranscript,
    });

    // Programmatically validate verbatim quote evidence against rawTranscript
    const validatedQuotes: string[] = [];
    let isQuotesValid = true;

    for (const quote of rawOutput.directQuotes) {
      const trimmedQuote = (quote || '').trim();
      if (!trimmedQuote) continue;

      // Check exact substring match
      if (rawTranscript.includes(trimmedQuote)) {
        validatedQuotes.push(trimmedQuote);
      } else {
        isQuotesValid = false;
        logger.warn(`[EvaluationService] Quote validation failed! Quote "${trimmedQuote}" was not found in raw transcript.`);
      }
    }

    // Enforce 1.0 to 5.0 range bounds on raw category scores
    const technicalDepthScore = this.clampScore(rawOutput.technicalDepthScore);
    const problemSolvingScore = this.clampScore(rawOutput.problemSolvingScore);
    const practicalExpScore = this.clampScore(rawOutput.practicalExpScore);
    const communicationScore = this.clampScore(rawOutput.communicationScore);

    // Compute overall score using strict weighted formula:
    // Overall = 0.35 * TD + 0.25 * PS + 0.20 * PE + 0.20 * CC
    const calculatedOverall =
      0.35 * technicalDepthScore +
      0.25 * problemSolvingScore +
      0.20 * practicalExpScore +
      0.20 * communicationScore;

    const overallScore = Number(this.clampScore(calculatedOverall).toFixed(2));

    return {
      technicalDepthScore,
      problemSolvingScore,
      practicalExpScore,
      communicationScore,
      overallScore,
      directQuotes: rawOutput.directQuotes,
      validatedQuotes,
      keyStrengths: rawOutput.keyStrengths,
      gapsIdentified: rawOutput.gapsIdentified,
      scoringRationale: rawOutput.scoringRationale,
      isQuotesValid,
    };
  }

  private clampScore(val: number): number {
    if (isNaN(val)) return 3.0;
    return Math.max(1.0, Math.min(5.0, Number(val)));
  }
}

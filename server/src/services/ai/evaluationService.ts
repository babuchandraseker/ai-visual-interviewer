import { logger } from '../../utils/logger';
import { ILLMProvider, EvaluationInput, EvaluationResult } from './types';
import { getLLMProvider } from './llmProvider';

export class EvaluationService {
  private llmProvider: ILLMProvider;

  constructor(provider?: ILLMProvider) {
    this.llmProvider = provider || getLLMProvider();
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

    // Call LLM provider with bounded retry (max 2 attempts)
    let rawOutput: any = null;
    let attempts = 0;
    const maxAttempts = 2;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        rawOutput = await this.llmProvider.evaluateAnswer({
          ...input,
          rawTranscript,
        });
        if (rawOutput) break;
      } catch (err: any) {
        logger.warn(`[EvaluationService] LLM evaluation attempt ${attempts} failed: ${err.message}`);
      }
    }

    if (!rawOutput) {
      logger.error('[EvaluationService] All LLM evaluation attempts failed. Using neutral fallback evaluation.');
      rawOutput = {
        technicalDepthScore: 3.0,
        problemSolvingScore: 3.0,
        practicalExpScore: 3.0,
        communicationScore: 3.0,
        directQuotes: [rawTranscript.substring(0, 50)],
        keyStrengths: ['Response submitted for evaluation'],
        gapsIdentified: ['Evaluator provider timeout or temporary service unavailability'],
        scoringRationale: 'System fallback evaluation due to evaluator provider timeout.',
      };
    }

    // Programmatically validate verbatim quote evidence against rawTranscript
    // Normalization helper for whitespace and punctuation tolerance
    const normalizeText = (str: string) =>
      (str || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();

    const normalizedRawTranscript = normalizeText(rawTranscript);

    const validatedQuotes: string[] = [];
    let isQuotesValid = true;

    for (const quote of rawOutput.directQuotes) {
      const trimmedQuote = (quote || '').trim();
      if (!trimmedQuote) continue;

      const normalizedQuote = normalizeText(trimmedQuote);

      // Check exact substring match or normalized substring match
      if (
        rawTranscript.includes(trimmedQuote) ||
        (normalizedQuote.length > 5 && normalizedRawTranscript.includes(normalizedQuote))
      ) {
        validatedQuotes.push(trimmedQuote);
      } else {
        isQuotesValid = false;
        logger.warn(
          `[EvaluationService] Quote validation failed! Quote "${trimmedQuote}" was not found in raw transcript.`
        );
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
    if (val === null || val === undefined || isNaN(val)) return 3.0;
    return Math.max(1.0, Math.min(5.0, Number(val)));
  }
}

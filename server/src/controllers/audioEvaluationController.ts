import { Request, Response, NextFunction } from 'express';
import { prisma } from '../services/db';
import { ApiError } from '../utils/apiError';
import { EvaluationService, AdaptationService } from '../services/ai';

const evaluationService = new EvaluationService();
const adaptationService = new AdaptationService();

export const evaluateAudioTranscript = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const {
      questionInstanceId: inputQuestionInstanceId,
      skillTag = 'General',
      difficultyLevel = 2,
      questionText = '',
      rawTranscript = '',
      durationSeconds = 0,
      isFollowUp = false,
    } = req.body;

    if (!sessionId) {
      throw ApiError.badRequest('Session ID is required');
    }

    // Verify session existence
    const session = await prisma.interviewSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw ApiError.notFound('Interview session not found');
    }

    // Resolve QuestionInstance
    let questionInstanceId = inputQuestionInstanceId;
    if (!questionInstanceId) {
      // Find latest or create a new QuestionInstance for session
      const existing = await prisma.questionInstance.findFirst({
        where: { interviewSessionId: session.id },
        orderBy: { orderIndex: 'desc' },
        include: { answerTranscript: true },
      });

      if (existing && !existing.answerTranscript) {
        questionInstanceId = existing.id;
      } else {
        const orderIndex = existing ? existing.orderIndex + 1 : 1;
        const newInstance = await prisma.questionInstance.create({
          data: {
            interviewSessionId: session.id,
            skillTag,
            difficultyLevel,
            questionText,
            orderIndex,
          },
        });
        questionInstanceId = newInstance.id;
      }
    }

    const wordCount = rawTranscript.trim() ? rawTranscript.trim().split(/\s+/).length : 0;

    // Save/Upsert AnswerTranscript
    await prisma.answerTranscript.upsert({
      where: { questionInstanceId },
      update: {
        rawText: rawTranscript,
        durationSeconds: Number(durationSeconds) || 0,
        wordCount,
      },
      create: {
        questionInstanceId,
        rawText: rawTranscript,
        durationSeconds: Number(durationSeconds) || 0,
        wordCount,
      },
    });

    // Run AI Evaluation
    const evaluation = await evaluationService.evaluateAnswer({
      questionText,
      skillTag,
      difficultyLevel: Number(difficultyLevel) || session.currentDifficulty,
      rawTranscript,
      durationSeconds,
    });

    // Save/Upsert EvaluationRecord in DB
    await prisma.evaluationRecord.upsert({
      where: { questionInstanceId },
      update: {
        technicalDepthScore: evaluation.technicalDepthScore,
        problemSolvingScore: evaluation.problemSolvingScore,
        communicationScore: evaluation.communicationScore,
        directQuotes: evaluation.validatedQuotes,
        keyStrengths: evaluation.keyStrengths,
        gapsIdentified: evaluation.gapsIdentified,
        scoringRationale: evaluation.scoringRationale,
      },
      create: {
        questionInstanceId,
        technicalDepthScore: evaluation.technicalDepthScore,
        problemSolvingScore: evaluation.problemSolvingScore,
        communicationScore: evaluation.communicationScore,
        directQuotes: evaluation.validatedQuotes,
        keyStrengths: evaluation.keyStrengths,
        gapsIdentified: evaluation.gapsIdentified,
        scoringRationale: evaluation.scoringRationale,
      },
    });

    // Compute Adaptation Decision
    const adaptation = adaptationService.decideNextStep(
      evaluation,
      session.currentDifficulty,
      Boolean(isFollowUp),
      skillTag
    );

    // Update InterviewSession state in DB if difficulty changed
    if (adaptation.nextDifficulty !== session.currentDifficulty) {
      await prisma.interviewSession.update({
        where: { id: session.id },
        data: { currentDifficulty: adaptation.nextDifficulty },
      });
    }

    res.status(200).json({
      success: true,
      questionInstanceId,
      evaluation,
      adaptation,
    });
  } catch (error) {
    next(error);
  }
};

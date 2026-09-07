import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { prisma } from '../services/db';
import { ApiError } from '../utils/apiError';
import { InterviewSessionStatus, Recommendation } from '@prisma/client';

export const getRecruiterDashboard = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const organizationId = req.user!.organizationId;

    const [totalInterviews, completedInterviews, inProgressInterviews, pendingInvites, finalReports] =
      await Promise.all([
        prisma.interviewSession.count({ where: { organizationId } }),
        prisma.interviewSession.count({
          where: { organizationId, status: InterviewSessionStatus.COMPLETED },
        }),
        prisma.interviewSession.count({
          where: { organizationId, status: InterviewSessionStatus.IN_PROGRESS },
        }),
        prisma.candidateInvite.count({
          where: { interviewTemplate: { organizationId }, status: 'PENDING' },
        }),
        prisma.finalReport.findMany({
          where: { interviewSession: { organizationId } },
          select: { overallScore: true },
        }),
      ]);

    const avgScore =
      finalReports.length > 0
        ? Number(
            (
              finalReports.reduce((sum, r) => sum + r.overallScore, 0) / finalReports.length
            ).toFixed(2)
          )
        : 0;

    res.status(200).json({
      success: true,
      organizationId,
      metrics: {
        totalInterviews,
        completedInterviews,
        inProgressInterviews,
        pendingInvites,
        averageScore: avgScore,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getRecruiterInterviews = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const organizationId = req.user!.organizationId;
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt((req.query.limit as string) || '10', 10)));
    const skip = (page - 1) * limit;

    const status = req.query.status as string | undefined;
    const jobRoleId = req.query.jobRoleId as string | undefined;
    const candidateName = req.query.candidateName as string | undefined;
    const sortBy = (req.query.sortBy as string) === 'overallScore' ? 'overallScore' : 'createdAt';
    const order = (req.query.order as string) === 'asc' ? 'asc' : 'desc';

    // Build filter query object scoped to recruiter organization
    const whereClause: any = {
      organizationId,
    };

    if (status && Object.values(InterviewSessionStatus).includes(status as any)) {
      whereClause.status = status;
    }

    if (candidateName) {
      whereClause.candidateInvite = {
        candidateName: {
          contains: candidateName,
          mode: 'insensitive',
        },
      };
    }

    if (jobRoleId) {
      whereClause.candidateInvite = {
        ...whereClause.candidateInvite,
        interviewTemplate: {
          jobRoleId,
        },
      };
    }

    const [totalCount, sessions] = await Promise.all([
      prisma.interviewSession.count({ where: whereClause }),
      prisma.interviewSession.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: order },
        include: {
          candidateInvite: {
            include: {
              interviewTemplate: {
                include: {
                  jobRole: true,
                },
              },
            },
          },
          finalReport: true,
          _count: {
            select: {
              questionInstances: true,
              integrityEvents: true,
            },
          },
        },
      }),
    ]);

    const interviews = sessions.map((session) => ({
      sessionId: session.id,
      candidateName: session.candidateInvite.candidateName,
      candidateEmail: session.candidateInvite.email,
      jobRoleTitle: session.candidateInvite.interviewTemplate.jobRole.title,
      status: session.status,
      currentDifficulty: session.currentDifficulty,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      createdAt: session.createdAt,
      overallScore: session.finalReport?.overallScore || null,
      questionCount: session._count.questionInstances,
      integrityEventCount: session._count.integrityEvents,
    }));

    res.status(200).json({
      success: true,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
      interviews,
    });
  } catch (error) {
    next(error);
  }
};

export const getInterviewEvidenceReport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const organizationId = req.user!.organizationId;

    if (!sessionId) {
      throw ApiError.badRequest('Session ID is required');
    }

    const session = await prisma.interviewSession.findUnique({
      where: { id: sessionId },
      include: {
        candidateInvite: {
          include: {
            interviewTemplate: {
              include: {
                jobRole: true,
              },
            },
          },
        },
        questionInstances: {
          orderBy: { orderIndex: 'asc' },
          include: {
            answerTranscript: true,
            evaluationRecord: true,
            audioAsset: true,
          },
        },
        integrityEvents: {
          orderBy: { timestamp: 'asc' },
        },
        finalReport: true,
      },
    });

    if (!session) {
      throw ApiError.notFound('Interview session not found');
    }

    // ORGANIZATION ISOLATION CHECK
    if (session.organizationId !== organizationId) {
      throw ApiError.forbidden('Access denied to candidate report outside your organization');
    }

    // Process Question Evaluations & Evidence
    const evaluations = session.questionInstances.map((q) => {
      const evalRec = q.evaluationRecord;
      const transcriptRec = q.answerTranscript;
      const audioAsset = q.audioAsset;

      const directQuotes: string[] = Array.isArray(evalRec?.directQuotes)
        ? (evalRec?.directQuotes as string[])
        : [];
      const keyStrengths: string[] = Array.isArray(evalRec?.keyStrengths)
        ? (evalRec?.keyStrengths as string[])
        : [];
      const gapsIdentified: string[] = Array.isArray(evalRec?.gapsIdentified)
        ? (evalRec?.gapsIdentified as string[])
        : [];

      // Validate direct quote evidence against transcript text
      const rawText = transcriptRec?.rawText || '';
      const validatedQuotes = directQuotes.filter((qStr) => qStr && rawText.includes(qStr.trim()));
      const isQuotesValid = directQuotes.length === 0 || validatedQuotes.length > 0;

      return {
        questionInstanceId: q.id,
        orderIndex: q.orderIndex,
        skillTag: q.skillTag,
        difficultyLevel: q.difficultyLevel,
        questionText: q.questionText,
        transcript: {
          id: transcriptRec?.id || null,
          rawText: transcriptRec?.rawText || 'No transcript recorded.',
          durationSeconds: transcriptRec?.durationSeconds || 0,
          wordCount: transcriptRec?.wordCount || 0,
        },
        scores: {
          technicalDepth: evalRec?.technicalDepthScore || 0,
          problemSolving: evalRec?.problemSolvingScore || 0,
          communication: evalRec?.communicationScore || 0,
        },
        evidence: {
          directQuotes,
          validatedQuotes,
          isQuotesValid,
        },
        strengths: keyStrengths,
        gaps: gapsIdentified,
        scoringRationale: evalRec?.scoringRationale || 'No scoring rationale available.',
        audioAsset: audioAsset
          ? {
              id: audioAsset.id,
              contentType: audioAsset.contentType,
              sizeBytes: audioAsset.sizeBytes,
              durationMs: audioAsset.durationMs,
            }
          : null,
      };
    });

    // Compute Skill Breakdown averages
    const skillScoreMap = new Map<string, { totalScore: number; count: number }>();
    evaluations.forEach((item) => {
      if (item.scores.technicalDepth > 0) {
        const itemAvg = (item.scores.technicalDepth + item.scores.problemSolving + item.scores.communication) / 3;
        const current = skillScoreMap.get(item.skillTag) || { totalScore: 0, count: 0 };
        skillScoreMap.set(item.skillTag, {
          totalScore: current.totalScore + itemAvg,
          count: current.count + 1,
        });
      }
    });

    const skillScores = Array.from(skillScoreMap.entries()).map(([skill, data]) => ({
      skill,
      score: Number((data.totalScore / data.count).toFixed(2)),
    }));

    // Compute Overall Score Dimensions ($0.35*TD + 0.25*PS + 0.20*PE + 0.20*CC$)
    let overallScore = session.finalReport?.overallScore || 0;
    if (overallScore === 0 && evaluations.length > 0) {
      const validEvals = evaluations.filter((e) => e.scores.technicalDepth > 0);
      if (validEvals.length > 0) {
        const avgTD = validEvals.reduce((s, e) => s + e.scores.technicalDepth, 0) / validEvals.length;
        const avgPS = validEvals.reduce((s, e) => s + e.scores.problemSolving, 0) / validEvals.length;
        const avgPE = avgTD * 0.9;
        const avgCC = validEvals.reduce((s, e) => s + e.scores.communication, 0) / validEvals.length;
        overallScore = Number((0.35 * avgTD + 0.25 * avgPS + 0.20 * avgPE + 0.20 * avgCC).toFixed(2));
      }
    }

    // Determine Transparent Human Review Recommendations
    const reviewReasons: string[] = [];
    if (session.integrityEvents.length > 2) {
      reviewReasons.push(`${session.integrityEvents.length} objective integrity events recorded.`);
    }
    if (overallScore >= 2.5 && overallScore <= 3.5) {
      reviewReasons.push(`Overall score (${overallScore.toFixed(2)}) lies within the review band (2.5 - 3.5).`);
    }

    const requiresHumanReview = reviewReasons.length > 0 || Boolean(session.finalReport?.requiresHumanReview);

    // Format Integrity Events
    const integrityEvents = session.integrityEvents.map((evt) => ({
      id: evt.id,
      eventType: evt.eventType,
      severity: evt.severity,
      durationMs: evt.durationMs,
      telemetrySnapshot: evt.telemetrySnapshot,
      timestamp: evt.timestamp,
    }));

    const reportDTO = {
      candidate: {
        name: session.candidateInvite.candidateName,
        email: session.candidateInvite.email,
        status: session.candidateInvite.status,
      },
      interview: {
        sessionId: session.id,
        jobRoleTitle: session.candidateInvite.interviewTemplate.jobRole.title,
        targetLevel: session.candidateInvite.interviewTemplate.jobRole.targetLevel,
        status: session.status,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        createdAt: session.createdAt,
      },
      overallEvaluation: {
        overallScore,
        technicalDepthScore: Number(
          (evaluations.reduce((s, e) => s + e.scores.technicalDepth, 0) / (evaluations.length || 1)).toFixed(1)
        ),
        problemSolvingScore: Number(
          (evaluations.reduce((s, e) => s + e.scores.problemSolving, 0) / (evaluations.length || 1)).toFixed(1)
        ),
        communicationScore: Number(
          (evaluations.reduce((s, e) => s + e.scores.communication, 0) / (evaluations.length || 1)).toFixed(1)
        ),
        weights: {
          technicalDepth: 35,
          problemSolving: 25,
          practicalExperience: 20,
          communication: 20,
        },
      },
      skillScores,
      evaluations,
      integrityEvents,
      humanReviewIndicators: {
        requiresHumanReview,
        reasons: reviewReasons,
      },
      humanDecision: {
        decision: session.finalReport?.recommendation || null,
        notes: session.finalReport?.humanReviewReason || null,
        updatedAt: session.finalReport?.updatedAt || null,
      },
    };

    res.status(200).json({
      success: true,
      report: reportDTO,
    });
  } catch (error) {
    next(error);
  }
};

export const saveRecruiterDecision = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const { decision, notes } = req.body || {};
    const organizationId = req.user!.organizationId;

    if (!sessionId) {
      throw ApiError.badRequest('Session ID is required');
    }

    const session = await prisma.interviewSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw ApiError.notFound('Interview session not found');
    }

    if (session.organizationId !== organizationId) {
      throw ApiError.forbidden('Access denied to update session decision outside your organization');
    }

    const validDecisions = ['ADVANCE', 'HOLD', 'REJECT', 'STRONG_PASS', 'PASS', 'BORDERLINE', 'FAIL'];
    if (!decision || !validDecisions.includes(decision.toUpperCase())) {
      throw ApiError.badRequest(`Invalid recruiter decision: ${decision}. Must be ADVANCE, HOLD, or REJECT.`);
    }

    // Map UI decision to Prisma Recommendation Enum
    let recommendation: Recommendation = Recommendation.PASS;
    const decUpper = decision.toUpperCase();
    if (decUpper === 'ADVANCE' || decUpper === 'STRONG_PASS') {
      recommendation = Recommendation.STRONG_PASS;
    } else if (decUpper === 'HOLD' || decUpper === 'BORDERLINE') {
      recommendation = Recommendation.BORDERLINE;
    } else if (decUpper === 'REJECT' || decUpper === 'FAIL') {
      recommendation = Recommendation.FAIL;
    }

    // Upsert FinalReport in PostgreSQL
    const finalReport = await prisma.finalReport.upsert({
      where: { interviewSessionId: session.id },
      update: {
        recommendation,
        humanReviewReason: notes || 'Recruiter decision saved.',
        requiresHumanReview: false,
      },
      create: {
        interviewSessionId: session.id,
        technicalDepthScore: 3.5,
        problemSolvingScore: 3.5,
        practicalExpScore: 3.5,
        communicationScore: 3.5,
        overallScore: 3.5,
        recommendation,
        evidenceQuotes: [],
        humanReviewReason: notes || 'Recruiter decision saved.',
        requiresHumanReview: false,
      },
    });

    res.status(200).json({
      success: true,
      sessionId: session.id,
      decision: finalReport.recommendation,
      notes: finalReport.humanReviewReason,
      updatedAt: finalReport.updatedAt,
    });
  } catch (error) {
    next(error);
  }
};

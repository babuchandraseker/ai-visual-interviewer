import { Request, Response, NextFunction } from 'express';
import { prisma } from '../services/db';
import { ApiError } from '../utils/apiError';
import { InterviewSessionStatus } from '@prisma/client';

export const validateInviteToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { token } = req.params;

    if (!token) {
      throw ApiError.badRequest('Invite token is required');
    }

    const invite = await prisma.candidateInvite.findUnique({
      where: { inviteToken: token },
      include: {
        interviewTemplate: {
          select: {
            title: true,
            durationMinutes: true,
            targetDifficulty: true
          }
        }
      }
    });

    if (!invite) {
      throw ApiError.notFound('Invalid candidate invite token');
    }

    if (invite.status === 'EXPIRED' || invite.expiresAt < new Date()) {
      throw ApiError.badRequest('Candidate invite token has expired');
    }

    res.status(200).json({
      valid: true,
      candidateName: invite.candidateName,
      template: invite.interviewTemplate,
      status: invite.status
    });
  } catch (error) {
    next(error);
  }
};

export const startInterviewSession = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { token } = req.body;

    if (!token) {
      throw ApiError.badRequest('Candidate invite token is required');
    }

    const invite = await prisma.candidateInvite.findUnique({
      where: { inviteToken: token },
      include: { interviewTemplate: true }
    });

    if (!invite) {
      throw ApiError.notFound('Candidate invite not found');
    }

    // Check existing or create new session idempotently
    let session = await prisma.interviewSession.findUnique({
      where: { candidateInviteId: invite.id }
    });

    if (!session) {
      session = await prisma.interviewSession.create({
        data: {
          candidateInviteId: invite.id,
          organizationId: invite.interviewTemplate.organizationId,
          status: InterviewSessionStatus.IN_PROGRESS,
          currentDifficulty: invite.interviewTemplate.targetDifficulty,
          startedAt: new Date()
        }
      });

      // Mark invite as USED
      await prisma.candidateInvite.update({
        where: { id: invite.id },
        data: { status: 'USED' }
      });
    } else if (session.status === InterviewSessionStatus.NOT_STARTED) {
      session = await prisma.interviewSession.update({
        where: { id: session.id },
        data: {
          status: InterviewSessionStatus.IN_PROGRESS,
          startedAt: new Date()
        }
      });
    }

    res.status(200).json({
      success: true,
      sessionId: session.id,
      status: session.status,
      startedAt: session.startedAt
    });
  } catch (error) {
    next(error);
  }
};

export const recordSessionEvent = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const { questionId, skillTag, difficultyLevel, questionText, orderIndex } = req.body;

    if (!sessionId) {
      throw ApiError.badRequest('Session ID is required');
    }

    const session = await prisma.interviewSession.findUnique({
      where: { id: sessionId }
    });

    if (!session) {
      throw ApiError.notFound('Interview session not found');
    }

    // Create question instance log idempotently
    const questionInstance = await prisma.questionInstance.create({
      data: {
        interviewSessionId: session.id,
        skillTag: skillTag || 'General',
        difficultyLevel: difficultyLevel || 2,
        questionText: questionText || '',
        orderIndex: orderIndex || 1
      }
    });

    res.status(200).json({
      success: true,
      questionInstanceId: questionInstance.id
    });
  } catch (error) {
    next(error);
  }
};

export const completeInterviewSession = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      throw ApiError.badRequest('Session ID is required');
    }

    const session = await prisma.interviewSession.findUnique({
      where: { id: sessionId }
    });

    if (!session) {
      throw ApiError.notFound('Interview session not found');
    }

    const updatedSession = await prisma.interviewSession.update({
      where: { id: session.id },
      data: {
        status: InterviewSessionStatus.COMPLETED,
        endedAt: new Date()
      }
    });

    res.status(200).json({
      success: true,
      sessionId: updatedSession.id,
      status: updatedSession.status,
      endedAt: updatedSession.endedAt
    });
  } catch (error) {
    next(error);
  }
};

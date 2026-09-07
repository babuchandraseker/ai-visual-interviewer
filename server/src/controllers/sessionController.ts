import { Request, Response, NextFunction } from 'express';
import { prisma } from '../services/db';
import { ApiError } from '../utils/apiError';

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

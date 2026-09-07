import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { prisma } from '../services/db';

export const getRecruiterDashboard = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const organizationId = req.user!.organizationId;

    // Fetch recruiter organization scoped counts
    const [jobRoleCount, templateCount, sessionCount] = await Promise.all([
      prisma.jobRole.count({ where: { organizationId } }),
      prisma.interviewTemplate.count({ where: { organizationId } }),
      prisma.interviewSession.count({ where: { organizationId } }),
    ]);

    res.status(200).json({
      message: 'Recruiter dashboard overview',
      organizationId,
      metrics: {
        totalJobRoles: jobRoleCount,
        totalTemplates: templateCount,
        totalSessions: sessionCount
      }
    });
  } catch (error) {
    next(error);
  }
};

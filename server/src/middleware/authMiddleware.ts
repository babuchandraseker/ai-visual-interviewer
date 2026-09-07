import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { verifyToken } from '../utils/jwt';
import { ApiError } from '../utils/apiError';
import { UserRole } from '@prisma/client';

export const requireAuth = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw ApiError.unauthorized('Authentication token missing or malformed');
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = verifyToken(token);
    req.user = {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      organizationId: payload.organizationId
    };
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      throw ApiError.unauthorized('Authentication token has expired');
    }
    throw ApiError.unauthorized('Invalid authentication token');
  }
};

export const requireRole = (...roles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw ApiError.unauthorized('Authentication required');
    }

    if (!roles.includes(req.user.role)) {
      throw ApiError.forbidden(`Access restricted to roles: ${roles.join(', ')}`);
    }

    next();
  };
};

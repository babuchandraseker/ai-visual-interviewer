import { Request } from 'express';
import { UserRole } from '@prisma/client';

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  organizationId: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: UserRole;
  organizationId: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

import { prisma } from './db';
import { comparePassword } from '../utils/password';
import { signToken } from '../utils/jwt';
import { ApiError } from '../utils/apiError';
import { UserRole } from '@prisma/client';

export interface LoginParams {
  email: string;
  password?: string;
}

export interface AuthResult {
  user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    organizationId: string;
  };
  token: string;
}

export const loginUser = async ({ email, password }: LoginParams): Promise<AuthResult> => {
  if (!email || !password) {
    throw ApiError.badRequest('Email and password are required');
  }

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    include: { organization: true }
  });

  if (!user) {
    // Generic error to prevent account enumeration
    throw ApiError.unauthorized('Invalid email or password');
  }

  const isPasswordValid = await comparePassword(password, user.passwordHash);
  if (!isPasswordValid) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  const token = signToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    organizationId: user.organizationId
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId
    },
    token
  };
};

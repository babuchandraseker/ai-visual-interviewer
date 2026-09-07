import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import { JwtPayload } from '../types';

export const signToken = (payload: Omit<JwtPayload, 'iat' | 'exp'>): string => {
  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as any,
  };
  return jwt.sign(payload, env.JWT_SECRET, options);
};

export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
};

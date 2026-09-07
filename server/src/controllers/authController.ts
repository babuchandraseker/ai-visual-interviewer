import { Request, Response, NextFunction } from 'express';
import { loginUser } from '../services/authService';
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address format'),
  password: z.string().min(1, 'Password is required')
});

export const handleLogin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;
    const result = await loginUser({ email, password });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

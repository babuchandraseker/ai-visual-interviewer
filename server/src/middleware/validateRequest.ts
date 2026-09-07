import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ApiError } from '../utils/apiError';

export const validateRequest = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const issues = error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message
        }));
        throw ApiError.badRequest('Validation failed for request data', issues);
      }
      next(error);
    }
  };
};

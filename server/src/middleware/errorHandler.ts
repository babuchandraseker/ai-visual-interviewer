import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/apiError';
import { logger } from '../utils/logger';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (err instanceof ApiError) {
    logger.warn(`API Error [${err.code}]: ${err.message}`, {
      path: req.path,
      method: req.method,
      statusCode: err.statusCode
    });

    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details && { details: err.details })
      }
    });
    return;
  }

  // Fallback for unhandled unexpected errors
  logger.error('Unhandled internal error', {
    error: err.message,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
    path: req.path,
    method: req.method
  });

  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected internal server error occurred'
    }
  });
};

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();
  const requestId = Math.random().toString(36).substring(2, 10);
  (req as any).id = requestId;

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP Request', {
      requestId,
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      durationMs: duration
    });
  });

  next();
};

import { Request, Response, NextFunction } from 'express';
import { checkDatabaseConnection } from '../services/db';

export const getHealth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const isDbConnected = await checkDatabaseConnection();

    const health = {
      status: isDbConnected ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: isDbConnected ? 'connected' : 'disconnected'
    };

    res.status(isDbConnected ? 200 : 503).json(health);
  } catch (error) {
    next(error);
  }
};

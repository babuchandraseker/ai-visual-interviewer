import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import healthRoutes from './routes/healthRoutes';
import apiV1Routes from './routes';
import { ApiError } from './utils/apiError';

export const createApp = (): Application => {
  const app = express();

  // Baseline Security Headers
  app.use(helmet());

  // CORS Policy
  app.use(
    cors({
      origin: env.CLIENT_ORIGIN,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    })
  );

  // Body Parsing (Allow up to 10MB for audio base64 buffers)
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // HTTP Request Logging
  app.use(requestLogger);

  // Rate Limiting for Authentication Endpoints (10 requests per 15 mins)
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: {
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many login attempts. Please try again after 15 minutes.'
      }
    },
    standardHeaders: true,
    legacyHeaders: false
  });

  // Rate Limiting for Expensive AI / Audio Operations (60 requests per minute)
  const aiOperationsLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 60,
    message: {
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: 'Rate limit exceeded for AI audio/evaluation requests. Please slow down.'
      }
    },
    standardHeaders: true,
    legacyHeaders: false
  });

  // Apply rate limiters
  app.use('/api/v1/auth/login', authLimiter);
  app.use('/api/v1/audio/transcribe', aiOperationsLimiter);
  app.use('/api/v1/audio/synthesize', aiOperationsLimiter);

  // Health Endpoint (Unversioned & Unauthenticated)
  app.use('/health', healthRoutes);

  // API v1 Routes
  app.use('/api/v1', apiV1Routes);

  // Catch 404 for unhandled routes
  app.use('*', (req, res, next) => {
    next(ApiError.notFound(`Cannot find endpoint ${req.originalUrl} on this server`));
  });

  // Global Error Handler
  app.use(errorHandler);

  return app;
};

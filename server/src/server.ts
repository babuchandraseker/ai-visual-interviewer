import { createApp } from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import { prisma } from './services/db';

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(`AI Visual Interviewer Server running in [${env.NODE_ENV}] mode on port ${env.PORT}`);
});

// Graceful Shutdown Signal Handling
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Initiating graceful shutdown...`);
  
  server.close(async () => {
    logger.info('HTTP server closed.');
    try {
      await prisma.$disconnect();
      logger.info('Prisma database connection closed.');
      process.exit(0);
    } catch (err: any) {
      logger.error('Error closing database connection', { error: err.message });
      process.exit(1);
    }
  });

  // Force close after 10s if shutdown hangs
  setTimeout(() => {
    logger.error('Forced shutdown after timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

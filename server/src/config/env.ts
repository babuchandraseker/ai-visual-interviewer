import dotenv from 'dotenv';
import path from 'path';

// Load .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const env = {
  PORT: parseInt(process.env.PORT || '4000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ai_interviewer?schema=public',
  JWT_SECRET: process.env.JWT_SECRET || 'super-secret-development-key-change-in-production',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',

  // Audio & AI Engine Service API Keys (Server-side only)
  DEEPGRAM_API_KEY: process.env.DEEPGRAM_API_KEY || '',
  ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY || '',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
};

// Production Environment Hardening Assertions
if (env.NODE_ENV === 'production') {
  if (env.JWT_SECRET === 'super-secret-development-key-change-in-production' || env.JWT_SECRET.length < 16) {
    throw new Error(
      'CRITICAL CONFIGURATION ERROR: Insecure JWT_SECRET detected in production. JWT_SECRET must be explicitly set and at least 16 characters long.'
    );
  }
}

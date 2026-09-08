import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

describe('Audio Engine API Endpoints (/api/v1/audio)', () => {
  describe('POST /api/v1/audio/transcribe', () => {
    it('should transcribe valid base64 audio payload', async () => {
      const mockAudioBase64 = Buffer.from('fake-audio-header-bytes-12345').toString('base64');

      const response = await request(app)
        .post('/api/v1/audio/transcribe')
        .send({
          audioBase64: mockAudioBase64,
          mimeType: 'audio/webm',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('transcript');
      expect(typeof response.body.transcript).toBe('string');
      expect(response.body).toHaveProperty('provider');
      expect(response.body).toHaveProperty('totalLatencyMs');
    });

    it('should return empty transcript on empty audio payload', async () => {
      const response = await request(app)
        .post('/api/v1/audio/transcribe')
        .send({
          audioBase64: '',
          mimeType: 'audio/webm',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.transcript).toBe('');
      expect(response.body.confidence).toBe(0);
    });

    it('should return custom transcript when provided to MockSTTProvider', async () => {
      const mockAudioBase64 = Buffer.from('test-audio-bytes').toString('base64');
      const response = await request(app)
        .post('/api/v1/audio/transcribe')
        .send({
          audioBase64: mockAudioBase64,
          mimeType: 'audio/webm',
          customTranscript: 'My test spoken answer',
        });

      expect(response.status).toBe(200);
      expect(response.body.transcript).toBe('My test spoken answer');
    });

    it('should return empty transcript when no speech was detected/provided in MockSTTProvider', async () => {
      const mockAudioBase64 = Buffer.from('silent-audio').toString('base64');
      const response = await request(app)
        .post('/api/v1/audio/transcribe')
        .send({
          audioBase64: mockAudioBase64,
          mimeType: 'audio/webm',
        });

      expect(response.status).toBe(200);
      expect(response.body.transcript).toBe('');
      expect(response.body.confidence).toBe(0);
    });

    it('should return 400 when STT_PROVIDER=deepgram is configured without API key', async () => {
      const { env } = require('../src/config/env');
      const origProvider = env.STT_PROVIDER;
      const origKey = env.DEEPGRAM_API_KEY;
      env.STT_PROVIDER = 'deepgram';
      env.DEEPGRAM_API_KEY = '';

      const mockAudioBase64 = Buffer.from('test-audio').toString('base64');
      const response = await request(app)
        .post('/api/v1/audio/transcribe')
        .send({
          audioBase64: mockAudioBase64,
          mimeType: 'audio/webm',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('DEEPGRAM_API_KEY');

      env.STT_PROVIDER = origProvider;
      env.DEEPGRAM_API_KEY = origKey;
    });
  });

  describe('POST /api/v1/audio/synthesize', () => {
    it('should synthesize text into audio payload', async () => {
      const response = await request(app)
        .post('/api/v1/audio/synthesize')
        .send({
          text: 'Welcome to your AI Visual Interview session.',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('audioBase64');
      expect(response.body).toHaveProperty('mimeType');
      expect(response.body).toHaveProperty('provider');
    });

    it('should return 400 Bad Request when text is empty', async () => {
      const response = await request(app)
        .post('/api/v1/audio/synthesize')
        .send({
          text: '',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('BAD_REQUEST');
    });
  });
});

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

    it('should return 400 Bad Request when audioBase64 is missing', async () => {
      const response = await request(app)
        .post('/api/v1/audio/transcribe')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('BAD_REQUEST');
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

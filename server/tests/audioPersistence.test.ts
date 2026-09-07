import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/services/db';
import { StorageService, MockObjectStorageProvider } from '../src/services/storage';
import { signToken } from '../src/utils/jwt';
import { UserRole } from '@prisma/client';

const app = createApp();

const sampleToken = signToken({
  userId: 'usr_123',
  email: 'recruiter@techcorp.com',
  role: UserRole.RECRUITER,
  organizationId: 'org_techcorp_789',
});

describe('Phase 7 — Audio Persistence Service & API', () => {
  const sessionId = 'sess_audio_test_123';
  const answerId = 'ans_transcript_456';
  const orgId = 'org_techcorp_789';

  describe('StorageService & MockObjectStorageProvider Unit Tests', () => {
    it('should generate path-traversal-safe storage keys', () => {
      const service = new StorageService(new MockObjectStorageProvider());
      const key = service.generateAudioKey('org_123/../admin', 'sess_456', 'ans_789/../../etc', 'webm');

      expect(key).toBe('organizations/org_123admin/sessions/sess_456/answers/ans_789etc.webm');
      expect(key.includes('..')).toBe(false);
    });

    it('should upload, check existence, get signed URL, and delete object from storage provider', async () => {
      const mockProvider = new MockObjectStorageProvider();
      const key = 'test/audio/sample.webm';
      const buffer = Buffer.from('fake-audio-stream-content-bytes');

      const uploaded = await mockProvider.upload(key, buffer, 'audio/webm');
      expect(uploaded.key).toBe(key);
      expect(uploaded.sizeBytes).toBe(buffer.length);

      const exists = await mockProvider.exists(key);
      expect(exists).toBe(true);

      const signedUrl = await mockProvider.getSignedUrl(key, 900);
      expect(signedUrl).toContain('/api/v1/audio/stream?key=');

      await mockProvider.delete(key);
      const existsAfterDelete = await mockProvider.exists(key);
      expect(existsAfterDelete).toBe(false);
    });
  });

  describe('POST /api/v1/sessions/:sessionId/answers/:answerId/audio Endpoint', () => {
    it('should upload valid candidate answer audio and return audio asset metadata and signed URL', async () => {
      jest.spyOn(prisma.interviewSession, 'findUnique').mockResolvedValue({
        id: sessionId,
        organizationId: orgId,
      } as any);

      jest.spyOn(prisma.answerTranscript, 'findUnique').mockResolvedValue({
        id: answerId,
        questionInstanceId: 'qinst_111',
        questionInstance: {
          id: 'qinst_111',
          interviewSessionId: sessionId,
        },
      } as any);

      jest.spyOn(prisma.audioAsset, 'upsert').mockResolvedValue({
        id: 'asset_777',
        interviewSessionId: sessionId,
        questionInstanceId: 'qinst_111',
        answerTranscriptId: answerId,
        storageKey: `organizations/${orgId}/sessions/${sessionId}/answers/${answerId}.webm`,
        contentType: 'audio/webm',
        sizeBytes: 1024,
        durationMs: 5000,
        checksum: 'fake_sha256_hash',
        createdAt: new Date(),
      } as any);

      jest.spyOn(prisma.answerTranscript, 'update').mockResolvedValue({} as any);

      const mockAudioBase64 = Buffer.from('fake-webm-audio-header-1234567890').toString('base64');

      const response = await request(app)
        .post(`/api/v1/sessions/${sessionId}/answers/${answerId}/audio`)
        .send({
          audioBase64: mockAudioBase64,
          mimeType: 'audio/webm',
          durationMs: 5000,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('audioAssetId', 'asset_777');
      expect(response.body).toHaveProperty('storageKey');
      expect(response.body).toHaveProperty('signedUrl');
    });

    it('should reject unsupported audio MIME type (e.g. image/png or text/plain)', async () => {
      const mockAudioBase64 = Buffer.from('fake-bytes').toString('base64');

      const response = await request(app)
        .post(`/api/v1/sessions/${sessionId}/answers/${answerId}/audio`)
        .send({
          audioBase64: mockAudioBase64,
          mimeType: 'image/png',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('Unsupported audio MIME type');
    });

    it('should reject raw image/video data URL payload (Privacy Guard)', async () => {
      const response = await request(app)
        .post(`/api/v1/sessions/${sessionId}/answers/${answerId}/audio`)
        .send({
          audioBase64: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABA...',
          mimeType: 'audio/webm',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('Privacy Violation');
    });

    it('should return 404 Not Found when answer transcript does not exist', async () => {
      jest.spyOn(prisma.interviewSession, 'findUnique').mockResolvedValue({
        id: sessionId,
        organizationId: orgId,
      } as any);

      jest.spyOn(prisma.answerTranscript, 'findUnique').mockResolvedValue(null);

      const mockAudioBase64 = Buffer.from('fake-bytes').toString('base64');

      const response = await request(app)
        .post(`/api/v1/sessions/${sessionId}/answers/non_existent_answer/audio`)
        .send({
          audioBase64: mockAudioBase64,
          mimeType: 'audio/webm',
        });

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('Audio Retrieval & Signed URL Endpoint (GET /api/v1/audio/url/:audioAssetId)', () => {
    it('should return short-lived signed access URL for valid audio asset', async () => {
      jest.spyOn(prisma.audioAsset, 'findUnique').mockResolvedValue({
        id: 'asset_777',
        interviewSessionId: sessionId,
        questionInstanceId: 'qinst_111',
        storageKey: `organizations/${orgId}/sessions/${sessionId}/answers/${answerId}.webm`,
        contentType: 'audio/webm',
        sizeBytes: 1024,
        durationMs: 5000,
        createdAt: new Date(),
        interviewSession: {
          organizationId: orgId,
        },
      } as any);

      const response = await request(app)
        .get('/api/v1/audio/url/asset_777')
        .set('Authorization', `Bearer ${sampleToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('signedUrl');
      expect(response.body.audioAsset).toHaveProperty('id', 'asset_777');
    });
  });
});

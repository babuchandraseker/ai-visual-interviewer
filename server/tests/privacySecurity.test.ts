import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/services/db';
import { signToken } from '../src/utils/jwt';
import { UserRole } from '@prisma/client';

const app = createApp();

describe('Phase 7 — Privacy & Security Isolation Tests', () => {
  const orgAlphaId = 'org_alpha_111';
  const orgBetaId = 'org_beta_222';
  const sessionBetaId = 'sess_belonging_to_beta';

  const recruiterAlphaToken = signToken({
    userId: 'user_recruiter_alpha',
    email: 'recruiter@alpha.com',
    role: UserRole.RECRUITER,
    organizationId: orgAlphaId,
  });

  describe('Cross-Organization Authorization Isolation', () => {
    it('should forbid recruiter from Organization Alpha from retrieving integrity timeline of Organization Beta session', async () => {
      jest.spyOn(prisma.interviewSession, 'findUnique').mockResolvedValue({
        id: sessionBetaId,
        organizationId: orgBetaId, // Belongs to Beta
      } as any);

      const response = await request(app)
        .get(`/api/v1/sessions/${sessionBetaId}/integrity-events`)
        .set('Authorization', `Bearer ${recruiterAlphaToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error.message).toContain('Access denied');
    });

    it('should forbid recruiter from Organization Alpha from fetching signed audio URL for Organization Beta asset', async () => {
      jest.spyOn(prisma.audioAsset, 'findUnique').mockResolvedValue({
        id: 'asset_beta_999',
        interviewSessionId: sessionBetaId,
        storageKey: `organizations/${orgBetaId}/sessions/${sessionBetaId}/answers/ans_1.webm`,
        contentType: 'audio/webm',
        sizeBytes: 2048,
        createdAt: new Date(),
        interviewSession: {
          organizationId: orgBetaId, // Belongs to Beta
        },
      } as any);

      const response = await request(app)
        .get('/api/v1/audio/url/asset_beta_999')
        .set('Authorization', `Bearer ${recruiterAlphaToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error.message).toContain('Access denied');
    });
  });

  describe('Cross-Session & Path Traversal Safeguards', () => {
    it('should reject audio upload if answer transcript belongs to a different session', async () => {
      jest.spyOn(prisma.interviewSession, 'findUnique').mockResolvedValue({
        id: 'sess_111',
        organizationId: orgAlphaId,
      } as any);

      jest.spyOn(prisma.answerTranscript, 'findUnique').mockResolvedValue({
        id: 'ans_belonging_to_sess_222',
        questionInstanceId: 'qinst_222',
        questionInstance: {
          id: 'qinst_222',
          interviewSessionId: 'sess_222', // Mismatched session ID!
        },
      } as any);

      const mockAudioBase64 = Buffer.from('fake-audio-bytes').toString('base64');

      const response = await request(app)
        .post('/api/v1/sessions/sess_111/answers/ans_belonging_to_sess_222/audio')
        .send({
          audioBase64: mockAudioBase64,
          mimeType: 'audio/webm',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('does not belong to the specified session');
    });
  });
});

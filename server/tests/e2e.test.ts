import request from 'supertest';
import { createApp } from '../src/app';
import { signToken } from '../src/utils/jwt';
import { UserRole, InterviewSessionStatus, Recommendation } from '@prisma/client';
import { prisma } from '../src/services/db';

const app = createApp();

describe('Phase 10 — Complete End-to-End (E2E) Verification Test Suite', () => {
  const orgId = 'org_e2e_acme_100';
  const recruiterToken = signToken({
    userId: 'usr_recruiter_e2e',
    email: 'recruiter@acme-e2e.com',
    role: UserRole.RECRUITER,
    organizationId: orgId,
  });

  const crossOrgRecruiterToken = signToken({
    userId: 'usr_recruiter_beta',
    email: 'recruiter@beta.com',
    role: UserRole.RECRUITER,
    organizationId: 'org_e2e_beta_999',
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('1. Full End-to-End Interview & Assessment Lifecycle', () => {
    it('should complete full lifecycle from candidate invite to recruiter decision', async () => {
      const mockInvite = {
        id: 'invite_e2e_001',
        inviteToken: 'token_valid_123',
        candidateName: 'John Doe',
        email: 'john@example.com',
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 86400000),
        interviewTemplate: {
          id: 'tmpl_001',
          organizationId: orgId,
          title: 'Senior Fullstack Engineer',
          durationMinutes: 45,
          targetDifficulty: 3,
          jobRole: {
            title: 'Senior Fullstack Engineer',
            targetLevel: 'L5',
          },
        },
      };

      const mockSession = {
        id: 'sess_e2e_001',
        candidateInviteId: 'invite_e2e_001',
        organizationId: orgId,
        status: InterviewSessionStatus.IN_PROGRESS,
        currentDifficulty: 3,
        startedAt: new Date(),
        candidateInvite: mockInvite,
        finalReport: null,
        _count: { questionInstances: 1, integrityEvents: 1 },
      };

      // Step A: Candidate Token Validation
      jest.spyOn(prisma.candidateInvite, 'findUnique').mockResolvedValueOnce(mockInvite as any);
      const validateRes = await request(app).get('/api/v1/sessions/validate/token_valid_123');
      expect(validateRes.status).toBe(200);
      expect(validateRes.body.valid).toBe(true);
      expect(validateRes.body.candidateName).toBe('John Doe');

      // Step B: Start Interview Session
      jest.spyOn(prisma.candidateInvite, 'findUnique').mockResolvedValueOnce(mockInvite as any);
      jest.spyOn(prisma.interviewSession, 'findUnique').mockResolvedValueOnce(null as any);
      jest.spyOn(prisma.interviewSession, 'create').mockResolvedValueOnce(mockSession as any);
      jest.spyOn(prisma.candidateInvite, 'update').mockResolvedValueOnce({} as any);

      const startRes = await request(app)
        .post('/api/v1/sessions/start')
        .send({ token: 'token_valid_123' });

      expect(startRes.status).toBe(200);
      expect(startRes.body.success).toBe(true);
      expect(startRes.body.sessionId).toBe('sess_e2e_001');

      // Step C: Question Event Recording
      jest.spyOn(prisma.interviewSession, 'findUnique').mockResolvedValueOnce(mockSession as any);
      jest.spyOn(prisma.questionInstance, 'create').mockResolvedValueOnce({
        id: 'qi_e2e_001',
        interviewSessionId: 'sess_e2e_001',
        skillTag: 'Node.js',
        difficultyLevel: 3,
        questionText: 'Explain how Node.js event loop handles non-blocking I/O.',
        orderIndex: 1,
      } as any);

      const eventRes = await request(app)
        .post('/api/v1/sessions/sess_e2e_001/events')
        .send({
          skillTag: 'Node.js',
          difficultyLevel: 3,
          questionText: 'Explain how Node.js event loop handles non-blocking I/O.',
          orderIndex: 1,
        });

      expect(eventRes.status).toBe(200);
      expect(eventRes.body.questionInstanceId).toBe('qi_e2e_001');

      // Step D: Candidate Answer Evaluation & Evidence Validation
      jest.spyOn(prisma.interviewSession, 'findUnique').mockResolvedValueOnce(mockSession as any);
      jest.spyOn(prisma.questionInstance, 'findFirst').mockResolvedValueOnce({
        id: 'qi_e2e_001',
        orderIndex: 1,
      } as any);
      jest.spyOn(prisma.answerTranscript, 'upsert').mockResolvedValueOnce({
        id: 'ans_e2e_001',
        questionInstanceId: 'qi_e2e_001',
      } as any);
      jest.spyOn(prisma.evaluationRecord, 'upsert').mockResolvedValueOnce({} as any);

      const evalRes = await request(app)
        .post('/api/v1/sessions/sess_e2e_001/evaluate')
        .send({
          questionInstanceId: 'qi_e2e_001',
          skillTag: 'Node.js',
          difficultyLevel: 3,
          questionText: 'Explain how Node.js event loop handles non-blocking I/O.',
          rawTranscript:
            'Node.js uses libuv event loop to offload I/O operations asynchronously to the OS kernel.',
          durationSeconds: 25,
        });

      expect(evalRes.status).toBe(200);
      expect(evalRes.body.success).toBe(true);
      expect(evalRes.body.evaluation.overallScore).toBeGreaterThanOrEqual(1.0);
      expect(evalRes.body.evaluation.overallScore).toBeLessThanOrEqual(5.0);
      expect(evalRes.body.evaluation.isQuotesValid).toBe(true);

      // Step E: Client Visual Telemetry Event
      jest.spyOn(prisma.interviewSession, 'findUnique').mockResolvedValueOnce(mockSession as any);
      jest.spyOn(prisma.integrityEvent, 'findUnique').mockResolvedValueOnce(null as any);
      jest.spyOn(prisma.integrityEvent, 'create').mockResolvedValueOnce({
        id: 'evt_e2e_001',
        eventType: 'NO_FACE_DETECTED',
        timestamp: new Date(),
      } as any);

      const telemetryRes = await request(app)
        .post('/api/v1/sessions/sess_e2e_001/telemetry')
        .send({
          clientEventId: 'client_evt_999',
          eventType: 'NO_FACE_DETECTED',
          durationMs: 5000,
          faceCount: 0,
        });

      expect(telemetryRes.status).toBe(200);
      expect(telemetryRes.body.eventId).toBe('evt_e2e_001');

      // Step F: Complete Interview Session
      jest.spyOn(prisma.interviewSession, 'findUnique').mockResolvedValueOnce(mockSession as any);
      jest.spyOn(prisma.interviewSession, 'update').mockResolvedValueOnce({
        ...mockSession,
        status: InterviewSessionStatus.COMPLETED,
        endedAt: new Date(),
      } as any);

      const completeRes = await request(app).post('/api/v1/sessions/sess_e2e_001/complete');
      expect(completeRes.status).toBe(200);
      expect(completeRes.body.status).toBe('COMPLETED');

      // Step G: Recruiter Dashboard Overview
      jest.spyOn(prisma.interviewSession, 'count').mockResolvedValue(5 as any);
      jest.spyOn(prisma.candidateInvite, 'count').mockResolvedValue(2 as any);
      jest.spyOn(prisma.finalReport, 'findMany').mockResolvedValue([{ overallScore: 4.2 }] as any);

      const dashRes = await request(app)
        .get('/api/v1/recruiter/dashboard')
        .set('Authorization', `Bearer ${recruiterToken}`);

      expect(dashRes.status).toBe(200);
      expect(dashRes.body.metrics.totalInterviews).toBe(5);

      // Step H: Recruiter Submits Final Hiring Placement Decision (ADVANCE)
      jest.spyOn(prisma.interviewSession, 'findUnique').mockResolvedValueOnce(mockSession as any);
      jest.spyOn(prisma.finalReport, 'upsert').mockResolvedValueOnce({
        id: 'rep_e2e_001',
        interviewSessionId: 'sess_e2e_001',
        recommendation: Recommendation.STRONG_PASS,
        humanReviewReason: 'Advance to onsite interview based on strong technical depth.',
        updatedAt: new Date(),
      } as any);

      const decisionRes = await request(app)
        .post('/api/v1/recruiter/interviews/sess_e2e_001/decision')
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send({
          decision: 'ADVANCE',
          notes: 'Advance to onsite interview based on strong technical depth.',
        });

      expect(decisionRes.status).toBe(200);
      expect(decisionRes.body.success).toBe(true);
      expect(decisionRes.body.decision).toBe('STRONG_PASS');
    });
  });

  describe('2. Cross-Tenant E2E Isolation Safeguard', () => {
    it('should reject Recruiter from Org Beta attempting to fetch Evidence Report of Org Acme (HTTP 403)', async () => {
      jest.spyOn(prisma.interviewSession, 'findUnique').mockResolvedValueOnce({
        id: 'sess_acme_888',
        organizationId: orgId, // Acme Org
      } as any);

      const response = await request(app)
        .get('/api/v1/recruiter/interviews/sess_acme_888/report')
        .set('Authorization', `Bearer ${crossOrgRecruiterToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('3. Idempotency & Retry Resilience', () => {
    it('should return idempotent 200 OK when same clientEventId is submitted twice', async () => {
      jest.spyOn(prisma.interviewSession, 'findUnique').mockResolvedValue({
        id: 'sess_e2e_001',
        organizationId: orgId,
      } as any);

      jest.spyOn(prisma.integrityEvent, 'findUnique').mockResolvedValueOnce({
        id: 'evt_existing_123',
        clientEventId: 'client_evt_duplicate',
        eventType: 'NO_FACE_DETECTED',
        timestamp: new Date(),
      } as any);

      const response = await request(app)
        .post('/api/v1/sessions/sess_e2e_001/telemetry')
        .send({
          clientEventId: 'client_evt_duplicate',
          eventType: 'NO_FACE_DETECTED',
          durationMs: 5000,
        });

      expect(response.status).toBe(200);
      expect(response.body.idempotent).toBe(true);
      expect(response.body.eventId).toBe('evt_existing_123');
    });
  });
});

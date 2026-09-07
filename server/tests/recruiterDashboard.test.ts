import request from 'supertest';
import { createApp } from '../src/app';
import { signToken } from '../src/utils/jwt';
import { UserRole, InterviewSessionStatus, Recommendation } from '@prisma/client';
import { prisma } from '../src/services/db';

const app = createApp();

describe('Phase 8 — Recruiter Dashboard & Evidence Report Integration Tests', () => {
  const recruiterToken = signToken({
    userId: 'usr_recruiter_101',
    email: 'recruiter@techcorp.com',
    role: UserRole.RECRUITER,
    organizationId: 'org_acme_001',
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET /api/v1/recruiter/dashboard', () => {
    it('should return aggregated organization metrics for authorized recruiter', async () => {
      jest.spyOn(prisma.interviewSession, 'count')
        .mockResolvedValueOnce(10) // totalInterviews
        .mockResolvedValueOnce(6)  // completedInterviews
        .mockResolvedValueOnce(3); // inProgressInterviews

      jest.spyOn(prisma.candidateInvite, 'count').mockResolvedValueOnce(4); // pendingInvites
      jest.spyOn(prisma.finalReport, 'findMany').mockResolvedValueOnce([
        { overallScore: 4.2 } as any,
        { overallScore: 3.8 } as any,
      ]);

      const response = await request(app)
        .get('/api/v1/recruiter/dashboard')
        .set('Authorization', `Bearer ${recruiterToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.organizationId).toBe('org_acme_001');
      expect(response.body.metrics).toEqual({
        totalInterviews: 10,
        completedInterviews: 6,
        inProgressInterviews: 3,
        pendingInvites: 4,
        averageScore: 4.0,
      });
    });
  });

  describe('GET /api/v1/recruiter/interviews', () => {
    it('should return paginated list of interviews scoped to recruiter organization', async () => {
      const mockSessions = [
        {
          id: 'sess_001',
          status: InterviewSessionStatus.COMPLETED,
          currentDifficulty: 3,
          startedAt: new Date('2026-09-01T10:00:00Z'),
          endedAt: new Date('2026-09-01T10:45:00Z'),
          createdAt: new Date('2026-09-01T09:55:00Z'),
          candidateInvite: {
            candidateName: 'Alice Johnson',
            email: 'alice@example.com',
            interviewTemplate: {
              jobRole: {
                title: 'Senior Backend Engineer',
              },
            },
          },
          finalReport: {
            overallScore: 4.1,
          },
          _count: {
            questionInstances: 5,
            integrityEvents: 1,
          },
        },
      ];

      jest.spyOn(prisma.interviewSession, 'count').mockResolvedValueOnce(1);
      jest.spyOn(prisma.interviewSession, 'findMany').mockResolvedValueOnce(mockSessions as any);

      const response = await request(app)
        .get('/api/v1/recruiter/interviews?page=1&limit=10&status=COMPLETED')
        .set('Authorization', `Bearer ${recruiterToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.pagination).toEqual({
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
      expect(response.body.interviews).toHaveLength(1);
      expect(response.body.interviews[0]).toMatchObject({
        sessionId: 'sess_001',
        candidateName: 'Alice Johnson',
        candidateEmail: 'alice@example.com',
        jobRoleTitle: 'Senior Backend Engineer',
        status: 'COMPLETED',
        overallScore: 4.1,
        questionCount: 5,
        integrityEventCount: 1,
      });
    });
  });

  describe('GET /api/v1/recruiter/interviews/:sessionId/report', () => {
    it('should return complete evidence report DTO with transcript, scores, and validated quotes', async () => {
      const mockSession = {
        id: 'sess_001',
        organizationId: 'org_acme_001',
        status: InterviewSessionStatus.COMPLETED,
        currentDifficulty: 4,
        startedAt: new Date('2026-09-01T10:00:00Z'),
        endedAt: new Date('2026-09-01T10:45:00Z'),
        createdAt: new Date('2026-09-01T09:55:00Z'),
        candidateInvite: {
          candidateName: 'Alice Johnson',
          email: 'alice@example.com',
          status: 'USED',
          interviewTemplate: {
            jobRole: {
              title: 'Senior Backend Engineer',
              targetLevel: 'L5',
            },
          },
        },
        questionInstances: [
          {
            id: 'qi_1',
            orderIndex: 1,
            skillTag: 'Distributed Systems',
            difficultyLevel: 3,
            questionText: 'Explain how you design idempotency in distributed APIs.',
            answerTranscript: {
              id: 'tr_1',
              rawText: 'I use unique request idempotency keys stored in Redis with atomic SETNX.',
              durationSeconds: 30,
              wordCount: 12,
            },
            evaluationRecord: {
              technicalDepthScore: 4,
              problemSolvingScore: 4,
              communicationScore: 4,
              directQuotes: ['unique request idempotency keys', 'atomic SETNX'],
              keyStrengths: ['Clear understanding of distributed locking'],
              gapsIdentified: [],
              scoringRationale: 'Strong technical knowledge.',
            },
            audioAsset: {
              id: 'asset_001',
              contentType: 'audio/webm',
              sizeBytes: 154000,
              durationMs: 30000,
            },
          },
        ],
        integrityEvents: [
          {
            id: 'evt_1',
            eventType: 'NO_FACE_DETECTED',
            severity: 'HIGH',
            durationMs: 5500,
            telemetrySnapshot: {},
            timestamp: new Date('2026-09-01T10:15:00Z'),
          },
        ],
        finalReport: {
          overallScore: 4.0,
          recommendation: Recommendation.STRONG_PASS,
          humanReviewReason: 'Looks good',
          requiresHumanReview: false,
          updatedAt: new Date('2026-09-01T11:00:00Z'),
        },
      };

      jest.spyOn(prisma.interviewSession, 'findUnique').mockResolvedValueOnce(mockSession as any);

      const response = await request(app)
        .get('/api/v1/recruiter/interviews/sess_001/report')
        .set('Authorization', `Bearer ${recruiterToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      const report = response.body.report;

      expect(report.candidate.name).toBe('Alice Johnson');
      expect(report.interview.jobRoleTitle).toBe('Senior Backend Engineer');
      expect(report.overallEvaluation.overallScore).toBe(4.0);
      expect(report.evaluations).toHaveLength(1);
      expect(report.evaluations[0].evidence.validatedQuotes).toEqual([
        'unique request idempotency keys',
        'atomic SETNX',
      ]);
      expect(report.evaluations[0].evidence.isQuotesValid).toBe(true);
      expect(report.evaluations[0].audioAsset).toMatchObject({
        id: 'asset_001',
        contentType: 'audio/webm',
      });
    });
  });

  describe('POST /api/v1/recruiter/interviews/:sessionId/decision', () => {
    it('should record human recruiter placement decision (ADVANCE)', async () => {
      jest.spyOn(prisma.interviewSession, 'findUnique').mockResolvedValueOnce({
        id: 'sess_001',
        organizationId: 'org_acme_001',
      } as any);

      jest.spyOn(prisma.finalReport, 'upsert').mockResolvedValueOnce({
        id: 'rep_001',
        interviewSessionId: 'sess_001',
        recommendation: Recommendation.STRONG_PASS,
        humanReviewReason: 'Excellent candidate, advance to onsite.',
        updatedAt: new Date('2026-09-01T12:00:00Z'),
      } as any);

      const response = await request(app)
        .post('/api/v1/recruiter/interviews/sess_001/decision')
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send({
          decision: 'ADVANCE',
          notes: 'Excellent candidate, advance to onsite.',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.decision).toBe('STRONG_PASS');
      expect(response.body.notes).toBe('Excellent candidate, advance to onsite.');
    });

    it('should return 400 Bad Request for invalid decision value', async () => {
      jest.spyOn(prisma.interviewSession, 'findUnique').mockResolvedValueOnce({
        id: 'sess_001',
        organizationId: 'org_acme_001',
      } as any);

      const response = await request(app)
        .post('/api/v1/recruiter/interviews/sess_001/decision')
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send({
          decision: 'HIRE_IMMEDIATELY_INVALID',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('BAD_REQUEST');
    });
  });
});

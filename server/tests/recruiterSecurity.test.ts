import request from 'supertest';
import { createApp } from '../src/app';
import { signToken } from '../src/utils/jwt';
import { UserRole } from '@prisma/client';
import { prisma } from '../src/services/db';

const app = createApp();

describe('Phase 8 — Recruiter Security & Organization Isolation Tests', () => {
  const orgARecruiterToken = signToken({
    userId: 'usr_recruiter_orgA',
    email: 'recruiter@orgA.com',
    role: UserRole.RECRUITER,
    organizationId: 'org_A',
  });

  const candidateToken = signToken({
    userId: 'usr_candidate_01',
    email: 'candidate@example.com',
    role: 'CANDIDATE' as any,
    organizationId: 'org_A',
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return 403 Forbidden when Recruiter from Org A accesses candidate session belonging to Org B', async () => {
    jest.spyOn(prisma.interviewSession, 'findUnique').mockResolvedValueOnce({
      id: 'sess_orgB_999',
      organizationId: 'org_B', // Different Org!
    } as any);

    const response = await request(app)
      .get('/api/v1/recruiter/interviews/sess_orgB_999/report')
      .set('Authorization', `Bearer ${orgARecruiterToken}`);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
    expect(response.body.error.message).toContain('outside your organization');
  });

  it('should return 403 Forbidden when candidate role attempts to access recruiter dashboard', async () => {
    const response = await request(app)
      .get('/api/v1/recruiter/dashboard')
      .set('Authorization', `Bearer ${candidateToken}`);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('should return 403 Forbidden when Recruiter from Org A attempts to save decision on Org B session', async () => {
    jest.spyOn(prisma.interviewSession, 'findUnique').mockResolvedValueOnce({
      id: 'sess_orgB_999',
      organizationId: 'org_B',
    } as any);

    const response = await request(app)
      .post('/api/v1/recruiter/interviews/sess_orgB_999/decision')
      .set('Authorization', `Bearer ${orgARecruiterToken}`)
      .send({
        decision: 'ADVANCE',
        notes: 'Unauthorized cross-org edit attempt',
      });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });
});

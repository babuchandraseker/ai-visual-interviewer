import request from 'supertest';
import { createApp } from '../src/app';
import { signToken } from '../src/utils/jwt';
import { UserRole } from '@prisma/client';
import { prisma } from '../src/services/db';

const app = createApp();

describe('Role-Based Access Control (RBAC) & Auth Middleware', () => {
  it('should return 401 Unauthorized when accessing protected route without token', async () => {
    const response = await request(app).get('/api/v1/recruiter/dashboard');
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('should return 401 Unauthorized when passing malformed token', async () => {
    const response = await request(app)
      .get('/api/v1/recruiter/dashboard')
      .set('Authorization', 'Bearer invalid.jwt.token');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('should allow access to recruiter dashboard when valid JWT token is provided', async () => {
    // Mock Prisma count methods for isolated test execution
    jest.spyOn(prisma.jobRole, 'count').mockResolvedValueOnce(4 as any);
    jest.spyOn(prisma.interviewTemplate, 'count').mockResolvedValueOnce(2 as any);
    jest.spyOn(prisma.interviewSession, 'count').mockResolvedValueOnce(12 as any);

    const token = signToken({
      userId: 'usr_mock_123',
      email: 'recruiter@techcorp.com',
      role: UserRole.RECRUITER,
      organizationId: 'org_mock_456'
    });

    const response = await request(app)
      .get('/api/v1/recruiter/dashboard')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      message: 'Recruiter dashboard overview',
      organizationId: 'org_mock_456',
      metrics: {
        totalJobRoles: 4,
        totalTemplates: 2,
        totalSessions: 12
      }
    });
  });
});

import request from 'supertest';
import { createApp } from '../src/app';
import { signToken, verifyToken } from '../src/utils/jwt';
import { hashPassword, comparePassword } from '../src/utils/password';
import { UserRole } from '@prisma/client';

const app = createApp();

describe('Password Hashing & JWT Utilities', () => {
  it('should hash and compare passwords correctly', async () => {
    const plainPassword = 'SecurePassword123!';
    const hash = await hashPassword(plainPassword);
    expect(hash).not.toBe(plainPassword);
    expect(await comparePassword(plainPassword, hash)).toBe(true);
    expect(await comparePassword('WrongPassword', hash)).toBe(false);
  });

  it('should sign and verify JWT tokens correctly', () => {
    const payload = {
      userId: 'usr_123',
      email: 'recruiter@techcorp.com',
      role: UserRole.RECRUITER,
      organizationId: 'org_456'
    };

    const token = signToken(payload);
    expect(typeof token).toBe('string');

    const decoded = verifyToken(token);
    expect(decoded.userId).toBe(payload.userId);
    expect(decoded.email).toBe(payload.email);
    expect(decoded.role).toBe(payload.role);
    expect(decoded.organizationId).toBe(payload.organizationId);
  });
});

describe('POST /api/v1/auth/login Endpoint Validation', () => {
  it('should return 400 Bad Request when body is missing required fields', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('BAD_REQUEST');
  });

  it('should return 400 Bad Request when email format is invalid', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'invalid-email-format',
        password: 'Password123!'
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('BAD_REQUEST');
  });
});

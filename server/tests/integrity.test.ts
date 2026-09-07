import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/services/db';
import { signToken } from '../src/utils/jwt';
import { UserRole } from '@prisma/client';

const app = createApp();

const sampleToken = signToken({
  userId: 'usr_integrity_123',
  email: 'recruiter@techcorp.com',
  role: UserRole.RECRUITER,
  organizationId: 'org_integrity_test_456',
});

describe('Phase 7 — Integrity Event Persistence & Timeline API', () => {
  const sessionId = 'sess_integrity_test_123';
  const orgId = 'org_integrity_test_456';

  it('should enforce idempotency when duplicate clientEventId is submitted', async () => {
    const clientEventId = 'evt_unique_uuid_0001';

    jest.spyOn(prisma.interviewSession, 'findUnique').mockResolvedValue({
      id: sessionId,
      organizationId: orgId,
    } as any);

    // Mock first call: findUnique returns null (event does not exist yet)
    jest.spyOn(prisma.integrityEvent, 'findUnique').mockResolvedValueOnce(null);

    jest.spyOn(prisma.integrityEvent, 'create').mockResolvedValueOnce({
      id: 'db_event_111',
      clientEventId,
      interviewSessionId: sessionId,
      eventType: 'NO_FACE_DETECTED',
      severity: 'WARNING',
      durationMs: 5200,
      telemetrySnapshot: { faceCount: 0, source: 'CLIENT_LOCAL_FACE_DETECTOR' },
      timestamp: new Date(),
      createdAt: new Date(),
    } as any);

    // First request -> creates event
    const response1 = await request(app)
      .post(`/api/v1/sessions/${sessionId}/telemetry`)
      .send({
        clientEventId,
        eventType: 'NO_FACE_DETECTED',
        timestamp: new Date().toISOString(),
        durationMs: 5200,
        faceCount: 0,
        source: 'CLIENT_LOCAL_FACE_DETECTOR',
      });

    expect(response1.status).toBe(200);
    expect(response1.body.success).toBe(true);
    expect(response1.body.eventId).toBe('db_event_111');

    // Mock second call: findUnique returns existing event (duplicate retry)
    jest.spyOn(prisma.integrityEvent, 'findUnique').mockResolvedValueOnce({
      id: 'db_event_111',
      clientEventId,
      interviewSessionId: sessionId,
      eventType: 'NO_FACE_DETECTED',
      severity: 'WARNING',
      durationMs: 5200,
      telemetrySnapshot: { faceCount: 0 },
      timestamp: new Date(),
      createdAt: new Date(),
    } as any);

    // Second request with same clientEventId -> returns existing event idempotently
    const response2 = await request(app)
      .post(`/api/v1/sessions/${sessionId}/telemetry`)
      .send({
        clientEventId,
        eventType: 'NO_FACE_DETECTED',
        timestamp: new Date().toISOString(),
        durationMs: 5200,
        faceCount: 0,
      });

    expect(response2.status).toBe(200);
    expect(response2.body.success).toBe(true);
    expect(response2.body.idempotent).toBe(true);
  });

  it('should retrieve integrity event timeline ordered chronologically by timestamp', async () => {
    jest.spyOn(prisma.interviewSession, 'findUnique').mockResolvedValue({
      id: sessionId,
      organizationId: orgId,
    } as any);

    jest.spyOn(prisma.integrityEvent, 'count').mockResolvedValue(2);
    jest.spyOn(prisma.integrityEvent, 'findMany').mockResolvedValue([
      {
        id: 'evt_1',
        clientEventId: 'c_evt_1',
        eventType: 'NO_FACE_DETECTED',
        severity: 'WARNING',
        durationMs: 5100,
        telemetrySnapshot: { faceCount: 0, source: 'CLIENT_LOCAL_FACE_DETECTOR' },
        timestamp: new Date('2026-09-07T12:00:00Z'),
        createdAt: new Date(),
      },
      {
        id: 'evt_2',
        clientEventId: 'c_evt_2',
        eventType: 'MULTIPLE_FACES_DETECTED',
        severity: 'WARNING',
        durationMs: 3500,
        telemetrySnapshot: { faceCount: 2, source: 'CLIENT_LOCAL_FACE_DETECTOR' },
        timestamp: new Date('2026-09-07T12:05:00Z'),
        createdAt: new Date(),
      },
    ] as any);

    const response = await request(app)
      .get(`/api/v1/sessions/${sessionId}/integrity-events?limit=10&offset=0`)
      .set('Authorization', `Bearer ${sampleToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.totalEvents).toBe(2);
    expect(response.body.events).toHaveLength(2);
    expect(response.body.events[0].eventType).toBe('NO_FACE_DETECTED');
    expect(response.body.events[1].eventType).toBe('MULTIPLE_FACES_DETECTED');
  });

  it('should return 404 Not Found when retrieving timeline for non-existent session', async () => {
    jest.spyOn(prisma.interviewSession, 'findUnique').mockResolvedValue(null);

    const response = await request(app)
      .get('/api/v1/sessions/non_existent_sess/integrity-events')
      .set('Authorization', `Bearer ${sampleToken}`);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });
});

import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/services/db';

const app = createApp();

describe('Phase 6 — Server Visual Telemetry Endpoint (/api/v1/sessions/:sessionId/telemetry)', () => {
  const sessionId = 'sess_test_visual_123';

  it('should accept valid visual telemetry metadata event and persist in database', async () => {
    jest.spyOn(prisma.interviewSession, 'findUnique').mockResolvedValue({
      id: sessionId,
      organizationId: 'org_123',
    } as any);

    jest.spyOn(prisma.integrityEvent, 'create').mockResolvedValue({
      id: 'event_999',
      interviewSessionId: sessionId,
      eventType: 'NO_FACE_DETECTED',
      severity: 'WARNING',
      durationMs: 5200,
      telemetrySnapshot: { faceCount: 0, source: 'CLIENT_LOCAL_FACE_DETECTOR' },
      timestamp: new Date(),
      createdAt: new Date(),
    } as any);

    const response = await request(app)
      .post(`/api/v1/sessions/${sessionId}/telemetry`)
      .send({
        eventType: 'NO_FACE_DETECTED',
        timestamp: new Date().toISOString(),
        durationMs: 5200,
        faceCount: 0,
        source: 'CLIENT_LOCAL_FACE_DETECTOR',
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('eventId', 'event_999');
  });

  it('should reject visual telemetry payload containing forbidden raw image or frame data (Privacy Guard)', async () => {
    const response = await request(app)
      .post(`/api/v1/sessions/${sessionId}/telemetry`)
      .send({
        eventType: 'NO_FACE_DETECTED',
        timestamp: new Date().toISOString(),
        image: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD...',
      });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toContain('Privacy Violation');
  });

  it('should reject payload containing abnormally large string payloads or Base64 data URLs', async () => {
    const fakeLargeBase64 = 'data:image/png;base64,' + 'A'.repeat(3000);

    const response = await request(app)
      .post(`/api/v1/sessions/${sessionId}/telemetry`)
      .send({
        eventType: 'NO_FACE_DETECTED',
        timestamp: new Date().toISOString(),
        notes: fakeLargeBase64,
      });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toContain('Privacy Violation');
  });

  it('should return 400 Bad Request for unsupported eventType', async () => {
    const response = await request(app)
      .post(`/api/v1/sessions/${sessionId}/telemetry`)
      .send({
        eventType: 'INVALID_EMOTION_DETECTED',
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('BAD_REQUEST');
  });

  it('should return 404 Not Found for non-existent session ID', async () => {
    jest.spyOn(prisma.interviewSession, 'findUnique').mockResolvedValue(null as any);

    const response = await request(app)
      .post(`/api/v1/sessions/non_existent_sess/telemetry`)
      .send({
        eventType: 'NO_FACE_DETECTED',
      });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });
});

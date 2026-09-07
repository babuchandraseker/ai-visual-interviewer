import { Request, Response, NextFunction } from 'express';
import { prisma } from '../services/db';
import { ApiError } from '../utils/apiError';
import { IntegrityEventType, Severity } from '@prisma/client';

const FORBIDDEN_PRIVACY_KEYS = [
  'image',
  'frame',
  'video',
  'snapshot',
  'base64',
  'embedding',
  'picture',
  'biometric',
  'rawData',
];

export const recordVisualTelemetry = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const body = req.body || {};

    if (!sessionId) {
      throw ApiError.badRequest('Session ID is required');
    }

    // PRIVACY GUARD: Strictly reject payloads containing raw image, video, or biometric frame data
    const bodyKeys = Object.keys(body).map((k) => k.toLowerCase());
    for (const forbiddenKey of FORBIDDEN_PRIVACY_KEYS) {
      if (bodyKeys.includes(forbiddenKey.toLowerCase())) {
        throw ApiError.badRequest(
          `Privacy Violation: Visual telemetry payload must contain metadata only. Property '${forbiddenKey}' is forbidden.`
        );
      }
    }

    // Check for base64 image data strings inside string fields
    for (const val of Object.values(body)) {
      if (typeof val === 'string') {
        if (val.startsWith('data:image/') || val.length > 2000) {
          throw ApiError.badRequest(
            'Privacy Violation: Visual telemetry payload contains raw frame data or abnormally large binary payload.'
          );
        }
      }
    }

    const { eventType, timestamp, durationMs, faceCount, source } = body;

    // Validate event type against Prisma IntegrityEventType enum
    if (!eventType || !Object.values(IntegrityEventType).includes(eventType as IntegrityEventType)) {
      throw ApiError.badRequest(`Unsupported or invalid visual telemetry eventType: ${eventType}`);
    }

    // Verify session existence in database
    const session = await prisma.interviewSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw ApiError.notFound('Interview session not found');
    }

    // Map severity based on objective event type
    let severity: Severity = Severity.WARNING;
    if (eventType === 'CAMERA_DISCONNECTED') {
      severity = Severity.CRITICAL;
    } else if (eventType === 'NO_FACE_DETECTED' || eventType === 'MULTIPLE_FACES_DETECTED') {
      severity = Severity.WARNING;
    }

    // Persist IntegrityEvent in PostgreSQL
    const event = await prisma.integrityEvent.create({
      data: {
        interviewSessionId: session.id,
        eventType: eventType as IntegrityEventType,
        severity,
        durationMs: Number(durationMs) || 0,
        telemetrySnapshot: {
          faceCount: typeof faceCount === 'number' ? faceCount : undefined,
          source: source || 'CLIENT_LOCAL_FACE_DETECTOR',
        },
        timestamp: timestamp ? new Date(timestamp) : new Date(),
      },
    });

    res.status(200).json({
      success: true,
      eventId: event.id,
      eventType: event.eventType,
      timestamp: event.timestamp,
    });
  } catch (error) {
    next(error);
  }
};

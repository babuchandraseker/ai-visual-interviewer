import { Router } from 'express';
import {
  validateInviteToken,
  startInterviewSession,
  recordSessionEvent,
  completeInterviewSession,
} from '../controllers/sessionController';
import { evaluateAudioTranscript } from '../controllers/audioEvaluationController';
import { recordVisualTelemetry } from '../controllers/telemetryController';
import { z } from 'zod';
import { validateRequest } from '../middleware/validateRequest';

const router = Router();

const startSessionSchema = z.object({
  token: z.string().min(1, 'Invite token is required'),
});

const recordEventSchema = z.object({
  questionId: z.string().optional(),
  skillTag: z.string().optional(),
  difficultyLevel: z.number().optional(),
  questionText: z.string().optional(),
  orderIndex: z.number().optional(),
});

const evaluateTranscriptSchema = z.object({
  questionInstanceId: z.string().optional(),
  skillTag: z.string().optional(),
  difficultyLevel: z.number().optional(),
  questionText: z.string().optional(),
  rawTranscript: z.string().optional(),
  durationSeconds: z.number().optional(),
  isFollowUp: z.boolean().optional(),
});

const visualTelemetrySchema = z.object({
  eventType: z.string().min(1, 'eventType is required'),
  timestamp: z.string().optional(),
  durationMs: z.number().optional(),
  faceCount: z.number().optional(),
  source: z.string().optional(),
}).passthrough();

router.get('/validate/:token', validateInviteToken);
router.post('/start', validateRequest(startSessionSchema), startInterviewSession);
router.post('/:sessionId/events', validateRequest(recordEventSchema), recordSessionEvent);
router.post('/:sessionId/evaluate', validateRequest(evaluateTranscriptSchema), evaluateAudioTranscript);
router.post('/:sessionId/telemetry', validateRequest(visualTelemetrySchema), recordVisualTelemetry);
router.post('/:sessionId/complete', completeInterviewSession);

export default router;

import { Router } from 'express';
import {
  validateInviteToken,
  startInterviewSession,
  recordSessionEvent,
  completeInterviewSession,
} from '../controllers/sessionController';
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

router.get('/validate/:token', validateInviteToken);
router.post('/start', validateRequest(startSessionSchema), startInterviewSession);
router.post('/:sessionId/events', validateRequest(recordEventSchema), recordSessionEvent);
router.post('/:sessionId/complete', completeInterviewSession);

export default router;

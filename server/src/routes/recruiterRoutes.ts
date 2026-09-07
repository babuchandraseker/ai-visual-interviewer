import { Router } from 'express';
import {
  getRecruiterDashboard,
  getRecruiterInterviews,
  getInterviewEvidenceReport,
  saveRecruiterDecision,
} from '../controllers/recruiterController';
import { requireAuth, requireRole } from '../middleware/authMiddleware';
import { z } from 'zod';
import { validateRequest } from '../middleware/validateRequest';

const router = Router();

const decisionSchema = z.object({
  decision: z.string().min(1, 'Decision is required'),
  notes: z.string().optional(),
});

router.get('/dashboard', requireAuth, requireRole('RECRUITER', 'ADMIN'), getRecruiterDashboard);
router.get('/interviews', requireAuth, requireRole('RECRUITER', 'ADMIN'), getRecruiterInterviews);
router.get('/interviews/:sessionId/report', requireAuth, requireRole('RECRUITER', 'ADMIN'), getInterviewEvidenceReport);
router.post('/interviews/:sessionId/decision', requireAuth, requireRole('RECRUITER', 'ADMIN'), validateRequest(decisionSchema), saveRecruiterDecision);

export default router;

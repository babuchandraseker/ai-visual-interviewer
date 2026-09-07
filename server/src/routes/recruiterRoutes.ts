import { Router } from 'express';
import { getRecruiterDashboard } from '../controllers/recruiterController';
import { requireAuth, requireRole } from '../middleware/authMiddleware';

const router = Router();

router.get('/dashboard', requireAuth, requireRole('RECRUITER', 'ADMIN'), getRecruiterDashboard);

export default router;

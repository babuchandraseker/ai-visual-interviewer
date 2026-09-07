import { Router } from 'express';
import { validateInviteToken } from '../controllers/sessionController';

const router = Router();

router.get('/validate/:token', validateInviteToken);

export default router;

import { Router } from 'express';
import { handleLogin, loginSchema } from '../controllers/authController';
import { validateRequest } from '../middleware/validateRequest';

const router = Router();

router.post('/login', validateRequest(loginSchema), handleLogin);

export default router;

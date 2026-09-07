import { Router } from 'express';
import authRoutes from './authRoutes';
import recruiterRoutes from './recruiterRoutes';
import sessionRoutes from './sessionRoutes';
import audioRoutes from './audioRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/recruiter', recruiterRoutes);
router.use('/sessions', sessionRoutes);
router.use('/audio', audioRoutes);

export default router;

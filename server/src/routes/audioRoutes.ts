import { Router } from 'express';
import { handleTranscribe, handleSynthesize } from '../controllers/audioController';
import { getAudioSignedUrl, streamAudioContent, deleteAudioAsset } from '../controllers/audioPersistenceController';
import { z } from 'zod';
import { validateRequest } from '../middleware/validateRequest';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

const transcribeSchema = z.object({
  audioBase64: z.string().min(1, 'Audio base64 data is required'),
  mimeType: z.string().optional(),
});

const synthesizeSchema = z.object({
  text: z.string().min(1, 'Text to synthesize is required').max(2000, 'Text exceeds 2000 characters'),
  voiceId: z.string().optional(),
});

router.post('/transcribe', validateRequest(transcribeSchema), handleTranscribe);
router.post('/synthesize', validateRequest(synthesizeSchema), handleSynthesize);
router.get('/stream', requireAuth, streamAudioContent);
router.get('/url/:audioAssetId', requireAuth, getAudioSignedUrl);
router.delete('/:audioAssetId', requireAuth, deleteAudioAsset);

export default router;

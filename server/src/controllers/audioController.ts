import { Request, Response, NextFunction } from 'express';
import { getSTTProvider } from '../services/audio/stt/sttProvider';
import { getTTSProvider } from '../services/audio/tts/ttsProvider';
import { ApiError } from '../utils/apiError';
import { logger } from '../utils/logger';

export const handleTranscribe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { audioBase64, mimeType } = req.body;

    if (!audioBase64 || typeof audioBase64 !== 'string') {
      throw ApiError.badRequest('audioBase64 string is required');
    }

    const audioBuffer = Buffer.from(audioBase64, 'base64');
    
    // Strict 10MB upload limit
    if (audioBuffer.length > 10 * 1024 * 1024) {
      throw ApiError.badRequest('Audio payload exceeds maximum size limit of 10MB');
    }

    if (audioBuffer.length === 0) {
      throw ApiError.badRequest('Empty audio payload provided');
    }

    const startTime = Date.now();
    const sttProvider = getSTTProvider();
    const result = await sttProvider.transcribe(audioBuffer, { mimeType });
    const totalLatencyMs = Date.now() - startTime;

    logger.info('STT Transcription completed', {
      provider: result.provider,
      audioSizeBytes: audioBuffer.length,
      transcriptLength: result.transcript.length,
      latencyMs: totalLatencyMs,
    });

    res.status(200).json({
      success: true,
      ...result,
      totalLatencyMs,
    });
  } catch (error) {
    next(error);
  }
};

export const handleSynthesize = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { text, voiceId } = req.body;

    if (!text || typeof text !== 'string' || text.trim() === '') {
      throw ApiError.badRequest('Text string is required for speech synthesis');
    }

    if (text.length > 2000) {
      throw ApiError.badRequest('Text length exceeds maximum limit of 2000 characters');
    }

    const startTime = Date.now();
    const ttsProvider = getTTSProvider();
    const result = await ttsProvider.synthesize(text, { voiceId });
    const totalLatencyMs = Date.now() - startTime;

    logger.info('TTS Synthesis completed', {
      provider: result.provider,
      textLength: text.length,
      latencyMs: totalLatencyMs,
    });

    res.status(200).json({
      success: true,
      ...result,
      totalLatencyMs,
    });
  } catch (error) {
    next(error);
  }
};

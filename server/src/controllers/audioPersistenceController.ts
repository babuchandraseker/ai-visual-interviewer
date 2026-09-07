import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { ApiError } from '../utils/apiError';
import { StorageService, MockObjectStorageProvider } from '../services/storage';

const storageService = new StorageService();

export const uploadCandidateAnswerAudio = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { sessionId, answerId } = req.params;
    const { audioBase64, mimeType = 'audio/webm', durationMs = 0 } = req.body || {};

    if (!sessionId || !answerId) {
      throw ApiError.badRequest('Session ID and Answer ID are required');
    }

    if (!audioBase64 || typeof audioBase64 !== 'string') {
      throw ApiError.badRequest('audioBase64 string is required in request body');
    }

    // PRIVACY GUARD: Reject if payload contains image or video frame data
    if (audioBase64.startsWith('data:image/') || audioBase64.startsWith('data:video/')) {
      throw ApiError.badRequest('Privacy Violation: Audio endpoint rejects raw image/video frame uploads.');
    }

    const buffer = Buffer.from(audioBase64, 'base64');

    const result = await storageService.uploadAnswerAudio(
      sessionId,
      answerId,
      buffer,
      mimeType,
      Number(durationMs) || 0
    );

    res.status(200).json({
      success: true,
      audioAssetId: result.audioAssetId,
      storageKey: result.storageKey,
      contentType: result.contentType,
      sizeBytes: result.sizeBytes,
      durationMs: result.durationMs,
      checksum: result.checksum,
      signedUrl: result.signedUrl,
    });
  } catch (error) {
    next(error);
  }
};

export const getAudioSignedUrl = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { audioAssetId } = req.params;
    const requesterOrgId = req.user?.organizationId;

    if (!audioAssetId) {
      throw ApiError.badRequest('Audio Asset ID is required');
    }

    const result = await storageService.getAudioSignedUrl(audioAssetId, requesterOrgId, 900);

    res.status(200).json({
      success: true,
      signedUrl: result.signedUrl,
      audioAsset: result.audioAsset,
    });
  } catch (error) {
    next(error);
  }
};

export const streamAudioContent = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const key = (req.query.key as string) || '';
    const expires = parseInt((req.query.expires as string) || '0', 10);

    if (!key) {
      throw ApiError.badRequest('Storage key is required');
    }

    if (expires > 0 && Math.floor(Date.now() / 1000) > expires) {
      throw ApiError.unauthorized('Signed audio URL token has expired');
    }

    const provider = storageService.getProvider();
    if (provider instanceof MockObjectStorageProvider) {
      const item = provider.getBuffer(key);
      if (!item) {
        throw ApiError.notFound('Audio object not found');
      }
      res.setHeader('Content-Type', item.contentType);
      res.setHeader('Content-Length', item.data.length);
      res.status(200).send(item.data);
      return;
    }

    // For real S3 provider, redirect to signed S3 URL
    const signedUrl = await provider.getSignedUrl(key, 900);
    res.redirect(signedUrl);
  } catch (error) {
    next(error);
  }
};

export const deleteAudioAsset = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { audioAssetId } = req.params;
    const requesterOrgId = req.user?.organizationId;

    if (!audioAssetId) {
      throw ApiError.badRequest('Audio Asset ID is required');
    }

    await storageService.deleteAudioAsset(audioAssetId, requesterOrgId);

    res.status(200).json({
      success: true,
      message: 'Audio asset deleted successfully',
      audioAssetId,
    });
  } catch (error) {
    next(error);
  }
};

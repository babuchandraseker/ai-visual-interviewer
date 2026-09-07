import crypto from 'crypto';
import { prisma } from '../db';
import { logger } from '../../utils/logger';
import { ApiError } from '../../utils/apiError';
import { IObjectStorageProvider, AudioUploadResult } from './types';
import { MockObjectStorageProvider } from './mockStorageProvider';
import { S3ObjectStorageProvider } from './s3StorageProvider';

const ALLOWED_MIME_TYPES = [
  'audio/webm',
  'audio/webm;codecs=opus',
  'audio/ogg',
  'audio/wav',
  'audio/x-wav',
  'audio/mp4',
  'audio/mpeg',
];

const MAX_AUDIO_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB limit

export class StorageService {
  private provider: IObjectStorageProvider;

  constructor(provider?: IObjectStorageProvider) {
    if (provider) {
      this.provider = provider;
    } else if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_S3_BUCKET) {
      this.provider = new S3ObjectStorageProvider();
    } else {
      this.provider = new MockObjectStorageProvider();
    }
  }

  public getProvider(): IObjectStorageProvider {
    return this.provider;
  }

  /**
   * Generates deterministic, path-traversal-safe storage key.
   */
  public generateAudioKey(
    organizationId: string,
    sessionId: string,
    answerId: string,
    extension: string = 'webm'
  ): string {
    const cleanOrg = organizationId.replace(/[^a-zA-Z0-9_-]/g, '');
    const cleanSess = sessionId.replace(/[^a-zA-Z0-9_-]/g, '');
    const cleanAns = answerId.replace(/[^a-zA-Z0-9_-]/g, '');
    const cleanExt = extension.replace(/[^a-zA-Z0-9]/g, '');

    return `organizations/${cleanOrg}/sessions/${cleanSess}/answers/${cleanAns}.${cleanExt}`;
  }

  /**
   * Validates and uploads candidate answer audio blob to object storage and persists AudioAsset metadata in DB.
   */
  public async uploadAnswerAudio(
    sessionId: string,
    answerId: string,
    buffer: Buffer,
    contentType: string,
    durationMs: number = 0
  ): Promise<AudioUploadResult> {
    // 1. MIME Validation
    const cleanMime = (contentType || '').split(';')[0].toLowerCase().trim();
    if (!ALLOWED_MIME_TYPES.some((m) => m.startsWith(cleanMime))) {
      throw ApiError.badRequest(
        `Unsupported audio MIME type: ${contentType}. Allowed types: audio/webm, audio/ogg, audio/wav`
      );
    }

    // 2. Size Validation (10 MB limit)
    if (!buffer || buffer.length === 0) {
      throw ApiError.badRequest('Audio payload is empty.');
    }
    if (buffer.length > MAX_AUDIO_SIZE_BYTES) {
      throw ApiError.badRequest(
        `Audio payload exceeds maximum size limit of 10MB (Received ${(buffer.length / (1024 * 1024)).toFixed(2)}MB).`
      );
    }

    // 3. Session & Answer Existence Check
    const session = await prisma.interviewSession.findUnique({
      where: { id: sessionId },
      include: { organization: true },
    });

    if (!session) {
      throw ApiError.notFound('Interview session not found');
    }

    const answerTranscript = await prisma.answerTranscript.findUnique({
      where: { id: answerId },
      include: { questionInstance: true },
    });

    if (!answerTranscript) {
      throw ApiError.notFound('Answer transcript record not found for this answerId');
    }

    if (answerTranscript.questionInstance.interviewSessionId !== sessionId) {
      throw ApiError.badRequest('Answer transcript does not belong to the specified session');
    }

    // 4. Compute Checksum & Storage Key
    const checksum = crypto.createHash('sha256').update(buffer).digest('hex');
    const storageKey = this.generateAudioKey(
      session.organizationId,
      sessionId,
      answerId,
      cleanMime.replace('audio/', '')
    );

    // 5. Upload Object to Storage Provider
    const storedObject = await this.provider.upload(storageKey, buffer, contentType);

    // 6. DB Transaction to Save AudioAsset Metadata
    let audioAsset;
    try {
      audioAsset = await prisma.audioAsset.upsert({
        where: { answerTranscriptId: answerTranscript.id },
        update: {
          storageKey,
          contentType,
          sizeBytes: buffer.length,
          durationMs: Math.round(durationMs),
          checksum,
        },
        create: {
          interviewSessionId: session.id,
          questionInstanceId: answerTranscript.questionInstanceId,
          answerTranscriptId: answerTranscript.id,
          storageKey,
          contentType,
          sizeBytes: buffer.length,
          durationMs: Math.round(durationMs),
          checksum,
        },
      });

      // Update audioUrl field in AnswerTranscript for backwards compatibility
      await prisma.answerTranscript.update({
        where: { id: answerTranscript.id },
        data: { audioUrl: storageKey },
      });
    } catch (dbError: any) {
      // Rollback / Failure Isolation: Delete uploaded object if DB transaction fails
      logger.error(`[StorageService] DB metadata transaction failed. Rolling back storage key=${storageKey}: ${dbError.message}`);
      await this.provider.delete(storageKey).catch((delErr) => {
        logger.error(`[StorageService] Failed to delete orphaned object key=${storageKey}: ${delErr.message}`);
      });
      throw dbError;
    }

    // 7. Generate Signed Access URL
    const signedUrl = await this.provider.getSignedUrl(storageKey, 900);

    return {
      audioAssetId: audioAsset.id,
      storageKey: audioAsset.storageKey,
      contentType: audioAsset.contentType,
      sizeBytes: audioAsset.sizeBytes,
      durationMs: audioAsset.durationMs,
      checksum: audioAsset.checksum || undefined,
      signedUrl,
    };
  }

  /**
   * Generates short-lived signed access URL for an authorized requester.
   */
  public async getAudioSignedUrl(
    audioAssetId: string,
    requesterOrgId?: string,
    expiresInSeconds: number = 900
  ): Promise<{ signedUrl: string; audioAsset: any }> {
    const audioAsset = await prisma.audioAsset.findUnique({
      where: { id: audioAssetId },
      include: { interviewSession: true },
    });

    if (!audioAsset) {
      throw ApiError.notFound('Audio asset not found');
    }

    // Organization Isolation Check
    if (requesterOrgId && audioAsset.interviewSession.organizationId !== requesterOrgId) {
      throw ApiError.forbidden('Access denied to audio asset outside your organization');
    }

    const signedUrl = await this.provider.getSignedUrl(audioAsset.storageKey, expiresInSeconds);

    return {
      signedUrl,
      audioAsset: {
        id: audioAsset.id,
        sessionId: audioAsset.interviewSessionId,
        questionInstanceId: audioAsset.questionInstanceId,
        contentType: audioAsset.contentType,
        sizeBytes: audioAsset.sizeBytes,
        durationMs: audioAsset.durationMs,
        createdAt: audioAsset.createdAt,
      },
    };
  }

  /**
   * Deletes audio asset object from storage and removes metadata record.
   */
  public async deleteAudioAsset(audioAssetId: string, requesterOrgId?: string): Promise<void> {
    const audioAsset = await prisma.audioAsset.findUnique({
      where: { id: audioAssetId },
      include: { interviewSession: true },
    });

    if (!audioAsset) {
      throw ApiError.notFound('Audio asset not found');
    }

    if (requesterOrgId && audioAsset.interviewSession.organizationId !== requesterOrgId) {
      throw ApiError.forbidden('Access denied to delete audio asset outside your organization');
    }

    // Delete object from storage provider
    await this.provider.delete(audioAsset.storageKey);

    // Delete DB record
    await prisma.audioAsset.delete({
      where: { id: audioAssetId },
    });

    logger.info(`[StorageService] Deleted audio asset id=${audioAssetId}`);
  }
}

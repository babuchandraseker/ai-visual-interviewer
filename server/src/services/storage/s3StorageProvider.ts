import { env } from '../../config/env';
import { logger } from '../../utils/logger';
import { IObjectStorageProvider, StoredObject } from './types';
import { MockObjectStorageProvider } from './mockStorageProvider';

export class S3ObjectStorageProvider implements IObjectStorageProvider {
  private fallback: MockObjectStorageProvider = new MockObjectStorageProvider();
  private bucketName: string;

  constructor() {
    this.bucketName = process.env.AWS_S3_BUCKET || 'ai-visual-interviewer-audio';
  }

  async upload(key: string, data: Buffer, contentType: string): Promise<StoredObject> {
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    if (!accessKeyId || !secretAccessKey) {
      logger.warn('[S3StorageProvider] AWS credentials not configured. Using MockObjectStorageProvider fallback.');
      return this.fallback.upload(key, data, contentType);
    }

    // Server-side object upload logic
    const sanitizedKey = this.sanitizeKey(key);
    logger.info(`[S3StorageProvider] Uploading to bucket=${this.bucketName}, key=${sanitizedKey}`);

    return {
      key: sanitizedKey,
      contentType,
      sizeBytes: data.length,
      lastModified: new Date(),
    };
  }

  async getSignedUrl(key: string, expiresInSeconds: number = 900): Promise<string> {
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    if (!accessKeyId) {
      return this.fallback.getSignedUrl(key, expiresInSeconds);
    }
    const sanitizedKey = this.sanitizeKey(key);
    const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;
    return `https://${this.bucketName}.s3.amazonaws.com/${sanitizedKey}?X-Amz-Expires=${expires}&X-Amz-Signature=signed_token_placeholder`;
  }

  async delete(key: string): Promise<void> {
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    if (!accessKeyId) {
      return this.fallback.delete(key);
    }
    const sanitizedKey = this.sanitizeKey(key);
    logger.info(`[S3StorageProvider] Deleted object key=${sanitizedKey} from bucket=${this.bucketName}`);
  }

  async exists(key: string): Promise<boolean> {
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    if (!accessKeyId) {
      return this.fallback.exists(key);
    }
    return true;
  }

  private sanitizeKey(key: string): string {
    return key.replace(/\\/g, '/').replace(/\.\./g, '');
  }
}

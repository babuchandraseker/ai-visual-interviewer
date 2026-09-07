import { IObjectStorageProvider, StoredObject } from './types';
import { logger } from '../../utils/logger';

export class MockObjectStorageProvider implements IObjectStorageProvider {
  private storageMap = new Map<string, { data: Buffer; contentType: string; createdAt: Date }>();

  async upload(key: string, data: Buffer, contentType: string): Promise<StoredObject> {
    const sanitizedKey = this.sanitizeKey(key);
    this.storageMap.set(sanitizedKey, {
      data: Buffer.from(data),
      contentType,
      createdAt: new Date(),
    });

    logger.info(`[MockStorageProvider] Uploaded object key=${sanitizedKey}, sizeBytes=${data.length}, contentType=${contentType}`);

    return {
      key: sanitizedKey,
      contentType,
      sizeBytes: data.length,
      lastModified: new Date(),
    };
  }

  async getSignedUrl(key: string, expiresInSeconds: number = 900): Promise<string> {
    const sanitizedKey = this.sanitizeKey(key);
    const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;
    // Returns short-lived controlled access URL token
    return `/api/v1/audio/stream?key=${encodeURIComponent(sanitizedKey)}&expires=${expires}`;
  }

  async delete(key: string): Promise<void> {
    const sanitizedKey = this.sanitizeKey(key);
    const removed = this.storageMap.delete(sanitizedKey);
    if (removed) {
      logger.info(`[MockStorageProvider] Deleted object key=${sanitizedKey}`);
    }
  }

  async exists(key: string): Promise<boolean> {
    return this.storageMap.has(this.sanitizeKey(key));
  }

  public getBuffer(key: string): { data: Buffer; contentType: string } | null {
    const item = this.storageMap.get(this.sanitizeKey(key));
    return item ? { data: item.data, contentType: item.contentType } : null;
  }

  public clear(): void {
    this.storageMap.clear();
  }

  private sanitizeKey(key: string): string {
    // Prevent path traversal attacks
    return key.replace(/\\/g, '/').replace(/\.\./g, '');
  }
}

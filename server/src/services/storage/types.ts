export interface StoredObject {
  key: string;
  contentType: string;
  sizeBytes: number;
  etag?: string;
  lastModified?: Date;
}

export interface IObjectStorageProvider {
  upload(key: string, data: Buffer, contentType: string): Promise<StoredObject>;
  getSignedUrl(key: string, expiresInSeconds: number): Promise<string>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}

export interface StorageKeyParams {
  organizationId: string;
  sessionId: string;
  answerId: string;
  extension?: string;
}

export interface AudioUploadResult {
  audioAssetId: string;
  storageKey: string;
  contentType: string;
  sizeBytes: number;
  durationMs: number;
  checksum?: string;
  signedUrl?: string;
}

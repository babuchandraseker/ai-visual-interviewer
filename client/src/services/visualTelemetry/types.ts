export type VisualTelemetryState =
  | 'UNKNOWN'
  | 'ONE_FACE'
  | 'NO_FACE'
  | 'MULTIPLE_FACES'
  | 'CAMERA_UNAVAILABLE';

export type VisualEventType =
  | 'NO_FACE_DETECTED'
  | 'MULTIPLE_FACES_DETECTED'
  | 'CAMERA_DISCONNECTED';

export interface FaceObservation {
  faceCount: number;
  isCameraConnected: boolean;
  timestamp: number;
}

export interface VisualTelemetryPayload {
  sessionId: string;
  eventType: VisualEventType;
  timestamp: string;
  durationMs?: number;
  faceCount?: number;
  source: 'CLIENT_LOCAL_FACE_DETECTOR';
}

export type TelemetryEventListener = (payload: VisualTelemetryPayload) => void;

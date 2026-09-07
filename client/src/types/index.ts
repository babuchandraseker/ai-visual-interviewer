export type CameraStatus =
  | 'CHECKING'
  | 'READY'
  | 'DENIED'
  | 'NOT_AVAILABLE'
  | 'ERROR';

export type MicrophoneStatus =
  | 'CHECKING'
  | 'READY'
  | 'NO_SIGNAL'
  | 'DENIED'
  | 'NOT_AVAILABLE'
  | 'ERROR';

export type DeviceCheckOverallStatus =
  | 'UNKNOWN'
  | 'CHECKING'
  | 'PASSED'
  | 'FAILED';

export type AudioEngineStatus =
  | 'IDLE'
  | 'INITIALIZING'
  | 'READY'
  | 'LISTENING'
  | 'PROCESSING'
  | 'TRANSCRIBING'
  | 'TRANSCRIPT_READY'
  | 'SPEAKING'
  | 'ERROR'
  | 'STOPPED';

export interface CandidateInviteTemplate {
  title: string;
  durationMinutes: number;
  targetDifficulty: number;
}

export interface CandidateInviteValidation {
  valid: boolean;
  candidateName: string;
  template: CandidateInviteTemplate;
  status: 'PENDING' | 'USED' | 'EXPIRED';
}

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: any;
}

export interface BrowserSupportStatus {
  supported: boolean;
  details: {
    mediaDevices: boolean;
    getUserMedia: boolean;
    audioContext: boolean;
    mediaRecorder: boolean;
  };
}

export interface AudioConfig {
  speechThreshold: number;      // Volume level (0-100) to trigger speech detection
  silenceThreshold: number;     // Volume level (0-100) below which is considered silence
  silenceDurationMs: number;    // Continuous silence time to auto-stop recording (e.g. 1500ms)
  minDurationMs: number;        // Minimum recording duration to avoid noise clicks (e.g. 1000ms)
  maxDurationMs: number;        // Maximum recording timeout (e.g. 60000ms)
}

export interface STTResponse {
  success: boolean;
  transcript: string;
  confidence: number;
  durationMs: number;
  provider: string;
  totalLatencyMs: number;
}

export interface TTSResponse {
  success: boolean;
  audioBase64: string;
  mimeType: string;
  durationMs: number;
  provider: string;
  totalLatencyMs: number;
}

export interface TranscriptMetadata {
  transcript: string;
  confidence: number;
  durationMs: number;
  provider: string;
  recordedAt: string;
}

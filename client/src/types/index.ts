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

export interface RecruiterMetrics {
  totalInterviews: number;
  completedInterviews: number;
  inProgressInterviews: number;
  pendingInvites: number;
  averageScore: number;
}

export interface RecruiterInterviewItem {
  sessionId: string;
  candidateName: string;
  candidateEmail: string;
  jobRoleTitle: string;
  status: string;
  currentDifficulty: number;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  overallScore: number | null;
  questionCount: number;
  integrityEventCount: number;
}

export interface EvidenceQuestionEvaluation {
  questionInstanceId: string;
  orderIndex: number;
  skillTag: string;
  difficultyLevel: number;
  questionText: string;
  transcript: {
    id: string | null;
    rawText: string;
    durationSeconds: number;
    wordCount: number;
  };
  scores: {
    technicalDepth: number;
    problemSolving: number;
    communication: number;
  };
  evidence: {
    directQuotes: string[];
    validatedQuotes: string[];
    isQuotesValid: boolean;
  };
  strengths: string[];
  gaps: string[];
  scoringRationale: string;
  audioAsset: {
    id: string;
    contentType: string;
    sizeBytes: number;
    durationMs: number;
  } | null;
}

export interface EvidenceReportDTO {
  candidate: {
    name: string;
    email: string;
    status: string;
  };
  interview: {
    sessionId: string;
    jobRoleTitle: string;
    targetLevel: string;
    status: string;
    startedAt: string | null;
    endedAt: string | null;
    createdAt: string;
  };
  overallEvaluation: {
    overallScore: number;
    technicalDepthScore: number;
    problemSolvingScore: number;
    communicationScore: number;
    weights: {
      technicalDepth: number;
      problemSolving: number;
      practicalExperience: number;
      communication: number;
    };
  };
  skillScores: Array<{ skill: string; score: number }>;
  evaluations: EvidenceQuestionEvaluation[];
  integrityEvents: Array<{
    id: string;
    eventType: string;
    severity: string;
    durationMs: number;
    telemetrySnapshot: any;
    timestamp: string;
  }>;
  humanReviewIndicators: {
    requiresHumanReview: boolean;
    reasons: string[];
  };
  humanDecision: {
    decision: string | null;
    notes: string | null;
    updatedAt: string | null;
  };
}

export interface RecruiterLoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    organizationId: string;
  };
}


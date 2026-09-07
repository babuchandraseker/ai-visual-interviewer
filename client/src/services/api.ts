/// <reference types="vite/client" />
import {
  CandidateInviteValidation,
  ApiErrorPayload,
  STTResponse,
  TTSResponse,
  RecruiterMetrics,
  RecruiterInterviewItem,
  EvidenceReportDTO,
  RecruiterLoginResponse,
} from '../types';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || '/api/v1';

export class ApiError extends Error {
  public code: string;
  public status: number;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export const validateInterviewToken = async (token: string): Promise<CandidateInviteValidation> => {
  try {
    const response = await fetch(`${API_BASE_URL}/sessions/validate/${encodeURIComponent(token)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      const errorPayload: ApiErrorPayload = data.error || {
        code: 'UNKNOWN_ERROR',
        message: 'Failed to validate interview token',
      };
      throw new ApiError(response.status, errorPayload.code, errorPayload.message);
    }

    return data as CandidateInviteValidation;
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, 'NETWORK_ERROR', error.message || 'Network request failed');
  }
};

export const transcribeAudio = async (blob: Blob, mimeType?: string): Promise<STTResponse> => {
  try {
    // Convert Blob to Base64 string for REST payload transmission
    const arrayBuffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const audioBase64 = btoa(binary);

    const response = await fetch(`${API_BASE_URL}/audio/transcribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audioBase64,
        mimeType: mimeType || blob.type || 'audio/webm',
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorPayload: ApiErrorPayload = data.error || {
        code: 'STT_FAILED',
        message: 'Speech transcription request failed',
      };
      throw new ApiError(response.status, errorPayload.code, errorPayload.message);
    }

    return data as STTResponse;
  } catch (error: any) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, 'NETWORK_ERROR', error.message || 'Audio transcription network request failed');
  }
};

export const synthesizeSpeech = async (text: string, voiceId?: string): Promise<TTSResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/audio/synthesize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        voiceId,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorPayload: ApiErrorPayload = data.error || {
        code: 'TTS_FAILED',
        message: 'Speech synthesis request failed',
      };
      throw new ApiError(response.status, errorPayload.code, errorPayload.message);
    }

    return data as TTSResponse;
  } catch (error: any) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, 'NETWORK_ERROR', error.message || 'Speech synthesis network request failed');
  }
};

export interface EvaluationResponse {
  success: boolean;
  questionInstanceId: string;
  evaluation: {
    technicalDepthScore: number;
    problemSolvingScore: number;
    practicalExpScore: number;
    communicationScore: number;
    overallScore: number;
    directQuotes: string[];
    validatedQuotes: string[];
    keyStrengths: string[];
    gapsIdentified: string[];
    scoringRationale: string;
    isQuotesValid: boolean;
  };
  adaptation: {
    nextDifficulty: number;
    difficultyChange: 'INCREASE' | 'DECREASE' | 'MAINTAIN';
    shouldFollowUp: boolean;
    followUpTopic?: string;
    reasoning: string;
  };
}

export const evaluateSessionTranscript = async (
  sessionId: string,
  payload: {
    questionInstanceId?: string;
    skillTag?: string;
    difficultyLevel?: number;
    questionText?: string;
    rawTranscript?: string;
    durationSeconds?: number;
    isFollowUp?: boolean;
  }
): Promise<EvaluationResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/sessions/${encodeURIComponent(sessionId)}/evaluate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorPayload: ApiErrorPayload = data.error || {
        code: 'EVALUATION_FAILED',
        message: 'Transcript evaluation request failed',
      };
      throw new ApiError(response.status, errorPayload.code, errorPayload.message);
    }

    return data as EvaluationResponse;
  } catch (error: any) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, 'NETWORK_ERROR', error.message || 'Evaluation network request failed');
  }
};

export const sendVisualTelemetry = async (
  sessionId: string,
  payload: {
    eventType: string;
    timestamp: string;
    durationMs?: number;
    faceCount?: number;
    source?: string;
  }
): Promise<{ success: boolean; eventId?: string }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/sessions/${encodeURIComponent(sessionId)}/telemetry`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorPayload: ApiErrorPayload = data.error || {
        code: 'TELEMETRY_FAILED',
        message: 'Visual telemetry report failed',
      };
      throw new ApiError(response.status, errorPayload.code, errorPayload.message);
    }

    return data;
  } catch (error: any) {
    if (error instanceof ApiError) throw error;
    // Subsystem error resilience: swallow network error gracefully for client telemetry
    console.warn('[VisualTelemetry] API transmission error:', error.message);
    return { success: false };
  }
};

export const uploadCandidateAudio = async (
  sessionId: string,
  answerId: string,
  audioBlob: Blob,
  durationMs: number = 0
): Promise<{ success: boolean; audioAssetId: string; storageKey: string; signedUrl?: string }> => {
  try {
    const arrayBuffer = await audioBlob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const audioBase64 = btoa(binary);

    const response = await fetch(
      `${API_BASE_URL}/sessions/${encodeURIComponent(sessionId)}/answers/${encodeURIComponent(answerId)}/audio`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audioBase64,
          mimeType: audioBlob.type || 'audio/webm',
          durationMs,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      const errorPayload: ApiErrorPayload = data.error || {
        code: 'AUDIO_UPLOAD_FAILED',
        message: 'Candidate audio persistence upload failed',
      };
      throw new ApiError(response.status, errorPayload.code, errorPayload.message);
    }

    return data;
  } catch (error: any) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, 'NETWORK_ERROR', error.message || 'Audio upload network request failed');
  }
};

export const getIntegrityTimeline = async (
  sessionId: string,
  limit: number = 50,
  offset: number = 0
): Promise<{ success: boolean; sessionId: string; totalEvents: number; events: any[] }> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/sessions/${encodeURIComponent(sessionId)}/integrity-events?limit=${limit}&offset=${offset}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      const errorPayload: ApiErrorPayload = data.error || {
        code: 'TIMELINE_FAILED',
        message: 'Failed to retrieve integrity event timeline',
      };
      throw new ApiError(response.status, errorPayload.code, errorPayload.message);
    }

    return data;
  } catch (error: any) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, 'NETWORK_ERROR', error.message || 'Integrity timeline network request failed');
  }
};

const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('recruiter_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const loginRecruiter = async (
  email: string,
  password: string
): Promise<RecruiterLoginResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorPayload: ApiErrorPayload = data.error || {
        code: 'AUTH_FAILED',
        message: 'Invalid credentials',
      };
      throw new ApiError(response.status, errorPayload.code, errorPayload.message);
    }

    if (data.token) {
      localStorage.setItem('recruiter_token', data.token);
    }

    return data as RecruiterLoginResponse;
  } catch (error: any) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, 'NETWORK_ERROR', error.message || 'Login request failed');
  }
};

export const getRecruiterDashboardMetrics = async (): Promise<{
  success: boolean;
  organizationId: string;
  metrics: RecruiterMetrics;
}> => {
  try {
    const response = await fetch(`${API_BASE_URL}/recruiter/dashboard`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorPayload: ApiErrorPayload = data.error || {
        code: 'METRICS_FAILED',
        message: 'Failed to load recruiter metrics',
      };
      throw new ApiError(response.status, errorPayload.code, errorPayload.message);
    }

    return data;
  } catch (error: any) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, 'NETWORK_ERROR', error.message || 'Failed to fetch dashboard metrics');
  }
};

export const getRecruiterInterviews = async (params?: {
  page?: number;
  limit?: number;
  status?: string;
  jobRoleId?: string;
  candidateName?: string;
  sortBy?: string;
  order?: string;
}): Promise<{
  success: boolean;
  pagination: { total: number; page: number; limit: number; totalPages: number };
  interviews: RecruiterInterviewItem[];
}> => {
  try {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.jobRoleId) queryParams.append('jobRoleId', params.jobRoleId);
    if (params?.candidateName) queryParams.append('candidateName', params.candidateName);
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.order) queryParams.append('order', params.order);

    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';

    const response = await fetch(`${API_BASE_URL}/recruiter/interviews${queryString}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorPayload: ApiErrorPayload = data.error || {
        code: 'INTERVIEWS_FAILED',
        message: 'Failed to load interviews list',
      };
      throw new ApiError(response.status, errorPayload.code, errorPayload.message);
    }

    return data;
  } catch (error: any) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, 'NETWORK_ERROR', error.message || 'Failed to fetch recruiter interviews');
  }
};

export const getInterviewEvidenceReport = async (
  sessionId: string
): Promise<{
  success: boolean;
  report: EvidenceReportDTO;
}> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/recruiter/interviews/${encodeURIComponent(sessionId)}/report`,
      {
        method: 'GET',
        headers: getAuthHeaders(),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      const errorPayload: ApiErrorPayload = data.error || {
        code: 'REPORT_FAILED',
        message: 'Failed to load interview evidence report',
      };
      throw new ApiError(response.status, errorPayload.code, errorPayload.message);
    }

    return data;
  } catch (error: any) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, 'NETWORK_ERROR', error.message || 'Failed to fetch interview evidence report');
  }
};

export const saveRecruiterDecision = async (
  sessionId: string,
  decision: 'ADVANCE' | 'HOLD' | 'REJECT',
  notes?: string
): Promise<{
  success: boolean;
  sessionId: string;
  decision: string;
  notes: string;
  updatedAt: string;
}> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/recruiter/interviews/${encodeURIComponent(sessionId)}/decision`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ decision, notes }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      const errorPayload: ApiErrorPayload = data.error || {
        code: 'DECISION_FAILED',
        message: 'Failed to record recruiter decision',
      };
      throw new ApiError(response.status, errorPayload.code, errorPayload.message);
    }

    return data;
  } catch (error: any) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, 'NETWORK_ERROR', error.message || 'Failed to save recruiter decision');
  }
};

export const getCandidateAudioUrl = (sessionId: string, answerId: string): string => {
  const token = localStorage.getItem('recruiter_token');
  const tokenQuery = token ? `?token=${encodeURIComponent(token)}` : '';
  return `${API_BASE_URL}/sessions/${encodeURIComponent(sessionId)}/answers/${encodeURIComponent(answerId)}/audio${tokenQuery}`;
};


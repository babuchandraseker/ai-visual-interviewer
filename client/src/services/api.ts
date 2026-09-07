/// <reference types="vite/client" />
import { CandidateInviteValidation, ApiErrorPayload, STTResponse, TTSResponse } from '../types';

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

import { ISTTProvider, STTTranscribeOptions, STTResult } from '../types';
import { env } from '../../../config/env';
import { logger } from '../../../utils/logger';
import { ApiError } from '../../../utils/apiError';

export class MockSTTProvider implements ISTTProvider {
  public name = 'MockSTT (Development Only)';

  async transcribe(audioBuffer: Buffer, options?: STTTranscribeOptions): Promise<STTResult> {
    const durationMs = Math.round((audioBuffer.length / 32000) * 1000) || 1200;
    
    // If client passes a web speech transcript hint or custom transcript, use it
    if (options?.customTranscript && options.customTranscript.trim() !== '') {
      return {
        transcript: options.customTranscript.trim(),
        confidence: 0.98,
        durationMs,
        provider: this.name,
      };
    }

    // Default mock transcript indicator in dev mode
    const mockTranscripts = [
      "In my technical experience, I have designed scalable microservices with PostgreSQL indexing and Redis caching.",
      "To optimize database read queries, I implement B-tree composite indexes and query execution plan analysis.",
      "The Event Loop processes asynchronous non-blocking I/O callbacks efficiently using microtask queues.",
      "We maintained system resilience under peak loads using circuit breakers and connection pooling."
    ];

    const transcript = mockTranscripts[Math.floor(Math.random() * mockTranscripts.length)];

    return {
      transcript,
      confidence: 0.95,
      durationMs,
      provider: this.name,
    };
  }
}

export class OpenAIWhisperSTTProvider implements ISTTProvider {
  public name = 'OpenAIWhisperSTT';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async transcribe(audioBuffer: Buffer, options?: STTTranscribeOptions): Promise<STTResult> {
    const startTime = Date.now();
    const mimeType = options?.mimeType || 'audio/webm';
    
    try {
      const formData = new FormData();
      const blob = new Blob([audioBuffer], { type: mimeType });
      const filename = mimeType.includes('webm') ? 'audio.webm' : mimeType.includes('mp4') ? 'audio.mp4' : 'audio.wav';
      formData.append('file', blob, filename);
      formData.append('model', 'whisper-1');

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('OpenAI Whisper STT API failed', { status: response.status, errorText });
        throw ApiError.internal('OpenAI Whisper STT provider failed to process audio');
      }

      const data: any = await response.json();
      const transcript = (data.text || '').trim();
      const durationMs = Date.now() - startTime;

      return {
        transcript,
        confidence: 0.95,
        durationMs,
        provider: this.name,
      };
    } catch (error: any) {
      if (error instanceof ApiError) throw error;
      logger.error('OpenAI Whisper STT Network Error', { error: error.message });
      throw ApiError.internal('Whisper STT Service provider error');
    }
  }
}

export class DeepgramSTTProvider implements ISTTProvider {
  public name = 'DeepgramSTT';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async transcribe(audioBuffer: Buffer, options?: STTTranscribeOptions): Promise<STTResult> {
    const startTime = Date.now();
    const mimeType = options?.mimeType || 'audio/webm';

    try {
      const response = await fetch('https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true', {
        method: 'POST',
        headers: {
          Authorization: `Token ${this.apiKey}`,
          'Content-Type': mimeType,
        },
        body: audioBuffer,
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Deepgram STT API request failed', { status: response.status, errorText });
        throw ApiError.internal('Deepgram STT provider failed to process audio');
      }

      const data: any = await response.json();
      const transcript = data.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
      const confidence = data.results?.channels?.[0]?.alternatives?.[0]?.confidence || 0.9;
      const durationMs = Date.now() - startTime;

      return {
        transcript,
        confidence,
        durationMs,
        provider: this.name,
      };
    } catch (error: any) {
      if (error instanceof ApiError) throw error;
      logger.error('Deepgram STT Network Error', { error: error.message });
      throw ApiError.internal('STT Service provider error');
    }
  }
}

export const getSTTProvider = (): ISTTProvider => {
  if (env.DEEPGRAM_API_KEY && env.DEEPGRAM_API_KEY.trim() !== '') {
    return new DeepgramSTTProvider(env.DEEPGRAM_API_KEY);
  }
  if (env.OPENAI_API_KEY && env.OPENAI_API_KEY.trim() !== '') {
    return new OpenAIWhisperSTTProvider(env.OPENAI_API_KEY);
  }
  return new MockSTTProvider();
};

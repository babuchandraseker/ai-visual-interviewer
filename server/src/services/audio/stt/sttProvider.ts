import { ISTTProvider, STTTranscribeOptions, STTResult } from '../types';
import { env } from '../../../config/env';
import { logger } from '../../../utils/logger';
import { ApiError } from '../../../utils/apiError';

export class MockSTTProvider implements ISTTProvider {
  public name = 'MockSTT';

  async transcribe(audioBuffer: Buffer, options?: STTTranscribeOptions): Promise<STTResult> {
    const durationMs = Math.round((audioBuffer.length / 32000) * 1000) || 1200;
    
    // Generates a mock transcript if dev mode without API keys
    const mockTranscripts = [
      "I have extensive experience building scalable REST APIs using Node.js, Express, and PostgreSQL.",
      "In my previous project, we optimized database queries by adding composite indexes and using Redis caching.",
      "The Event Loop in Node.js processes microtasks like Promise callbacks before macrotasks like timers.",
      "We handled high concurrency by implementing connection pooling and graceful error boundaries."
    ];

    const transcript = mockTranscripts[Math.floor(Math.random() * mockTranscripts.length)];

    return {
      transcript,
      confidence: 0.96,
      durationMs,
      provider: this.name,
    };
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
  return new MockSTTProvider();
};

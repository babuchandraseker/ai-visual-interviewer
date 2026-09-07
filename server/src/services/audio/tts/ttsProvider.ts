import { ITTSProvider, TTSSynthesizeOptions, TTSResult } from '../types';
import { env } from '../../../config/env';
import { logger } from '../../../utils/logger';
import { ApiError } from '../../../utils/apiError';

// 1-second silent WAV base64 string for mock dev audio response
const MOCK_WAV_BASE64 = "UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";

export class MockTTSProvider implements ITTSProvider {
  public name = 'MockTTS';

  async synthesize(text: string, options?: TTSSynthesizeOptions): Promise<TTSResult> {
    const estimatedDurationMs = Math.max(1000, text.length * 60);

    return {
      audioBase64: MOCK_WAV_BASE64,
      mimeType: 'audio/wav',
      durationMs: estimatedDurationMs,
      provider: this.name,
    };
  }
}

export class ElevenLabsTTSProvider implements ITTSProvider {
  public name = 'ElevenLabsTTS';
  private apiKey: string;
  private defaultVoiceId = '21m00Tcm4TlvDq8ikWAM'; // Rachel voice

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async synthesize(text: string, options?: TTSSynthesizeOptions): Promise<TTSResult> {
    const startTime = Date.now();
    const voiceId = options?.voiceId || this.defaultVoiceId;

    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('ElevenLabs TTS API request failed', { status: response.status, errorText });
        throw ApiError.internal('ElevenLabs TTS provider failed to synthesize audio');
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const audioBase64 = buffer.toString('base64');
      const durationMs = Date.now() - startTime;

      return {
        audioBase64,
        mimeType: 'audio/mpeg',
        durationMs,
        provider: this.name,
      };
    } catch (error: any) {
      if (error instanceof ApiError) throw error;
      logger.error('ElevenLabs TTS Network Error', { error: error.message });
      throw ApiError.internal('TTS Service provider error');
    }
  }
}

export const getTTSProvider = (): ITTSProvider => {
  if (env.ELEVENLABS_API_KEY && env.ELEVENLABS_API_KEY.trim() !== '') {
    return new ElevenLabsTTSProvider(env.ELEVENLABS_API_KEY);
  }
  return new MockTTSProvider();
};

export interface STTTranscribeOptions {
  mimeType?: string;
  language?: string;
}

export interface STTResult {
  transcript: string;
  confidence: number;
  durationMs: number;
  provider: string;
}

export interface TTSSynthesizeOptions {
  voiceId?: string;
}

export interface TTSResult {
  audioBase64: string;
  mimeType: string;
  durationMs: number;
  provider: string;
}

export interface ISTTProvider {
  name: string;
  transcribe(audioBuffer: Buffer, options?: STTTranscribeOptions): Promise<STTResult>;
}

export interface ITTSProvider {
  name: string;
  synthesize(text: string, options?: TTSSynthesizeOptions): Promise<TTSResult>;
}

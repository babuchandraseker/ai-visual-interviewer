import { AudioConfig } from '../types';

export interface SpeechCaptureEvents {
  onVolumeChange?: (level: number) => void;
  onSpeechStart?: () => void;
  onSpeechEnd?: (audioBlob: Blob, durationMs: number) => void;
  onError?: (error: Error) => void;
}

export const DEFAULT_AUDIO_CONFIG: AudioConfig = {
  speechThreshold: 10,       // 10% volume
  silenceThreshold: 5,       // 5% volume
  silenceDurationMs: 1500,   // 1.5s natural pause before stopping
  minDurationMs: 1000,       // 1.0s minimum recording
  maxDurationMs: 60000,      // 60s max safety cutoff
};

export class SpeechCaptureEngine {
  private config: AudioConfig;
  private events: SpeechCaptureEvents;
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private recordedChunks: Blob[] = [];

  private isRecording = false;
  private isSpeechDetected = false;
  private recordingStartTime = 0;
  private silenceStartTime: number | null = null;
  private animFrameId: number | null = null;

  constructor(events: SpeechCaptureEvents = {}, config: Partial<AudioConfig> = {}) {
    this.events = events;
    this.config = { ...DEFAULT_AUDIO_CONFIG, ...config };
  }

  public getSupportedMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
      'audio/wav',
    ];

    if (typeof MediaRecorder !== 'undefined' && typeof MediaRecorder.isTypeSupported === 'function') {
      for (const type of types) {
        if (MediaRecorder.isTypeSupported(type)) {
          return type;
        }
      }
    }
    return '';
  }

  public async start(): Promise<void> {
    if (this.isRecording) return;

    try {
      this.recordedChunks = [];
      this.isSpeechDetected = false;
      this.silenceStartTime = null;

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const mimeType = this.getSupportedMimeType();
      this.mediaRecorder = mimeType
        ? new MediaRecorder(this.mediaStream, { mimeType })
        : new MediaRecorder(this.mediaStream);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.recordedChunks, {
          type: this.mediaRecorder?.mimeType || 'audio/webm',
        });
        const durationMs = Date.now() - this.recordingStartTime;
        console.log(`[SpeechCaptureEngine] Audio recording completed: ${this.recordedChunks.length} chunks, ${audioBlob.size} bytes, ${durationMs}ms`);
        if (this.events.onSpeechEnd) {
          this.events.onSpeechEnd(audioBlob, durationMs);
        }
      };

      // Set up VAD Web Audio Analyzer
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioCtx();
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      source.connect(this.analyser);

      this.recordingStartTime = Date.now();
      this.mediaRecorder.start(250); // Collect 250ms chunks
      this.isRecording = true;

      this.monitorVAD();
    } catch (err: any) {
      this.cleanup();
      if (this.events.onError) {
        this.events.onError(new Error(err.message || 'Failed to start speech capture'));
      }
    }
  }

  private monitorVAD(): void {
    if (!this.isRecording || !this.analyser) return;

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);

    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    const average = sum / dataArray.length;
    const volumeLevel = Math.min(100, Math.round((average / 128) * 100));

    if (this.events.onVolumeChange) {
      this.events.onVolumeChange(volumeLevel);
    }

    const elapsedMs = Date.now() - this.recordingStartTime;

    // Check for speech start
    if (volumeLevel >= this.config.speechThreshold) {
      if (!this.isSpeechDetected) {
        this.isSpeechDetected = true;
        if (this.events.onSpeechStart) {
          this.events.onSpeechStart();
        }
      }
      this.silenceStartTime = null;
    } else if (this.isSpeechDetected && volumeLevel <= this.config.silenceThreshold) {
      // Monitor continuous silence duration
      if (this.silenceStartTime === null) {
        this.silenceStartTime = Date.now();
      } else {
        const silenceDuration = Date.now() - this.silenceStartTime;
        if (silenceDuration >= this.config.silenceDurationMs && elapsedMs >= this.config.minDurationMs) {
          // Candidate finished speaking after natural silence pause
          this.stop();
          return;
        }
      }
    }

    // Safety timeout limit
    if (elapsedMs >= this.config.maxDurationMs) {
      this.stop();
      return;
    }

    this.animFrameId = requestAnimationFrame(() => this.monitorVAD());
  }

  public stop(): void {
    if (!this.isRecording) return;
    this.isRecording = false;

    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }

    this.cleanup();
  }

  public cleanup(): void {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    this.isRecording = false;
  }
}

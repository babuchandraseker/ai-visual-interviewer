import { useState, useEffect, useRef, useCallback } from 'react';
import { AudioEngineStatus, TranscriptMetadata, AudioConfig } from '../types';
import { SpeechCaptureEngine } from '../services/audioCapture';
import { AudioPlaybackEngine } from '../services/audioPlayback';
import { transcribeAudio, synthesizeSpeech } from '../services/api';

export interface UseAudioEngineReturn {
  status: AudioEngineStatus;
  transcript: TranscriptMetadata | null;
  volumeLevel: number;
  errorMessage: string | null;
  startListening: () => Promise<void>;
  stopListening: () => void;
  speakText: (text: string) => Promise<void>;
  stopSpeaking: () => void;
  resetTranscript: () => void;
}

export const useAudioEngine = (configOptions: Partial<AudioConfig> = {}): UseAudioEngineReturn => {
  const [status, setStatus] = useState<AudioEngineStatus>('IDLE');
  const [transcript, setTranscript] = useState<TranscriptMetadata | null>(null);
  const [volumeLevel, setVolumeLevel] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const captureEngineRef = useRef<SpeechCaptureEngine | null>(null);
  const playbackEngineRef = useRef<AudioPlaybackEngine | null>(null);

  const stopSpeaking = useCallback(() => {
    if (playbackEngineRef.current) {
      playbackEngineRef.current.stop();
    }
    if (status === 'SPEAKING') {
      setStatus('READY');
    }
  }, [status]);

  const processTranscription = useCallback(async (audioBlob: Blob, durationMs: number) => {
    if (audioBlob.size === 0) {
      setStatus('READY');
      return;
    }

    setStatus('TRANSCRIBING');
    setErrorMessage(null);

    try {
      const sttResponse = await transcribeAudio(audioBlob);

      setTranscript({
        transcript: sttResponse.transcript,
        confidence: sttResponse.confidence,
        durationMs: sttResponse.durationMs,
        provider: sttResponse.provider,
        recordedAt: new Date().toISOString(),
      });

      setStatus('TRANSCRIPT_READY');
    } catch (err: any) {
      setStatus('ERROR');
      setErrorMessage(err.message || 'Speech transcription failed');
    }
  }, []);

  const startListening = useCallback(async () => {
    stopSpeaking(); // Cancel AI speech if active
    setStatus('INITIALIZING');
    setErrorMessage(null);
    setVolumeLevel(0);

    if (!captureEngineRef.current) {
      captureEngineRef.current = new SpeechCaptureEngine(
        {
          onVolumeChange: (vol) => setVolumeLevel(vol),
          onSpeechStart: () => setStatus('LISTENING'),
          onSpeechEnd: (blob, duration) => {
            setStatus('PROCESSING');
            processTranscription(blob, duration);
          },
          onError: (err) => {
            setStatus('ERROR');
            setErrorMessage(err.message);
          },
        },
        configOptions
      );
    }

    await captureEngineRef.current.start();
    setStatus('LISTENING');
  }, [stopSpeaking, processTranscription, configOptions]);

  const stopListening = useCallback(() => {
    if (captureEngineRef.current) {
      captureEngineRef.current.stop();
    }
  }, []);

  const speakText = useCallback(async (text: string) => {
    if (!text || text.trim() === '') return;

    stopListening(); // Ensure microphone is off while AI speaks
    setStatus('INITIALIZING');
    setErrorMessage(null);

    try {
      const ttsResponse = await synthesizeSpeech(text);

      if (!playbackEngineRef.current) {
        playbackEngineRef.current = new AudioPlaybackEngine({
          onPlay: () => setStatus('SPEAKING'),
          onEnded: () => setStatus('READY'),
          onError: (err) => {
            setStatus('ERROR');
            setErrorMessage(err.message);
          },
        });
      }

      await playbackEngineRef.current.playBase64(ttsResponse.audioBase64, ttsResponse.mimeType);
    } catch (err: any) {
      setStatus('ERROR');
      setErrorMessage(err.message || 'Speech synthesis failed');
    }
  }, [stopListening]);

  const resetTranscript = useCallback(() => {
    setTranscript(null);
    if (status === 'TRANSCRIPT_READY') {
      setStatus('READY');
    }
  }, [status]);

  // Clean up media streams and audio engines on unmount
  useEffect(() => {
    return () => {
      if (captureEngineRef.current) {
        captureEngineRef.current.cleanup();
      }
      if (playbackEngineRef.current) {
        playbackEngineRef.current.stop();
      }
    };
  }, []);

  return {
    status,
    transcript,
    volumeLevel,
    errorMessage,
    startListening,
    stopListening,
    speakText,
    stopSpeaking,
    resetTranscript,
  };
};

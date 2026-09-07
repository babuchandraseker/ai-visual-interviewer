import { useState, useEffect, useRef, useCallback } from 'react';
import { MicrophoneStatus } from '../types';

export interface UseMicrophoneReturn {
  status: MicrophoneStatus;
  volumeLevel: number; // 0 to 100
  errorMessage: string | null;
  startMicrophone: () => Promise<void>;
  stopMicrophone: () => void;
}

export const useMicrophone = (): UseMicrophoneReturn => {
  const [status, setStatus] = useState<MicrophoneStatus>('CHECKING');
  const [volumeLevel, setVolumeLevel] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const signalDetectedRef = useRef<boolean>(false);

  const stopMicrophone = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }

    setVolumeLevel(0);
  }, []);

  const startMicrophone = useCallback(async () => {
    setStatus('CHECKING');
    setErrorMessage(null);
    setVolumeLevel(0);
    signalDetectedRef.current = false;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStatus('NOT_AVAILABLE');
      setErrorMessage('Microphone API is not supported in this browser.');
      return;
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = mediaStream;

      // Setup Web Audio API Analyzer
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(mediaStream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateVolume = () => {
        if (!analyserRef.current) return;

        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }

        const average = sum / dataArray.length;
        const normalizedVolume = Math.min(100, Math.round((average / 128) * 100));
        setVolumeLevel(normalizedVolume);

        if (normalizedVolume > 5) {
          signalDetectedRef.current = true;
          setStatus('READY');
        } else if (!signalDetectedRef.current) {
          setStatus('NO_SIGNAL');
        }

        animFrameRef.current = requestAnimationFrame(updateVolume);
      };

      updateVolume();
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setStatus('DENIED');
        setErrorMessage('Microphone access was denied. Please update browser permissions.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setStatus('NOT_AVAILABLE');
        setErrorMessage('No microphone device found on this system.');
      } else {
        setStatus('ERROR');
        setErrorMessage(err.message || 'Failed to initialize microphone.');
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      stopMicrophone();
    };
  }, [stopMicrophone]);

  return {
    status,
    volumeLevel,
    errorMessage,
    startMicrophone,
    stopMicrophone,
  };
};

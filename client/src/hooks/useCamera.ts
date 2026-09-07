import { useState, useEffect, useRef, useCallback } from 'react';
import { CameraStatus } from '../types';

export interface UseCameraReturn {
  status: CameraStatus;
  stream: MediaStream | null;
  errorMessage: string | null;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  videoRef: React.RefObject<HTMLVideoElement>;
}

export const useCamera = (): UseCameraReturn => {
  const [status, setStatus] = useState<CameraStatus>('CHECKING');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      const tracks = streamRef.current.getTracks ? streamRef.current.getTracks() : [];
      if (Array.isArray(tracks)) {
        tracks.forEach((track) => {
          track.stop();
        });
      }
      streamRef.current = null;
    }
    setStream(null);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    // Reuse existing active stream if already running
    if (streamRef.current && streamRef.current.active) {
      const tracks = streamRef.current.getVideoTracks ? streamRef.current.getVideoTracks() : streamRef.current.getTracks();
      if (tracks.length > 0 && tracks[0].readyState === 'live') {
        setStatus('READY');
        setStream(streamRef.current);
        return;
      }
    }

    setStatus('CHECKING');
    setErrorMessage(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStatus('NOT_AVAILABLE');
      setErrorMessage('Camera API is not supported in this browser.');
      return;
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
      });

      // Track end listener for disconnect detection
      const videoTracks = mediaStream.getVideoTracks ? mediaStream.getVideoTracks() : (mediaStream.getTracks ? mediaStream.getTracks() : []);
      const videoTrack = videoTracks[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          setStatus('NOT_AVAILABLE');
          setErrorMessage('Camera disconnected.');
        };
      }

      streamRef.current = mediaStream;
      setStream(mediaStream);
      setStatus('READY');

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.muted = true;
        videoRef.current.playsInline = true;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setStatus('DENIED');
        setErrorMessage('Camera access was denied. Please update browser permissions.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setStatus('NOT_AVAILABLE');
        setErrorMessage('No camera device found on this system.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setStatus('ERROR');
        setErrorMessage('Camera is currently in use by another application.');
      } else {
        setStatus('ERROR');
        setErrorMessage(err.message || 'Failed to initialize camera.');
      }
    }
  }, []);

  // Cleanup only on component unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return {
    status,
    stream,
    errorMessage,
    startCamera,
    stopCamera,
    videoRef,
  };
};

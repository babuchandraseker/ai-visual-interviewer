import { useState, useEffect, useRef } from 'react';
import {
  LocalFaceDetector,
  VisualTelemetryStateMachine,
  VisualTelemetryState,
  VisualTelemetryPayload,
} from '../services/visualTelemetry';
import { sendVisualTelemetry } from '../services/api';

export interface UseVisualTelemetryOptions {
  videoRef: React.RefObject<HTMLVideoElement>;
  sessionId: string;
  enabled?: boolean;
  samplingIntervalMs?: number; // default 2000 ms (0.5 Hz)
}

export interface UseVisualTelemetryReturn {
  state: VisualTelemetryState;
  warningMessage: string | null;
  faceCount: number;
  isDetectorActive: boolean;
}

export const useVisualTelemetry = ({
  videoRef,
  sessionId,
  enabled = true,
  samplingIntervalMs = 2000,
}: UseVisualTelemetryOptions): UseVisualTelemetryReturn => {
  const [state, setState] = useState<VisualTelemetryState>('UNKNOWN');
  const [faceCount, setFaceCount] = useState<number>(1);
  const [isDetectorActive, setIsDetectorActive] = useState<boolean>(false);

  const detectorRef = useRef<LocalFaceDetector | null>(null);
  const stateMachineRef = useRef<VisualTelemetryStateMachine | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setIsDetectorActive(false);
      return;
    }

    // Initialize detector & state machine
    if (!detectorRef.current) {
      detectorRef.current = new LocalFaceDetector();
    }
    if (!stateMachineRef.current) {
      stateMachineRef.current = new VisualTelemetryStateMachine(sessionId);
    } else {
      stateMachineRef.current.setSessionId(sessionId);
    }

    // Telemetry event listener
    const handleTelemetryEvent = (payload: VisualTelemetryPayload) => {
      sendVisualTelemetry(sessionId, payload).catch((err) => {
        console.warn('[useVisualTelemetry] Telemetry submission failed:', err);
      });
    };

    stateMachineRef.current.addEventListener(handleTelemetryEvent);
    setIsDetectorActive(true);

    // Bounded sampling interval loop (~0.5 Hz)
    intervalRef.current = setInterval(() => {
      if (!detectorRef.current || !stateMachineRef.current) return;

      const videoEl = videoRef.current;
      const observation = detectorRef.current.analyzeFrame(videoEl);

      setFaceCount(observation.faceCount);
      const nextState = stateMachineRef.current.processObservation(observation);
      setState(nextState);
    }, samplingIntervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (stateMachineRef.current) {
        stateMachineRef.current.removeEventListener(handleTelemetryEvent);
        stateMachineRef.current.dispose();
        stateMachineRef.current = null;
      }
      if (detectorRef.current) {
        detectorRef.current.dispose();
        detectorRef.current = null;
      }
      setIsDetectorActive(false);
    };
  }, [enabled, sessionId, samplingIntervalMs, videoRef]);

  // Derived neutral operational message
  let warningMessage: string | null = null;
  if (state === 'NO_FACE') {
    warningMessage = 'Please remain visible to the camera.';
  } else if (state === 'MULTIPLE_FACES') {
    warningMessage = 'Please ensure only the candidate is visible in the camera frame.';
  }

  return {
    state,
    warningMessage,
    faceCount,
    isDetectorActive,
  };
};

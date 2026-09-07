import {
  FaceObservation,
  TelemetryEventListener,
  VisualTelemetryPayload,
  VisualTelemetryState,
} from './types';

export const VISUAL_THRESHOLDS = {
  NO_FACE_MS: 5000,
  MULTIPLE_FACES_MS: 3000,
};

export class VisualTelemetryStateMachine {
  private state: VisualTelemetryState = 'UNKNOWN';
  private sessionId: string;
  private listeners: TelemetryEventListener[] = [];

  private noFaceTimer: ReturnType<typeof setTimeout> | null = null;
  private multiFaceTimer: ReturnType<typeof setTimeout> | null = null;
  private noFaceStartTime: number | null = null;
  private multiFaceStartTime: number | null = null;

  private hasEmittedNoFace: boolean = false;
  private hasEmittedMultiFace: boolean = false;
  private hasEmittedCamDisconnected: boolean = false;

  constructor(sessionId: string = 'sess_default') {
    this.sessionId = sessionId;
  }

  public setSessionId(sessionId: string): void {
    this.sessionId = sessionId;
  }

  public getState(): VisualTelemetryState {
    return this.state;
  }

  public addEventListener(listener: TelemetryEventListener): void {
    this.listeners.push(listener);
  }

  public removeEventListener(listener: TelemetryEventListener): void {
    this.listeners = this.listeners.filter((l) => l !== listener);
  }

  /**
   * Processes a raw face count observation and updates state machine & threshold timers.
   */
  public processObservation(obs: FaceObservation): VisualTelemetryState {
    // 1. Camera Disconnection Handler
    if (!obs.isCameraConnected) {
      this.clearAllTimers();
      this.state = 'CAMERA_UNAVAILABLE';
      if (!this.hasEmittedCamDisconnected) {
        this.hasEmittedCamDisconnected = true;
        this.emitTelemetry({
          sessionId: this.sessionId,
          eventType: 'CAMERA_DISCONNECTED',
          timestamp: new Date(obs.timestamp).toISOString(),
          faceCount: 0,
          source: 'CLIENT_LOCAL_FACE_DETECTOR',
        });
      }
      return this.state;
    }

    // Camera is connected -> reset disconnect flag
    this.hasEmittedCamDisconnected = false;

    // 2. No Face Observation (0 faces)
    if (obs.faceCount === 0) {
      this.clearTimer('multiFace');

      if (!this.noFaceStartTime) {
        this.noFaceStartTime = obs.timestamp;
      }

      const elapsed = obs.timestamp - this.noFaceStartTime;

      if (elapsed >= VISUAL_THRESHOLDS.NO_FACE_MS) {
        this.state = 'NO_FACE';
        if (!this.hasEmittedNoFace) {
          this.hasEmittedNoFace = true;
          this.emitTelemetry({
            sessionId: this.sessionId,
            eventType: 'NO_FACE_DETECTED',
            timestamp: new Date(obs.timestamp).toISOString(),
            durationMs: elapsed,
            faceCount: 0,
            source: 'CLIENT_LOCAL_FACE_DETECTOR',
          });
        }
      }
      return this.state;
    }

    // 3. Multiple Faces Observation (>1 faces)
    if (obs.faceCount > 1) {
      this.clearTimer('noFace');

      if (!this.multiFaceStartTime) {
        this.multiFaceStartTime = obs.timestamp;
      }

      const elapsed = obs.timestamp - this.multiFaceStartTime;

      if (elapsed >= VISUAL_THRESHOLDS.MULTIPLE_FACES_MS) {
        this.state = 'MULTIPLE_FACES';
        if (!this.hasEmittedMultiFace) {
          this.hasEmittedMultiFace = true;
          this.emitTelemetry({
            sessionId: this.sessionId,
            eventType: 'MULTIPLE_FACES_DETECTED',
            timestamp: new Date(obs.timestamp).toISOString(),
            durationMs: elapsed,
            faceCount: obs.faceCount,
            source: 'CLIENT_LOCAL_FACE_DETECTOR',
          });
        }
      }
      return this.state;
    }

    // 4. Automatic Recovery to Normal (1 Face)
    this.clearAllTimers();
    this.state = 'ONE_FACE';
    return this.state;
  }

  private clearTimer(timerType: 'noFace' | 'multiFace'): void {
    if (timerType === 'noFace') {
      if (this.noFaceTimer) clearTimeout(this.noFaceTimer);
      this.noFaceTimer = null;
      this.noFaceStartTime = null;
      this.hasEmittedNoFace = false;
    } else {
      if (this.multiFaceTimer) clearTimeout(this.multiFaceTimer);
      this.multiFaceTimer = null;
      this.multiFaceStartTime = null;
      this.hasEmittedMultiFace = false;
    }
  }

  private clearAllTimers(): void {
    this.clearTimer('noFace');
    this.clearTimer('multiFace');
  }

  private emitTelemetry(payload: VisualTelemetryPayload): void {
    this.listeners.forEach((listener) => {
      try {
        listener(payload);
      } catch (err) {
        console.error('[VisualTelemetryStateMachine] Listener error:', err);
      }
    });
  }

  public dispose(): void {
    this.clearAllTimers();
    this.listeners = [];
  }
}

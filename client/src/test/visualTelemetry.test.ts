import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  LocalFaceDetector,
  VisualTelemetryStateMachine,
  VISUAL_THRESHOLDS,
  VisualTelemetryPayload,
} from '../services/visualTelemetry';

describe('Phase 6 — Client-Side Visual AI Telemetry', () => {
  let stateMachine: VisualTelemetryStateMachine;
  let emittedEvents: VisualTelemetryPayload[];

  beforeEach(() => {
    stateMachine = new VisualTelemetryStateMachine('sess_test_999');
    emittedEvents = [];
    stateMachine.addEventListener((event) => {
      emittedEvents.push(event);
    });
  });

  afterEach(() => {
    stateMachine.dispose();
  });

  describe('LocalFaceDetector (Privacy & In-Memory Analysis)', () => {
    it('should return isCameraConnected=false when camera track is inactive or ended', () => {
      const detector = new LocalFaceDetector();
      const obs = detector.analyzeFrame(null);

      expect(obs.isCameraConnected).toBe(false);
      expect(obs.faceCount).toBe(0);
      detector.dispose();
    });
  });

  describe('VisualTelemetryStateMachine — Thresholds & State Logic', () => {
    it('should stay in ONE_FACE state when 1 face is observed continuously', () => {
      const state = stateMachine.processObservation({
        faceCount: 1,
        isCameraConnected: true,
        timestamp: Date.now(),
      });

      expect(state).toBe('ONE_FACE');
      expect(emittedEvents).toHaveLength(0);
    });

    it('should NOT emit NO_FACE_DETECTED if 0 faces persist for less than 5 seconds', () => {
      const t0 = 1000000;
      stateMachine.processObservation({ faceCount: 0, isCameraConnected: true, timestamp: t0 });
      stateMachine.processObservation({ faceCount: 0, isCameraConnected: true, timestamp: t0 + 4000 });

      expect(emittedEvents).toHaveLength(0);
      expect(stateMachine.getState()).not.toBe('NO_FACE');
    });

    it('should emit NO_FACE_DETECTED when 0 faces persist for >= 5 seconds', () => {
      const t0 = 1000000;
      stateMachine.processObservation({ faceCount: 0, isCameraConnected: true, timestamp: t0 });
      stateMachine.processObservation({
        faceCount: 0,
        isCameraConnected: true,
        timestamp: t0 + VISUAL_THRESHOLDS.NO_FACE_MS + 100,
      });

      expect(stateMachine.getState()).toBe('NO_FACE');
      expect(emittedEvents).toHaveLength(1);
      expect(emittedEvents[0].eventType).toBe('NO_FACE_DETECTED');
      expect(emittedEvents[0].faceCount).toBe(0);
      expect(emittedEvents[0].source).toBe('CLIENT_LOCAL_FACE_DETECTOR');
    });

    it('should execute automatic recovery when face returns after NO_FACE_DETECTED', () => {
      const t0 = 1000000;
      // Trigger NO_FACE
      stateMachine.processObservation({ faceCount: 0, isCameraConnected: true, timestamp: t0 });
      stateMachine.processObservation({
        faceCount: 0,
        isCameraConnected: true,
        timestamp: t0 + VISUAL_THRESHOLDS.NO_FACE_MS + 100,
      });
      expect(emittedEvents).toHaveLength(1);

      // Face returns
      const recoveredState = stateMachine.processObservation({
        faceCount: 1,
        isCameraConnected: true,
        timestamp: t0 + VISUAL_THRESHOLDS.NO_FACE_MS + 1000,
      });

      expect(recoveredState).toBe('ONE_FACE');
      // No extra error event emitted on recovery
      expect(emittedEvents).toHaveLength(1);
    });

    it('should emit MULTIPLE_FACES_DETECTED when >1 faces persist for >= 3 seconds', () => {
      const t0 = 1000000;
      stateMachine.processObservation({ faceCount: 2, isCameraConnected: true, timestamp: t0 });
      stateMachine.processObservation({
        faceCount: 2,
        isCameraConnected: true,
        timestamp: t0 + VISUAL_THRESHOLDS.MULTIPLE_FACES_MS + 100,
      });

      expect(stateMachine.getState()).toBe('MULTIPLE_FACES');
      expect(emittedEvents).toHaveLength(1);
      expect(emittedEvents[0].eventType).toBe('MULTIPLE_FACES_DETECTED');
      expect(emittedEvents[0].faceCount).toBe(2);
    });

    it('should avoid event spam by emitting only once while condition remains unchanged', () => {
      const t0 = 1000000;
      stateMachine.processObservation({ faceCount: 0, isCameraConnected: true, timestamp: t0 });
      stateMachine.processObservation({
        faceCount: 0,
        isCameraConnected: true,
        timestamp: t0 + 5100,
      });
      stateMachine.processObservation({
        faceCount: 0,
        isCameraConnected: true,
        timestamp: t0 + 6000,
      });
      stateMachine.processObservation({
        faceCount: 0,
        isCameraConnected: true,
        timestamp: t0 + 7000,
      });

      expect(emittedEvents).toHaveLength(1);
    });

    it('should emit CAMERA_DISCONNECTED when camera stream is lost', () => {
      stateMachine.processObservation({
        faceCount: 0,
        isCameraConnected: false,
        timestamp: Date.now(),
      });

      expect(stateMachine.getState()).toBe('CAMERA_UNAVAILABLE');
      expect(emittedEvents).toHaveLength(1);
      expect(emittedEvents[0].eventType).toBe('CAMERA_DISCONNECTED');
    });
  });

  describe('Strict Privacy Payload Integrity Assertion', () => {
    it('should guarantee that telemetry payload contains ONLY metadata and ZERO image data', () => {
      const t0 = Date.now();
      stateMachine.processObservation({ faceCount: 0, isCameraConnected: true, timestamp: t0 });
      stateMachine.processObservation({
        faceCount: 0,
        isCameraConnected: true,
        timestamp: t0 + 6000,
      });

      expect(emittedEvents).toHaveLength(1);
      const payload = emittedEvents[0] as any;

      // Assert required metadata fields exist
      expect(payload).toHaveProperty('sessionId');
      expect(payload).toHaveProperty('eventType');
      expect(payload).toHaveProperty('timestamp');
      expect(payload).toHaveProperty('source');

      // Assert forbidden binary/image fields DO NOT exist
      expect(payload.image).toBeUndefined();
      expect(payload.frame).toBeUndefined();
      expect(payload.video).toBeUndefined();
      expect(payload.base64).toBeUndefined();
      expect(payload.snapshot).toBeUndefined();
      expect(payload.embedding).toBeUndefined();

      // Assert no string value is a Base64 data URL
      Object.values(payload).forEach((val) => {
        if (typeof val === 'string') {
          expect(val.startsWith('data:image')).toBe(false);
          expect(val.length).toBeLessThan(500);
        }
      });
    });
  });
});

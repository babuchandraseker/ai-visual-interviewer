import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SpeechCaptureEngine } from '../services/audioCapture';
import { AudioPlaybackEngine } from '../services/audioPlayback';

describe('SpeechCaptureEngine Service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize cleanly and detect supported mime types', () => {
    const engine = new SpeechCaptureEngine();
    expect(engine).toBeDefined();
    expect(typeof engine.getSupportedMimeType()).toBe('string');
  });

  it('should stop capture and execute cleanup cleanly', () => {
    const engine = new SpeechCaptureEngine();
    engine.cleanup();
    // Verify cleanup does not throw error
    expect(true).toBe(true);
  });
});

describe('AudioPlaybackEngine Service', () => {
  it('should track playing state and stop current audio without error', () => {
    const playback = new AudioPlaybackEngine();
    expect(playback.getIsPlaying()).toBe(false);

    playback.stop();
    expect(playback.getIsPlaying()).toBe(false);
  });
});

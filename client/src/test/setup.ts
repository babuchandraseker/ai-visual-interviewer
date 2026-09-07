import { vi } from 'vitest';

// Mock MediaDevices and getUserMedia for testing environment
if (typeof window !== 'undefined') {
  Object.defineProperty(navigator, 'mediaDevices', {
    writable: true,
    value: {
      getUserMedia: vi.fn(),
    },
  });

  // Mock AudioContext
  (window as any).AudioContext = vi.fn().mockImplementation(() => ({
    createMediaStreamSource: vi.fn().mockReturnValue({
      connect: vi.fn(),
    }),
    createAnalyser: vi.fn().mockReturnValue({
      fftSize: 256,
      frequencyBinCount: 128,
      smoothingTimeConstant: 0.8,
      getByteFrequencyData: vi.fn((array: Uint8Array) => {
        array.fill(50);
      }),
    }),
    close: vi.fn().mockResolvedValue(undefined),
    state: 'running',
  }));
}

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCamera } from '../hooks/useCamera';

describe('useCamera Custom Hook', () => {
  let mockTrack: any;
  let mockStream: any;

  beforeEach(() => {
    mockTrack = { stop: vi.fn() };
    mockStream = {
      getTracks: vi.fn().mockReturnValue([mockTrack]),
    };

    navigator.mediaDevices.getUserMedia = vi.fn().mockResolvedValue(mockStream);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with CHECKING status', () => {
    const { result } = renderHook(() => useCamera());
    expect(result.current.status).toBe('CHECKING');
    expect(result.current.stream).toBeNull();
  });

  it('should update status to READY when camera access is granted', async () => {
    const { result } = renderHook(() => useCamera());

    await act(async () => {
      await result.current.startCamera();
    });

    expect(result.current.status).toBe('READY');
    expect(result.current.stream).toBe(mockStream);
  });

  it('should handle camera permission denial cleanly', async () => {
    const error = new Error('Permission denied');
    error.name = 'NotAllowedError';
    navigator.mediaDevices.getUserMedia = vi.fn().mockRejectedValue(error);

    const { result } = renderHook(() => useCamera());

    await act(async () => {
      await result.current.startCamera();
    });

    expect(result.current.status).toBe('DENIED');
    expect(result.current.errorMessage).toContain('Camera access was denied');
  });

  it('should stop tracks when stopCamera is called', async () => {
    const { result } = renderHook(() => useCamera());

    await act(async () => {
      await result.current.startCamera();
    });

    act(() => {
      result.current.stopCamera();
    });

    expect(mockTrack.stop).toHaveBeenCalled();
    expect(result.current.stream).toBeNull();
  });
});

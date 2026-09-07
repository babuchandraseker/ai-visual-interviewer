import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { InterviewTimer } from '../services/interviewTimer';

describe('InterviewTimer Service', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize and track remaining seconds', () => {
    const timer = new InterviewTimer({ durationSeconds: 60 });
    expect(timer.getRemaining()).toBe(60);
    expect(timer.getElapsed()).toBe(0);
  });

  it('should increment elapsed and decrement remaining on tick', () => {
    const timer = new InterviewTimer({ durationSeconds: 60 });
    timer.start();

    vi.advanceTimersByTime(3000); // Advance 3 seconds

    expect(timer.getElapsed()).toBe(3);
    expect(timer.getRemaining()).toBe(57);
    timer.stop();
  });

  it('should invoke onExpire callback when duration expires', () => {
    const onExpireMock = vi.fn();
    const timer = new InterviewTimer({ durationSeconds: 5, onExpire: onExpireMock });
    timer.start();

    vi.advanceTimersByTime(6000);

    expect(onExpireMock).toHaveBeenCalled();
  });
});

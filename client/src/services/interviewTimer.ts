export interface InterviewTimerOptions {
  durationSeconds: number;
  onTick?: (elapsed: number, remaining: number) => void;
  onExpire?: () => void;
}

export class InterviewTimer {
  private durationSeconds = 1800;
  private elapsedSeconds = 0;
  private timerId: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;
  private onTick?: (elapsed: number, remaining: number) => void;
  private onExpire?: () => void;

  constructor(options?: Partial<InterviewTimerOptions>) {
    if (options?.durationSeconds) {
      this.durationSeconds = options.durationSeconds;
    }
    this.onTick = options?.onTick;
    this.onExpire = options?.onExpire;
  }

  public start(durationSeconds?: number): void {
    if (durationSeconds) {
      this.durationSeconds = durationSeconds;
    }
    this.stop();
    this.elapsedSeconds = 0;
    this.isRunning = true;

    this.timerId = setInterval(() => {
      this.elapsedSeconds += 1;
      const remaining = Math.max(0, this.durationSeconds - this.elapsedSeconds);

      if (this.onTick) {
        this.onTick(this.elapsedSeconds, remaining);
      }

      if (this.elapsedSeconds >= this.durationSeconds) {
        this.stop();
        if (this.onExpire) {
          this.onExpire();
        }
      }
    }, 1000);
  }

  public pause(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.isRunning = false;
  }

  public resume(): void {
    if (this.isRunning || this.elapsedSeconds >= this.durationSeconds) return;
    this.start(this.durationSeconds);
  }

  public stop(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.isRunning = false;
  }

  public getElapsed(): number {
    return this.elapsedSeconds;
  }

  public getRemaining(): number {
    return Math.max(0, this.durationSeconds - this.elapsedSeconds);
  }

  public getIsRunning(): boolean {
    return this.isRunning;
  }
}

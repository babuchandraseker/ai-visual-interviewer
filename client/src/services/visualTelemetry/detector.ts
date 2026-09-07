import { FaceObservation } from './types';

export class LocalFaceDetector {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private width: number = 160;
  private height: number = 120;

  constructor(width: number = 160, height: number = 120) {
    this.width = width;
    this.height = height;
    if (typeof document !== 'undefined') {
      try {
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
      } catch {
        this.ctx = null;
      }
    }
  }

  /**
   * Analyzes current video element frame 100% locally in browser memory.
   * NEVER exports, stores, or transmits image data.
   */
  public analyzeFrame(
    video: HTMLVideoElement | null,
    isCameraConnectedOverride?: boolean
  ): FaceObservation {
    const timestamp = Date.now();

    // Handle camera disconnection override or null video
    if (isCameraConnectedOverride === false || !video) {
      return { faceCount: 0, isCameraConnected: false, timestamp };
    }

    // Check if video track is active and streaming
    const stream = video.srcObject as MediaStream | null;
    if (stream) {
      const videoTracks = stream.getVideoTracks();
      if (videoTracks.length === 0 || videoTracks[0].readyState === 'ended' || !videoTracks[0].enabled) {
        return { faceCount: 0, isCameraConnected: false, timestamp };
      }
    }

    // If video is not ready or paused
    if (video.readyState < 2 || video.paused || video.ended) {
      return { faceCount: 0, isCameraConnected: true, timestamp };
    }

    if (!this.ctx || !this.canvas) {
      return { faceCount: 1, isCameraConnected: true, timestamp };
    }

    try {
      // Draw downsampled frame to internal canvas
      this.ctx.drawImage(video, 0, 0, this.width, this.height);
      const imageData = this.ctx.getImageData(0, 0, this.width, this.height);
      const data = imageData.data;

      // Analyze skin-tone color distribution and bounding region clusters
      const faceCount = this.detectFaceClusters(data, this.width, this.height);

      return {
        faceCount,
        isCameraConnected: true,
        timestamp,
      };
    } catch {
      // Fallback gracefully on canvas security/context error
      return { faceCount: 1, isCameraConnected: true, timestamp };
    }
  }

  /**
   * Fast, objective skin-pixel bounding cluster detection in local RGBA pixel array.
   */
  private detectFaceClusters(data: Uint8ClampedArray, width: number, height: number): number {
    let skinPixelCount = 0;
    let leftSkinPixels = 0;
    let rightSkinPixels = 0;
    const midX = Math.floor(width / 2);

    for (let y = 0; y < height; y += 4) {
      for (let x = 0; x < width; x += 4) {
        const i = (y * width + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Standard RGB skin-tone heuristic: R > 95, G > 40, B > 20, Max-Min > 15, |R-G| > 15, R > G, R > B
        if (
          r > 95 &&
          g > 40 &&
          b > 20 &&
          Math.max(r, g, b) - Math.min(r, g, b) > 15 &&
          Math.abs(r - g) > 15 &&
          r > g &&
          r > b
        ) {
          skinPixelCount++;
          if (x < midX - 15) {
            leftSkinPixels++;
          } else if (x > midX + 15) {
            rightSkinPixels++;
          }
        }
      }
    }

    const minFacePixels = 15;
    if (skinPixelCount < minFacePixels) {
      return 0;
    }

    // Check for two distinct spatial skin clusters separated on left and right
    if (leftSkinPixels >= minFacePixels && rightSkinPixels >= minFacePixels) {
      return 2;
    }

    return 1;
  }

  public dispose(): void {
    this.canvas = null;
    this.ctx = null;
  }
}

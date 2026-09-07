export interface AudioPlaybackEvents {
  onPlay?: () => void;
  onEnded?: () => void;
  onError?: (error: Error) => void;
}

export class AudioPlaybackEngine {
  private currentAudio: HTMLAudioElement | null = null;
  private isPlaying = false;
  private events: AudioPlaybackEvents;

  constructor(events: AudioPlaybackEvents = {}) {
    this.events = events;
  }

  public async playBase64(base64Data: string, mimeType: string = 'audio/mp3'): Promise<void> {
    this.stop(); // Stop any currently playing audio to prevent overlap

    try {
      const audioUrl = `data:${mimeType};base64,${base64Data}`;
      const audio = new Audio(audioUrl);
      this.currentAudio = audio;

      audio.onplay = () => {
        this.isPlaying = true;
        if (this.events.onPlay) this.events.onPlay();
      };

      audio.onended = () => {
        this.isPlaying = false;
        this.currentAudio = null;
        if (this.events.onEnded) this.events.onEnded();
      };

      audio.onerror = (e) => {
        this.isPlaying = false;
        this.currentAudio = null;
        if (this.events.onError) {
          this.events.onError(new Error('Audio playback failed'));
        }
      };

      await audio.play();
    } catch (err: any) {
      this.isPlaying = false;
      this.currentAudio = null;
      if (this.events.onError) {
        this.events.onError(new Error(err.message || 'Failed to start audio playback'));
      }
    }
  }

  public stop(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio.onplay = null;
      this.currentAudio.onended = null;
      this.currentAudio.onerror = null;
      this.currentAudio = null;
    }
    this.isPlaying = false;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }
}

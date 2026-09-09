// Audio utilities for Gemini Live API and Gemini TTS

/**
 * Converts Float32Array microphone samples into 16-bit Little-Endian PCM base64 string
 * Expected by Gemini Live API (audio/pcm;rate=16000)
 */
export function floatTo16BitPCMBase64(inputData: Float32Array): string {
  const buffer = new ArrayBuffer(inputData.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < inputData.length; i++) {
    // Clamp to [-1, 1]
    const s = Math.max(-1, Math.min(1, inputData[i]));
    // Convert to 16-bit signed integer (-32768 to 32767)
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Decodes a base64 encoded raw 16-bit Little-Endian PCM buffer into an AudioBuffer
 * Gemini Live and TTS model output 24kHz mono PCM
 */
export function decodePCMToAudioBuffer(
  base64Data: string,
  audioCtx: AudioContext,
  sampleRate: number = 24000
): AudioBuffer {
  const binaryString = atob(base64Data);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const int16 = new Int16Array(bytes.buffer);
  const float32 = new Float32Array(int16.length);

  for (let i = 0; i < int16.length; i++) {
    float32[i] = int16[i] / (int16[i] < 0 ? 32768 : 32767);
  }

  const audioBuffer = audioCtx.createBuffer(1, float32.length, sampleRate);
  audioBuffer.getChannelData(0).set(float32);
  return audioBuffer;
}

/**
 * Audio Queue Player for gapless streaming playback
 * Follows SKILL.md guidelines: tracks nextStartTime to prevent stutter or jitter
 */
export class GaplessAudioQueuePlayer {
  private ctx: AudioContext | null = null;
  private nextStartTime: number = 0;
  private activeSources: AudioBufferSourceNode[] = [];
  private isPlaying: boolean = false;
  private onStateChange?: (playing: boolean) => void;

  constructor(onStateChange?: (playing: boolean) => void) {
    this.onStateChange = onStateChange;
  }

  private initCtx() {
    if (!this.ctx || this.ctx.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx({ sampleRate: 24000 });
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public enqueueChunk(base64Data: string) {
    this.initCtx();
    if (!this.ctx) return;

    const buffer = decodePCMToAudioBuffer(base64Data, this.ctx, 24000);
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.ctx.destination);

    const currentTime = this.ctx.currentTime;
    if (this.nextStartTime < currentTime) {
      this.nextStartTime = currentTime;
    }

    source.start(this.nextStartTime);
    this.nextStartTime += buffer.duration;
    this.activeSources.push(source);

    if (!this.isPlaying) {
      this.isPlaying = true;
      this.onStateChange?.(true);
    }

    source.onended = () => {
      const idx = this.activeSources.indexOf(source);
      if (idx !== -1) {
        this.activeSources.splice(idx, 1);
      }
      if (this.activeSources.length === 0) {
        this.isPlaying = false;
        this.onStateChange?.(false);
      }
    };
  }

  public stopAndClear() {
    for (const source of this.activeSources) {
      try {
        source.stop();
      } catch (e) {
        // already stopped
      }
    }
    this.activeSources = [];
    if (this.ctx) {
      this.nextStartTime = this.ctx.currentTime;
    }
    this.isPlaying = false;
    this.onStateChange?.(false);
  }

  public close() {
    this.stopAndClear();
    if (this.ctx && this.ctx.state !== 'closed') {
      this.ctx.close();
      this.ctx = null;
    }
  }
}

class AudioController {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    // Initialize lazily on first interaction
  }

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  getMuted() {
    return this.isMuted;
  }

  // Generic tone generator
  private playTone(freq: number, type: OscillatorType, duration: number, vol: number = 0.1) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  // Noise generator for UI clicks/cards
  private playNoise(duration: number, vol: number = 0.1) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

    noise.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start();
  }

  // --- Public SFX Methods ---

  playClick() {
    // High tech chirp
    this.playTone(1200, 'sine', 0.05, 0.05);
    this.playNoise(0.05, 0.02);
  }

  playHover() {
    // Subtle static
    this.playNoise(0.02, 0.01);
  }

  playCardFlip() {
    // Swoosh sound (approximated by low freq noise)
    this.playNoise(0.15, 0.08);
  }

  playCoinToss() {
    this.playTone(2000, 'sine', 0.5, 0.1);
  }

  playWin() {
    // Major chord arpeggio
    if (this.isMuted) return;
    setTimeout(() => this.playTone(440, 'triangle', 0.3, 0.1), 0);
    setTimeout(() => this.playTone(554, 'triangle', 0.3, 0.1), 100);
    setTimeout(() => this.playTone(659, 'triangle', 0.6, 0.1), 200);
  }

  playLose() {
    // Discordant low tone
    this.playTone(100, 'sawtooth', 0.5, 0.2);
    this.playTone(95, 'sawtooth', 0.5, 0.2);
  }
}

export const audioController = new AudioController();

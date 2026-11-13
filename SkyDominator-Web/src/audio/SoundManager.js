/**
 * Procedural Web Audio Engine for Sky Dominator: Apex Strike
 * 100% Synthesized - Zero external audio file dependencies
 */
export class SoundManager {
  constructor() {
    this.ctx = null;
    this.isMuted = false;

    // Continuous sound nodes
    this.engineOsc = null;
    this.engineFilter = null;
    this.engineGain = null;

    this.afterburnerNoise = null;
    this.afterburnerGain = null;

    this.lockBeepOsc = null;
    this.lockBeepGain = null;
    this.isLockBeeping = false;

    this.isInitialized = false;
  }

  init() {
    if (this.isInitialized) return;

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContextClass();

      // Master output
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.8, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // 1. Continuous Jet Turbine Engine Node
      this.setupEngineSynth();

      // 2. Continuous Afterburner Noise Node
      this.setupAfterburnerSynth();

      this.isInitialized = true;
    } catch (e) {
      console.warn('Web Audio API not supported or blocked:', e);
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setupEngineSynth() {
    // Jet Turbine Whine: Dual sawtooth oscillators running through a sharp bandpass filter
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.setValueAtTime(110, this.ctx.currentTime);

    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'bandpass';
    this.engineFilter.frequency.setValueAtTime(800, this.ctx.currentTime);
    this.engineFilter.Q.setValueAtTime(3.5, this.ctx.currentTime);

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

    this.engineOsc.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.masterGain);

    this.engineOsc.start();
  }

  setupAfterburnerSynth() {
    // Generate pink/brown noise for low-end engine roar
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      output[i] = (b0 + b1 + b2) * 0.2;
    }

    this.afterburnerNoise = this.ctx.createBufferSource();
    this.afterburnerNoise.buffer = noiseBuffer;
    this.afterburnerNoise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, this.ctx.currentTime);

    this.afterburnerGain = this.ctx.createGain();
    this.afterburnerGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    this.afterburnerNoise.connect(filter);
    filter.connect(this.afterburnerGain);
    this.afterburnerGain.connect(this.masterGain);

    this.afterburnerNoise.start();
  }

  updateEngine(throttlePercent, isAfterburnerActive, airspeedKts) {
    if (!this.isInitialized || !this.ctx) return;

    const t = this.ctx.currentTime;

    // Turbine pitch scales smoothly with throttle and speed
    const baseFreq = 120 + (throttlePercent * 240) + (airspeedKts * 0.2);
    this.engineOsc.frequency.setTargetAtTime(baseFreq, t, 0.1);
    this.engineFilter.frequency.setTargetAtTime(baseFreq * 4.5, t, 0.1);

    // Afterburner rumble volume
    const targetAbGain = isAfterburnerActive ? 0.35 : (throttlePercent * 0.08);
    this.afterburnerGain.gain.setTargetAtTime(targetAbGain, t, 0.15);
  }

  playCannonFire() {
    if (!this.isInitialized || !this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.06);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.06);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.06);
  }

  playMissileLaunch() {
    if (!this.isInitialized || !this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.linearRampToValueAtTime(800, t + 0.3);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(600, t);
    filter.frequency.linearRampToValueAtTime(1600, t + 0.3);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.4);
  }

  playExplosion(isLarge = false) {
    if (!this.isInitialized || !this.ctx) return;

    const t = this.ctx.currentTime;
    const duration = isLarge ? 1.5 : 0.8;

    // White noise explosion burst
    const bufferSize = this.ctx.sampleRate * duration;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(isLarge ? 300 : 500, t);
    filter.frequency.exponentialRampToValueAtTime(40, t + duration);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(isLarge ? 0.7 : 0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(t);
    noise.stop(t + duration);
  }

  playLockTone(isLocked) {
    if (!this.isInitialized || !this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(isLocked ? 1200 : 800, t);

    gain.gain.setValueAtTime(0.12, t);
    const duration = isLocked ? 0.15 : 0.07;
    gain.gain.exponentialRampToValueAtTime(0.01, t + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + duration);
  }

  playWarningChime(type = 'stall') {
    if (!this.isInitialized || !this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(type === 'stall' ? 440 : 880, t);
    osc.frequency.setValueAtTime(type === 'stall' ? 330 : 660, t + 0.1);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.25);
  }
}


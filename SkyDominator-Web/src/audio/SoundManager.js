/**
 * Procedural Web Audio Engine + Tactical AWACS Radio Chatter
 * 100% Synthesized - Zero external audio file dependencies
 */
export class SoundManager {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.isInitialized = false;
    this.masterVolume = 0.85;

    // Nodes
    this.masterGain = null;
    this.engineOsc = null;
    this.engineFilter = null;
    this.engineGain = null;
    this.afterburnerNoise = null;
    this.afterburnerGain = null;

    // BGM Synth nodes
    this.bgmGain = null;
    this.bgmTimer = null;
    this.bgmStep = 0;
    this.isBgmPlaying = false;

    // Radio Chatter (Speech Synthesis)
    this.speechSynth = window.speechSynthesis || null;
    this.lastRadioTime = 0;
    this.selectedVoice = null;

    if (this.speechSynth) {
      this.initVoices();
      if (this.speechSynth.onvoiceschanged !== undefined) {
        this.speechSynth.onvoiceschanged = () => this.initVoices();
      }
    }
  }

  initVoices() {
    if (!this.speechSynth) return;
    const voices = this.speechSynth.getVoices();
    // Prefer English male or robotic voice for military AWACS
    this.selectedVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('David') || v.name.includes('Google') || v.name.includes('Male'))) || voices[0];
  }

  initAudio() {
    if (this.isInitialized) {
      this.resume();
      return;
    }

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContextClass();

      // Master Output
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // Jet Engine Synth
      this.setupEngineSynth();

      // Afterburner Noise Synth
      this.setupAfterburnerSynth();

      // Tactical BGM Bus
      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.setValueAtTime(0.18, this.ctx.currentTime);
      this.bgmGain.connect(this.masterGain);

      this.isInitialized = true;
      this.startCombatBGM();
    } catch (e) {
      console.warn('Web Audio API not supported or blocked:', e);
    }
  }

  setMasterVolume(val) {
    this.masterVolume = Math.max(0, Math.min(1.0, val));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.masterVolume, this.ctx.currentTime, 0.05);
    }
  }

  pauseAudio() {
    if (this.ctx && this.ctx.state === 'running') {
      this.ctx.suspend();
    }
  }

  resumeAudio() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  resume() {
    this.resumeAudio();
  }

  setupEngineSynth() {
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
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      output[i] = (b0 + b1 + b2) * 0.22;
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
    const baseFreq = 120 + (throttlePercent * 240) + (airspeedKts * 0.18);
    this.engineOsc.frequency.setTargetAtTime(baseFreq, t, 0.1);
    this.engineFilter.frequency.setTargetAtTime(baseFreq * 4.2, t, 0.1);

    const targetAbGain = isAfterburnerActive ? 0.38 : (throttlePercent * 0.08);
    this.afterburnerGain.gain.setTargetAtTime(targetAbGain, t, 0.12);
  }

  playCannonFire() {
    if (!this.isInitialized || !this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(85, t);
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
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.linearRampToValueAtTime(850, t + 0.3);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(600, t);
    filter.frequency.linearRampToValueAtTime(1700, t + 0.3);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.38);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.38);
  }

  playExplosion(isLarge = false) {
    if (!this.isInitialized || !this.ctx) return;

    const t = this.ctx.currentTime;
    const duration = isLarge ? 1.6 : 0.85;

    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.28));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(isLarge ? 300 : 550, t);
    filter.frequency.exponentialRampToValueAtTime(35, t + duration);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(isLarge ? 0.75 : 0.45, t);
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

    osc.type = isLocked ? 'square' : 'sine';
    osc.frequency.setValueAtTime(isLocked ? 1420 : 880, t);

    gain.gain.setValueAtTime(isLocked ? 0.16 : 0.08, t);
    const duration = isLocked ? 0.09 : 0.05;
    gain.gain.exponentialRampToValueAtTime(0.005, t + duration);

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

  playDopplerFlyby(distance = 150) {
    if (!this.isInitialized || !this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    // Classic supersonic Doppler pitch drop (900 Hz down to 250 Hz)
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.exponentialRampToValueAtTime(240, t + 0.6);

    const vol = Math.max(0.1, 1.0 - (distance / 400)) * 0.35;
    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.25);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.65);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.65);
  }

  playRadioClick() {
    if (!this.isInitialized || !this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(2400, t);
    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.04);
  }

  speakRadioChatter(message, callsign = 'AWACS', onSubtitle = null) {
    const now = performance.now();
    if (now - this.lastRadioTime < 3500) return; // avoid overlapping chatter
    this.lastRadioTime = now;

    this.playRadioClick();

    if (onSubtitle) {
      onSubtitle(`[${callsign}] ${message}`);
    }

    if (this.speechSynth) {
      try {
        this.speechSynth.cancel();
        const utter = new SpeechSynthesisUtterance(message);
        if (this.selectedVoice) utter.voice = this.selectedVoice;
        utter.rate = 1.15; // fast military tempo
        utter.pitch = 0.95;
        utter.volume = 0.85;
        this.speechSynth.speak(utter);
      } catch (e) {
        // Fallback gracefully
      }
    }
  }

  startCombatBGM() {
    if (this.isBgmPlaying || !this.ctx) return;
    this.isBgmPlaying = true;

    // Driving 128 BPM pulse synthwave bassline
    const bassNotes = [55, 55, 65.4, 55, 73.4, 55, 65.4, 82.4]; // A1, C2, D2, E2
    const interval = (60 / 128) / 2 * 1000; // eighth notes

    this.bgmTimer = setInterval(() => {
      if (!this.isBgmPlaying || !this.ctx || this.ctx.state !== 'running') return;

      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      const note = bassNotes[this.bgmStep % bassNotes.length];
      this.bgmStep++;

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(note, t);

      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.005, t + 0.18);

      osc.connect(gain);
      gain.connect(this.bgmGain);

      osc.start(t);
      osc.stop(t + 0.18);
    }, interval);
  }

  stopCombatBGM() {
    this.isBgmPlaying = false;
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }
}

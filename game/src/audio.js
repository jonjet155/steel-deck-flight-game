// audio.js — WebAudio synth only. No audio files.
export function makeAudio() {
  const a = { ctx: null, muted: false, engine: null, engineGain: null, windGain: null, started: false };
  a.init = function () {
    if (a.started) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      a.ctx = new AC();
      // engine hum: two detuned oscillators through a lowpass
      a.engineGain = a.ctx.createGain(); a.engineGain.gain.value = 0.05;
      const filt = a.ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 320;
      a.engine = a.ctx.createOscillator(); a.engine.type = 'sawtooth'; a.engine.frequency.value = 55;
      const o2 = a.ctx.createOscillator(); o2.type = 'square'; o2.frequency.value = 110;
      const g2 = a.ctx.createGain(); g2.gain.value = 0.4;
      a.engine.connect(filt); o2.connect(g2); g2.connect(filt); filt.connect(a.engineGain); a.engineGain.connect(a.ctx.destination);
      a.engine.start(); o2.start();
      // wind: looped noise buffer
      const len = a.ctx.sampleRate * 2;
      const buf = a.ctx.createBuffer(1, len, a.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const src = a.ctx.createBufferSource(); src.buffer = buf; src.loop = true;
      const bp = a.ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 500; bp.Q.value = 0.6;
      a.windGain = a.ctx.createGain(); a.windGain.gain.value = 0.03;
      src.connect(bp); bp.connect(a.windGain); a.windGain.connect(a.ctx.destination);
      src.start();
      a.started = true;
    } catch (e) { /* audio unavailable — game continues silent */ }
  };
  a.setEngine = function (throttle, speed) {
    if (!a.ctx || a.muted) return;
    a.engine.frequency.value = 45 + throttle * 90 + speed * 0.08;
    a.engineGain.gain.value = 0.03 + throttle * 0.06;
    a.windGain.gain.value = 0.01 + speed * 0.00025;
  };
  a.thunder = function () {
    if (!a.ctx || a.muted) return;
    const o = a.ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(70, a.ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(28, a.ctx.currentTime + 1.4);
    const g = a.ctx.createGain(); g.gain.setValueAtTime(0.22, a.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, a.ctx.currentTime + 1.5);
    o.connect(g); g.connect(a.ctx.destination); o.start(); o.stop(a.ctx.currentTime + 1.5);
  };
  a.clang = function () {
    if (!a.ctx || a.muted) return;
    [880, 1320, 660].forEach((f, i) => {
      const o = a.ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = f;
      const g = a.ctx.createGain(); g.gain.setValueAtTime(0.18, a.ctx.currentTime + i * 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, a.ctx.currentTime + 0.5);
      o.connect(g); g.connect(a.ctx.destination); o.start(a.ctx.currentTime + i * 0.02); o.stop(a.ctx.currentTime + 0.5);
    });
  };
  a.hiss = function () {
    if (!a.ctx || a.muted) return;
    const len = a.ctx.sampleRate * 0.8;
    const buf = a.ctx.createBuffer(1, len, a.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = a.ctx.createBufferSource(); src.buffer = buf;
    const hp = a.ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2000;
    const g = a.ctx.createGain(); g.gain.value = 0.25;
    src.connect(hp); hp.connect(g); g.connect(a.ctx.destination); src.start();
  };
  a.toggleMute = function () {
    a.muted = !a.muted;
    if (a.ctx) a.ctx.resume && a.ctx.resume();
    return a.muted;
  };
  return a;
}

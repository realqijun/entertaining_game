/** Tiny WebAudio synth so the game has zero audio assets to download. */
let ctx: AudioContext | null = null;
let muted = (() => {
  try {
    return localStorage.getItem('sdt-muted') === '1';
  } catch {
    return false;
  }
})();

export function isMuted() {
  return muted;
}

export function setMuted(m: boolean) {
  muted = m;
  try {
    localStorage.setItem('sdt-muted', m ? '1' : '0');
  } catch {
    /* ignore */
  }
}

function ac(): AudioContext | null {
  if (muted) return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.12, slide = 0, delay = 0) {
  const a = ac();
  if (!a) return;
  const t = a.currentTime + delay;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(dur: number, vol = 0.15, freq = 1200) {
  const a = ac();
  if (!a) return;
  const buf = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = freq;
  const g = a.createGain();
  g.gain.value = vol;
  src.connect(f).connect(g).connect(a.destination);
  src.start();
}

export const sfx = {
  click: () => tone(660, 0.06, 'square', 0.04),
  buy: () => { tone(520, 0.08, 'triangle', 0.08); tone(780, 0.1, 'triangle', 0.08, 0, 0.06); },
  sell: () => tone(400, 0.1, 'triangle', 0.06, -150),
  squash: () => { noise(0.12, 0.25, 900); tone(140, 0.12, 'square', 0.06, -80); },
  splash: () => noise(0.35, 0.2, 2500),
  coin: () => { tone(988, 0.08, 'square', 0.06); tone(1319, 0.25, 'square', 0.06, 0, 0.08); },
  ship: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, 'triangle', 0.08, 0, i * 0.07)),
  research: () => [440, 554, 659, 880].forEach((f, i) => tone(f, 0.2, 'sine', 0.09, 0, i * 0.05)),
  alarm: () => { tone(880, 0.18, 'sawtooth', 0.05, -300); tone(880, 0.18, 'sawtooth', 0.05, -300, 0.22); },
  bad: () => tone(220, 0.3, 'sawtooth', 0.06, -120),
  fanfare: () => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.1, 0, i * 0.11)),
  correct: () => { tone(784, 0.1, 'sine', 0.1); tone(1175, 0.2, 'sine', 0.1, 0, 0.09); },
  wrong: () => tone(196, 0.3, 'square', 0.06, -60),
};

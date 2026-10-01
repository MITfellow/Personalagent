/**
 * Tiny synthesized sound kit — no asset files, all WebAudio.
 * The Veo sound kit: a "swoosh" on send, a "pop" on receive and a tapback thunk.
 */
let ctx: AudioContext | null = null;
let enabled = true;

function ac(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const C = window.AudioContext || (window as any).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

export function setSoundEnabled(v: boolean) {
  enabled = v;
}

function noiseBuffer(c: AudioContext, seconds: number) {
  const len = Math.floor(c.sampleRate * seconds);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

/** outgoing: airy upward swoosh */
export function playSend() {
  if (!enabled) return;
  const c = ac();
  if (!c) return;
  const t = c.currentTime;

  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c, 0.5);
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.Q.value = 1.1;
  bp.frequency.setValueAtTime(600, t);
  bp.frequency.exponentialRampToValueAtTime(5200, t + 0.26);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.1, t + 0.06);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
  src.connect(bp).connect(g).connect(c.destination);
  src.start(t);
  src.stop(t + 0.5);

  const o = c.createOscillator();
  const og = c.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(520, t);
  o.frequency.exponentialRampToValueAtTime(1400, t + 0.2);
  og.gain.setValueAtTime(0.0001, t);
  og.gain.exponentialRampToValueAtTime(0.045, t + 0.04);
  og.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
  o.connect(og).connect(c.destination);
  o.start(t);
  o.stop(t + 0.3);
}

/** incoming: short glassy two-tone pop */
export function playReceive() {
  if (!enabled) return;
  const c = ac();
  if (!c) return;
  const t = c.currentTime;
  [
    [1180, 0, 0.07],
    [1620, 0.045, 0.1],
  ].forEach(([f, delay, dur]) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sine';
    o.frequency.value = f as number;
    const s = t + (delay as number);
    g.gain.setValueAtTime(0.0001, s);
    g.gain.exponentialRampToValueAtTime(0.09, s + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, s + (dur as number));
    o.connect(g).connect(c.destination);
    o.start(s);
    o.stop(s + (dur as number) + 0.05);
  });
}

/** tapback: soft wooden thunk */
export function playTapback() {
  if (!enabled) return;
  const c = ac();
  if (!c) return;
  const t = c.currentTime;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'triangle';
  o.frequency.setValueAtTime(420, t);
  o.frequency.exponentialRampToValueAtTime(190, t + 0.12);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.08, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + 0.2);
}

export function playWhoosh() {
  if (!enabled) return;
  const c = ac();
  if (!c) return;
  const t = c.currentTime;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c, 0.7);
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(3800, t);
  lp.frequency.exponentialRampToValueAtTime(320, t + 0.6);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.07, t + 0.08);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.62);
  src.connect(lp).connect(g).connect(c.destination);
  src.start(t);
  src.stop(t + 0.7);
}
